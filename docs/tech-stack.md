# 🛠️ YAKAMOZ Tech Stack

> Complete reference of all tools, platforms, APIs and services used in the YAKAMOZ ecosystem.

---

## 🎨 Frontend

| Technology | Version | Use Case |
|-----------|---------|----------|
| HTML5 | Latest | Page structure |
| CSS3 | Latest | Styling, animations |
| Vanilla JavaScript | ES2022+ | Interactivity, logic |
| TailwindCSS | v3 | Utility-first styling |
| Google Fonts | — | Playfair Display, Inter |

### Key Frontend Patterns
- Glassmorphism cards (`backdrop-filter: blur`)
- CSS Custom Properties (variables) for theming
- Intersection Observer for scroll animations
- Flexbox + CSS Grid for layout
- Mobile-first responsive design

---

## 🤖 AI & LLM Layer

| Service | Provider | Use Case |
|---------|----------|----------|
| Claude API | Anthropic | Primary coding assistant, Claude Code |
| Gemini API | Google Cloud | Multimodal, vision tasks |
| Groq API | Groq | Fast inference (LLaMA, Mixtral) for bots |
| OpenAI API | OpenAI | Fallback, GPT models |

### AI Dev Tools
| Tool | Purpose | Install |
|------|---------|--------|
| Claude Code | AI coding in terminal | `npm i -g @anthropic-ai/claude-code` |
| UI UX Pro Max | Design intelligence skill | `npm i -g uipro-cli` |
| Magic MCP | UI component generation | `npx @21st-dev/cli@latest install` |
| Steel Browser | Browser automation | https://github.com/7LVER10/steel-browser |
| MCP Server | Tool context protocol | https://github.com/7LVER10/mcp |

---

## ⚙️ Automation

| Tool | Version | Use Case |
|------|---------|----------|
| N8N | Self-hosted | Visual workflow automation |
| Telegram Bot API | v7+ | Customer communication |
| Webhook triggers | — | Event-driven automation |

### N8N Setup
- Repository: https://github.com/7LVER10/n8n
- Self-hosted on Docker
- Integrates with: Telegram, REST APIs, Google Sheets, databases

---

## 🚀 Hosting & Deployment

| Platform | Use Case | Status |
|----------|----------|--------|
| GitHub Pages | Frontend catalog | Active (production) |
| Replit | Backend prototyping | Active |
| Vercel | Production frontend | Planned |
| Docker | Containerization | Active (N8N, services) |
| Alibaba Cloud | Primary cloud infra | Active |
| Google Cloud | Gemini API, cloud services | Active |

---

## 💻 Development Tools

| Tool | Purpose |
|------|--------|
| GitHub | Version control, CI/CD |
| VS Code / Cursor | Code editors |
| Windsurf | AI-powered IDE |
| Docker Desktop | Container management |
| Postman | API testing |
| Chrome DevTools | Frontend debugging |

---

## 🔑 APIs & Integrations

| API | Purpose | Env Variable |
|-----|---------|-------------|
| Anthropic API | Claude AI | `ANTHROPIC_API_KEY` |
| Google Gemini | Gemini AI | `GEMINI_API_KEY` |
| Groq | Fast LLM inference | `GROQ_API_KEY` |
| Telegram Bot | Customer bot | `TELEGRAM_BOT_TOKEN` |
| 21st.dev Magic | UI components | `MAGIC_API_KEY` |
| GitHub API | Repo automation | `GITHUB_TOKEN` |

> ⚠️ **NEVER hardcode these values. Always use environment variables.**

---

## 📊 Databases & Storage

| Storage | Use Case | Status |
|---------|----------|--------|
| GitHub (file-based) | Docs, config, content | Active |
| JSON files | Product catalog data | Active |
| Google Sheets | Analytics, orders | Planned |
| PostgreSQL | Full marketplace DB | Planned |
| Redis | Caching, sessions | Planned |

---

## 📱 Mobile Strategy

- **Current:** Responsive HTML (mobile-friendly but not mobile-first)
- **Planned:** Progressive Web App (PWA) wrapper
- **Future:** React Native or Flutter mobile app

---

## 🔄 CI/CD Pipeline

```
GitHub Push to main
    ↓
GitHub Actions (automatic)
    ↓
GitHub Pages Deploy
    ↓
Live at: https://7lver10.github.io/yakamoz-catalog/
```

Deploy time: ~30 seconds

---

## 📋 Dependencies (`package.json`)

Current minimal setup (HTML-first project):
```json
{
  "name": "yakamoz-catalog",
  "version": "1.0.0",
  "description": "Yakamoz Glass Works — Premium Interactive Catalog"
}
```

Future additions planned:
- `express` or `fastify` — API server
- `@telegram-bot-api/node` — Telegram bot
- `@anthropic-ai/sdk` — Claude integration
- `tailwindcss` — utility CSS

---

*See also: [AGENTS.md](../AGENTS.md) | [Ecosystem](./yakamoz-ecosystem.md) | [Design System](./design-system.md)*
