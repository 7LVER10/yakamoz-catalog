# Agent Rebuild Brief

This document is a reconstruction contract. It defines exactly what exists, what works, what the boundaries are, and what to do next. Use it to rebuild this project in a clean workspace without loss of verified behavior.

Do not interpret. Do not improve. Reconstruct exactly, verify, then advance.

## 1. Mission

Build a modular AI-agent system for affiliate / referral / CPA lead gen. The system receives leads from Telegram, validates them, checks policy, and delivers them to CPA advertising networks. The goal is a stable, autonomous, legally careful, audit-safe system with no duplicates, no loose ends, and no chaos.

Current state: verified local pre-deploy snapshot. Persistent storage and logging. Dashboard data layer. Telegram runtime. Pipeline runtime entry point. Mock-only CPA delivery. 485 tests passing across 10 suites.

## 2. System Scope

In scope for current state:
- Inbound lead reception via Telegram adapter (parsing, dedup, extraction)
- Middleware pipeline: normalize, validate, dedup, policy-check, dispatch
- Persistent lead store with file-based storage, status transitions, and dedup
- Persistent append-only event logger with PII masking and daily file rotation
- CPA adapter pattern with mock adapter (no live network delivery)
- Policy evaluation framework (no real policy packs loaded)
- Dashboard data layer with snapshot generation
- Dashboard preview (static HTML with data.json)
- Config loader (.env and bot-config.json)
- Telegram runtime (local mode and polling mode)
- Pipeline runtime (single entry point wiring all modules)
- Operational documentation (runbook, readiness checklist, dashboard spec, packaging guide, human guide)

Not in scope for current state:
- Live CPA network submission
- Telegram webhook (polling mode exists, webhook does not)
- Dashboard HTTP server (static file only)
- Authentication or access control
- Alerting or notification channels
- Manual control actions (pause/resume/retry wired to runtime)
- Offer registry as standalone module (hardcoded in runtime)
- Policy packs for real networks
- Cloud deployment

## 3. Verified Architecture

The pipeline is linear. A lead enters through the Telegram adapter, passes through middleware, lands in the persistent store, gets dispatched through the CPA adapter pattern, and is logged to persistent files.

Inbound: Telegram Adapter (update-handler.js, update-cache.js, telegram.js)

Pipeline: Middleware (normalize.js, validate.js, policy-check.js, dispatch.js) orchestrated by middleware.js

Storage: Lead Store (lead-schema.js, lead-store.js, dedup-index.js) with FileStore (file-store.js) for persistence

Logging: Logger (logger.js, pii-mask.js, event-types.js) with FileSink (file-sink.js) for persistence

Outbound: CPA Adapter Pattern (adapter-base.js, adapter-registry.js, delivery-result.js, error-taxonomy.js, mock-adapter.js)

Dashboard: Dashboard data layer (dashboard.js)

Runtime: Pipeline Runtime (pipeline-runtime.js), Telegram Runtime (telegram-runtime.js), Config Loader (config-loader.js)

Data flow: Telegram update → update-handler parses → update-cache deduplicates by update_id → middleware normalizes phone/email, validates, checks dedup by offerId+phone+email, evaluates policy, dispatches to CPA adapter → adapter.deliver() returns DeliveryResult → logger records to memory and disk → lead persisted to disk via FileStore

No module mutates another module's state directly. Middleware reads and returns. Dispatch delegates and logs. Store is the only write path for lead state. FileStore and FileSink are passive persistence layers — they write what they are given, they do not make decisions.

## 4. Verified Modules

Store layer:
- lead-schema.js: defines LEAD_STATES (new, validated, pending_delivery, delivered, rejected, failed), LEAD_TRANSITIONS (enforced state machine), IMMUTABLE_FIELDS (id, createdAt, source, offerId), REQUIRED_FIELDS (offerId, contact), createLead() factory
- lead-store.js: in-memory Map storage with optional FileStore persistence, create(), get(), update(), updateStatus(), listByOffer(), list(), dedup by offerId+phone+email key, loads from disk on construction when FileStore provided
- dedup-index.js: simple Map-based key tracking, has(), add(), get()
- file-store.js: saves each lead as JSON file in data/leads/{leadId}.json, save(), load(), loadAll(), remove(), listIds(), count()

Logger layer:
- logger.js: append-only array with optional FileSink persistence, log(event, data), query(filter), all(), count(). File write failure does not crash logger.
- pii-mask.js: maskPhone() preserves first 3 and last 2 digits, maskEmail() preserves first and last char of local part
- event-types.js: 13 constants — lead_created, lead_status_changed, lead_duplicate_blocked, middleware_valid, middleware_invalid, middleware_normalized, policy_check, policy_blocked, dispatch_attempt, adapter_deliver, adapter_error, telegram_update, telegram_skipped
- file-sink.js: JSONL format (one JSON per line), daily file naming (logs-YYYY-MM-DD.jsonl), write(), readByDate(), readRange(), listDates(), totalEntries(), append-only, graceful malformed line handling

Middleware layer:
- middleware.js: orchestrates 5 stages, accepts {store, logger, policyPacks, offerRegistry, adapterRegistry}, setDispatch() wires outbound, process() is async
- normalize.js: normalizePhone() handles 8-to-+7 conversion, strips non-digit chars; normalizeEmail() trims and lowercases
- validate.js: checks REQUIRED_FIELDS presence, email format regex
- policy-check.js: iterates policy packs and rules, calls rule.evaluate(lead), maps severity (info/caution/warning/critical) and enforcement (allow/warn/require_review/soft_pause/hard_pause/emergency_stop), more restrictive wins
- dispatch.js: createDispatch() factory returns async dispatch function with getLog() and getEntries() methods, checks policy approval, resolves offer→networkId→adapter, validates adapter config, idempotency guard by leadId+offerId+networkId key, calls adapter.deliver(), maps DeliveryResult to dispatchStatus (delivered/retry_pending/rejected/error/skipped/offer_not_found/no_adapter/adapter_config_invalid/idempotent_hit)

Telegram adapter layer:
- update-handler.js: handleUpdate() detects type (message/unsupported), rejects non-message and no-text, extracts offerId from /start command, normalizes language code, returns {action: 'process'|'skip', lead?, reason?}
- update-cache.js: Map-based update_id tracking with TTL eviction (default 1 hour)
- telegram.js: TelegramAdapter class, validateToken() checks numeric_id:alphanumeric format, init() sets status, processUpdate() chains cache dedup → handleUpdate → middleware.process(), tracks status counters (updatesProcessed, updatesSkipped, leadsCreated, errors)

CPA adapter pattern layer:
- adapter-base.js: abstract class, constructor(config), abstract validateConfig()/deliver()/mapLead()
- adapter-registry.js: Map-based register(networkId, adapter), get(), has(), list()
- delivery-result.js: static factories ok(data, adapterId, leadId), reject(error, adapterId, leadId), retryable(error, adapterId, leadId); fields: success, retryable, error, data, adapterId, leadId, timestamp
- error-taxonomy.js: ERROR_TYPES (transport/timeout/rejection/mapping/config/unknown), RETRYABLE_ERRORS (transport/timeout), AdapterError extends Error with type/detail/isRetryable()
- mock-adapter.js: extends AdapterBase, failNext control (null/reject/retryable/error), deliveryLog tracking, mapLead() maps to externalId/email/phone/offerId

Dashboard layer:
- dashboard.js: Dashboard class, accepts {store, logger, adapterRegistry, offerRegistry, dispatchFn}, read-only data aggregation. Methods: getLeads(), getLeadCounts(), getLeadDetail(id), getDispatchLog(), getDispatchCounts(), getModuleStatus(), getPolicySummary(), getRecentAlerts(limit), getSnapshot(). No mutations. No direct file I/O.

Runtime layer:
- config-loader.js: loadConfig() reads from .env file and config/bot-config.json with override support, validateConfig() checks bot token format. No external dependencies.
- telegram-runtime.js: TelegramRuntime class, manages TelegramAdapter lifecycle. Modes: local (feed updates programmatically) and polling (Telegram Bot API getUpdates via Node.js https). Methods: init(), start(), stop(), feedUpdate(), feedUpdates(), getStatus().
- pipeline-runtime.js: PipelineRuntime class, main composition layer. Wires all modules: Logger+FileSink, LeadStore+FileStore, AdapterRegistry+MockAdapter, OfferRegistry, Dispatch, Middleware, TelegramRuntime, Dashboard. Supports persistent and in-memory modes. Methods: init(), start(), stop(), processLead(), feedUpdate(), feedUpdates(), getDashboardSnapshot(), getDashboard(), getStatus(), getStore(), getLogger().

## 5. Verified Test State

Total: 485 assertions, 0 failures across 10 suites.

test-lead-store.js: 13 assertions. Covers create, get, updateStatus, invalid transition rejection, immutable field rejection, duplicate detection, no false duplicate, listByOffer, logger correlation, PII phone masking, PII email masking.

test-cpa-adapter.js: 87 assertions. Covers DeliveryResult factories and defaults, all 6 ERROR_TYPES, retryable classification, AdapterError fields and inheritance, registry register/lookup/has/list/overwrite, MockAdapter success/reject/retryable/error/config/mapLead/deliveryLog, AdapterBase abstract methods, custom adapter with config validation.

test-telegram-adapter.js: 79 assertions. Covers UpdateCache add/has/dedup/eviction, handleUpdate for valid message/no text/empty text/edited_message/callback_query/inline_query/null/missing update_id, language normalization, extractOfferId, detectType, token validation, init success/failure, adapter processUpdate for valid message/duplicate/no text/unsupported, correlation propagation, multiple messages same user, language normalization in lead, status tracking, adapter without middleware, logger records skips.

test-middleware.js: 57 assertions. Covers full pipeline: valid lead with normalization, missing field rejection, duplicate rejection, policy blocking, approved lead delivery, correlation ID preservation and auto-generation, dispatch status mapping, no unsafe mutation, offer not found, pipeline without dispatch, PII masking in logs, full log trace.

test-dispatch.js: 19 assertions. Covers approved lead delivery, policy-blocked lead skipped, offer not found, no adapter, adapter config invalid, idempotency hit, retryable result, reject result, adapter throw, correlation ID in dispatch log, PII masking in dispatch log.

test-dashboard.js: 50 assertions. Covers getLeads empty/populated, getLeadCounts by status, status transitions reflected, getLeadDetail with fields and null for nonexistent, getDispatchLog entries, getDispatchCounts breakdown, getModuleStatus all modules present and stats correct, getPolicySummary from logger events, getRecentAlerts with severity and limit, getSnapshot complete structure, store.list(), dispatchFn.getLog()/getEntries(), graceful degradation with null modules.

test-persistent-logger.js: 38 assertions. Covers FileSink directory creation, write/read, append behavior, readByDate, readByDate empty, listDates, readRange across days, totalEntries across files, malformed JSONL handling, Logger+FileSink integration, Logger without FileSink backward compatible, PII masking preserved on disk, file write failure resilience, shared FileSink, Logger query with FileSink, daily rotation, seq preservation, timestamp preservation.

test-persistent-store.js: 39 assertions. Covers FileStore directory creation, save/load, load null for missing, loadAll, save overwrites, remove, listIds, count, malformed JSON handling, LeadStore+FileStore create persists, restart loads leads, restart dedup, status persist to disk, invalid transition still rejected, immutable fields still protected, LeadStore without FileStore backward compatible, LeadStore with logger-only constructor, file write failure resilience, multiple transitions persist, metadata persist.

test-telegram-runtime.js: 49 assertions. Covers config defaults, config file loading, config overrides, validateConfig valid/missing/invalid format/bot id/short token/polling without token, runtime init success/invalid, start/stop lifecycle, auto-init, double start, stop not running, feedUpdate valid/dup/no-text, feedUpdates batch, getStatus completeness, feedUpdate before init, no middleware mode.

test-pipeline-runtime.js: 54 assertions. Covers init creates all modules, persistent/non-persistent init, start/stop lifecycle, auto-init, double start, stop not running, processLead through full pipeline, processLead persists to disk, feedUpdate through adapter, getDashboardSnapshot from real data, getStatus system-wide, leads survive restart, dedup across restart, dashboard reads from persistent store after restart, getStore/getLogger, multiple leads through pipeline.

## 6. Critical Behaviors That Must Be Preserved

Lead state machine: new→validated→pending_delivery→delivered (happy path). new→validated→rejected (policy). pending_delivery→failed→pending_delivery (retry). Terminal states (delivered, rejected) have no outbound transitions.

Immutable fields: id, createdAt, source, offerId cannot be modified after creation. Any attempt must throw.

Dedup key: offerId + phone + email, lowercased. Two leads with the same offerId and same empty phone/email are duplicates. Dedup must survive restart — when leads are loaded from FileStore, the dedup index is rebuilt.

Correlation ID: every lead gets one. If not provided, auto-generated with corr_ prefix. Propagates through all middleware stages and all log entries.

PII masking: phone shows first 3 and last 2 digits. Email shows first and last char of local part. Masking at logger level, not store level. Store contains raw data. Logger contains masked data. PII must not appear in FileSink output.

Dispatch idempotency: key is leadId + offerId + networkId. DispatchFn exposes getLog() and getEntries() for dashboard consumption.

Policy conflict resolution: more restrictive wins. Ambiguous cases escalate.

Error taxonomy: transport and timeout are retryable. rejection, mapping, config, and unknown are not retryable.

Adapter contract: every adapter must implement validateConfig(), deliver(lead, campaign), and mapLead(lead).

No module directly mutates another module's internals. Middleware returns results. Dispatch delegates to adapters. Store is the single write authority for lead state.

FileStore and FileSink must not crash the system on write failure. Errors are caught, data remains in memory.

Logger constructor must work without arguments (backward compatible). LeadStore constructor must accept both old format (logger instance) and new format (options object with logger and/or fileStore).

PipelineRuntime in local mode without bot token must still start and process leads. TelegramRuntime initialization failure must not block the pipeline.

## 7. Known Gaps And Non-Goals

Gaps (must be addressed before cloud):
- No real CPA adapter. Mock only. No actual lead delivery.
- No Telegram webhook. Polling mode exists but needs real bot token and HTTPS.
- No dashboard HTTP server. Static HTML file with generated JSON only.
- No authentication. No access control. No secrets management.
- No process management. No restart-on-crash.
- No HTTPS. No TLS.
- No offer registry module. Hardcoded in pipeline runtime.
- No policy packs loaded. Policy check evaluates but finds nothing.
- No alerting. No notification channel for failures.
- No manual control actions wired to runtime. Dashboard buttons are UI placeholders.
- No .gitignore for data/ directories.

Non-goals (explicitly out of scope):
- Multi-tenancy
- Role-based access control
- Historical analytics
- Chart visualizations
- Mobile responsiveness
- Batch operations
- Policy hot-reload
- Rate limiting
- Concurrency hardening
- Graceful shutdown (signal handling)
- Metrics export
- Distributed tracing
- TypeScript
- CI/CD pipeline
- Docker containerization
- UI framework

## 8. Files That Must Exist

25 source files:
- src/store/lead-schema.js
- src/store/lead-store.js
- src/store/dedup-index.js
- src/store/file-store.js
- src/logger/logger.js
- src/logger/pii-mask.js
- src/logger/event-types.js
- src/logger/file-sink.js
- src/middleware/middleware.js
- src/middleware/normalize.js
- src/middleware/validate.js
- src/middleware/policy-check.js
- src/middleware/dispatch.js
- src/adapter/telegram.js
- src/adapter/update-handler.js
- src/adapter/update-cache.js
- src/adapter/cpa/adapter-base.js
- src/adapter/cpa/adapter-registry.js
- src/adapter/cpa/delivery-result.js
- src/adapter/cpa/error-taxonomy.js
- src/adapter/cpa/mock-adapter.js
- src/config/config-loader.js
- src/dashboard/dashboard.js
- src/runtime/telegram-runtime.js
- src/runtime/pipeline-runtime.js

10 test files:
- tests/test-lead-store.js
- tests/test-cpa-adapter.js
- tests/test-telegram-adapter.js
- tests/test-middleware.js
- tests/test-dispatch.js
- tests/test-dashboard.js
- tests/test-persistent-logger.js
- tests/test-persistent-store.js
- tests/test-telegram-runtime.js
- tests/test-pipeline-runtime.js

3 config files:
- package.json
- .env.example
- config/bot-config.json

Preview files (not required for tests but required for dashboard):
- preview/dashboard.html
- preview/generate-data.js

Missing any source or test file breaks the system. The test suite will fail if any file is missing or modified incorrectly.

## 9. Operational Documents That Must Be Preserved

- runbook.md: startup sequence, verification sequence, smoke test sequence, failure handling, safe stop, pre-cloud preparation
- deployment-readiness-checklist.md: 12 blockers before cloud, 12 deferred items, current readiness state per category
- dashboard-control-panel-mvp.md: 4 core views, manual control actions, audit visibility, data sources, MVP limits
- middleware-outbound-dispatch-implementation.md: dispatch integration spec, processing flow, idempotency model, logging contract
- repo-packaging-and-local-bootstrap.md: file list, folder structure, bootstrap sequence, Git initialization
- human-guide.md: plain-language onboarding for non-technical operators
- agent-rebuild-brief.md: this document

These 7 docs plus the 25 source files, 10 test files, 3 config files, and 2 preview files are the complete project.

## 10. Reconstruction Rules

Rule 1: do not rewrite what works. If a module passes its tests, leave it alone. Reconstruct the structure, verify with tests, then advance.

Rule 2: tests are the specification. If the behavior is documented in a test, the test is the authority. If the test and a spec disagree, the test wins.

Rule 3: no live integrations during reconstruction. Use mock adapters. Do not call Telegram API. Do not call CPA network APIs. Reconstruct locally, verify, then connect.

Rule 4: preserve the module boundaries. Store handles state. Logger handles events. Middleware orchestrates. Adapters handle external I/O. Dashboard aggregates read-only. Runtime composes. Do not merge these responsibilities.

Rule 5: preserve the state machine. Lead transitions are enforced. Invalid transitions throw. Terminal states are terminal.

Rule 6: preserve PII masking. Logger and FileSink output must never contain raw phone numbers or email addresses.

Rule 7: preserve idempotency. Dispatch must not call an adapter twice for the same lead+offer+network combination.

Rule 8: do not add external dependencies without explicit reason. The system currently has zero npm dependencies. Every addition must be justified.

Rule 9: all new modules must have tests. No module enters the codebase without a corresponding test file.

Rule 10: npm test must always pass 485 assertions (or more if new tests are added). Never reduce the assertion count. Never skip tests.

Rule 11: FileStore and FileSink must not crash the system on write failure. All file I/O must be wrapped in try/catch.

Rule 12: Logger and LeadStore constructors must remain backward compatible. Logger works without FileSink. LeadStore works without FileStore. Passing a logger instance directly to LeadStore must still work.

Rule 13: PipelineRuntime must start in local mode without a bot token. TelegramRuntime initialization failure must not block the pipeline.

## 11. Safe Next Roadmap

Phase 1 — Observability (mostly complete):
- File-based logger with daily rotation — DONE
- Dashboard data layer — DONE
- Dashboard preview — DONE (static HTML, needs HTTP server)
- Module status methods — DONE (via dashboard getModuleStatus)
- Manual control actions (pause/resume/retry) — TBD, spec exists

Phase 2 — Real delivery:
- Implement offer registry as standalone module (currently hardcoded)
- Implement LeadGid adapter (first real CPA network adapter)
- Add policy packs for LeadGid
- Integration test with mock HTTP server simulating LeadGid API

Phase 3 — Real inbound:
- Telegram polling with real bot token (runtime supports this, needs config)
- Telegram webhook endpoint (not yet implemented)
- HTTPS/TLS for webhook
- Integration test with Telegram test bot

Phase 4 — Cloud hardening:
- Process management (PM2 or systemd)
- Secure credential storage (replace plain .env)
- Alerting (at least one channel: email or Telegram notification)
- Dashboard HTTP server (serve preview over HTTP)
- .gitignore for data/ directories

Phase 5 — Post-launch:
- Additional CPA network adapters (SalesDoubler, Admitad, MaxBounty)
- Policy hot-reload
- Rate limiting
- Historical analytics
- Log rotation and archival

Phase 1 is complete. Phase 2 and Phase 3 are independent of each other. Phase 4 requires Phase 2 or Phase 3 to be meaningful. All phases must be complete before cloud launch.

## 12. Exact Next Step

Reconstruct the 38 source/config/preview files and 10 test files in a clean workspace. Run npm test. Confirm 485 assertions pass. Then run node preview/generate-data.js and open preview/dashboard.html to verify the dashboard.

Then proceed to Phase 2: implement a real CPA network adapter. The mock adapter proves the pipeline works. A real adapter makes the system useful.

Do not skip verification. Do not deploy to cloud before all phases are complete.
