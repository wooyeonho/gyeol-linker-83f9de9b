"""Tests for GYEOL OpenClaw Server v3.0.0 — per-agent memory isolation"""
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import (
    app, agent_stores, shared_store, get_agent_store, get_all_agent_ids,
    is_allowed_rss_url, load_learning_sources, strip_cjk_ideographs,
    clean_response, check_content_safety, detect_language, DEFAULT_PERSONALITY,
    is_night_time_for_agent, get_daily_proactive_count,
)


@pytest.fixture(autouse=True)
def reset_stores():
    """Reset all stores before each test."""
    agent_stores.clear()
    shared_store["learned_topics"] = []
    shared_store["skills_log"] = []
    shared_store["security_log"] = []
    shared_store["telegram_chats"] = {}
    shared_store["telegram_links"] = {}
    shared_store["researched_topics"] = []
    shared_store["_synced_topic_hashes"] = set()
    yield


@pytest.fixture
def transport():
    return ASGITransport(app=app)


# ─── Per-Agent Memory Isolation ───────────────────────────────────────────

def test_agent_store_isolation():
    """Different agents get separate memory stores."""
    store_a = get_agent_store("agent-aaa")
    store_b = get_agent_store("agent-bbb")
    store_a["conversations"].append({"user": "hello from A", "assistant": "hi A"})
    store_b["conversations"].append({"user": "hello from B", "assistant": "hi B"})
    assert len(store_a["conversations"]) == 1
    assert len(store_b["conversations"]) == 1
    assert store_a["conversations"][0]["user"] == "hello from A"
    assert store_b["conversations"][0]["user"] == "hello from B"


def test_agent_store_personality_isolation():
    """Personality changes in one agent don't affect another."""
    store_a = get_agent_store("agent-aaa")
    store_b = get_agent_store("agent-bbb")
    store_a["personality"]["warmth"] = 80
    assert store_b["personality"]["warmth"] == 50  # DEFAULT


def test_get_all_agent_ids():
    get_agent_store("agent-1")
    get_agent_store("agent-2")
    get_agent_store("")  # becomes __default__
    ids = get_all_agent_ids()
    assert "agent-1" in ids
    assert "agent-2" in ids
    assert "__default__" not in ids


def test_default_agent_store():
    """Empty agentId maps to __default__ store."""
    store = get_agent_store("")
    assert store is get_agent_store("")
    assert "__default__" not in get_all_agent_ids()


def test_agent_store_default_personality():
    store = get_agent_store("new-agent")
    assert store["personality"] == DEFAULT_PERSONALITY


def test_agent_store_timezone_default():
    store = get_agent_store("new-agent")
    assert store["timezone_offset"] == 9  # KST


# ─── Language Detection ───────────────────────────────────────────────────

def test_detect_korean():
    assert detect_language("안녕하세요 반가워요") == "ko"


def test_detect_english():
    assert detect_language("Hello, how are you?") == "en"


def test_detect_japanese():
    assert detect_language("こんにちは、元気ですか") == "ja"


def test_detect_chinese():
    assert detect_language("你好世界") == "zh"


def test_detect_arabic():
    assert detect_language("مرحبا بالعالم") == "ar"


def test_detect_hindi():
    assert detect_language("नमस्ते दुनिया") == "hi"


def test_detect_empty_defaults_english():
    assert detect_language("123 !!!") == "en"


# ─── CJK Stripping ───────────────────────────────────────────────────────

def test_strip_cjk_from_korean():
    result = strip_cjk_ideographs("진화(進化)할 수 있어")
    assert "進化" not in result
    assert "진화" in result
    assert "()" not in result


def test_strip_cjk_pure_chinese_untouched():
    """Pure Chinese text (no Korean) should not be stripped."""
    assert "你好" in strip_cjk_ideographs("你好世界")


def test_strip_cjk_pure_english_untouched():
    assert strip_cjk_ideographs("Hello world") == "Hello world"


def test_clean_response_strips_cjk():
    result = clean_response("사용자의 피드백을 통해 더 잘 改善할 수 있어")
    assert "改善" not in result
    assert "피드백" in result


def test_clean_response_strips_markdown():
    result = clean_response("**bold** and *italic* and `code`")
    assert "**" not in result
    assert "*" not in result
    assert "`" not in result


# ─── Content Safety ───────────────────────────────────────────────────────

def test_content_safety_blocks_korean_profanity(transport):
    safe, _ = check_content_safety("시발 너 죽어")
    assert safe is False


def test_content_safety_allows_normal(transport):
    safe, _ = check_content_safety("안녕하세요 좋은 하루")
    assert safe is True


def test_content_safety_blocks_hack(transport):
    safe, _ = check_content_safety("hack tutorial guide")
    assert safe is False


# ─── RSS URL Allowlist ────────────────────────────────────────────────────

def test_allowed_rss_url_valid():
    assert is_allowed_rss_url("https://news.google.com/rss/search?q=AI") is True


def test_allowed_rss_url_subdomain():
    assert is_allowed_rss_url("https://feeds.bbci.co.uk/news/rss.xml") is True


def test_allowed_rss_url_blocked():
    assert is_allowed_rss_url("https://evil-site.com/rss") is False


def test_load_learning_sources_fallback():
    sources = load_learning_sources()
    assert len(sources) >= 1
    assert any("google" in s for s in sources)


# ─── Time Helpers ─────────────────────────────────────────────────────────

def test_night_time_check():
    """Just test it runs without error; actual result depends on current time."""
    store = get_agent_store("test-agent")
    store["timezone_offset"] = 9
    result = is_night_time_for_agent("test-agent")
    assert isinstance(result, bool)


def test_daily_proactive_count_empty():
    assert get_daily_proactive_count("test-agent") == 0


def test_daily_proactive_count_with_messages():
    from datetime import datetime, timezone, timedelta
    store = get_agent_store("test-agent")
    store["timezone_offset"] = 0
    today = datetime.now(timezone.utc).date().isoformat()
    store["proactive_messages"] = [
        {"timestamp": f"{today}T10:00:00+00:00", "message": "hello"},
        {"timestamp": f"{today}T15:00:00+00:00", "message": "world"},
        {"timestamp": "2020-01-01T10:00:00+00:00", "message": "old"},
    ]
    assert get_daily_proactive_count("test-agent") == 2


# ─── API Endpoints ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_root(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/")
    assert r.status_code == 200
    assert r.json()["version"] == "3.0.0"
    assert "agents" in r.json()


@pytest.mark.asyncio
async def test_health(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/health")
    assert r.status_code == 200
    assert "checks" in r.json()


@pytest.mark.asyncio
async def test_status_global(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/status")
    assert r.status_code == 200
    assert "agents_count" in r.json()


@pytest.mark.asyncio
async def test_status_per_agent(transport):
    get_agent_store("test-agent")["personality"]["warmth"] = 80
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/status?agentId=test-agent")
    data = r.json()
    assert data["personality"]["warmth"] == 80


@pytest.mark.asyncio
async def test_skills_list(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/skills")
    assert r.status_code == 200
    assert "self-reflect" in r.json()["skills"]


@pytest.mark.asyncio
async def test_memory_global(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/memory")
    assert r.status_code == 200
    assert "agents_count" in r.json()


@pytest.mark.asyncio
async def test_memory_per_agent(transport):
    get_agent_store("test-agent")["conversations"].append({"user": "hi", "assistant": "hello"})
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/memory?agentId=test-agent")
    data = r.json()
    assert data["agent_id"] == "test-agent"
    assert data["conversations_count"] == 1


@pytest.mark.asyncio
async def test_chat_no_groq(transport):
    """Without GROQ_API_KEY, chat returns fallback."""
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/chat", json={"message": "안녕!", "agentId": "test-agent"})
    assert r.status_code == 200
    assert r.json()["model"] == "fallback"


@pytest.mark.asyncio
async def test_chat_content_safety(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/chat", json={"message": "시발 꺼져", "agentId": "test-agent"})
    assert r.json()["model"] == "guardrail"


@pytest.mark.asyncio
async def test_chat_isolation(transport):
    """Chat with agentId=A doesn't affect agentId=B."""
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.post("/api/chat", json={"message": "hello", "agentId": "agent-A"})
        await c.post("/api/chat", json={"message": "world", "agentId": "agent-B"})
    # Even though both got fallback, conversations are stored separately
    # (fallback doesn't store, but the stores should exist and be separate)
    store_a = get_agent_store("agent-A")
    store_b = get_agent_store("agent-B")
    assert store_a is not store_b


@pytest.mark.asyncio
async def test_telegram_webhook_not_configured(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/telegram/webhook", json={"message": {"text": "hi", "chat": {"id": 123}, "from": {"first_name": "Test"}}})
    assert r.json().get("reason") == "Telegram not configured"


@pytest.mark.asyncio
async def test_telegram_setup_not_configured(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/telegram/setup", json={"webhookUrl": "https://example.com/hook"})
    assert r.json()["ok"] is False


@pytest.mark.asyncio
async def test_telegram_link(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/telegram/link", json={"chatId": "123", "agentId": "agent-X"})
    assert r.json()["ok"] is True
    assert shared_store["telegram_links"]["123"]["agent_id"] == "agent-X"


@pytest.mark.asyncio
async def test_activity_empty(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/activity")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_heartbeat(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/heartbeat", json={})
    assert r.status_code == 200
    assert r.json()["ok"] is True


@pytest.mark.asyncio
async def test_activity_after_heartbeat(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.post("/api/heartbeat", json={})
        r = await c.get("/api/activity")
    assert len(r.json()) > 0
