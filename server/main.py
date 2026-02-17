import os
import json
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="GYEOL Gateway")

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


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    message = body.get("message", "")
    agent_id = body.get("agentId", "default")

    if not message:
        return JSONResponse({"error": "message required"}, status_code=400)

    if not GROQ_API_KEY:
        return JSONResponse({"error": "GROQ_API_KEY not configured"}, status_code=500)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": message},
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
        return JSONResponse({"error": "AI provider error", "detail": resp.text}, status_code=502)

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    content = content.replace("*", "").replace("#", "").replace("_", "").replace("~", "").replace("`", "")

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
            chat_resp = await chat(request)
            if isinstance(chat_resp, JSONResponse):
                reply = "죄송해요, 잠시 문제가 있어요."
            else:
                reply = chat_resp.get("message", "응답을 생성하지 못했어요.")
        except Exception:
            reply = "죄송해요, 잠시 문제가 있어요."

    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": chat_id, "text": reply},
        )

    return {"ok": True}


@app.get("/")
async def root():
    return {"service": "GYEOL Gateway", "status": "running", "endpoints": ["/health", "/api/chat", "/webhook/telegram"]}
