# 🤖 Agent Guidelines — How to Work on YAKAMOZ

> Detailed operational instructions for AI agents working in the YAKAMOZ ecosystem.
> Read [AGENTS.md](../AGENTS.md) first for quick context.

---

## 📌 Golden Rules

1. **This repo is the source of truth** — always read docs here before making decisions
2. **Ask before deleting** — never remove files, data, or code without user confirmation
3. **Preserve existing work** — don't overwrite working features
4. **Multilingual always** — every UI change must work in TR/EN/RU/AR
5. **Dark theme always** — no light backgrounds unless explicitly requested
6. **Test before confirming** — validate logic before saying "it's done"

---

## 💬 Communication Style

- **Language:** Match the user's language (Russian, Turkish, or English)
- **Tone:** Direct, professional, no unnecessary pleasantries
- **Format:** Use bullet points and code blocks, not walls of text
- **When stuck:** Say what you know, what you don't know, and what you need
- **Errors:** Report clearly with context — file, line, error message

---

## 📦 When Working on Code

### Before writing code
1. Read relevant existing files first
2. Understand the existing pattern (don't introduce new ones without reason)
3. Check if similar functionality already exists

### Code standards
```
- Indentation: 2 spaces (HTML/CSS/JS)
- Quotes: single quotes in JS
- Comments: English only
- Variable names: camelCase
- CSS classes: kebab-case
- File names: kebab-case.ext
```

### HTML structure
```html
<!-- Always include lang + dir attributes -->
<html lang="tr" dir="ltr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YAKAMOZ — [Page Title]</title>
  </head>
</html>
```

### Multilingual pattern
```javascript
// Always use this pattern for multilingual content
const translations = {
  TR: { title: 'Başlık', ... },
  EN: { title: 'Title', ... },
  RU: { title: 'Заголовок', ... },
  AR: { title: 'عنوان', ... }
};
```

---

## 🚀 Deployment Rules

- **Main branch = production** on GitHub Pages
- Every commit to `main` triggers automatic deployment
- Test locally (or in Replit) before committing breaking changes
- Commit messages must be descriptive:
  ```
  feat: add product filter sidebar
  fix: correct RTL layout for Arabic nav
  docs: update tech stack info
  refactor: clean up CSS variables
  ```

---

## 🔐 Security Rules

- **Never commit API keys** to any file
- Use environment variables: `process.env.API_KEY` or `.env` files
- `.env` must be in `.gitignore` always
- If you see a hardcoded key in existing code, flag it immediately
- When in doubt: ask the user for the key, don't guess or fabricate

---

## 🧩 N8N Workflow Guidelines

- N8N is the automation backbone — handle with care
- Document every workflow you create/modify
- Use meaningful node names (not "HTTP Request 1")
- Add error handling to every workflow
- Test with small data sets before enabling on production

---

## 🤖 Telegram Bot Guidelines

- All responses must be in user's language
- Keep responses concise (Telegram UX preference)
- Use inline keyboards for options, not text commands
- Log all errors with context
- Rate limits: respect Telegram API limits (30 msg/sec global, 1 msg/sec per chat)

---

## 📊 When Analyzing/Reporting

Structure reports as:
```
## Summary
[2-3 sentences]

## Findings
- Finding 1
- Finding 2

## Recommendations
1. Do X because Y
2. Fix Z

## Next Steps
- [ ] Action item 1
- [ ] Action item 2
```

---

## ⚠️ Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|------------------|
| White background UI | Always use dark theme (`#0a0e1a` base) |
| Ignoring Arabic RTL | Add `dir="rtl"` for AR language |
| Single language output | Always implement all 4 languages |
| Hardcoded API keys | Use `process.env.KEY_NAME` |
| Breaking existing features | Test before committing |
| Vague commit messages | Be specific: `fix: nav menu overflow on mobile` |

---

## 🔗 Quick Reference Links

- Main repo: https://github.com/7LVER10/yakamoz-catalog
- Live site: https://7lver10.github.io/yakamoz-catalog/
- Design system: [design-system.md](./design-system.md)
- Tech stack: [tech-stack.md](./tech-stack.md)
- Ecosystem: [yakamoz-ecosystem.md](./yakamoz-ecosystem.md)

---

*Updated: June 2026 | Maintained by 7LVER10*
