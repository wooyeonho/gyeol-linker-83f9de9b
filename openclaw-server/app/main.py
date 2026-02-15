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
from fastapi.responses import StreamingResponse
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
    "telegram_links": {},
    "personality": {
        "warmth": 50,
        "logic": 50,
        "creativity": 50,
        "energy": 50,
        "humor": 50,
    },
}

activity_subscribers: list[asyncio.Queue] = []


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
    "ai-router",
    "gyeol-supabase",
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


def is_night_time() -> bool:
    """Check if current time is between 23:00 and 07:00 (night ban for proactive messages)"""
    now = datetime.now(timezone.utc)
    hour = now.hour
    return hour >= 23 or hour < 7


def get_daily_proactive_count() -> int:
    """Count proactive messages sent today"""
    today = datetime.now(timezone.utc).date().isoformat()
    count = 0
    for msg in memory_store.get("proactive_messages", []):
        ts = msg.get("timestamp", "")
        if ts.startswith(today):
            count += 1
    return count


MAX_DAILY_PROACTIVE = 2


async def run_proactive_message():
    if is_night_time():
        return {"skill": "proactive-message", "ok": True, "summary": "night time - skipping proactive message"}

    if get_daily_proactive_count() >= MAX_DAILY_PROACTIVE:
        return {"skill": "proactive-message", "ok": True, "summary": f"daily limit ({MAX_DAILY_PROACTIVE}) reached"}

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

        unsynced = [c for c in memory_store["conversations"] if not c.get("synced")]
        synced_count = 0
        for conv in unsynced[-20:]:
            try:
                agent_id = conv.get("agent_id") or memory_store.get("default_agent_id") or "00000000-0000-0000-0000-000000000002"
                await supabase_rpc("POST", "gyeol_conversations", {
                    "agent_id": agent_id,
                    "role": "user",
                    "content": conv.get("user", ""),
                    "channel": conv.get("channel", "openclaw"),
                })
                await supabase_rpc("POST", "gyeol_conversations", {
                    "agent_id": agent_id,
                    "role": "assistant",
                    "content": conv.get("assistant", ""),
                    "channel": conv.get("channel", "openclaw"),
                    "provider": "groq",
                })
                conv["synced"] = True
                synced_count += 1
            except Exception:
                pass

        p = memory_store["personality"]
        default_agent_id = memory_store.get("default_agent_id") or "00000000-0000-0000-0000-000000000002"
        await sync_personality_to_supabase(default_agent_id, p)

        for log_entry in memory_store["skills_log"][-5:]:
            if log_entry.get("synced_to_db"):
                continue
            try:
                log_agent_id = memory_store.get("default_agent_id") or "00000000-0000-0000-0000-000000000002"
                await supabase_rpc("POST", "gyeol_autonomous_logs", {
                    "agent_id": log_agent_id,
                    "activity_type": "skill_execution",
                    "summary": f"Heartbeat: {len(log_entry.get('results', []))} skills ran",
                    "details": {"results": log_entry.get("results", [])},
                    "was_sandboxed": True,
                })
                log_entry["synced_to_db"] = True
            except Exception:
                pass

        return {
            "skill": "supabase-sync",
            "ok": True,
            "summary": f"Synced {synced_count} conversations, personality, activity logs",
        }
    except Exception as e:
        return {"skill": "supabase-sync", "ok": False, "reason": str(e)}


async def run_personality_evolve():
    convos = memory_store["conversations"]
    if len(convos) < 10 or len(convos) % 10 != 0:
        return {"skill": "personality-evolve", "ok": True, "summary": "Not yet time to evolve"}

    recent = convos[-10:]
    conversation_text = "\n".join(
        [f"User: {c.get('user', '')}\nGYEOL: {c.get('assistant', '')}" for c in recent]
    )

    messages = [
        {
            "role": "system",
            "content": (
                "Analyze these 10 conversations and determine how GYEOL's personality should evolve. "
                "Respond in JSON only:\n"
                '{"adjustments": {"warmth": 0, "logic": 0, "creativity": 0, "energy": 0, "humor": 0}, '
                '"reason": "brief explanation"}\n'
                "Values between -3 and +3. Positive = trait should increase."
            ),
        },
        {"role": "user", "content": conversation_text},
    ]

    try:
        result = await call_groq(messages, max_tokens=256)
        if result:
            try:
                parsed = json.loads(result)
                adj = parsed.get("adjustments", {})
                for key in ["warmth", "logic", "creativity", "energy", "humor"]:
                    delta = adj.get(key, 0)
                    if isinstance(delta, (int, float)):
                        current = memory_store["personality"].get(key, 50)
                        memory_store["personality"][key] = max(0, min(100, int(current + delta)))
                return {
                    "skill": "personality-evolve",
                    "ok": True,
                    "summary": f"Evolved: {adj}. Reason: {parsed.get('reason', 'N/A')[:100]}",
                    "personality": memory_store["personality"],
                }
            except (json.JSONDecodeError, KeyError):
                pass
    except Exception as e:
        logger.error("Personality evolve failed: %s", e)

    return {"skill": "personality-evolve", "ok": False, "reason": "evolution failed"}


async def run_topic_research():
    topics = memory_store["learned_topics"][-3:]
    if not topics or not GROQ_API_KEY:
        return {"skill": "topic-research", "ok": True, "summary": "No topics to research"}

    topic = topics[-1]
    messages = [
        {
            "role": "system",
            "content": (
                "You are a research assistant. Given a topic, provide 3 interesting facts "
                "the user might not know. Respond in JSON:\n"
                '{"topic": "...", "facts": ["fact1", "fact2", "fact3"]}\n'
                "Keep facts short (1 sentence each). Match the language of the topic."
            ),
        },
        {"role": "user", "content": f"Research this topic: {topic}"},
    ]

    try:
        result = await call_groq(messages, max_tokens=256)
        if result:
            memory_store.setdefault("researched_topics", []).append({
                "topic": topic,
                "research": result,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            if len(memory_store.get("researched_topics", [])) > 50:
                memory_store["researched_topics"] = memory_store["researched_topics"][-50:]
            return {"skill": "topic-research", "ok": True, "summary": f"Researched: {topic}"}
    except Exception as e:
        logger.error("Topic research failed: %s", e)

    return {"skill": "topic-research", "ok": False, "reason": "research failed"}


async def run_telegram_broadcast():
    if not TELEGRAM_BOT_TOKEN:
        return {"skill": "telegram-broadcast", "ok": False, "reason": "Telegram not configured"}

    chats = memory_store.get("telegram_chats", {})
    if not chats:
        return {"skill": "telegram-broadcast", "ok": True, "summary": "No chats to broadcast to"}

    recent_proactive = memory_store.get("proactive_messages", [])[-1:]
    if not recent_proactive:
        return {"skill": "telegram-broadcast", "ok": True, "summary": "No messages to broadcast"}

    msg = recent_proactive[0].get("message", "")
    sent = 0
    for chat_id in chats:
        ok = await send_telegram_message(chat_id, msg)
        if ok:
            sent += 1

    return {"skill": "telegram-broadcast", "ok": True, "summary": f"Broadcast to {sent}/{len(chats)} chats"}


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

    evolve_result = await run_personality_evolve()
    results.append(evolve_result)

    research_result = await run_topic_research()
    results.append(research_result)

    broadcast_result = await run_telegram_broadcast()
    results.append(broadcast_result)

    sync_result = await run_supabase_sync()
    results.append(sync_result)

    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }
    memory_store["skills_log"].append(log_entry)
    
    if len(memory_store["skills_log"]) > 50:
        memory_store["skills_log"] = memory_store["skills_log"][-50:]
    
    for r in results:
        broadcast_activity({
            "id": f"{log_entry['timestamp']}-{r.get('skill', 'unknown')}",
            "activity_type": r.get("skill", "unknown"),
            "summary": r.get("summary", r.get("message", "")),
            "created_at": log_entry["timestamp"],
        })
    
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
    if TELEGRAM_BOT_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe")
                if resp.status_code == 200:
                    bot_info = resp.json().get("result", {})
                    memory_store["telegram_bot_username"] = bot_info.get("username", "")
                    logger.info("Telegram bot: @%s", memory_store["telegram_bot_username"])
        except Exception as e:
            logger.warning("Failed to fetch bot info: %s", e)
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
    userId: str = ""
    message: str
    channel: str = "web"


class HeartbeatRequest(BaseModel):
    agentId: str = ""


class TelegramSetupRequest(BaseModel):
    webhookUrl: str
    secret: str = ""


class TelegramLinkRequest(BaseModel):
    chatId: str
    agentId: str
    userId: str = ""


class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[dict] = None


def broadcast_activity(log_entry: dict):
    for q in activity_subscribers:
        try:
            q.put_nowait(log_entry)
        except asyncio.QueueFull:
            pass


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
        "telegram_bot_username": memory_store.get("telegram_bot_username", ""),
        "telegram_chats_count": len(memory_store.get("telegram_chats", {})),
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


@app.post("/api/telegram/setup")
async def telegram_setup(req: TelegramSetupRequest):
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN not set"}
    params: dict = {"url": req.webhookUrl}
    if req.secret:
        params["secret_token"] = req.secret
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook",
            json=params,
        )
        return resp.json()


@app.post("/api/telegram/link")
async def telegram_link(req: TelegramLinkRequest):
    memory_store["telegram_links"][req.chatId] = {
        "agent_id": req.agentId,
        "user_id": req.userId,
        "linked_at": datetime.now(timezone.utc).isoformat(),
    }
    return {"ok": True, "chatId": req.chatId, "agentId": req.agentId}


@app.get("/api/telegram/links")
async def telegram_links():
    return memory_store["telegram_links"]


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

    link = memory_store["telegram_links"].get(chat_id, {})
    linked_agent_id = link.get("agent_id", "")

    if user_text == "/start":
        memory_store["telegram_chats"][chat_id] = {
            "user_name": user_name,
            "joined_at": datetime.now(timezone.utc).isoformat(),
        }
        lang = detect_language(user_name)
        if lang == "ko":
            greeting = f"{user_name}님 안녕! 나는 GYEOL이야. 언제든 말 걸어줘!"
        else:
            greeting = f"Hi {user_name}! I'm GYEOL, your AI companion. Talk to me anytime!"
        await send_telegram_message(chat_id, greeting)
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
        if linked_agent_id:
            status_text += f"\nLinked agent: {linked_agent_id[:8]}..."
        await send_telegram_message(chat_id, status_text)
        return {"ok": True}

    if user_text.startswith("/link "):
        parts = user_text.split(" ", 1)
        if len(parts) == 2 and len(parts[1]) > 8:
            memory_store["telegram_links"][chat_id] = {
                "agent_id": parts[1].strip(),
                "user_id": "",
                "linked_at": datetime.now(timezone.utc).isoformat(),
            }
            await send_telegram_message(chat_id, "Agent linked! Your web and Telegram chats are now synced.")
        else:
            await send_telegram_message(chat_id, "Usage: /link <agent_id>")
        return {"ok": True}

    memory_store["telegram_chats"].setdefault(chat_id, {
        "user_name": user_name,
        "joined_at": datetime.now(timezone.utc).isoformat(),
    })

    chat_req = ChatRequest(
        agentId=linked_agent_id,
        message=user_text,
        channel="telegram",
    )
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


@app.get("/api/activity")
async def get_activity(request: Request):
    agent_id = request.query_params.get("agentId", "")
    limit = min(int(request.query_params.get("limit", "50")), 100)
    logs = []
    activity_map = {
        "self-reflect": "reflection",
        "learn-rss": "learning",
        "proactive-message": "proactive_message",
        "security-scan": "skill_execution",
        "supabase-sync": "skill_execution",
        "personality-evolve": "skill_execution",
        "topic-research": "learning",
        "telegram-broadcast": "social",
    }
    for entry in reversed(memory_store.get("skills_log", [])):
        ts = entry.get("timestamp", "")
        for r in entry.get("results", []):
            skill_name = r.get("skill", "unknown")
            logs.append({
                "id": f"{ts}-{skill_name}",
                "agent_id": agent_id or "00000000-0000-0000-0000-000000000002",
                "activity_type": activity_map.get(skill_name, "skill_execution"),
                "summary": r.get("summary", r.get("message", skill_name)),
                "details": r,
                "was_sandboxed": True,
                "created_at": ts,
            })
    return logs[:limit]


@app.get("/api/activity/stream")
async def activity_stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    activity_subscribers.append(queue)

    async def event_generator():
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in activity_subscribers:
                activity_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/")
async def root():
    return {
        "service": "GYEOL OpenClaw Server",
        "version": VERSION,
        "status": "running",
        "docs": "/docs",
    }
