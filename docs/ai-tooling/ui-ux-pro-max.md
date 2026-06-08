# 🎨 UI UX Pro Max Skill

> AI design intelligence for Claude Code, Cursor, Windsurf, Copilot, and Codex.

**Source:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill  
**License:** MIT  
**Stars:** 88.6k+

---

## What is it?

UI UX Pro Max is an open-source AI skill that gives coding assistants access to a comprehensive, searchable design intelligence database:

- **50+ UI styles** (Glassmorphism, Neumorphism, Brutalism, Material, etc.)
- **161 color palettes** (curated, production-ready)
- **57 font pairings** (with usage context)
- **UX guidelines** per platform (web, mobile, dashboard)
- **Stack-specific best practices** (React, TailwindCSS, HTML5, etc.)

---

## Installation

### Method 1: Claude Code Marketplace (Fastest)
```bash
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

### Method 2: CLI (Recommended for all IDEs)
```bash
# Step 1: Install CLI globally
npm install -g uipro-cli

# Step 2: Init for your AI assistant
uipro init --ai claude      # Claude Code
uipro init --ai cursor      # Cursor
uipro init --ai copilot     # GitHub Copilot
uipro init --ai codex       # OpenAI Codex

# Step 3 (optional): Install globally across all projects
uipro init --ai claude --global
# Installs to: ~/.claude/skills/
```

---

## How to Use

Once installed, in your AI coding assistant prompt:
```
Use UI UX Pro Max skill to design a premium glass-effect product card
for the YAKAMOZ catalog with TailwindCSS and dark theme.
```

The skill will automatically apply:
- Appropriate style (e.g. Glassmorphism)
- Matching color palette
- Correct font pairing
- Responsive layout best practices

---

## Compatibility

| IDE / Assistant | Supported |
|---|---|
| Claude Code | ✅ |
| Cursor | ✅ |
| Windsurf | ✅ |
| GitHub Copilot | ✅ |
| OpenAI Codex | ✅ |
| Antigravity | ✅ |
| VS Code (with extension) | ✅ |

---

## Why YAKAMOZ uses this

- Enforces consistent premium aesthetics across all catalog pages
- Reduces manual design decision time
- Aligns with multi-language UI requirements (TR/EN/RU/AR)
- Production-grade output from first iteration

---

*See also: [Magic MCP](./magic-mcp.md) | [AI Tooling Overview](./README.md)*
