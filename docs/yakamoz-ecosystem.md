# 🔮 YAKAMOZ Ecosystem — Full Overview

> This document describes the complete YAKAMOZ / EcoMosaic ecosystem for AI agents and collaborators.

---

## 🏢 About the Project

**YAKAMOZ** is a premium multilingual marketplace and catalog platform for **Yakamoz Glass Works**, based in Istanbul, Turkey.

The project has two interconnected identities:
- **YAKAMOZ** — the brand name (means "phosphorescence" / sea glow in Turkish)
- **EcoMosaic** — the ecosystem architecture name

### Vision
Build the most sophisticated AI-powered glass product marketplace in the Turkish and CIS market, with full multilingual support and automated operations.

---

## 🌐 Markets & Languages

| Market | Language | Code | Notes |
|--------|----------|------|-------|
| Turkey | Turkish | TR | Primary market |
| Russia / CIS | Russian | RU | Key export market |
| International | English | EN | Default fallback |
| Middle East | Arabic | AR | RTL layout required |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│           YAKAMOZ ECOSYSTEM                 │
├─────────────────────────────────────────┤
│  Frontend         │  Automation Layer       │
│  (HTML Catalog)   │  (N8N Workflows)        │
├─────────────────────────────────────────┤
│  AI Agents Layer  │  Communication Layer    │
│  (Claude/Gemini)  │  (Telegram Bots)        │
├─────────────────────────────────────────┤
│  Data Layer       │  Hosting Layer          │
│  (APIs/Parsing)   │  (GitHub/Vercel/Docker) │
└─────────────────────────────────────────┘
```

---

## 📁 Repositories

| Repo | Purpose | Status |
|------|---------|--------|
| [yakamoz-catalog](https://github.com/7LVER10/yakamoz-catalog) | Main product catalog, HTML frontend | Active |
| [n8n](https://github.com/7LVER10/n8n) | Workflow automation (forked) | Active |
| [mcp](https://github.com/7LVER10/mcp) | Model Context Protocol server | Active |
| [gstack](https://github.com/7LVER10/gstack) | Claude Code setup (Garry Tan stack) | Reference |
| [steel-browser](https://github.com/7LVER10/steel-browser) | Browser API for AI agents | Active |
| [agentic-frameworks](https://github.com/7LVER10/agentic-frameworks) | AI agent framework comparison | Reference |
| [awesome-code-agents](https://github.com/7LVER10/awesome-code-agents) | Code agent resources | Reference |
| [awesome-vibe-coding](https://github.com/7LVER10/awesome-vibe-coding) | Vibe coding resources | Reference |

---

## 🤖 AI & Automation Stack

### LLM Providers in Use
- **Claude (Anthropic)** — primary coding assistant, Claude Code
- **Gemini (Google Cloud)** — multimodal tasks, API integration
- **Groq API** — fast inference for Telegram bots (LLaMA/Mixtral)

### Automation
- **N8N** — visual workflow automation, self-hosted
- Custom webhook triggers and REST API integrations
- Telegram Bot API for customer communication

### AI Dev Tools
- **UI UX Pro Max Skill** — design intelligence for Claude Code
- **Magic MCP (21st.dev)** — UI component generation
- **Steel Browser** — browser automation for AI agents
- **MCP (Model Context Protocol)** — tool context for AI assistants

---

## 📊 Business Context

### Product Categories
- Decorative glass panels
- Architectural glass products
- Custom glass solutions
- Premium glass accessories

### Target Customers
- Interior designers
- Architects
- Construction companies
- Individual premium buyers

### Key Differentiators
- Multilingual from day 1 (TR/EN/RU/AR)
- AI-assisted catalog management
- Premium visual presentation
- Automated customer communication via Telegram

---

## 🚀 Deployment & Hosting

| Service | Use Case |
|---------|----------|
| GitHub Pages | Frontend catalog (free, fast) |
| Replit | Backend prototyping, quick deploys |
| Vercel | Production frontend (when ready) |
| Docker | Service containerization |
| Alibaba Cloud | Primary cloud infrastructure |
| Google Cloud | Gemini API, cloud services |

---

## 📅 Roadmap (as of June 2026)

### Done
- [x] Premium HTML catalog with multilingual support
- [x] GitHub Pages deployment
- [x] AI tooling setup documentation
- [x] AGENTS.md knowledge base

### In Progress
- [ ] Full marketplace backend with product management
- [ ] Telegram bot with LLM responses
- [ ] N8N automation for order processing
- [ ] ALSAT marketplace parser/integration

### Planned
- [ ] Mobile-optimized version
- [ ] Customer dashboard
- [ ] AI-powered product recommendations
- [ ] Analytics dashboard

---

*See also: [AGENTS.md](../AGENTS.md) | [Tech Stack](./tech-stack.md) | [Design System](./design-system.md)*
