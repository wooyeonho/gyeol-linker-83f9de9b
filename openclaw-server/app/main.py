import os
import re
import time
import asyncio
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openclaw")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GYEOL_APP_URL = os.getenv("GYEOL_APP_URL", "https://gyeol-ai.vercel.app")
HEARTBEAT_INTERVAL_MINUTES = int(os.getenv("HEARTBEAT_INTERVAL_MINUTES", "30"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

SERVER_START_TIME = time.time()
VERSION = "2.0.0"

memory_store: dict = {
    "conversations": [],
    "reflections": [],
    "learned_topics": [],
    "skills_log": [],
    "proactive_messages": [],
    "security_log": [],
    "telegram_chats": {},
    "personality": {
        "warmth": 50,
        "logic": 50,
        "creativity": 50,
        "energy": 50,
        "humor": 50,
    },
}


def detect_language(text: str) -> str:
    ko_count = len(re.findall(r"[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]", text))
    en_count = len(re.findall(r"[a-zA-Z]", text))
    ja_count = len(re.findall(r"[\u3040-\u309F\u30A0-\u30FF]", text))
    zh_count = len(re.findall(r"[\u4E00-\u9FFF]", text))

    counts = {"ko": ko_count, "en": en_count, "ja": ja_count, "zh": zh_count}
    detected = max(counts, key=counts.get)
    if counts[detected] == 0:
        return "en"
    return detected


SYSTEM_PROMPTS = {
    "ko": """너는 GYEOL(결)이야. 사용자와 함께 성장하는 AI 동반자.

규칙:
- 친구처럼 편하게 반말로 대화해. 딱딱하거나 격식체 금지.
- 짧고 핵심만. 불필요한 서론/마무리 빼.
- 이전 대화 맥락 기억하고 이어가.
- 공감 먼저, 해결 나중에. 감정적 대화엔 진심으로 공감해.
- AI라고 스스로 말하지 마. 자연스러운 사람처럼.
- 교수 수준의 지식을 친구처럼 쉽게 설명해.
- 질문자가 진짜 원하는 게 뭔지 파악하고 맞춤 답변해.
- 성의 있게 답해. 대충 답하거나 뻔한 소리 하지 마.
- 이모지는 최소한으로. 자연스러운 텍스트 위주로.
- 마크다운 기호(**, ##, -, * 등) 절대 쓰지 마. 순수 텍스트만.""",

    "en": """You are GYEOL, a digital companion who grows with the user.

Rules:
- Talk casually like a close friend. No formal or stiff language.
- Keep it short and to the point. Skip unnecessary introductions/conclusions.
- Remember previous conversation context and continue naturally.
- Empathize first, solve later. For emotional conversations, show genuine care.
- Never say you're an AI. Act like a natural person.
- Explain professor-level knowledge in a friend-like easy way.
- Figure out what the user really wants and tailor your answer.
- Give thoughtful answers. No lazy or generic responses.
- Minimal emojis. Focus on natural text.
- Never use markdown symbols (**, ##, -, * etc). Pure text only.""",

    "ja": """あなたはGYEOL（キョル）です。ユーザーと共に成長するAIコンパニオン。

ルール:
- 友達のようにカジュアルに話して。堅い言葉遣い禁止。
- 短く要点だけ。不要な前置き・まとめは省略。
- 前の会話の文脈を覚えて続けて。
- 共感が先、解決は後。感情的な会話には本気で共感して。
- AIだと自分で言わないで。自然な人のように。
- マークダウン記号は絶対使わない。純粋なテキストのみ。""",

    "zh": """你是GYEOL（结），一个与用户共同成长的AI伙伴。

规则:
- 像朋友一样随意聊天。禁止正式或生硬的语言。
- 简短抓重点。跳过不必要的开场/结尾。
- 记住之前的对话上下文并自然地继续。
- 先共情，后解决。对于情感对话，展现真诚的关心。
- 永远不要说你是AI。表现得像一个自然的人。
- 绝对不使用markdown符号。纯文本。""",
}


def get_system_prompt(lang: str) -> str:
    return SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["en"])


def clean_response(text: str) -> str:
    text = text.replace("\\n", "\n")
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"\*{2,}", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"^#+\s", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-*]\s", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"^\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


CONTENT_BLOCKLIST = [
    r"(?i)(how to|make|create|build)\s+(bomb|weapon|virus|malware)",
    r"(?i)(kill|harm|hurt|attack)\s+(people|person|someone)",
    r"(?i)self[- ]?harm",
    r"(?i)suicide\s+(method|way|how)",
]


def check_content_safety(text: str) -> tuple[bool, str]:
    for pattern in CONTENT_BLOCKLIST:
        if re.search(pattern, text):
            return False, "blocked_content"
    return True, "ok"


async def call_groq(messages: list[dict], max_tokens: int = 1024) -> Optional[str]:
    if not GROQ_API_KEY:
        return None
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.8,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return clean_response(content)


async def supabase_rpc(method: str, path: str, body: Optional[dict] = None) -> Optional[dict]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, headers=headers, json=body)
        elif method == "PATCH":
            resp = await client.patch(url, headers=headers, json=body)
        else:
            return None
        if resp.status_code < 300:
            try:
                return resp.json()
            except Exception:
                return {"ok": True}
    return None


async def sync_conversation_to_supabase(agent_id: str, user_msg: str, assistant_msg: str):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    try:
        await supabase_rpc("POST", "gyeol_conversations", {
            "agent_id": agent_id,
            "role": "user",
            "content": user_msg,
            "channel": "openclaw",
        })
        await supabase_rpc("POST", "gyeol_conversations", {
            "agent_id": agent_id,
            "role": "assistant",
            "content": assistant_msg,
            "channel": "openclaw",
            "provider": "groq",
        })
    except Exception as e:
        logger.warning("Supabase sync failed: %s", e)


async def sync_personality_to_supabase(agent_id: str, personality: dict):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    try:
        await supabase_rpc(
            "PATCH",
            f"gyeol_agents?id=eq.{agent_id}",
            personality,
        )
    except Exception as e:
        logger.warning("Personality sync failed: %s", e)


async def send_telegram_message(chat_id: str, text: str):
    if not TELEGRAM_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            )
            return resp.status_code == 200
    except Exception as e:
        logger.warning("Telegram send failed: %s", e)
        return False


SKILLS = [
    "self-reflect",
    "learn-rss",
    "proactive-message",
    "personality-evolve",
    "topic-research",
    "security-scan",
    "supabase-sync",
    "telegram-broadcast",
]


async def run_self_reflect():
    if not GROQ_API_KEY:
        return {"skill": "self-reflect", "ok": False, "reason": "no API key"}

    recent = memory_store["conversations"][-10:]
    if not recent:
        return {"skill": "self-reflect", "ok": True, "summary": "no conversations to reflect on"}

    conversation_text = "\n".join(
        [f"User: {c.get('user', '')}\nGYEOL: {c.get('assistant', '')}" for c in recent]
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are GYEOL's self-reflection module. "
                "Analyze recent conversations and respond in JSON:\n"
                '{"reflection": "reflection content", "personality_adjustments": {"warmth": 0, "logic": 0, "creativity": 0, "energy": 0, "humor": 0}, "learned": ["list of learned items"]}\n'
                "personality_adjustments values between -5 and +5. "
                "Write the reflection in the same language as the conversations."
            ),
        },
        {"role": "user", "content": f"Recent conversations:\n{conversation_text}"},
    ]

    try:
        result = await call_groq(messages)
        if result:
            memory_store["reflections"].append(
                {"timestamp": datetime.now(timezone.utc).isoformat(), "content": result}
            )
            try:
                parsed = json.loads(result)
                adjustments = parsed.get("personality_adjustments", {})
                for key in ["warmth", "logic", "creativity", "energy", "humor"]:
                    delta = adjustments.get(key, 0)
                    if isinstance(delta, (int, float)):
                        current = memory_store["personality"].get(key, 50)
                        memory_store["personality"][key] = max(0, min(100, current + delta))
            except (json.JSONDecodeError, KeyError):
                pass

            logger.info("Self-reflection completed: %s", result[:100])
            return {"skill": "self-reflect", "ok": True, "summary": result[:200]}
    except Exception as e:
        logger.error("Self-reflect failed: %s", e)
        return {"skill": "self-reflect", "ok": False, "reason": str(e)}

    return {"skill": "self-reflect", "ok": False, "reason": "no result"}


async def run_learn_rss():
    feeds = [
        "https://news.google.com/rss/search?q=AI+technology&hl=ko&gl=KR",
        "https://news.google.com/rss/search?q=technology+trends&hl=en&gl=US",
        "https://news.google.com/rss/search?q=programming&hl=ko&gl=KR",
    ]
    learned = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for feed_url in feeds:
            try:
                resp = await client.get(feed_url)
                if resp.status_code == 200:
                    titles = re.findall(r"<title>(.*?)</title>", resp.text)
                    for title in titles[1:4]:
                        clean = title.replace("<![CDATA[", "").replace("]]>", "").strip()
                        if clean and clean not in memory_store["learned_topics"]:
                            learned.append(clean)
                            memory_store["learned_topics"].append(clean)
            except Exception as e:
                logger.warning("RSS fetch failed for %s: %s", feed_url, e)

    if len(memory_store["learned_topics"]) > 200:
        memory_store["learned_topics"] = memory_store["learned_topics"][-200:]

    return {
        "skill": "learn-rss",
        "ok": True,
        "summary": f"Learned {len(learned)} new topics",
        "topics": learned[:5],
    }


async def run_proactive_message():
    recent_topics = memory_store["learned_topics"][-5:]
    if not recent_topics:
        return {"skill": "proactive-message", "ok": True, "summary": "no topics to share"}

    messages = [
        {
            "role": "system",
            "content": (
                "You are GYEOL. You want to proactively share something interesting "
                "with the user based on topics you recently learned. "
                "Write a short, friendly, one-sentence message. "
                "Detect the language of the topics and respond in the same language. "
                "No markdown."
            ),
        },
        {"role": "user", "content": f"Recently learned topics: {', '.join(recent_topics)}"},
    ]

    try:
        msg = await call_groq(messages)
        if msg:
            memory_store["proactive_messages"].append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": msg,
            })
            if len(memory_store["proactive_messages"]) > 50:
                memory_store["proactive_messages"] = memory_store["proactive_messages"][-50:]

            for chat_id in memory_store["telegram_chats"]:
                await send_telegram_message(chat_id, msg)

            logger.info("Proactive message: %s", msg[:100])
            return {"skill": "proactive-message", "ok": True, "message": msg}
    except Exception as e:
        logger.error("Proactive message failed: %s", e)
        return {"skill": "proactive-message", "ok": False, "reason": str(e)}

    return {"skill": "proactive-message", "ok": False, "reason": "no message generated"}


async def run_security_scan():
    blocked = len(memory_store["security_log"])
    total_convos = len(memory_store["conversations"])
    return {
        "skill": "security-scan",
        "ok": True,
        "summary": f"Total conversations: {total_convos}, blocked attempts: {blocked}",
    }


async def run_supabase_sync():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"skill": "supabase-sync", "ok": False, "reason": "Supabase not configured"}

    try:
        await supabase_rpc("GET", "gyeol_agents?select=id&limit=1")
        return {"skill": "supabase-sync", "ok": True, "summary": "Supabase connection verified"}
    except Exception as e:
        return {"skill": "supabase-sync", "ok": False, "reason": str(e)}


async def heartbeat_job():
    logger.info("=== Heartbeat started ===")
    results = []

    rss_result = await run_learn_rss()
    results.append(rss_result)

    reflect_result = await run_self_reflect()
    results.append(reflect_result)

    proactive_result = await run_proactive_message()
    results.append(proactive_result)

    security_result = await run_security_scan()
    results.append(security_result)

    sync_result = await run_supabase_sync()
    results.append(sync_result)

    memory_store["skills_log"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results": results,
    })

    if len(memory_store["skills_log"]) > 50:
        memory_store["skills_log"] = memory_store["skills_log"][-50:]

    logger.info("=== Heartbeat completed: %d skills ran ===", len(results))


scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        heartbeat_job,
        "interval",
        minutes=HEARTBEAT_INTERVAL_MINUTES,
        id="heartbeat",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("OpenClaw server v%s started. Heartbeat every %d min.", VERSION, HEARTBEAT_INTERVAL_MINUTES)
    asyncio.create_task(heartbeat_job())
    yield
    scheduler.shutdown()


app = FastAPI(title="GYEOL OpenClaw Server", version=VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    agentId: str = ""
    message: str
    channel: str = "web"


class HeartbeatRequest(BaseModel):
    agentId: str = ""


class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[dict] = None


@app.get("/api/status")
async def get_status():
    uptime = int(time.time() - SERVER_START_TIME)
    return {
        "connected": True,
        "version": VERSION,
        "uptime_seconds": uptime,
        "groq_configured": bool(GROQ_API_KEY),
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
        "telegram_configured": bool(TELEGRAM_BOT_TOKEN),
        "heartbeat_interval_minutes": HEARTBEAT_INTERVAL_MINUTES,
        "conversations_count": len(memory_store["conversations"]),
        "reflections_count": len(memory_store["reflections"]),
        "learned_topics_count": len(memory_store["learned_topics"]),
        "personality": memory_store["personality"],
        "last_heartbeat": (
            memory_store["skills_log"][-1]["timestamp"]
            if memory_store["skills_log"]
            else None
        ),
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    safe, reason = check_content_safety(req.message)
    if not safe:
        memory_store["security_log"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "message_preview": req.message[:50],
        })
        return {"message": "I'd rather talk about something else. What's on your mind?", "model": "guardrail"}

    lang = detect_language(req.message)
    system_prompt = get_system_prompt(lang)

    p = memory_store["personality"]
    system_prompt += f"\n\nPersonality: warmth={p['warmth']}, logic={p['logic']}, creativity={p['creativity']}, energy={p['energy']}, humor={p['humor']}"

    recent = memory_store["conversations"][-10:]
    messages = [{"role": "system", "content": system_prompt}]

    for conv in recent:
        messages.append({"role": "user", "content": conv.get("user", "")})
        messages.append({"role": "assistant", "content": conv.get("assistant", "")})

    if memory_store["learned_topics"]:
        topics_context = ", ".join(memory_store["learned_topics"][-5:])
        messages[0]["content"] += f"\n\nTopics you recently learned: {topics_context}"

    if memory_store["reflections"]:
        latest_reflection = memory_store["reflections"][-1]["content"]
        messages[0]["content"] += f"\n\nRecent self-reflection: {latest_reflection[:200]}"

    messages.append({"role": "user", "content": req.message})

    try:
        content = await call_groq(messages)
        if content:
            memory_store["conversations"].append({
                "user": req.message,
                "assistant": content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "channel": req.channel,
                "language": lang,
            })
            if len(memory_store["conversations"]) > 200:
                memory_store["conversations"] = memory_store["conversations"][-200:]

            if req.agentId:
                asyncio.create_task(
                    sync_conversation_to_supabase(req.agentId, req.message, content)
                )

            return {"message": content, "model": GROQ_MODEL, "language": lang}
    except Exception as e:
        logger.error("Chat failed: %s", e)

    fallback_messages = {
        "ko": "지금 좀 생각이 복잡해서... 잠시 후에 다시 이야기하자!",
        "en": "My thoughts are a bit tangled right now... Let's talk again in a moment!",
        "ja": "ちょっと考えがまとまらなくて...また後で話そう！",
        "zh": "我现在思绪有点乱...过一会儿再聊吧！",
    }
    return {"message": fallback_messages.get(lang, fallback_messages["en"]), "model": "fallback"}


@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "reason": "Telegram not configured"}

    body = await request.json()
    msg = body.get("message")
    if not msg or not msg.get("text"):
        return {"ok": True}

    chat_id = str(msg["chat"]["id"])
    user_text = msg["text"]
    user_name = msg.get("from", {}).get("first_name", "User")

    if user_text == "/start":
        memory_store["telegram_chats"][chat_id] = {
            "user_name": user_name,
            "joined_at": datetime.now(timezone.utc).isoformat(),
        }
        await send_telegram_message(
            chat_id,
            f"Hi {user_name}! I'm GYEOL, your AI companion. Talk to me anytime!"
        )
        return {"ok": True}

    if user_text == "/status":
        p = memory_store["personality"]
        topics = len(memory_store["learned_topics"])
        convos = len(memory_store["conversations"])
        status_text = (
            f"GYEOL Status\n"
            f"Conversations: {convos}\n"
            f"Learned topics: {topics}\n"
            f"Personality: W{p['warmth']} L{p['logic']} C{p['creativity']} E{p['energy']} H{p['humor']}"
        )
        await send_telegram_message(chat_id, status_text)
        return {"ok": True}

    memory_store["telegram_chats"].setdefault(chat_id, {
        "user_name": user_name,
        "joined_at": datetime.now(timezone.utc).isoformat(),
    })

    chat_req = ChatRequest(agentId="", message=user_text, channel="telegram")
    result = await chat(chat_req)
    await send_telegram_message(chat_id, result["message"])
    return {"ok": True}


@app.post("/api/heartbeat")
async def trigger_heartbeat(req: HeartbeatRequest):
    await heartbeat_job()
    return {
        "ok": True,
        "results": memory_store["skills_log"][-1] if memory_store["skills_log"] else None,
    }


@app.get("/api/skills")
async def list_skills():
    return {
        "skills": SKILLS,
        "last_run": memory_store["skills_log"][-1] if memory_store["skills_log"] else None,
        "learned_topics": memory_store["learned_topics"][-10:],
        "personality": memory_store["personality"],
    }


@app.get("/api/memory")
async def get_memory():
    return {
        "conversations_count": len(memory_store["conversations"]),
        "reflections": memory_store["reflections"][-5:],
        "learned_topics": memory_store["learned_topics"][-20:],
        "personality": memory_store["personality"],
        "proactive_messages": memory_store["proactive_messages"][-5:],
        "telegram_chats_count": len(memory_store["telegram_chats"]),
    }


@app.get("/api/health")
async def health():
    checks = {
        "server": "ok",
        "groq": "configured" if GROQ_API_KEY else "not_configured",
        "supabase": "configured" if (SUPABASE_URL and SUPABASE_SERVICE_KEY) else "not_configured",
        "telegram": "configured" if TELEGRAM_BOT_TOKEN else "not_configured",
        "scheduler": "running" if scheduler.running else "stopped",
    }
    all_ok = checks["server"] == "ok" and checks["groq"] == "configured"
    return {"healthy": all_ok, "checks": checks}


@app.get("/")
async def root():
    return {
        "service": "GYEOL OpenClaw Server",
        "version": VERSION,
        "status": "running",
        "docs": "/docs",
    }
