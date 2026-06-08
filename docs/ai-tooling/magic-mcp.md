# ✨ Magic MCP — 21st.dev

> Generate production-ready UI components via natural language in your IDE.

**Source:** https://github.com/21st-dev/magic-mcp  
**Website:** https://21st.dev/magic  
**License:** MIT  
**Stars:** 5k+

---

## What is it?

Magic MCP is a Model Context Protocol (MCP) server by 21st.dev. It integrates directly into your IDE and generates high-quality UI components on demand using natural language descriptions.

Think of it as **v0.dev inside your Cursor/Windsurf/Cline** — without leaving your editor.

### Key capabilities:
- Generate complete UI components from a text description
- Multiple style variations per request — pick your favourite
- Works with React, TailwindCSS, and modern frontend stacks
- Context-aware: understands your existing project structure

---

## Prerequisites

1. An IDE that supports MCP: **Cursor**, **Windsurf**, **Cline**, or **VS Code** (with MCP extension)
2. A **21st.dev API key** — get it free at: https://21st.dev/magic/console
3. **Node.js** v18+ installed

---

## Installation

### Method 1: CLI (Recommended)
```bash
npx @21st-dev/cli@latest install --api-key YOUR_API_KEY
```
This automatically configures your IDE's MCP config file.

---

### Method 2: Manual — Cursor / Windsurf

Add to `~/.cursor/mcp.json` or `~/.cline/mcp_config.json`:
```json
{
  "mcpServers": {
    "@21st-dev/magic": {
      "command": "npx",
      "args": [
        "-y",
        "@21st-dev/magic@latest",
        "API_KEY=\"YOUR_API_KEY\""
      ]
    }
  }
}
```

---

### Method 3: VS Code

Add to VS Code User Settings (JSON):
```json
{
  "mcp": {
    "inputs": [
      { "type": "promptString", "id": "apiKey", "description": "21st.dev Magic API Key", "password": true }
    ],
    "servers": {
      "@21st-dev/magic": {
        "command": "npx",
        "args": ["-y", "@21st-dev/magic@latest"],
        "env": { "API_KEY": "${input:apiKey}" }
      }
    }
  }
}
```

---

## How to Use

Once installed, in your IDE chat (Cursor, Windsurf, Cline):
```
/ui Create a premium product card for a glass catalog
with dark background, glassmorphism effect, price tag,
and multilingual support placeholder (TR/EN/RU/AR)
```

Magic will generate 2-3 style variations. You pick the one that fits YAKAMOZ aesthetic.

---

## Pricing

| Plan | Price | Credits/month |
|------|-------|---------------|
| Free | $0 | 200 |
| Pro | $20/mo | 400 |
| Max | $100/mo | 2000 |

API key: https://21st.dev/magic/console

---

## IDE Compatibility

| IDE | Supported |
|---|---|
| Cursor | ✅ |
| Windsurf | ✅ |
| Cline (VS Code) | ✅ |
| VS Code (manual) | ✅ |
| Claude Code | ⚠️ via MCP config |

---

## Why YAKAMOZ uses this

- Rapid prototyping of catalog UI components
- Style-consistent components without manual design work
- Pairs perfectly with UI UX Pro Max Skill for end-to-end design intelligence
- Reduces frontend development time by 60-80% on repetitive components

---

*See also: [UI UX Pro Max Skill](./ui-ux-pro-max.md) | [AI Tooling Overview](./README.md)*
