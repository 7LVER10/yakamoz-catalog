# 🔄 HERMES — N8N Business Automation Workflows

> **Skill #6 of HERMES:** 31 ready-to-build N8N workflow agents for business automation.
> Priority: **A = must-have (now)**, **B = important (soon)**, **C = nice-to-have (later)**

Source: YAKAMOZ internal table (Tablica.txt)

---

## 📊 Summary

| Total | Priority A | Priority B | Priority C |
|-------|-----------|-----------|------------|
| 31 workflows | 11 | 14 | 6 |

---

## 🟥 Priority A — Must-Have (Build First)

| ID | Workflow | Description |
|----|----------|-------------|
| 1 | `smb-router` | Main router — entry point, directs tasks to correct workflow |
| 2 | `smb-onboard` | Business onboarding — new client/partner setup |
| 3 | `business-pulse` | Business pulse — daily health check of key metrics |
| 7 | `cash-flow-snapshot` | Cash flow snapshot — real-time financial position |
| 11 | `invoice-chase` | Invoice chasing — automated follow-up on unpaid invoices |
| 12 | `close-month` | Month close — end-of-month financial closing procedure |
| 17 | `lead-triage` | CRM lead triage — qualify and route incoming leads |
| 25 | `customer-pulse` | Customer pulse — monitor customer satisfaction |
| 27 | `handle-complaint` | Handle complaint — automated complaint resolution flow |
| 30 | `contract-review` | Contract review — AI-powered contract analysis |

---

## 🟡 Priority B — Important (Build Soon)

| ID | Workflow | Description |
|----|----------|-------------|
| 4 | `monday-brief` | Monday brief — weekly kickoff summary for the team |
| 5 | `friday-brief` | Friday brief — weekly results summary and planning |
| 6 | `month-heads-up` | Month heads-up — upcoming deadlines and events alert |
| 8 | `margin-analyzer` | Margin analyzer — product/service margin calculation |
| 9 | `price-check` | Price check — competitive pricing intelligence |
| 13 | `month-end-prep` | Month-end prep — prepare documents before month close |
| 14 | `quarterly-review` | Quarterly review — automated Q1/Q2/Q3/Q4 report |
| 15 | `tax-prep` | Tax prep — collect and organize tax documents |
| 18 | `call-list` | CRM call list — daily sales call priority list |
| 19 | `crm-cleanup` | CRM cleanup — deduplicate and clean CRM records |
| 21 | `content-strategy` | Content strategy — AI-generated content plan |
| 22 | `sales-brief` | Sales brief — daily sales team briefing |
| 26 | `customer-pulse-check` | Customer pulse check — periodic satisfaction survey |
| 28 | `ticket-deflector` | Ticket deflector — auto-resolve common support tickets |
| 29 | `job-post-builder` | Job post builder — generate job descriptions from role specs |
| 31 | `review-contract` | Review contract — secondary contract review pipeline |

---

## 🟢 Priority C — Nice-to-Have (Build Later)

| ID | Workflow | Description |
|----|----------|-------------|
| 10 | `plan-payroll` | Payroll planning — salary calculation and scheduling |
| 16 | `tax-season-organizer` | Tax season organizer — full tax season management system |
| 20 | `crm-maintenance` | CRM maintenance — ongoing CRM health and data quality |
| 23 | `run-campaign` | Run campaign — launch and monitor marketing campaigns |
| 24 | `canva-creator` | Canva creator — auto-generate visual content via Canva API |

---

## 🏗️ Build Order (Recommended)

```
Phase 1 — Core Infrastructure (Week 1-2)
  ├─ smb-router        # Must build first — routes everything
  ├─ smb-onboard       # Onboard new clients
  └─ business-pulse    # Daily health check

Phase 2 — Finance Automation (Week 2-3)
  ├─ cash-flow-snapshot
  ├─ invoice-chase
  └─ close-month

Phase 3 — CRM & Sales (Week 3-4)
  ├─ lead-triage
  ├─ call-list
  └─ crm-cleanup

Phase 4 — Customer & Support (Week 4-5)
  ├─ customer-pulse
  ├─ handle-complaint
  └─ ticket-deflector

Phase 5 — Reporting & Planning (Week 5-6)
  ├─ monday-brief
  ├─ friday-brief
  ├─ month-end-prep
  └─ contract-review

Phase 6 — Advanced (After core is stable)
  ├─ content-strategy
  ├─ run-campaign
  ├─ canva-creator
  └─ tax-season-organizer
```

---

## ⚙️ N8N Implementation Rules for HERMES

1. **Every workflow starts with a Webhook or Schedule trigger** — never manual-only
2. **Node names must be descriptive** — e.g. `Check Invoice Status`, NOT `HTTP Request 3`
3. **Every workflow has an Error Handler node** — connected to Telegram notification
4. **All API keys via N8N Credentials** — never in node parameters as plain text
5. **Each workflow has a notes field** explaining what it does and when it runs
6. **Telegram notification on completion** — for all Priority A workflows
7. **Test with small dataset first** — before activating on production

---

## 💬 N8N Agent Node System Prompt for HERMES

When building any of these workflows, use this context in the N8N AI Agent node:

```
You are HERMES, N8N automation specialist for YAKAMOZ ecosystem.
Owner: 7LVER10 (Istanbul, TR).
Language: Russian (primary), Turkish, English.

You are currently working on workflow: [WORKFLOW_NAME]
Context: [WORKFLOW_DESCRIPTION]

Rules:
- All user-facing messages in Russian first, then Turkish if needed
- Financial data formatted with Turkish Lira (₺) by default
- Dates in DD.MM.YYYY format
- Error messages must include timestamp and workflow name
- Always send Telegram notification when workflow completes (Priority A workflows)

Knowledge base: https://github.com/7LVER10/yakamoz-catalog/blob/main/HERMES.md
```

---

## 🔗 Related Files

- [HERMES.md](../HERMES.md) — full super-agent config
- [AGENTS.md](../AGENTS.md) — agent knowledge base index
- [tech-stack.md](./tech-stack.md) — N8N setup and integrations
- [agent-guidelines.md](./agent-guidelines.md) — N8N workflow rules

---

*31 workflows | 3 priority levels | YAKAMOZ Business Automation Suite*
*Owner: 7LVER10 | Updated: June 2026*
