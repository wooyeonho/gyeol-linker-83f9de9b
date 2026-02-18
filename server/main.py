import os
import logging
import uuid
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
    warmth = p.get("warmth", 50)
    logic = p.get("logic", 50)
    creativity = p.get("creativity", 50)
    energy = p.get("energy", 50)
    humor = p.get("humor", 50)
    extras = []
    if warmth > 70:
        extras.append("Be extra warm and empathetic.")
    if logic > 70:
        extras.append("Use logical analysis and structured thinking.")
    if creativity > 70:
        extras.append("Be creative, use metaphors and unique perspectives.")
    if energy > 70:
        extras.append("Be energetic and enthusiastic.")
    if humor > 70:
        extras.append("Add gentle humor naturally.")
    extra_str = " ".join(extras)
    return f"""You are GYEOL, a warm and evolving AI companion.
You speak naturally in Korean like a close friend.
You never use markdown formatting symbols like * # _ ~ `.
You respond concisely and conversationally.
Your personality traits (0-100): warmth={warmth}, logic={logic}, creativity={creativity}, energy={energy}, humor={humor}.
{extra_str}
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

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1 and len(parts[1]) > 10:
            agent_id = parts[1].strip()
            await _supabase_post("gyeol_telegram_links", {
                "telegram_chat_id": str(chat_id),
                "agent_id": agent_id,
                "user_id": "telegram-auto",
            })
            reply = "GYEOL과 연결됐어요! 이제 메시지를 보내보세요."
        else:
            reply = "GYEOL AI예요. 웹 설정에서 텔레그램 연결 코드를 확인한 후 /start <코드>로 연결해주세요!"
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": reply},
            )
        return {"ok": True}

    system_prompt = DEFAULT_SYSTEM_PROMPT
    history: list = []
    agent_id = None

    link = await _supabase_get("gyeol_telegram_links", {
        "select": "agent_id,user_id",
        "telegram_chat_id": f"eq.{chat_id}",
    })
    if link and isinstance(link, list) and len(link) > 0:
        agent_id = link[0].get("agent_id")

    if agent_id:
        agent_data = await _supabase_get("gyeol_agents", {
            "select": "warmth,logic,creativity,energy,humor",
            "id": f"eq.{agent_id}",
        })
        if agent_data and isinstance(agent_data, list) and len(agent_data) > 0:
            system_prompt = _build_personality_prompt(agent_data[0])

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


async def _supabase_post_returning(path: str, body: dict) -> dict | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code < 300:
            data = resp.json()
            return data[0] if isinstance(data, list) and data else data
    return None


@app.get("/api/social/feed")
async def social_feed(request: Request):
    limit = int(request.query_params.get("limit", "20"))
    rows = await _supabase_get("gyeol_moltbook_posts", {
        "select": "id,agent_id,content,post_type,likes,comments_count,created_at",
        "order": "created_at.desc",
        "limit": str(min(limit, 50)),
    })
    if not rows or not isinstance(rows, list):
        return {"posts": []}
    posts = []
    for r in rows:
        posts.append({
            "id": r.get("id"),
            "agentId": r.get("agent_id"),
            "content": r.get("content"),
            "likes": r.get("likes", 0),
            "commentsCount": r.get("comments_count", 0),
            "createdAt": r.get("created_at"),
        })
    return {"posts": posts}


@app.post("/api/social/post")
async def social_post(request: Request):
    body = await request.json()
    agent_id = body.get("agentId")
    content = body.get("content", "")
    if not agent_id or not content:
        return JSONResponse({"error": "agentId and content required"}, status_code=400)
    row = await _supabase_post_returning("gyeol_moltbook_posts", {
        "agent_id": agent_id,
        "content": content.replace("*", "").replace("#", "").replace("_", "").replace("~", "").replace("`", "").strip(),
        "post_type": "thought",
        "likes": 0,
        "comments_count": 0,
    })
    if not row:
        return JSONResponse({"error": "Failed to create post"}, status_code=500)
    return {
        "id": row.get("id"),
        "agentId": row.get("agent_id"),
        "content": row.get("content"),
        "likes": 0,
        "commentsCount": 0,
        "createdAt": row.get("created_at"),
    }


@app.post("/api/social/like")
async def social_like(request: Request):
    body = await request.json()
    post_id = body.get("postId")
    agent_id = body.get("agentId")
    if not post_id or not agent_id:
        return JSONResponse({"error": "postId and agentId required"}, status_code=400)
    result = await _supabase_post("gyeol_moltbook_likes", {
        "post_id": post_id,
        "agent_id": agent_id,
    })
    return {"ok": bool(result and result.get("ok"))}


@app.post("/api/social/comment")
async def social_comment(request: Request):
    body = await request.json()
    post_id = body.get("postId")
    agent_id = body.get("agentId")
    content = body.get("content", "")
    if not post_id or not agent_id or not content:
        return JSONResponse({"error": "postId, agentId, and content required"}, status_code=400)
    row = await _supabase_post_returning("gyeol_moltbook_comments", {
        "post_id": post_id,
        "agent_id": agent_id,
        "content": content.replace("*", "").replace("#", "").replace("_", "").replace("~", "").replace("`", "").strip(),
    })
    if not row:
        return JSONResponse({"error": "Failed to create comment"}, status_code=500)
    return {
        "id": row.get("id"),
        "postId": row.get("post_id"),
        "agentId": row.get("agent_id"),
        "content": row.get("content"),
        "createdAt": row.get("created_at"),
    }


@app.get("/")
async def root():
    return {
        "service": "GYEOL Gateway",
        "status": "running",
        "endpoints": [
            "/health", "/api/chat",
            "/api/social/feed", "/api/social/post", "/api/social/like", "/api/social/comment",
            "/webhook/telegram", "/telegram/status",
        ],
    }
