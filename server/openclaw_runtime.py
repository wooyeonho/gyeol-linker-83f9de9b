import os
import asyncio
import logging
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

import httpx

logger = logging.getLogger("openclaw")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
AGENT_ID = os.environ.get("GYEOL_AGENT_ID", "")
HEARTBEAT_INTERVAL = int(os.environ.get("OPENCLAW_HEARTBEAT_INTERVAL", "1800"))

KST = timezone(timedelta(hours=9))

_heartbeat_task = None
_last_heartbeat = None
_heartbeat_count = 0
_last_deep_analysis = None


async def _supabase_get(path: str, params: dict | None = None) -> list | dict | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=headers, params=params or {})
        if resp.status_code == 200:
            return resp.json()
    return None


async def _supabase_post(path: str, body: dict | list) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=headers, json=body)
        return resp.status_code < 300


async def _supabase_upsert(path: str, body: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=headers, json=body)
        return resp.status_code < 300


async def _supabase_patch(path: str, params: dict, body: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(f"{SUPABASE_URL}/rest/v1/{path}", headers=headers, params=params, json=body)
        return resp.status_code < 300


async def _groq_chat(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.7,
            },
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Groq error {resp.status_code}: {resp.text[:200]}")
    return resp.json()["choices"][0]["message"]["content"]


async def _log_activity(activity_type: str, summary: str, details: dict | None = None) -> None:
    body = {
        "agent_id": AGENT_ID,
        "activity_type": activity_type,
        "summary": summary,
        "was_sandboxed": True,
        "source": "openclaw",
    }
    if details:
        body["details"] = details
    await _supabase_post("gyeol_autonomous_logs", body)


RSS_FEEDS = [
    ("TechCrunch", "https://feeds.feedburner.com/TechCrunch"),
    ("Hacker News", "https://hnrss.org/frontpage?count=5"),
]


async def _skill_learner() -> str:
    logger.info("[skill:learner] Starting RSS learning")
    topics_saved = 0
    for feed_name, feed_url in RSS_FEEDS:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(feed_url)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.text[:50000])
            items = root.findall(".//item")[:3]
            if not items:
                items = root.findall(".//{http://www.w3.org/2005/Atom}entry")[:3]
            for item in items:
                title_el = item.find("title")
                if title_el is None:
                    title_el = item.find("{http://www.w3.org/2005/Atom}title")
                link_el = item.find("link")
                if link_el is None:
                    link_el = item.find("{http://www.w3.org/2005/Atom}link")
                title = title_el.text if title_el is not None and title_el.text else ""
                link = ""
                if link_el is not None:
                    link = link_el.text or link_el.get("href", "")
                if not title:
                    continue
                try:
                    summary = await _groq_chat(
                        "You are a Korean-speaking AI assistant. Summarize the following article title in 1 Korean sentence. Keep it concise and informative. Output ONLY the summary, nothing else.",
                        f"Article from {feed_name}: {title}",
                        max_tokens=150,
                    )
                except Exception:
                    summary = title
                await _supabase_upsert("gyeol_learned_topics", {
                    "agent_id": AGENT_ID,
                    "topic": title[:100],
                    "summary": summary[:300],
                    "source": "rss",
                    "source_url": link[:500] if link else "",
                })
                topics_saved += 1
        except Exception as e:
            logger.warning(f"[skill:learner] Feed {feed_name} error: {e}")
    await _log_activity("learning", f"RSS 학습 완료: {topics_saved}개 주제", {"source_count": topics_saved})
    return f"learned {topics_saved} topics"


async def _skill_user_memory() -> str:
    logger.info("[skill:user-memory] Starting memory extraction")
    conversations = await _supabase_get("gyeol_conversations", {
        "agent_id": f"eq.{AGENT_ID}",
        "role": "eq.user",
        "order": "created_at.desc",
        "limit": "20",
        "select": "content",
    })
    if not conversations or not isinstance(conversations, list) or len(conversations) == 0:
        return "no conversations to analyze"

    user_msgs = "\n".join([c.get("content", "") for c in conversations if c.get("content")])
    if not user_msgs.strip():
        return "no user messages found"

    try:
        result = await _groq_chat(
            """You extract user information from chat messages. Output ONLY valid JSON array.
Each item: {"category": "identity|preference|interest|relationship|goal|emotion|experience|style|knowledge_level", "key": "short_key", "value": "extracted value in Korean", "confidence": 50-100}
Rules:
- Only extract from USER messages (these are all user messages)
- Max 5 items per analysis
- confidence 90-100 for explicit statements, 50-70 for inferences
- Output ONLY the JSON array, no explanation""",
            f"User messages:\n{user_msgs[:3000]}",
            max_tokens=500,
        )
    except Exception as e:
        logger.warning(f"[skill:user-memory] Groq error: {e}")
        return "groq error"

    try:
        start = result.find("[")
        end = result.rfind("]") + 1
        if start >= 0 and end > start:
            memories = json.loads(result[start:end])
        else:
            return "no valid JSON in response"
    except json.JSONDecodeError:
        return "JSON parse error"

    saved = 0
    for mem in memories[:5]:
        cat = mem.get("category", "")
        key = mem.get("key", "")
        val = mem.get("value", "")
        conf = mem.get("confidence", 50)
        if not cat or not key or not val:
            continue
        await _supabase_upsert("gyeol_user_memories", {
            "agent_id": AGENT_ID,
            "category": cat,
            "key": key,
            "value": val,
            "confidence": min(100, max(0, int(conf))),
        })
        saved += 1

    await _log_activity("learning", f"사용자 기억 {saved}개 추출", {"memories_extracted": saved})
    return f"extracted {saved} memories"


async def _skill_personality_evolve() -> str:
    logger.info("[skill:personality-evolve] Starting deep analysis")
    conversations = await _supabase_get("gyeol_conversations", {
        "agent_id": f"eq.{AGENT_ID}",
        "order": "created_at.desc",
        "limit": "30",
        "select": "role,content",
    })
    if not conversations or not isinstance(conversations, list) or len(conversations) < 5:
        return "not enough conversations for analysis"

    conv_text = "\n".join([f"[{c.get('role','')}]: {c.get('content','')}" for c in reversed(conversations)])

    try:
        result = await _groq_chat(
            """Analyze this conversation and output ONLY valid JSON:
{
  "topics": ["topic1", "topic2"],
  "emotion_arc": "positive|negative|neutral|mixed",
  "underlying_need": "what user really wanted (Korean)",
  "what_worked": "what went well (Korean)",
  "what_to_improve": "what to improve (Korean)",
  "personality_delta": {"warmth": -5 to 5, "logic": -5 to 5, "creativity": -5 to 5, "energy": -5 to 5, "humor": -5 to 5},
  "next_hint": "prediction for next conversation (Korean)"
}
IMPORTANT: personality_delta must NOT be all zeros. Every conversation causes some change.""",
            f"Conversation:\n{conv_text[:4000]}",
            max_tokens=600,
        )
    except Exception as e:
        logger.warning(f"[skill:personality-evolve] Groq error: {e}")
        return "groq error"

    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        if start >= 0 and end > start:
            analysis = json.loads(result[start:end])
        else:
            return "no valid JSON"
    except json.JSONDecodeError:
        return "JSON parse error"

    await _supabase_post("gyeol_conversation_insights", {
        "agent_id": AGENT_ID,
        "topics": analysis.get("topics", []),
        "emotion_arc": analysis.get("emotion_arc", "neutral"),
        "underlying_need": analysis.get("underlying_need", ""),
        "what_worked": analysis.get("what_worked", ""),
        "what_to_improve": analysis.get("what_to_improve", ""),
        "personality_delta": analysis.get("personality_delta", {}),
        "next_hint": analysis.get("next_hint", ""),
    })

    delta = analysis.get("personality_delta", {})
    if any(v != 0 for v in delta.values()):
        agent = await _supabase_get("gyeol_agents", {
            "id": f"eq.{AGENT_ID}",
            "select": "warmth,logic,creativity,energy,humor",
        })
        if agent and isinstance(agent, list) and len(agent) > 0:
            current = agent[0]
            update = {}
            for trait in ["warmth", "logic", "creativity", "energy", "humor"]:
                d = delta.get(trait, 0)
                if isinstance(d, (int, float)):
                    new_val = max(0, min(100, current.get(trait, 50) + int(d)))
                    update[trait] = new_val
            if update:
                await _supabase_patch("gyeol_agents", {"id": f"eq.{AGENT_ID}"}, update)

    await _log_activity("reflection", "대화 심층 분석 + 성격 진화", {"delta": delta, "topics": analysis.get("topics", [])})
    return f"analyzed, delta={delta}"


async def _is_night_kst() -> bool:
    now_kst = datetime.now(KST)
    return now_kst.hour >= 23 or now_kst.hour < 7


async def run_heartbeat_cycle() -> dict:
    global _last_heartbeat, _heartbeat_count, _last_deep_analysis
    results = {}

    if await _is_night_kst():
        results["skipped"] = "night time (KST 23:00-07:00)"
        return results

    try:
        results["user_memory"] = await _skill_user_memory()
    except Exception as e:
        results["user_memory"] = f"error: {e}"
        logger.error(f"[heartbeat] user_memory failed: {e}")

    try:
        results["learner"] = await _skill_learner()
    except Exception as e:
        results["learner"] = f"error: {e}"
        logger.error(f"[heartbeat] learner failed: {e}")

    should_deep = False
    if _last_deep_analysis is None:
        should_deep = True
    else:
        elapsed = (datetime.now(timezone.utc) - _last_deep_analysis).total_seconds()
        if elapsed >= 21600:
            should_deep = True

    if should_deep:
        try:
            results["personality_evolve"] = await _skill_personality_evolve()
            _last_deep_analysis = datetime.now(timezone.utc)
        except Exception as e:
            results["personality_evolve"] = f"error: {e}"
            logger.error(f"[heartbeat] personality_evolve failed: {e}")

    _last_heartbeat = datetime.now(timezone.utc).isoformat()
    _heartbeat_count += 1
    logger.info(f"[heartbeat] Cycle #{_heartbeat_count} complete: {results}")
    return results


async def _heartbeat_loop():
    await asyncio.sleep(10)
    logger.info(f"[openclaw] Heartbeat started (interval={HEARTBEAT_INTERVAL}s)")
    while True:
        try:
            await run_heartbeat_cycle()
        except Exception as e:
            logger.error(f"[heartbeat] Cycle error: {e}")
        await asyncio.sleep(HEARTBEAT_INTERVAL)


def start_heartbeat():
    global _heartbeat_task
    if not AGENT_ID:
        logger.warning("[openclaw] GYEOL_AGENT_ID not set, heartbeat disabled")
        return
    if not GROQ_API_KEY:
        logger.warning("[openclaw] GROQ_API_KEY not set, heartbeat disabled")
        return
    _heartbeat_task = asyncio.create_task(_heartbeat_loop())
    logger.info("[openclaw] Heartbeat task created")


def stop_heartbeat():
    global _heartbeat_task
    if _heartbeat_task:
        _heartbeat_task.cancel()
        _heartbeat_task = None


def get_status() -> dict:
    return {
        "runtime": "openclaw-lite",
        "agent_id": AGENT_ID or "not set",
        "heartbeat_interval": HEARTBEAT_INTERVAL,
        "heartbeat_count": _heartbeat_count,
        "last_heartbeat": _last_heartbeat,
        "last_deep_analysis": _last_deep_analysis.isoformat() if _last_deep_analysis else None,
        "groq_model": GROQ_MODEL,
        "supabase_connected": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
    }
