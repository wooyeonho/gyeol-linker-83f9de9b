import os
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
    from openclaw_runtime import start_heartbeat, stop_heartbeat
    await _set_telegram_webhook()
    start_heartbeat()
    yield
    stop_heartbeat()


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


async def _web_search(query: str, max_results: int = 5) -> str:
    """Search the web using DuckDuckGo HTML (no API key needed)."""
    try:
        search_url = "https://html.duckduckgo.com/html/"
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.post(
                search_url,
                data={"q": query},
                headers={"User-Agent": "Mozilla/5.0 (compatible; GyeolBot/1.0)"},
            )
        if resp.status_code != 200:
            return ""
        html = resp.text
        # Parse results from HTML
        results = []
        import re
        # Extract result snippets
        snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
        urls = re.findall(r'class="result__url"[^>]*href="([^"]*)"', html)
        titles = re.findall(r'class="result__a"[^>]*>(.*?)</a>', html, re.DOTALL)
        for i in range(min(max_results, len(snippets))):
            title = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else ""
            snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
            url = urls[i] if i < len(urls) else ""
            if url.startswith("//duckduckgo.com/l/?"):
                # Extract actual URL from DDG redirect
                actual = re.search(r'uddg=([^&]+)', url)
                if actual:
                    from urllib.parse import unquote
                    url = unquote(actual.group(1))
            results.append(f"{i+1}. {title}\n   {snippet}\n   출처: {url}")
        return "\n\n".join(results) if results else ""
    except Exception as e:
        logger.error(f"Web search error: {e}")
        return ""


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

    # Helper to send telegram message
    async def _send_reply(reply_text: str):
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": reply_text},
            )

    # /start command
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1 and len(parts[1]) > 10:
            agent_id = parts[1].strip()
            await _supabase_post("gyeol_telegram_links", {
                "telegram_chat_id": str(chat_id),
                "agent_id": agent_id,
                "user_id": "telegram-auto",
            })
            await _send_reply("GYEOL과 연결됐어요! 이제 메시지를 보내보세요.")
        else:
            await _send_reply("GYEOL AI예요. 웹 설정에서 텔레그램 연결 코드를 확인한 후 /start <코드>로 연결해주세요!")
        return {"ok": True}

    # Resolve agent link
    link = await _supabase_get("gyeol_telegram_links", {
        "select": "agent_id,user_id",
        "telegram_chat_id": f"eq.{chat_id}",
    })
    agent_id = None
    if link and isinstance(link, list) and len(link) > 0:
        agent_id = link[0].get("agent_id")

    # /status command — show full agent status
    if text.strip() == "/status":
        if not agent_id:
            await _send_reply("아직 에이전트가 연결되지 않았어요.\n/start <코드>로 연결해주세요.")
            return {"ok": True}
        agent_data = await _supabase_get("gyeol_agents", {
            "select": "name,gen,warmth,logic,creativity,energy,humor,intimacy,mood,total_conversations,consecutive_days,evolution_progress,last_active",
            "id": f"eq.{agent_id}",
        })
        if agent_data and isinstance(agent_data, list) and len(agent_data) > 0:
            a = agent_data[0]
            # Count learned topics
            topics = await _supabase_get("gyeol_learned_topics", {
                "select": "id",
                "agent_id": f"eq.{agent_id}",
            })
            topic_count = len(topics) if isinstance(topics, list) else 0
            # Count memories
            memories = await _supabase_get("gyeol_user_memories", {
                "select": "id",
                "agent_id": f"eq.{agent_id}",
            })
            memory_count = len(memories) if isinstance(memories, list) else 0

            mood_emoji = {"happy": "😊", "neutral": "😐", "sad": "😢", "excited": "🤩", "tired": "😴"}.get(a.get("mood", "neutral"), "🌟")
            status_text = (
                f"[ {a.get('name', 'GYEOL')} 상태 ]\n"
                f"━━━━━━━━━━━━━━━\n"
                f"세대: Gen {a.get('gen', 1)}  |  기분: {mood_emoji} {a.get('mood', 'neutral')}\n"
                f"친밀도: {'❤️' * min(5, a.get('intimacy', 0) // 20)}{'🤍' * (5 - min(5, a.get('intimacy', 0) // 20))} {a.get('intimacy', 0)}%\n"
                f"진화: {'▓' * (a.get('evolution_progress', 0) // 10)}{'░' * (10 - a.get('evolution_progress', 0) // 10)} {a.get('evolution_progress', 0)}%\n\n"
                f"[ 성격 ]\n"
                f"따뜻함: {a.get('warmth', 50)}  |  논리: {a.get('logic', 50)}\n"
                f"창의성: {a.get('creativity', 50)}  |  에너지: {a.get('energy', 50)}\n"
                f"유머: {a.get('humor', 50)}\n\n"
                f"[ 활동 ]\n"
                f"대화: {a.get('total_conversations', 0)}회\n"
                f"연속 접속: {a.get('consecutive_days', 0)}일\n"
                f"학습한 주제: {topic_count}개\n"
                f"기억한 정보: {memory_count}개"
            )
            await _send_reply(status_text)
        else:
            await _send_reply("에이전트 정보를 불러올 수 없어요.")
        return {"ok": True}

    # /memory command — view and manage user memories
    if text.strip().startswith("/memory"):
        if not agent_id:
            await _send_reply("먼저 /start <코드>로 에이전트를 연결해주세요!")
            return {"ok": True}
        parts = text.strip().split(maxsplit=2)
        sub_cmd = parts[1].strip().lower() if len(parts) > 1 else "list"

        if sub_cmd == "list" or sub_cmd == "/memory":
            mem_data = await _supabase_get("gyeol_user_memories", {
                "select": "id,category,key,value,confidence",
                "agent_id": f"eq.{agent_id}",
                "order": "confidence.desc",
                "limit": "15",
            })
            if not mem_data or not isinstance(mem_data, list) or len(mem_data) == 0:
                await _send_reply("아직 저장된 기억이 없어요.")
            else:
                lines = ["[ 기억 목록 ]", "━━━━━━━━━━━━━━━"]
                for i, m in enumerate(mem_data, 1):
                    conf = m.get("confidence", 0)
                    conf_bar = "●" * (conf // 20) + "○" * (5 - conf // 20)
                    lines.append(f"{i}. [{m.get('category', '?')}] {m.get('key', '')}")
                    lines.append(f"   → {m.get('value', '')}  ({conf_bar} {conf}%)")
                lines.append(f"\n삭제: /memory delete <번호>")
                await _send_reply("\n".join(lines))
            return {"ok": True}

        if sub_cmd == "delete" and len(parts) > 2:
            try:
                idx = int(parts[2].strip()) - 1
            except ValueError:
                await _send_reply("번호를 입력해주세요. 예: /memory delete 3")
                return {"ok": True}
            mem_data = await _supabase_get("gyeol_user_memories", {
                "select": "id,key",
                "agent_id": f"eq.{agent_id}",
                "order": "confidence.desc",
                "limit": "15",
            })
            if not mem_data or not isinstance(mem_data, list) or idx < 0 or idx >= len(mem_data):
                await _send_reply("유효하지 않은 번호예요. /memory list로 확인해주세요.")
                return {"ok": True}
            target = mem_data[idx]
            # Delete via Supabase REST API
            try:
                delete_url = f"{SUPABASE_URL}/rest/v1/gyeol_user_memories?id=eq.{target['id']}"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.delete(delete_url, headers={
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    })
                if resp.status_code < 300:
                    await _send_reply(f"'{target.get('key', '')}' 기억을 삭제했어요.")
                else:
                    await _send_reply("삭제 중 오류가 발생했어요.")
            except Exception as e:
                logger.error(f"Memory delete error: {e}")
                await _send_reply("삭제 중 오류가 발생했어요.")
            return {"ok": True}

        if sub_cmd == "add" and len(parts) > 2:
            # Format: /memory add 카테고리:키=값  or  /memory add 키=값
            raw = parts[2].strip()
            category = "preference"
            key_val = raw
            if ":" in raw and "=" in raw:
                cat_part, key_val = raw.split(":", 1)
                cat_part = cat_part.strip().lower()
                valid_cats = ["identity", "preference", "interest", "relationship", "goal", "emotion", "experience", "style", "knowledge_level"]
                if cat_part in valid_cats:
                    category = cat_part
            if "=" not in key_val:
                await _send_reply("형식: /memory add 키=값\n예: /memory add favorite_food=떡볶이\n예: /memory add identity:job=개발자")
                return {"ok": True}
            mem_key, mem_val = key_val.split("=", 1)
            mem_key = mem_key.strip()
            mem_val = mem_val.strip()
            if not mem_key or not mem_val:
                await _send_reply("키와 값을 모두 입력해주세요.\n예: /memory add hobby=독서")
                return {"ok": True}
            # Upsert via POST with merge-duplicates
            try:
                upsert_url = f"{SUPABASE_URL}/rest/v1/gyeol_user_memories"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(upsert_url, headers={
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates",
                    }, json={
                        "agent_id": agent_id,
                        "category": category,
                        "key": mem_key,
                        "value": mem_val,
                        "confidence": 100,
                    })
                if resp.status_code < 300:
                    await _send_reply(f"기억 추가 완료!\n[{category}] {mem_key} → {mem_val}")
                else:
                    await _send_reply(f"저장 중 오류가 발생했어요. ({resp.status_code})")
            except Exception as e:
                logger.error(f"Memory add error: {e}")
                await _send_reply("저장 중 오류가 발생했어요.")
            return {"ok": True}

        await _send_reply("사용법:\n/memory — 기억 목록\n/memory list — 기억 목록\n/memory add 키=값 — 기억 추가\n/memory add 카테고리:키=값 — 카테고리 지정 추가\n/memory delete <번호> — 기억 삭제\n\n카테고리: identity, preference, interest, relationship, goal, emotion, experience, style, knowledge_level")
        return {"ok": True}

    # /evolve command — show personality evolution history
    if text.strip().startswith("/evolve"):
        if not agent_id:
            await _send_reply("먼저 /start <코드>로 에이전트를 연결해주세요!")
            return {"ok": True}

        # Get agent current stats
        agent_data = await _supabase_get("gyeol_agents", {
            "select": "name,gen,warmth,logic,creativity,energy,humor,evolution_progress",
            "id": f"eq.{agent_id}",
        })
        if not agent_data or not isinstance(agent_data, list) or len(agent_data) == 0:
            await _send_reply("에이전트 정보를 불러올 수 없어요.")
            return {"ok": True}
        a = agent_data[0]

        # Get recent personality insights (change history)
        insights = await _supabase_get("gyeol_conversation_insights", {
            "select": "emotion_arc,personality_delta,created_at",
            "agent_id": f"eq.{agent_id}",
            "order": "created_at.desc",
            "limit": "10",
        })

        # Build personality bars
        def bar(val, label, width=10):
            filled = val // (100 // width)
            empty = width - filled
            return f"{label}: {'▓' * filled}{'░' * empty} {val}"

        evo = a.get("evolution_progress", 0)
        evo_filled = evo // 10
        evo_bar = f"{'▓' * evo_filled}{'░' * (10 - evo_filled)} {evo}%"

        lines = [
            f"[ {a.get('name', 'GYEOL')} 진화 현황 ]",
            f"━━━━━━━━━━━━━━━",
            f"세대: Gen {a.get('gen', 1)}",
            f"진화 진행: {evo_bar}",
            "",
            "[ 현재 성격 ]",
            bar(a.get("warmth", 50), "따뜻함"),
            bar(a.get("logic", 50), "논리력"),
            bar(a.get("creativity", 50), "창의성"),
            bar(a.get("energy", 50), "에너지"),
            bar(a.get("humor", 50), "유머  "),
        ]

        if insights and isinstance(insights, list) and len(insights) > 0:
            lines.append("")
            lines.append("[ 최근 성격 변화 ]")
            for ins in insights[:5]:
                delta = ins.get("personality_delta", {})
                if not delta:
                    continue
                changes = []
                trait_names = {"warmth": "따뜻함", "logic": "논리", "creativity": "창의", "energy": "에너지", "humor": "유머"}
                for k, v in delta.items():
                    if isinstance(v, (int, float)) and v != 0:
                        sign = "+" if v > 0 else ""
                        changes.append(f"{trait_names.get(k, k)} {sign}{v}")
                if changes:
                    date_str = ins.get("created_at", "")[:10]
                    emotion = ins.get("emotion_arc", "")
                    lines.append(f"  {date_str} ({emotion}): {', '.join(changes)}")

        if not insights or not isinstance(insights, list) or len(insights) == 0:
            lines.append("")
            lines.append("아직 성격 변화 기록이 없어요.")

        await _send_reply("\n".join(lines))
        return {"ok": True}

    # /help command
    if text.strip() == "/help":
        await _send_reply(
            "/start <코드> — 에이전트 연결\n"
            "/status — 에이전트 상태 보기\n"
            "/evolve — 진화 현황 보기\n"
            "/search <키워드> — 웹 검색\n"
            "/memory — 기억 관리\n"
            "/help — 도움말\n\n"
            "그 외 메시지는 AI가 답변해요!"
        )
        return {"ok": True}

    # /search command — web search via DuckDuckGo
    if text.strip().startswith("/search"):
        query = text.strip()[7:].strip()
        if not query:
            await _send_reply("검색어를 입력해주세요.\n예: /search AI 최신 뉴스")
            return {"ok": True}
        try:
            search_results = await _web_search(query)
            if search_results:
                # Use AI to summarize search results
                summary = await _call_groq(
                    f"다음 검색 결과를 바탕으로 '{query}'에 대해 한국어로 간결하게 요약해줘. 출처도 포함해.\n\n{search_results}",
                    "You are a helpful search assistant. Summarize web search results concisely in Korean. Include source URLs. No markdown formatting.",
                )
                await _send_reply(f"🔍 '{query}' 검색 결과\n\n{summary}")
            else:
                await _send_reply(f"'{query}'에 대한 검색 결과를 찾지 못했어요.")
        except Exception as e:
            logger.error(f"Search error: {e}")
            await _send_reply("검색 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.")
        return {"ok": True}

    # Normal chat — build context
    if not agent_id:
        await _send_reply("먼저 /start <코드>로 에이전트를 연결해주세요!")
        return {"ok": True}

    system_prompt = DEFAULT_SYSTEM_PROMPT
    history: list = []

    agent_data = await _supabase_get("gyeol_agents", {
        "select": "warmth,logic,creativity,energy,humor",
        "id": f"eq.{agent_id}",
    })
    if agent_data and isinstance(agent_data, list) and len(agent_data) > 0:
        system_prompt = _build_personality_prompt(agent_data[0])

    # Load conversation history (exclude heartbeat-generated messages for better context)
    conv_data = await _supabase_get("gyeol_conversations", {
        "select": "role,content",
        "agent_id": f"eq.{agent_id}",
        "provider": "not.eq.heartbeat",
        "order": "created_at.desc",
        "limit": "10",
    })
    if conv_data and isinstance(conv_data, list):
        history = [{"role": r["role"], "content": r["content"]} for r in reversed(conv_data)]

    # Load user memories for context
    mem_data = await _supabase_get("gyeol_user_memories", {
        "select": "category,key,value",
        "agent_id": f"eq.{agent_id}",
        "order": "confidence.desc",
        "limit": "10",
    })
    if mem_data and isinstance(mem_data, list) and len(mem_data) > 0:
        mem_lines = "\n".join([f"- [{m.get('category','')}] {m.get('key','')}: {m.get('value','')}" for m in mem_data])
        system_prompt += f"\n\n사용자에 대해 기억하고 있는 것:\n{mem_lines}\n이 정보를 자연스럽게 활용해서 대화해."

    # Load learned topics for context
    topic_data = await _supabase_get("gyeol_learned_topics", {
        "select": "title,summary",
        "agent_id": f"eq.{agent_id}",
        "order": "learned_at.desc",
        "limit": "10",
    })
    if topic_data and isinstance(topic_data, list) and len(topic_data) > 0:
        topic_lines = "\n".join([f"- {t.get('title','')}: {t.get('summary','')}" for t in topic_data])
        system_prompt += f"\n\n최근 학습한 주제:\n{topic_lines}"

    # Load latest conversation insight
    insight_data = await _supabase_get("gyeol_conversation_insights", {
        "select": "next_hint,what_to_improve",
        "agent_id": f"eq.{agent_id}",
        "order": "created_at.desc",
        "limit": "1",
    })
    if insight_data and isinstance(insight_data, list) and len(insight_data) > 0:
        hint = insight_data[0].get("next_hint", "")
        if hint:
            system_prompt += f"\n\n다음 대화 힌트: {hint}"

    # P2: Auto web search routing — regex pre-filter before LLM call
    import re as _re
    SEARCH_TRIGGERS = _re.compile(
        r"날씨|뉴스|최신|현재|오늘|어제|속보|주가|환율|검색|최근|실시간|지금|트렌드|업데이트"
    )
    search_context = ""
    if SEARCH_TRIGGERS.search(text):
        try:
            need_search = await _call_groq(
                f"사용자 메시지: {text}\n\n이 메시지에 답하려면 최신 정보나 웹검색이 필요한가요? YES와 검색 키워드를 반환하세요.\n형식: YES: <검색키워드> 또는 NO",
                "You are a search router. Determine if a user message requires web search for up-to-date info. Respond ONLY with 'YES: <search query>' or 'NO'. Nothing else.",
            )
            if need_search and need_search.strip().upper().startswith("YES:"):
                search_query = need_search.strip()[4:].strip()
                if search_query:
                    search_results = await _web_search(search_query)
                    if search_results:
                        search_context = f"\n\n[웹 검색 결과 ({search_query})]\n{search_results}"
        except Exception as e:
            logger.warning(f"Auto search routing error: {e}")

    # Augment system prompt with search results if available
    final_system = system_prompt
    if search_context:
        final_system += f"\n\n다음 웹 검색 결과를 참고해서 답변해. 출처를 자연스럽게 언급해:{search_context}"

    try:
        reply = await _call_groq(text, final_system, history)
    except Exception as e:
        logger.error(f"Telegram chat error: {e}")
        reply = "죄송해요, 잠시 문제가 있어요."

    if agent_id:
        await _supabase_post("gyeol_conversations", [
            {"agent_id": agent_id, "role": "user", "content": text, "channel": "telegram"},
            {"agent_id": agent_id, "role": "assistant", "content": reply, "channel": "telegram", "provider": "groq"},
        ])

    await _send_reply(reply)
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


@app.get("/openclaw/status")
async def openclaw_status():
    from openclaw_runtime import get_status
    return get_status()


@app.post("/openclaw/heartbeat")
async def openclaw_trigger_heartbeat():
    from openclaw_runtime import run_heartbeat_cycle
    results = await run_heartbeat_cycle()
    return {"ok": True, "results": results}


@app.get("/")
async def root():
    return {
        "service": "GYEOL Gateway + OpenClaw Runtime",
        "status": "running",
        "endpoints": [
            "/health", "/api/chat",
            "/api/social/feed", "/api/social/post", "/api/social/like", "/api/social/comment",
            "/webhook/telegram", "/telegram/status",
            "/openclaw/status", "/openclaw/heartbeat",
        ],
    }
