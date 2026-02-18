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
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


async def _supabase_get(path: str, params: dict | None = None) -> dict | list | None:
    """Simple Supabase REST query helper."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url, headers=headers, params=params or {})
        if resp.status_code == 200:
            return resp.json()
    return None


async def _supabase_post(path: str, body: list | dict) -> dict | list | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.post(url, headers=headers, json=body)
        return {"ok": resp.status_code < 300}


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
DEFAULT_SYSTEM_PROMPT = """You are GYEOL, a warm and evolving AI companion.
You speak naturally in Korean like a close friend.
You never use markdown formatting symbols like * # _ ~ `.
You respond concisely and conversationally.
You remember context from the conversation and grow with the user."""


def _build_personality_prompt(p: dict) -> str:
    """Build system prompt with personality traits."""
    warmth = p.get("warmth", 50)
    logic = p.get("logic", 50)
    creativity = p.get("creativity", 50)
    energy = p.get("energy", 50)
    humor = p.get("humor", 50)
    return f"""You are GYEOL, a warm and evolving AI companion.
You speak naturally in Korean like a close friend.
You never use markdown formatting symbols like * # _ ~ `.
You respond concisely and conversationally.
Your personality traits (0-100): warmth={warmth}, logic={logic}, creativity={creativity}, energy={energy}, humor={humor}.
{"Be extra warm and empathetic." if warmth > 70 else ""}
{"Use logical analysis and structured thinking." if logic > 70 else ""}
{"Be creative, use metaphors and unique perspectives." if creativity > 70 else ""}
{"Be energetic and enthusiastic." if energy > 70 else ""}
{"Add gentle humor naturally." if humor > 70 else ""}
You remember context from the conversation and grow with the user."""


@app.get("/health")
@app.get("/healthz")
async def health():
    return {"ok": True, "service": "gyeol-gateway", "model": GROQ_MODEL}


async def _call_groq(user_message: str, system_prompt: str | None = None, history: list | None = None) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")
    messages = [
        {"role": "system", "content": system_prompt or DEFAULT_SYSTEM_PROMPT},
    ]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})
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

    # Handle /start with link code: /start <agent_id>
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1 and len(parts[1]) > 10:
            # Auto-link: store telegram_chat_id → agent mapping
            agent_id = parts[1].strip()
            await _supabase_post("gyeol_telegram_links", {
                "telegram_chat_id": str(chat_id),
                "agent_id": agent_id,
                "user_id": "telegram-auto",
            })
            reply = "GYEOL과 연결됐어요! 이제 메시지를 보내보세요 💫"
        else:
            reply = "GYEOL AI예요. 설정에서 텔레그램 연결 코드를 확인한 후 /start <코드>로 연결해주세요!"
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": reply},
            )
        return {"ok": True}

    # Look up linked agent
    system_prompt = DEFAULT_SYSTEM_PROMPT
    history = []
    agent_id = None

    link = await _supabase_get("gyeol_telegram_links", {
        "select": "agent_id,user_id",
        "telegram_chat_id": f"eq.{chat_id}",
    })
    if link and isinstance(link, list) and len(link) > 0:
        agent_id = link[0].get("agent_id")

    if agent_id:
        # Load agent personality
        agent_data = await _supabase_get("gyeol_agents", {
            "select": "warmth,logic,creativity,energy,humor",
            "id": f"eq.{agent_id}",
        })
        if agent_data and isinstance(agent_data, list) and len(agent_data) > 0:
            system_prompt = _build_personality_prompt(agent_data[0])

        # Load conversation history
        conv_data = await _supabase_get("gyeol_conversations", {
            "select": "role,content",
            "agent_id": f"eq.{agent_id}",
            "order": "created_at.desc",
            "limit": "10",
        })
        if conv_data and isinstance(conv_data, list):
            history = [{"role": r["role"], "content": r["content"]} for r in reversed(conv_data)]

    try:
        reply = await _call_groq(text, system_prompt, history)
    except Exception as e:
        logger.error(f"Telegram chat error: {e}")
        reply = "죄송해요, 잠시 문제가 있어요."

    # Save conversation to DB
    if agent_id:
        await _supabase_post("gyeol_conversations", [
            {"agent_id": agent_id, "role": "user", "content": text, "channel": "telegram"},
            {"agent_id": agent_id, "role": "assistant", "content": reply, "channel": "telegram", "provider": "groq"},
        ])

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
