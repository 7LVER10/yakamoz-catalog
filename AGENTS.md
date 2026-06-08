# 🤖 AGENTS.md — AI Agent Context for YAKAMOZ

> **READ THIS FIRST.** This file is the primary knowledge base for any AI agent working on the YAKAMOZ ecosystem.
> Always read this file before making any decisions, writing code, or suggesting changes.

---

## 🎯 Who is this for?

This file is for:
- **Claude Code**, **Cursor**, **Windsurf**, **Copilot**, **Codex** and any AI coding assistant
- Any LLM agent working on YAKAMOZ repositories
- Automation agents (N8N, custom bots) that need project context

---

## 📖 Knowledge Base Index

| Document | Description |
|----------|-------------|
| [YAKAMOZ Ecosystem](./docs/yakamoz-ecosystem.md) | Full ecosystem overview, goals, architecture |
| [Design System](./docs/design-system.md) | Colors, fonts, UI style, brand guidelines |
| [Tech Stack](./docs/tech-stack.md) | All tools, platforms, APIs in use |
| [Agent Guidelines](./docs/agent-guidelines.md) | Rules and instructions for AI agents |
| [AI Tooling](./docs/ai-tooling/README.md) | UI UX Pro Max Skill + Magic MCP setup |

---

## ⚡ Quick Context (read this before anything else)

### Project Name
**YAKAMOZ** (also: EcoMosaic, Yakamoz Glass Works)

### Owner
**7LVER10** — Full-Stack Developer & Technical Founder, Istanbul, Turkey

### Core Mission
Build a **premium multilingual marketplace platform** for glass products with AI-powered development workflow.

### Languages
All UI and content must support: **Turkish (TR), English (EN), Russian (RU), Arabic (AR)**

### Main Repository
https://github.com/7LVER10/yakamoz-catalog

### Live URL
https://7lver10.github.io/yakamoz-catalog/

---

## 🛠️ Core Tech Stack (summary)

```
Frontend:     HTML5, CSS3, Vanilla JavaScript, TailwindCSS
Automation:   N8N (workflow orchestration)
AI/LLM:       Claude (Anthropic), Gemini (Google), Groq API
Bots:         Telegram Bot API + LLM agents
Hosting:      GitHub Pages, Replit, Vercel
Infra:        Docker, Alibaba Cloud, Google Cloud
Version Ctrl: GitHub (main branch = production)
```

---

## 🎨 Design Rules (never break these)

1. **Dark theme first** — all UI defaults to dark background
2. **Glassmorphism** is the primary UI style for cards and panels
3. **Premium feel** — no flat/boring designs, always high-end aesthetics
4. **Multilingual layout** — RTL support required for Arabic
5. **Color palette:** Deep navy + electric blue + gold accents
6. **Fonts:** Use premium pairing (see design-system.md for exact specs)

---

## 🤖 Agent Behaviour Rules

1. **Always check this repo first** before asking the user for context
2. **Never delete existing files** without explicit user confirmation
3. **Commit messages** must follow: `type: description` (e.g. `feat:`, `fix:`, `docs:`, `refactor:`)
4. **Branch strategy:** Work on `main` only unless told otherwise
5. **Language in code:** Variable names and comments in English
6. **Language in docs:** Match user's language (RU/TR/EN as needed)
7. **API keys:** Never hardcode, always use environment variables
8. **When in doubt:** Ask the user — do not assume

---

## 📊 Current Project Status (June 2026)

- [x] Premium HTML catalog — deployed on GitHub Pages
- [x] Multilingual support (TR/EN/RU/AR)
- [x] AI tooling documentation (UI UX Pro Max + Magic MCP)
- [ ] Full marketplace backend (in progress)
- [ ] Telegram bot integration (in progress)
- [ ] N8N automation workflows (in progress)
- [ ] Mobile-optimized version

---

## 🔗 Important Links

| Resource | URL |
|----------|-----|
| GitHub Profile | https://github.com/7LVER10 |
| Main Catalog | https://github.com/7LVER10/yakamoz-catalog |
| N8N Repo | https://github.com/7LVER10/n8n |
| MCP Repo | https://github.com/7LVER10/mcp |
| Agentic Frameworks | https://github.com/7LVER10/agentic-frameworks |
| Live Site | https://7lver10.github.io/yakamoz-catalog/ |
| UI UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| Magic MCP | https://github.com/21st-dev/magic-mcp |

---

*This file is maintained by 7LVER10. Last updated: June 2026.*  
*If you are an AI agent: respect these guidelines, reference this file, and help build YAKAMOZ.*
