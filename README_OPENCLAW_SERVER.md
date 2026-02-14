# OpenClaw "Living" Server Agent

This is a complete server deployment package for your "Living" AI agent.

## 🚀 Features
- **Always On**: Runs in a Docker container, ready to be deployed on any server.
- **Accessible**: Chat with your agent via Telegram (or Discord).
- **Capable**: Can search the web, write files, and execute code.
- **Alive**: Configured with a "Living" persona to be proactive and engaging.

## 🛠️ Setup & Deployment

oss
### 1. Prerequisites
- **Docker** & **Docker Compose** installed on your server (or local machine).
- A **Telegram Bot Token** (Create one via [@BotFather](https://t.me/BotFather)).
- An **OpenAI API Key** (or compatible LLM key).

### 2. Configuration
1.  Rename `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Edit `.env` and fill in your API keys:
    ```bash
    nano .env
    ```

### 3. Run
Start the agent in the background:
```bash
docker-compose up -d
```

## 🧠 Customization

- **Persona**: Edit `system_prompt.md` to change how your agent talks and behaves.
- **Config**: Edit `config.json` to enable/disable skills or change the model.
- **Data**: All agent data is stored in the `data/` directory (persisted).

## 📂 Directory Structure
- `config.json`: Main agent configuration.
- `docker-compose.yml`: Container orchestration.
- `system_prompt.md`: The "Brain" (persona definition).
- `skills/`: Directory for custom skills (JavaScript/Python).
- `data/`: Agent's memory and workspace.
