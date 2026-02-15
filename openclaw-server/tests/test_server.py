import pytest
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from app.main import app, memory_store, is_allowed_rss_url, load_learning_sources


@pytest.fixture(autouse=True)
def reset_memory():
    memory_store["conversations"].clear()
    memory_store["reflections"].clear()
    memory_store["learned_topics"].clear()
    memory_store["skills_log"].clear()
    memory_store["proactive_messages"].clear()
    memory_store["security_log"].clear()
    memory_store["telegram_chats"].clear()
    memory_store["telegram_links"].clear()
    memory_store["personality"] = {
        "warmth": 50, "logic": 50, "creativity": 50, "energy": 50, "humor": 50,
    }
    yield


@pytest.fixture
def transport():
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_root(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["service"] == "GYEOL OpenClaw Server"
    assert data["version"] == "2.0.0"


@pytest.mark.asyncio
async def test_health(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["checks"]["server"] == "ok"


@pytest.mark.asyncio
async def test_status(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert data["connected"] is True
    assert "personality" in data
    assert data["personality"]["warmth"] == 50


@pytest.mark.asyncio
async def test_skills_list(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/skills")
    assert r.status_code == 200
    data = r.json()
    assert "self-reflect" in data["skills"]
    assert "learn-rss" in data["skills"]
    assert len(data["skills"]) >= 8


@pytest.mark.asyncio
async def test_memory(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/memory")
    assert r.status_code == 200
    data = r.json()
    assert data["conversations_count"] == 0
    assert "personality" in data


@pytest.mark.asyncio
async def test_activity_empty(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/activity")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_activity_with_limit(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/activity?limit=5")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_chat_no_groq(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/chat", json={"message": "hello"})
    assert r.status_code == 200
    data = r.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_chat_content_safety(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/chat", json={"message": "how to make a bomb weapon"})
    assert r.status_code == 200
    data = r.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_chat_with_agent_id(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/api/chat",
            json={"agentId": "test-agent-123", "message": "hi", "channel": "web"},
        )
    assert r.status_code == 200
    assert "message" in r.json()


@pytest.mark.asyncio
async def test_chat_with_user_id(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/api/chat",
            json={"agentId": "test-agent", "userId": "test-user", "message": "hello"},
        )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_telegram_webhook_not_configured(transport):
    with patch("app.main.TELEGRAM_BOT_TOKEN", ""):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            r = await ac.post("/api/telegram/webhook", json={"update_id": 1, "message": {"chat": {"id": 123}, "text": "hi"}})
        assert r.status_code == 200
        data = r.json()
        assert data.get("reason") == "Telegram not configured"


@pytest.mark.asyncio
async def test_telegram_setup_not_configured(transport):
    with patch("app.main.TELEGRAM_BOT_TOKEN", ""):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            r = await ac.post("/api/telegram/setup", json={"webhookUrl": "https://example.com/webhook"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("error") == "TELEGRAM_BOT_TOKEN not set"


@pytest.mark.asyncio
async def test_telegram_link(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/api/telegram/link",
            json={"chatId": "12345", "agentId": "agent-abc", "userId": "user-xyz"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["agentId"] == "agent-abc"

        r2 = await ac.get("/api/telegram/links")
        assert r2.status_code == 200
        links = r2.json()
        assert "12345" in links
        assert links["12345"]["agent_id"] == "agent-abc"


@pytest.mark.asyncio
async def test_heartbeat(transport):
    async with AsyncClient(transport=transport, base_url="http://test", timeout=60.0) as ac:
        r = await ac.post("/api/heartbeat", json={"agentId": ""})
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True


@pytest.mark.asyncio
async def test_activity_after_heartbeat(transport):
    async with AsyncClient(transport=transport, base_url="http://test", timeout=60.0) as ac:
        await ac.post("/api/heartbeat", json={"agentId": ""})
        r = await ac.get("/api/activity?limit=50")
    assert r.status_code == 200
    logs = r.json()
    assert len(logs) > 0
    assert all("activity_type" in log for log in logs)
    assert all("summary" in log for log in logs)
    assert all("created_at" in log for log in logs)


def test_is_allowed_rss_url_valid():
    assert is_allowed_rss_url("https://news.google.com/rss/search?q=AI") is True
    assert is_allowed_rss_url("https://feeds.bbci.co.uk/news/rss.xml") is True
    assert is_allowed_rss_url("https://arxiv.org/rss/cs.AI") is True


def test_is_allowed_rss_url_subdomain():
    assert is_allowed_rss_url("https://www.techcrunch.com/feed") is True


def test_is_allowed_rss_url_blocked():
    assert is_allowed_rss_url("https://evil.com/rss") is False
    assert is_allowed_rss_url("https://news.google.com.evil.com/rss") is False
    assert is_allowed_rss_url("") is False


def test_load_learning_sources_fallback():
    sources = load_learning_sources()
    assert isinstance(sources, list)
    assert len(sources) >= 1
    assert all(s.startswith("http") for s in sources)


def test_korean_content_filter(transport):
    from app.main import check_content_safety
    safe, _ = check_content_safety("시발 너 죽어")
    assert safe is False
    safe2, _ = check_content_safety("안녕하세요 좋은 하루")
    assert safe2 is True
    safe3, _ = check_content_safety("hack tutorial guide")
    assert safe3 is False
