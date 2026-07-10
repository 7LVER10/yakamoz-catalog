# Human Guide

Welcome. This document is for you if you just opened this project and want to understand what it is, what works, and what to do next — without reading eight technical spec documents.

## 1. What This Project Is

This is a system that receives potential customer leads (from Telegram), checks them against rules, and sends them to advertising networks where you get paid per lead. Think of it as an automated middleman: someone messages your Telegram bot, the system captures their info, makes sure it is valid and not a duplicate, checks policy rules, and delivers it to a CPA (cost-per-action) network.

It is not finished, but it is no longer just a skeleton. The core pipeline works. Data persists to disk. A dashboard shows you what is happening. You can start the system as a single process on your machine. What is missing is real network connections — real Telegram bots and real advertising networks.

## 2. What Is Already Built

The system has 485 automated tests across 10 test suites, all passing. Here is what exists:

The core pipeline — a Telegram adapter that receives messages, a middleware pipeline that normalizes, validates, deduplicates, checks policy, and dispatches leads. A lead store that tracks every lead's lifecycle. A logger that records every event with personal info automatically masked.

Persistent storage — leads are saved as individual JSON files on disk. If you restart the system, all leads are loaded back automatically. Logs are written to daily files. Nothing is lost on restart.

A dashboard — a visual preview you can open in your browser. It shows lead counts, dispatch results, module health, alerts, and lets you click through to see individual lead details. The data comes from the real running system, not hardcoded demos.

A Telegram runtime — the system can start in local mode (you feed updates programmatically) or polling mode (it connects to the Telegram Bot API and listens for real messages). You need a bot token for polling mode, but local mode works without one.

A pipeline runtime — a single entry point that wires everything together. One command starts the whole system: store, logger, middleware, dispatch, adapters, and dashboard. Persistence is enabled by default.

A CPA adapter pattern — the framework for connecting to advertising networks. Right now only a mock adapter exists. It pretends to deliver leads and returns success. Real adapters need to be built for each network.

Documentation — a runbook for operating the system, a deployment readiness checklist, a dashboard spec, a repo packaging guide, and this document.

## 3. How The System Works

Start the system using the pipeline runtime. It initializes all modules, loads any existing leads from disk, and is ready to process.

A lead enters through the Telegram adapter (either from a real Telegram update or from a programmatic feed). The adapter reads the message, extracts the person's info, and passes it into the middleware pipeline.

The middleware normalizes phone numbers and emails. Then validates required fields. Then checks for duplicates against all leads already stored (including ones loaded from a previous session). Then runs policy checks. Then dispatches to an advertising network adapter.

Every step is logged to both memory and disk. Every lead gets a correlation ID so you can trace its full journey.

The dashboard reads from the live store and logger. When you open it in a browser, you see the current state of the system — not a snapshot from when it started.

## 4. What You Can Test Right Now

You can run the full test suite: npm test

You should see 485 tests pass with zero failures across 10 suites. This confirms every module works correctly, including persistence, dashboard, and runtime.

You can generate a dashboard preview: node preview/generate-data.js

This runs demo leads through the real pipeline with persistence enabled, then writes a snapshot to preview/data.json. Open preview/dashboard.html in a browser to see the result.

You can start the system as a process using the pipeline runtime. It starts in local mode by default — no bot token needed. You can feed updates programmatically and see leads appear in the store and on disk.

You cannot yet test with a real Telegram bot that receives messages from actual users. You cannot yet send leads to a real advertising network. Both require additional work described in the readiness checklist.

## 5. What Is Not Connected Yet

Real Telegram integration. The polling mode exists and can connect to the Telegram Bot API, but you need a bot token configured in .env. No webhook mode exists yet — only polling.

Real advertising networks. The mock adapter always succeeds. There are no real adapters for LeadGid, SalesDoubler, Admitad, MaxBounty, or any other network. Those need to be built one by one.

The dashboard is a static HTML file that reads from a generated JSON snapshot. It does not auto-refresh. You need to re-run the generator to update it. A live HTTP server for the dashboard has not been built yet.

Policy rules. The policy checking system works, but no real rules are loaded. The system lets everything through. Real rules for each network need to be defined.

Alerting. There is no way for the system to tell you something went wrong automatically. No email, no Telegram notification. You find out by checking the dashboard or logs manually.

Manual controls. The dashboard shows pause/resume/retry/reject buttons, but they are UI placeholders. The actual control actions have not been wired to the runtime.

## 6. How To Run It Locally

Make sure you have Node.js version 18 or newer. Check: node --version

Copy all project files to a folder on your machine.

Run: npm install — completes quickly, the project has zero external dependencies.

Run: npm test — you should see 485 tests pass.

To generate dashboard data: node preview/generate-data.js — then open preview/dashboard.html in a browser.

To start the system as a process: the pipeline runtime (src/runtime/pipeline-runtime.js) wires all modules together. It starts in local mode with persistence enabled. You can feed leads through it programmatically.

For Telegram polling: create a .env file with TELEGRAM_BOT_TOKEN set to your bot token, then start the runtime in polling mode. The system will connect to the Telegram API and process incoming messages.

## 7. What The Dashboard Shows

The dashboard has four tabs:

Leads — a list of all leads with their status (new, validated, delivered, rejected, failed), the offer they came from, dispatch result, and action buttons. You can click a lead to see full details.

Dispatch — a log of all delivery attempts: which lead went to which network, what happened (delivered, rejected, error, retry pending), and per-adapter performance counts.

Modules — health status of each system component: Lead Store, Logger, Middleware, Adapter Registry, Dispatch. Shows lead count, event count, registered adapters.

Policy/Alerts — a summary of policy checks (approved vs blocked) and recent alerts sorted by severity (critical, warning, info).

The data comes from the real running system. If leads have been processed, you see them. If nothing has happened, you see empty states.

## 8. What Will Be Needed Before Cloud Launch

The deployment-readiness-checklist.md has the complete list. Here is the summary:

Resolved (already done):
- Persistent storage for leads — done, files on disk
- Persistent logging — done, daily JSONL files
- Dashboard — done, data layer and preview exist

Still needed:
- At least one real advertising network adapter
- Telegram webhook or polling with real bot
- Secure credential storage (not plain .env)
- Process management (auto-restart on crash)
- HTTPS/TLS for webhook endpoint
- An offer registry module (currently hardcoded)
- Policy rules for target networks
- Alerting channel (email or Telegram notification)
- Dashboard live HTTP server (currently static)
- Manual control actions wired to runtime

## 9. What To Save And Not Lose

The source files (25 in src/), test files (10 in tests/), config files (3), and documentation files (8 .md files) are the complete project. Back them all up.

The 485 tests are the proof that the system works. If you lose the tests, you cannot verify anything.

The most important file is package.json — it defines the test script that runs all 10 suites.

When you set up Git, make your first commit contain everything with all tests passing. That commit is your known-good starting point.

## 10. Exact Next Step

If you have not done so yet: copy all files to your machine, run npm install, run npm test, confirm 485 tests pass. Then run node preview/generate-data.js and open preview/dashboard.html in a browser to see the dashboard.

If that is done: the most valuable next step is implementing a real CPA network adapter (LeadGid or SalesDoubler) so the system can actually deliver leads somewhere. The mock adapter proves the pipeline works, but real delivery is what makes the system useful. Read deployment-readiness-checklist.md for the full blocker list. Read runbook.md for operational procedures.
