import os
import json
import logging
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("gyeol")

KOYEB_URL = os.environ.get("KOYEB_PUBLIC_URL", "https://gyeol-openclaw-gyeol-dab5f459.koyeb.app")


async def _set_telegram_webhook():
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not set, skipping webhook registration")
        return
    url = f"{KOYEB_URL}/webhook/telegram"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={"url": url, "allowed_updates": ["message"]},
        )
        logger.info(f"Telegram webhook set to {url}: {resp.text}")


@asynccontextmanager
async def lifespan(application: FastAPI):
    await _set_telegram_webhook()
    yield


app = FastAPI(title="GYEOL Gateway", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SYSTEM_PROMPT = """You are GYEOL, a warm and evolving AI companion.
You speak naturally in Korean like a close friend.
You never use markdown formatting symbols like * # _ ~ `.
You respond concisely and conversationally.
You remember context from the conversation and grow with the user."""


@app.get("/health")
@app.get("/healthz")
async def health():
    return {"ok": True, "service": "gyeol-gateway", "model": GROQ_MODEL}


async def _call_groq(user_message: str) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"model": GROQ_MODEL, "messages": messages, "max_tokens": 1024, "temperature": 0.8},
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Groq API error: {resp.status_code} {resp.text}")
    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    return content.replace("*", "").replace("#", "").replace("_", "").replace("~", "").replace("`", "")


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    message = body.get("message", "")
    agent_id = body.get("agentId", "default")

    if not message:
        return JSONResponse({"error": "message required"}, status_code=400)

    try:
        content = await _call_groq(message)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    except RuntimeError as e:
        return JSONResponse({"error": "AI provider error", "detail": str(e)}, status_code=502)

    return {"message": content, "provider": "groq", "model": GROQ_MODEL, "agentId": agent_id}


@app.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN not set"}

    body = await request.json()
    msg = body.get("message", {})
    chat_id = msg.get("chat", {}).get("id")
    text = msg.get("text", "")

    if not chat_id or not text:
        return {"ok": True}

    if text.startswith("/start"):
        reply = "GYEOL AI입니다. 메시지를 보내주세요!"
    else:
        try:
            reply = await _call_groq(text)
        except Exception as e:
            logger.error(f"Telegram chat error: {e}")
            reply = "죄송해요, 잠시 문제가 있어요."

    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": chat_id, "text": reply},
        )

    return {"ok": True}


@app.get("/telegram/status")
async def telegram_status():
    token = TELEGRAM_BOT_TOKEN
    if not token:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN not set"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"https://api.telegram.org/bot{token}/getWebhookInfo")
        return resp.json()


@app.get("/")
async def root():
    return {"service": "GYEOL Gateway", "status": "running", "endpoints": ["/health", "/api/chat", "/webhook/telegram", "/telegram/status"]}
