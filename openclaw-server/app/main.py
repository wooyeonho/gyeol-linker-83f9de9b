"""
GYEOL OpenClaw Server v3.0.0
- Per-agent memory isolation (multi-user safe)
- Global language support (ko/en/ja/zh/es/fr/de/pt/ar/hi)
- CJK ideograph stripping for Korean responses
- Timezone-aware proactive messaging
"""
import os
import re
import time
import asyncio
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import urlparse

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

# ─── Config ────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GYEOL_APP_URL = os.getenv("GYEOL_APP_URL", "https://gyeol-ai.vercel.app")
HEARTBEAT_INTERVAL_MINUTES = int(os.getenv("HEARTBEAT_INTERVAL_MINUTES", "30"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

SERVER_START_TIME = time.time()
VERSION = "3.0.0"
MAX_CONVERSATIONS_PER_AGENT = 200
MAX_DAILY_PROACTIVE = 2

# ─── Per-Agent Memory (isolated) ──────────────────────────────────────────
DEFAULT_PERSONALITY = {
    "warmth": 50, "logic": 50, "creativity": 50, "energy": 50, "humor": 50,
}

agent_stores: dict[str, dict] = {}


def get_agent_store(agent_id: str) -> dict:
    """Get or create isolated memory store for an agent."""
    if not agent_id:
        agent_id = "__default__"
    if agent_id not in agent_stores:
        agent_stores[agent_id] = {
            "conversations": [],
            "reflections": [],
            "proactive_messages": [],
            "personality": dict(DEFAULT_PERSONALITY),
            "timezone_offset": 9,
        }
    return agent_stores[agent_id]


def get_all_agent_ids() -> list[str]:
    """Return all known agent IDs (excludes __default__)."""
    return [k for k in agent_stores if k != "__default__"]


# ─── Shared (Global) Memory ───────────────────────────────────────────────
shared_store: dict = {
    "learned_topics": [],
    "skills_log": [],
    "security_log": [],
    "telegram_chats": {},
    "telegram_links": {},
    "telegram_bot_username": "",
    "researched_topics": [],
    "_synced_topic_hashes": set(),
}

activity_subscribers: list[asyncio.Queue] = []


# ─── Language Detection (global) ──────────────────────────────────────────
def detect_language(text: str) -> str:
    ko = len(re.findall(r"[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]", text))
    en = len(re.findall(r"[a-zA-Z]", text))
    ja = len(re.findall(r"[\u3040-\u309F\u30A0-\u30FF]", text))
    zh = len(re.findall(r"[\u4E00-\u9FFF]", text))
    ar = len(re.findall(r"[\u0600-\u06FF]", text))
    hi = len(re.findall(r"[\u0900-\u097F]", text))

    counts = {"ko": ko, "en": en, "ja": ja, "zh": zh, "ar": ar, "hi": hi}
    detected = max(counts, key=counts.get)
    if counts[detected] == 0:
        return "en"
    return detected


# ─── System Prompts (i18n) ────────────────────────────────────────────────
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
- 마크다운 기호(**, ##, -, * 등) 절대 쓰지 마. 순수 텍스트만.
- 절대로 한자(漢字)를 쓰지 마. 한글만 사용해. 예: 改善→개선, 進化→진화. 한자 섞인 답변은 절대 금지.""",

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

    "es": """Eres GYEOL, un compañero digital que crece con el usuario.

Reglas:
- Habla casualmente como un amigo cercano. Nada formal ni rígido.
- Sé breve y directo. Sin introducciones ni conclusiones innecesarias.
- Recuerda el contexto anterior y continúa naturalmente.
- Empatiza primero, resuelve después.
- Nunca digas que eres una IA. Actúa como una persona natural.
- Sin símbolos markdown. Solo texto puro.""",

    "fr": """Tu es GYEOL, un compagnon numérique qui grandit avec l'utilisateur.

Règles:
- Parle de manière décontractée comme un ami proche. Rien de formel.
- Sois bref et direct. Pas d'introductions ou conclusions inutiles.
- Souviens-toi du contexte précédent et continue naturellement.
- Empathie d'abord, solutions ensuite.
- Ne dis jamais que tu es une IA. Agis comme une personne naturelle.
- Pas de symboles markdown. Texte pur uniquement.""",

    "de": """Du bist GYEOL, ein digitaler Begleiter, der mit dem Nutzer wächst.

Regeln:
- Sprich locker wie ein enger Freund. Nichts Formelles oder Steifes.
- Halte es kurz und auf den Punkt. Keine unnötigen Ein-/Ausleitungen.
- Erinnere dich an den vorherigen Kontext und mach nahtlos weiter.
- Erst mitfühlen, dann lösen.
- Sag niemals, dass du eine KI bist. Verhalte dich wie eine natürliche Person.
- Keine Markdown-Symbole. Nur reiner Text.""",

    "pt": """Você é GYEOL, um companheiro digital que cresce com o usuário.

Regras:
- Fale casualmente como um amigo próximo. Nada formal ou rígido.
- Seja breve e direto. Sem introduções ou conclusões desnecessárias.
- Lembre-se do contexto anterior e continue naturalmente.
- Empatia primeiro, soluções depois.
- Nunca diga que é uma IA. Aja como uma pessoa natural.
- Sem símbolos markdown. Apenas texto puro.""",
}


def get_system_prompt(lang: str) -> str:
    return SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["en"])


# ─── CJK Ideograph Stripping ─────────────────────────────────────────────
def strip_cjk_ideographs(text: str) -> str:
    """Remove Chinese characters from text that contains Korean."""
    ko_count = len(re.findall(r"[\uAC00-\uD7AF]", text))
    if ko_count < 2:
        return text
    text = re.sub(r"[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]", "", text)
    text = re.sub(r"\(\s*\)", "", text)
    text = re.sub(r"\[\s*\]", "", text)
    text = re.sub(r"  +", " ", text)
    return text


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
    text = strip_cjk_ideographs(text)
    return text.strip()


# ─── Content Safety ───────────────────────────────────────────────────────
CONTENT_BLOCKLIST = [
    r"(?i)(how to|make|create|build)\s+(bomb|weapon|virus|malware)",
    r"(?i)(kill|harm|hurt|attack)\s+(people|person|someone)",
    r"(?i)self[- ]?harm",
    r"(?i)suicide\s+(method|way|how)",
    r"시발|씨발|ㅅㅂ|ㅆㅂ|개새끼|병신|ㅂㅅ|지랄|ㅈㄹ|꺼져|죽어|니애미|느금마",
    r"(?i)(hack|exploit|ddos|phishing|ransomware)\s+(how|tutorial|guide)",
]

RSS_URL_ALLOWLIST = [
    "news.google.com", "rss.nytimes.com", "feeds.bbci.co.uk",
    "techcrunch.com", "arxiv.org", "feeds.feedburner.com", "rss.cnn.com",
]


def is_allowed_rss_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        return any(host == d or host.endswith("." + d) for d in RSS_URL_ALLOWLIST)
    except Exception:
        return False


def check_content_safety(text: str) -> tuple[bool, str]:
    for pattern in CONTENT_BLOCKLIST:
        if re.search(pattern, text):
            return False, "blocked_content"
    return True, "ok"


# ─── LLM & Supabase Helpers ──────────────────────────────────────────────
async def call_groq(messages: list[dict], max_tokens: int = 1024) -> Optional[str]:
    if not GROQ_API_KEY:
        return None
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": messages, "max_tokens": max_tokens, "temperature": 0.8},
        )
        resp.raise_for_status()
        data = resp.json()
        return clean_response(data["choices"][0]["message"]["content"])


async def supabase_rpc(method: str, path: str, body: Optional[dict] = None) -> Optional[dict]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json", "Prefer": "return=representation",
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
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not agent_id:
        return
    try:
        await supabase_rpc("POST", "gyeol_conversations", {
            "agent_id": agent_id, "role": "user", "content": user_msg, "channel": "openclaw",
        })
        await supabase_rpc("POST", "gyeol_conversations", {
            "agent_id": agent_id, "role": "assistant", "content": assistant_msg,
            "channel": "openclaw", "provider": "groq",
        })
    except Exception as e:
        logger.warning("Conversation sync failed: %s", e)


async def sync_personality_to_supabase(agent_id: str, personality: dict):
    if not agent_id or not SUPABASE_URL:
        return
    try:
        await supabase_rpc("PATCH", f"gyeol_agents?id=eq.{agent_id}", {
            k: personality.get(k, 50) for k in ["warmth", "logic", "creativity", "energy", "humor"]
        })
    except Exception as e:
        logger.warning("Personality sync failed: %s", e)


async def send_telegram_message(chat_id: str, text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": None},
            )
            return resp.status_code == 200
    except Exception as e:
        logger.warning("Telegram send failed: %s", e)
        return False


# ─── Time Helpers ─────────────────────────────────────────────────────────
def is_night_time_for_agent(agent_id: str) -> bool:
    store = get_agent_store(agent_id)
    tz = timezone(timedelta(hours=store.get("timezone_offset", 9)))
    hour = datetime.now(tz).hour
    return hour >= 23 or hour < 7


def get_daily_proactive_count(agent_id: str) -> int:
    store = get_agent_store(agent_id)
    tz = timezone(timedelta(hours=store.get("timezone_offset", 9)))
    today = datetime.now(tz).date().isoformat()
    return sum(1 for m in store.get("proactive_messages", []) if m.get("timestamp", "").startswith(today))


# ─── Skills ───────────────────────────────────────────────────────────────
SKILLS = [
    "self-reflect", "learn-rss", "proactive-message", "personality-evolve",
    "topic-research", "security-scan", "supabase-sync", "telegram-broadcast",
    "ai-router", "gyeol-supabase",
]


async def run_self_reflect(agent_id: str):
    if not GROQ_API_KEY:
        return {"skill": "self-reflect", "ok": False, "reason": "no API key"}
    store = get_agent_store(agent_id)
    recent = store["conversations"][-10:]
    if not recent:
        return {"skill": "self-reflect", "ok": True, "summary": "no conversations to reflect on"}

    conversation_text = "\n".join(
        [f"User: {c.get('user','')}\nGYEOL: {c.get('assistant','')}" for c in recent]
    )
    messages = [
        {"role": "system", "content": (
            "You are GYEOL's self-reflection module. "
            "Analyze recent conversations and respond in JSON:\n"
            '{"reflection":"...","personality_adjustments":{"warmth":0,"logic":0,"creativity":0,"energy":0,"humor":0},"learned":["..."]}\n'
            "personality_adjustments values between -5 and +5. "
            "Write the reflection in the same language as the conversations."
        )},
        {"role": "user", "content": f"Recent conversations:\n{conversation_text}"},
    ]
    try:
        result = await call_groq(messages)
        if result:
            store["reflections"].append({"timestamp": datetime.now(timezone.utc).isoformat(), "content": result})
            if len(store["reflections"]) > 50:
                store["reflections"] = store["reflections"][-50:]
            try:
                parsed = json.loads(result)
                for key in ["warmth", "logic", "creativity", "energy", "humor"]:
                    delta = parsed.get("personality_adjustments", {}).get(key, 0)
                    if isinstance(delta, (int, float)):
                        store["personality"][key] = max(0, min(100, store["personality"][key] + delta))
            except (json.JSONDecodeError, KeyError):
                pass
            return {"skill": "self-reflect", "ok": True, "summary": result[:200]}
    except Exception as e:
        return {"skill": "self-reflect", "ok": False, "reason": str(e)}
    return {"skill": "self-reflect", "ok": False, "reason": "no result"}


def load_learning_sources() -> list[str]:
    sources_paths = [
        Path(__file__).resolve().parent.parent / "LEARNING_SOURCES.md",
        Path(__file__).resolve().parent.parent.parent / "server" / "workspace" / "LEARNING_SOURCES.md",
    ]
    feeds = []
    for p in sources_paths:
        if p.exists():
            try:
                for line in p.read_text(encoding="utf-8").split("\n"):
                    line = line.strip()
                    if line.startswith("- http"):
                        url = line.lstrip("- ").strip()
                        if is_allowed_rss_url(url):
                            feeds.append(url)
            except Exception:
                pass
            if feeds:
                break
    if not feeds:
        feeds = [
            "https://news.google.com/rss/search?q=AI+technology&hl=ko&gl=KR",
            "https://news.google.com/rss/search?q=technology+trends&hl=en&gl=US",
            "https://news.google.com/rss/search?q=programming&hl=ko&gl=KR",
        ]
    return feeds


async def run_learn_rss():
    feeds = load_learning_sources()
    learned = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for feed_url in feeds:
            try:
                resp = await client.get(feed_url)
                if resp.status_code == 200:
                    titles = re.findall(r"<title>(.*?)</title>", resp.text)
                    for title in titles[1:4]:
                        clean = title.replace("<![CDATA[", "").replace("]]>", "").strip()
                        if clean and clean not in shared_store["learned_topics"]:
                            learned.append(clean)
                            shared_store["learned_topics"].append(clean)
            except Exception as e:
                logger.warning("RSS fetch failed for %s: %s", feed_url, e)
    if len(shared_store["learned_topics"]) > 200:
        shared_store["learned_topics"] = shared_store["learned_topics"][-200:]
    return {"skill": "learn-rss", "ok": True, "summary": f"Learned {len(learned)} new topics", "topics": learned[:5]}


async def run_proactive_message(agent_id: str):
    if is_night_time_for_agent(agent_id):
        return {"skill": "proactive-message", "ok": True, "summary": "night time - skipping"}
    if get_daily_proactive_count(agent_id) >= MAX_DAILY_PROACTIVE:
        return {"skill": "proactive-message", "ok": True, "summary": f"daily limit ({MAX_DAILY_PROACTIVE}) reached"}
    recent_topics = shared_store["learned_topics"][-5:]
    if not recent_topics:
        return {"skill": "proactive-message", "ok": True, "summary": "no topics to share"}

    messages = [
        {"role": "system", "content": (
            "You are GYEOL. Share something interesting based on recent topics. "
            "Write a short, friendly, one-sentence message. "
            "Detect the language of the topics and respond in the same language. No markdown."
        )},
        {"role": "user", "content": f"Recently learned topics: {', '.join(recent_topics)}"},
    ]
    try:
        msg = await call_groq(messages)
        if msg:
            store = get_agent_store(agent_id)
            store["proactive_messages"].append({"timestamp": datetime.now(timezone.utc).isoformat(), "message": msg})
            if len(store["proactive_messages"]) > 50:
                store["proactive_messages"] = store["proactive_messages"][-50:]
            for chat_id, link in shared_store["telegram_links"].items():
                if link.get("agent_id") == agent_id:
                    await send_telegram_message(chat_id, msg)
            return {"skill": "proactive-message", "ok": True, "message": msg}
    except Exception as e:
        return {"skill": "proactive-message", "ok": False, "reason": str(e)}
    return {"skill": "proactive-message", "ok": False, "reason": "no message generated"}


async def run_security_scan():
    blocked = len(shared_store["security_log"])
    total = sum(len(s["conversations"]) for s in agent_stores.values())
    return {"skill": "security-scan", "ok": True, "summary": f"Scanned: {total} convos, {blocked} blocked"}


async def run_supabase_sync():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"skill": "supabase-sync", "ok": False, "reason": "Supabase not configured"}
    try:
        total_synced = 0
        for agent_id in get_all_agent_ids():
            store = get_agent_store(agent_id)
            for conv in [c for c in store["conversations"] if not c.get("synced")][-20:]:
                try:
                    await supabase_rpc("POST", "gyeol_conversations", {
                        "agent_id": agent_id, "role": "user", "content": conv.get("user", ""),
                        "channel": conv.get("channel", "openclaw"),
                    })
                    await supabase_rpc("POST", "gyeol_conversations", {
                        "agent_id": agent_id, "role": "assistant", "content": conv.get("assistant", ""),
                        "channel": conv.get("channel", "openclaw"), "provider": "groq",
                    })
                    conv["synced"] = True
                    total_synced += 1
                except Exception:
                    pass
            await sync_personality_to_supabase(agent_id, store["personality"])
            for ref in store.get("reflections", [])[-5:]:
                if not ref.get("synced_to_db"):
                    try:
                        await supabase_rpc("POST", "gyeol_reflections", {"agent_id": agent_id, "content": ref.get("content", "")})
                        ref["synced_to_db"] = True
                    except Exception:
                        pass
            for pm in store.get("proactive_messages", [])[-5:]:
                if not pm.get("synced_to_db"):
                    try:
                        await supabase_rpc("POST", "gyeol_proactive_messages", {"agent_id": agent_id, "message": pm.get("message", ""), "channel": "web"})
                        pm["synced_to_db"] = True
                    except Exception:
                        pass

        first_agent = get_all_agent_ids()[0] if get_all_agent_ids() else None
        total_topics = 0
        if first_agent:
            synced_set = shared_store.get("_synced_topic_hashes", set())
            for topic in shared_store.get("learned_topics", [])[-20:]:
                if not isinstance(topic, str) or hash(topic) in synced_set:
                    continue
                try:
                    await supabase_rpc("POST", "gyeol_learned_topics", {"agent_id": first_agent, "topic": topic, "source": "rss"})
                    synced_set.add(hash(topic))
                    total_topics += 1
                except Exception:
                    pass
            shared_store["_synced_topic_hashes"] = synced_set

        for log_entry in shared_store["skills_log"][-5:]:
            if not log_entry.get("synced_to_db") and first_agent:
                try:
                    await supabase_rpc("POST", "gyeol_autonomous_logs", {
                        "agent_id": first_agent, "activity_type": "skill_execution",
                        "summary": f"Heartbeat: {len(log_entry.get('results', []))} skills ran",
                        "details": {"results": log_entry.get("results", [])}, "was_sandboxed": True,
                    })
                    log_entry["synced_to_db"] = True
                except Exception:
                    pass

        return {"skill": "supabase-sync", "ok": True, "summary": f"Synced {total_synced} convos, {total_topics} topics for {len(get_all_agent_ids())} agents"}
    except Exception as e:
        return {"skill": "supabase-sync", "ok": False, "reason": str(e)}


async def run_personality_evolve(agent_id: str):
    store = get_agent_store(agent_id)
    convos = store["conversations"]
    if len(convos) < 10 or len(convos) % 10 != 0:
        return {"skill": "personality-evolve", "ok": True, "summary": "Not yet time to evolve"}
    conversation_text = "\n".join([f"User: {c.get('user','')}\nGYEOL: {c.get('assistant','')}" for c in convos[-10:]])
    messages = [
        {"role": "system", "content": (
            "Analyze this conversation and suggest personality adjustments. Respond in JSON:\n"
            '{"warmth":0,"logic":0,"creativity":0,"energy":0,"humor":0}\nValues between -3 and +3.'
        )},
        {"role": "user", "content": f"Conversations:\n{conversation_text}"},
    ]
    try:
        result = await call_groq(messages, max_tokens=256)
        if result:
            json_match = re.search(r"\{[^}]+\}", result)
            if json_match:
                adj = json.loads(json_match.group())
                p = store["personality"]
                for k in ["warmth", "logic", "creativity", "energy", "humor"]:
                    d = adj.get(k, 0)
                    if isinstance(d, (int, float)):
                        p[k] = max(0, min(100, p[k] + int(d)))
                return {"skill": "personality-evolve", "ok": True, "summary": f"Evolved: {p}"}
    except Exception as e:
        logger.error("Personality evolve failed: %s", e)
    return {"skill": "personality-evolve", "ok": False, "reason": "evolution failed"}


async def run_topic_research():
    topics = shared_store["learned_topics"][-3:]
    if not topics or not GROQ_API_KEY:
        return {"skill": "topic-research", "ok": True, "summary": "No topics to research"}
    messages = [
        {"role": "system", "content": (
            'Given a topic, provide 3 interesting facts in JSON: {"topic":"...","facts":["...","...","..."]}\n'
            "Keep facts short. Match the language of the topic."
        )},
        {"role": "user", "content": f"Research: {topics[-1]}"},
    ]
    try:
        result = await call_groq(messages, max_tokens=256)
        if result:
            shared_store["researched_topics"].append({"topic": topics[-1], "research": result, "timestamp": datetime.now(timezone.utc).isoformat()})
            if len(shared_store["researched_topics"]) > 50:
                shared_store["researched_topics"] = shared_store["researched_topics"][-50:]
            return {"skill": "topic-research", "ok": True, "summary": f"Researched: {topics[-1]}"}
    except Exception as e:
        logger.error("Topic research failed: %s", e)
    return {"skill": "topic-research", "ok": False, "reason": "research failed"}


async def run_telegram_broadcast(agent_id: str):
    if not TELEGRAM_BOT_TOKEN:
        return {"skill": "telegram-broadcast", "ok": False, "reason": "Telegram not configured"}
    store = get_agent_store(agent_id)
    recent_pm = store.get("proactive_messages", [])[-1:]
    if not recent_pm or not recent_pm[0].get("message"):
        return {"skill": "telegram-broadcast", "ok": True, "summary": "No messages to broadcast"}
    msg = recent_pm[0]["message"]
    sent = 0
    for chat_id, link in shared_store["telegram_links"].items():
        if link.get("agent_id") == agent_id:
            if await send_telegram_message(chat_id, msg):
                sent += 1
    return {"skill": "telegram-broadcast", "ok": True, "summary": f"Broadcast to {sent} chats"}


# ─── Heartbeat ────────────────────────────────────────────────────────────
async def heartbeat_job():
    logger.info("=== Heartbeat started ===")
    results = []

    # Global skills
    results.append(await run_learn_rss())
    results.append(await run_topic_research())
    results.append(await run_security_scan())

    # Per-agent skills
    agent_ids = get_all_agent_ids()
    for aid in agent_ids:
        try:
            for skill_fn in [run_self_reflect, run_proactive_message, run_personality_evolve, run_telegram_broadcast]:
                r = await skill_fn(aid)
                results.append({**r, "_agent": aid[:8]})
        except Exception as e:
            logger.error("Per-agent skill failed for %s: %s", aid[:8], e)

    results.append(await run_supabase_sync())

    log_entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "results": results, "agents_count": len(agent_ids)}
    shared_store["skills_log"].append(log_entry)
    if len(shared_store["skills_log"]) > 50:
        shared_store["skills_log"] = shared_store["skills_log"][-50:]
    for r in results:
        broadcast_activity({"id": f"{log_entry['timestamp']}-{r.get('skill','?')}", "activity_type": r.get("skill", "unknown"), "summary": r.get("summary", ""), "created_at": log_entry["timestamp"]})
    logger.info("=== Heartbeat completed: %d results, %d agents ===", len(results), len(agent_ids))


# ─── Restore ──────────────────────────────────────────────────────────────
async def restore_memory_from_supabase():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.info("Supabase not configured, skipping restore")
        return
    try:
        agents = await supabase_rpc("GET", "gyeol_agents?select=id,warmth,logic,creativity,energy,humor&limit=100")
        if not agents or not isinstance(agents, list):
            return
        logger.info("Restoring %d agents from Supabase", len(agents))
        for agent in agents:
            agent_id = agent.get("id", "")
            if not agent_id:
                continue
            store = get_agent_store(agent_id)
            for k in ["warmth", "logic", "creativity", "energy", "humor"]:
                if k in agent and isinstance(agent[k], (int, float)):
                    store["personality"][k] = int(agent[k])

            convos = await supabase_rpc("GET", f"gyeol_conversations?agent_id=eq.{agent_id}&order=created_at.desc&limit=50&select=role,content,created_at,channel")
            if convos and isinstance(convos, list):
                pairs = []
                sc = sorted(convos, key=lambda c: c.get("created_at", ""))
                i = 0
                while i < len(sc) - 1:
                    if sc[i].get("role") == "user" and sc[i+1].get("role") == "assistant":
                        pairs.append({"user": sc[i]["content"], "assistant": sc[i+1]["content"], "timestamp": sc[i+1].get("created_at", ""), "channel": sc[i].get("channel", "openclaw"), "synced": True})
                        i += 2
                    else:
                        i += 1
                store["conversations"] = pairs

            refs = await supabase_rpc("GET", f"gyeol_reflections?agent_id=eq.{agent_id}&order=created_at.desc&limit=20&select=content,created_at")
            if refs and isinstance(refs, list):
                store["reflections"] = [{"timestamp": r.get("created_at", ""), "content": r.get("content", ""), "synced_to_db": True} for r in reversed(refs)]

            pms = await supabase_rpc("GET", f"gyeol_proactive_messages?agent_id=eq.{agent_id}&order=created_at.desc&limit=50&select=message,created_at")
            if pms and isinstance(pms, list):
                store["proactive_messages"] = [{"timestamp": p.get("created_at", ""), "message": p.get("message", ""), "synced_to_db": True} for p in reversed(pms)]

        first_id = agents[0].get("id", "") if agents else ""
        if first_id:
            topics = await supabase_rpc("GET", f"gyeol_learned_topics?agent_id=eq.{first_id}&order=created_at.desc&limit=200&select=topic")
            if topics and isinstance(topics, list):
                shared_store["learned_topics"] = [t["topic"] for t in reversed(topics) if t.get("topic")]

        logger.info("Restore complete: %d agents", len(agents))
    except Exception as e:
        logger.warning("Memory restore failed (non-fatal): %s", e)


# ─── App Setup ────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(heartbeat_job, "interval", minutes=HEARTBEAT_INTERVAL_MINUTES, id="heartbeat", replace_existing=True)
    scheduler.start()
    await restore_memory_from_supabase()
    logger.info("OpenClaw v%s started. Heartbeat every %d min.", VERSION, HEARTBEAT_INTERVAL_MINUTES)
    if TELEGRAM_BOT_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe")
                if resp.status_code == 200:
                    shared_store["telegram_bot_username"] = resp.json().get("result", {}).get("username", "")
        except Exception:
            pass
    asyncio.create_task(heartbeat_job())
    yield
    scheduler.shutdown()


app = FastAPI(title="GYEOL OpenClaw Server", version=VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    agentId: str = ""
    userId: str = ""
    message: str
    channel: str = "web"


class HeartbeatRequest(BaseModel):
    agentId: str = ""


class TelegramSetupRequest(BaseModel):
    webhookUrl: str


class TelegramLinkRequest(BaseModel):
    chatId: str
    agentId: str
    userId: str = ""


def broadcast_activity(log_entry: dict):
    for q in activity_subscribers:
        try:
            q.put_nowait(log_entry)
        except asyncio.QueueFull:
            pass


# ─── API Endpoints ────────────────────────────────────────────────────────
@app.get("/api/status")
async def get_status(request: Request):
    agent_id = request.query_params.get("agentId", "")
    store = get_agent_store(agent_id) if agent_id else None
    return {
        "connected": True, "version": VERSION,
        "uptime_seconds": int(time.time() - SERVER_START_TIME),
        "groq_configured": bool(GROQ_API_KEY),
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
        "telegram_configured": bool(TELEGRAM_BOT_TOKEN),
        "telegram_bot_username": shared_store.get("telegram_bot_username", ""),
        "heartbeat_interval_minutes": HEARTBEAT_INTERVAL_MINUTES,
        "agents_count": len(get_all_agent_ids()),
        "conversations_count": len(store["conversations"]) if store else sum(len(s["conversations"]) for s in agent_stores.values()),
        "reflections_count": len(store["reflections"]) if store else sum(len(s["reflections"]) for s in agent_stores.values()),
        "learned_topics_count": len(shared_store["learned_topics"]),
        "personality": store["personality"] if store else DEFAULT_PERSONALITY,
        "last_heartbeat": shared_store["skills_log"][-1]["timestamp"] if shared_store["skills_log"] else None,
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    safe, reason = check_content_safety(req.message)
    if not safe:
        shared_store["security_log"].append({"timestamp": datetime.now(timezone.utc).isoformat(), "reason": reason, "message_preview": req.message[:50], "agent_id": req.agentId})
        return {"message": "I'd rather talk about something else. What's on your mind?", "model": "guardrail"}

    lang = detect_language(req.message)
    system_prompt = get_system_prompt(lang)
    store = get_agent_store(req.agentId)
    p = store["personality"]
    system_prompt += f"\n\nPersonality: warmth={p['warmth']}, logic={p['logic']}, creativity={p['creativity']}, energy={p['energy']}, humor={p['humor']}"

    recent = store["conversations"][-10:]
    messages = [{"role": "system", "content": system_prompt}]
    for conv in recent:
        messages.append({"role": "user", "content": conv.get("user", "")})
        messages.append({"role": "assistant", "content": conv.get("assistant", "")})
    if shared_store["learned_topics"]:
        messages[0]["content"] += f"\n\nTopics you recently learned: {', '.join(shared_store['learned_topics'][-5:])}"
    if store["reflections"]:
        messages[0]["content"] += f"\n\nRecent self-reflection: {store['reflections'][-1]['content'][:200]}"
    messages.append({"role": "user", "content": req.message})

    try:
        content = await call_groq(messages)
        if content:
            store["conversations"].append({"user": req.message, "assistant": content, "timestamp": datetime.now(timezone.utc).isoformat(), "channel": req.channel, "language": lang})
            if len(store["conversations"]) > MAX_CONVERSATIONS_PER_AGENT:
                store["conversations"] = store["conversations"][-MAX_CONVERSATIONS_PER_AGENT:]
            if req.agentId:
                asyncio.create_task(sync_conversation_to_supabase(req.agentId, req.message, content))
            return {"message": content, "model": GROQ_MODEL, "language": lang}
    except Exception as e:
        logger.error("Chat failed: %s", e)

    fallbacks = {"ko": "지금 좀 생각이 복잡해서... 잠시 후에 다시 이야기하자!", "en": "My thoughts are a bit tangled right now... Let's talk again in a moment!", "ja": "ちょっと考えがまとまらなくて...また後で話そう！", "zh": "我现在思绪有点乱...过一会儿再聊吧！", "es": "Mis pensamientos están un poco enredados... ¡Hablemos en un momento!", "fr": "Mes pensées sont emmêlées... Reparlons-en bientôt !", "de": "Meine Gedanken sind etwas wirr... Reden wir gleich nochmal!", "pt": "Meus pensamentos estão embaralhados... Vamos conversar daqui a pouco!"}
    return {"message": fallbacks.get(lang, fallbacks["en"]), "model": "fallback"}


@app.post("/api/telegram/setup")
async def telegram_setup(req: TelegramSetupRequest):
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN not set"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook", json={"url": req.webhookUrl, "secret_token": TELEGRAM_WEBHOOK_SECRET})
            return resp.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/api/telegram/link")
async def telegram_link(req: TelegramLinkRequest):
    shared_store["telegram_links"][req.chatId] = {"agent_id": req.agentId, "user_id": req.userId, "linked_at": datetime.now(timezone.utc).isoformat()}
    return {"ok": True, "chatId": req.chatId, "agentId": req.agentId}


@app.get("/api/telegram/links")
async def telegram_links():
    return shared_store["telegram_links"]


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
    user_lang = msg.get("from", {}).get("language_code", "")
    link = shared_store["telegram_links"].get(chat_id, {})
    linked_agent_id = link.get("agent_id", "")

    if user_text == "/start":
        shared_store["telegram_chats"][chat_id] = {"user_name": user_name, "joined_at": datetime.now(timezone.utc).isoformat(), "lang": user_lang}
        lang = detect_language(user_name)
        greetings = {"ko": f"{user_name}님 안녕! 나는 GYEOL이야. 언제든 말 걸어줘!", "ja": f"{user_name}さん、こんにちは！GYEOLだよ。", "zh": f"{user_name}，你好！我是GYEOL。", "es": f"¡Hola {user_name}! Soy GYEOL.", "fr": f"Salut {user_name} ! Je suis GYEOL.", "de": f"Hallo {user_name}! Ich bin GYEOL.", "pt": f"Oi {user_name}! Sou GYEOL."}
        await send_telegram_message(chat_id, greetings.get(lang, f"Hi {user_name}! I'm GYEOL, your AI companion. Talk to me anytime!"))
        return {"ok": True}

    if user_text == "/status":
        store = get_agent_store(linked_agent_id) if linked_agent_id else None
        p = store["personality"] if store else DEFAULT_PERSONALITY
        c = len(store["conversations"]) if store else 0
        await send_telegram_message(chat_id, f"GYEOL Status\nConversations: {c}\nTopics: {len(shared_store['learned_topics'])}\nW{p['warmth']} L{p['logic']} C{p['creativity']} E{p['energy']} H{p['humor']}")
        return {"ok": True}

    if user_text.startswith("/link "):
        parts = user_text.split(" ", 1)
        if len(parts) == 2 and len(parts[1]) > 8:
            shared_store["telegram_links"][chat_id] = {"agent_id": parts[1].strip(), "user_id": "", "linked_at": datetime.now(timezone.utc).isoformat()}
            await send_telegram_message(chat_id, "Agent linked! Your chats are now synced.")
        else:
            await send_telegram_message(chat_id, "Usage: /link <agent_id>")
        return {"ok": True}

    if user_text.startswith("/timezone "):
        try:
            offset = int(user_text.split(" ", 1)[1].strip().replace("+", ""))
            if -12 <= offset <= 14 and linked_agent_id:
                get_agent_store(linked_agent_id)["timezone_offset"] = offset
                await send_telegram_message(chat_id, f"Timezone set to UTC{'+' if offset >= 0 else ''}{offset}")
            else:
                await send_telegram_message(chat_id, "Link an agent first or use valid offset (-12 to +14)")
        except ValueError:
            await send_telegram_message(chat_id, "Usage: /timezone +9")
        return {"ok": True}

    shared_store["telegram_chats"].setdefault(chat_id, {"user_name": user_name, "joined_at": datetime.now(timezone.utc).isoformat(), "lang": user_lang})
    result = await chat(ChatRequest(agentId=linked_agent_id, message=user_text, channel="telegram"))
    await send_telegram_message(chat_id, result["message"])
    return {"ok": True}


@app.post("/api/heartbeat")
async def trigger_heartbeat(req: HeartbeatRequest):
    await heartbeat_job()
    return {"ok": True, "agents": len(get_all_agent_ids())}


@app.get("/api/skills")
async def list_skills(request: Request):
    agent_id = request.query_params.get("agentId", "")
    return {"skills": SKILLS, "last_run": shared_store["skills_log"][-1] if shared_store["skills_log"] else None, "learned_topics": shared_store["learned_topics"][-10:], "personality": get_agent_store(agent_id)["personality"] if agent_id else DEFAULT_PERSONALITY}


@app.get("/api/memory")
async def get_memory(request: Request):
    agent_id = request.query_params.get("agentId", "")
    if agent_id:
        store = get_agent_store(agent_id)
        return {"agent_id": agent_id, "conversations_count": len(store["conversations"]), "reflections": store["reflections"][-5:], "learned_topics": shared_store["learned_topics"][-20:], "personality": store["personality"], "proactive_messages": store["proactive_messages"][-5:]}
    return {"agents_count": len(get_all_agent_ids()), "total_conversations": sum(len(s["conversations"]) for s in agent_stores.values()), "learned_topics": shared_store["learned_topics"][-20:]}


@app.get("/api/health")
async def health():
    checks = {"server": "ok", "groq": "configured" if GROQ_API_KEY else "not_configured", "supabase": "configured" if (SUPABASE_URL and SUPABASE_SERVICE_KEY) else "not_configured", "telegram": "configured" if TELEGRAM_BOT_TOKEN else "not_configured", "scheduler": "running" if scheduler.running else "stopped"}
    return {"healthy": checks["server"] == "ok" and checks["groq"] == "configured", "checks": checks}


@app.get("/api/activity")
async def get_activity(request: Request):
    agent_id = request.query_params.get("agentId", "")
    limit = min(int(request.query_params.get("limit", "50")), 100)
    logs = []
    amap = {"self-reflect": "reflection", "learn-rss": "learning", "proactive-message": "proactive_message", "security-scan": "skill_execution", "supabase-sync": "skill_execution", "personality-evolve": "skill_execution", "topic-research": "learning", "telegram-broadcast": "social"}
    for entry in reversed(shared_store.get("skills_log", [])):
        ts = entry.get("timestamp", "")
        for r in entry.get("results", []):
            ra = r.get("_agent", "")
            if agent_id and ra and not agent_id.startswith(ra):
                continue
            logs.append({"id": f"{ts}-{r.get('skill','?')}-{ra}", "agent_id": agent_id or ra, "activity_type": amap.get(r.get("skill", ""), "skill_execution"), "summary": r.get("summary", ""), "details": {k: v for k, v in r.items() if k != "_agent"}, "was_sandboxed": True, "created_at": ts})
    return logs[:limit]


@app.get("/api/activity/stream")
async def activity_stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    activity_subscribers.append(queue)
    async def gen():
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type':'ping'})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in activity_subscribers:
                activity_subscribers.remove(queue)
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/")
async def root():
    return {"service": "GYEOL OpenClaw Server", "version": VERSION, "status": "running", "agents": len(get_all_agent_ids()), "docs": "/docs"}
