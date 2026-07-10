# Deployment Readiness Checklist

## A. Purpose

This document gives the operator a binary readiness assessment for the lead gen system. Every item is classified into one of three states:

- READY: verified and functional now
- REQUIRED: must be completed before cloud deployment
- DEFERRED: can wait until after first successful cloud launch

No item is marked READY unless it is verified in the current workspace with passing tests. No item is marked REQUIRED unless its absence would cause data loss, security exposure, or operational failure in cloud. Everything else is DEFERRED.

The operator's job is to convert all REQUIRED items to READY before deploying to cloud.

## B. Current Verified State

The system is a verified mock-level skeleton. The full pipeline has been exercised with 255 passing tests across 5 suites. No live integrations exist. No persistent storage exists. No external dependencies are required.

Verified pipeline: Telegram Adapter → Middleware (normalize, validate, dedup, policy-check, dispatch) → Lead Store + Logger → CPA Adapter Pattern (mock)

Modules verified: 19 source files across store, logger, middleware, telegram adapter, and CPA adapter pattern.

Test suites verified: test-lead-store (13), test-cpa-adapter (87), test-telegram-adapter (79), test-middleware (57), test-dispatch (19).

Status: ready for local mock testing. Not ready for cloud deployment.

## C. Code Readiness

Lead schema and state machine
- Status: READY
- Lead states: new, validated, pending_delivery, delivered, rejected, failed
- Transitions enforced: invalid transitions rejected
- Immutable fields enforced: id, createdAt, source, offerId
- Required fields enforced: offerId, contact

Lead store with dedup
- Status: READY
- CRUD operations: create, get, update, updateStatus
- Dedup by offerId + phone + email key
- In-memory only: REQUIRED to replace with persistent storage before cloud

Logger with PII masking
- Status: READY
- Append-only event logging
- PII masking on phone and email
- In-memory only: REQUIRED to replace with persistent logging before cloud
- Event types: 13 canonical types defined and used

Middleware pipeline
- Status: READY
- Stages: normalize, validate, dedup, policy-check, dispatch
- Correlation ID propagation verified
- No direct state mutation by middleware
- All stages log through logger

Dispatch layer
- Status: READY
- Policy gate: blocks dispatch if policy check fails
- Offer registry lookup: resolves offerId to networkId
- Adapter registry lookup: resolves networkId to adapter
- Config validation: adapter.validateConfig() before delivery
- Idempotency guard: leadId + offerId + networkId key
- Status mapping: delivered, retry_pending, rejected, error

CPA adapter pattern
- Status: READY (mock only)
- AdapterBase: abstract contract (validateConfig, deliver, mapLead)
- AdapterRegistry: register, get, has, list
- DeliveryResult: ok, reject, retryable factories
- AdapterError: error taxonomy with retryable classification
- MockAdapter: functional test/stub adapter
- Real CPA adapter: REQUIRED to implement at least one before cloud

Telegram adapter
- Status: READY (programmatic only)
- Update parsing: message type detection, text extraction
- Update cache: duplicate update_id prevention with TTL eviction
- Token validation: format check (numeric_id:alphanumeric_string)
- Language normalization: lowercase, 2-char truncation
- Lead extraction: /start command with offerId parameter
- Webhook integration: REQUIRED to implement before cloud

Policy check
- Status: READY (evaluation only)
- Rule evaluation: calls rule.evaluate(lead) when present
- Enforcement mapping: allow, warn, require_review, soft_pause, hard_pause, emergency_stop
- Severity model: info, caution, warning, critical
- Conflict resolution: more restrictive wins
- Policy packs: REQUIRED to define and load real policy packs before cloud

## D. Test Readiness

Unit tests
- Status: READY
- test-lead-store.js: 13 assertions, all pass
- test-cpa-adapter.js: 87 assertions, all pass

Integration tests
- Status: READY
- test-middleware.js: 57 assertions, all pass
- test-dispatch.js: 19 assertions, all pass

Adapter tests
- Status: READY
- test-telegram-adapter.js: 79 assertions, all pass

Total: 255 assertions, 0 failures.

Test gaps (REQUIRED before cloud):
- No end-to-end test with real CPA adapter (because no real adapter exists yet)
- No load/stress testing
- No concurrency testing (multiple simultaneous leads)
- No persistence testing (data survives restart)
- No webhook integration test
- No authentication test (no auth exists yet)
- No error recovery test (process crash mid-pipeline)

## E. Config Readiness

package.json
- Status: READY
- Test scripts defined for all 5 suites
- No external npm dependencies
- Entry point: src/index.js (TBD — not yet created)

bot-config.json
- Status: READY (skeleton only)
- Fields: botToken, webhookUrl, allowedChatTypes, maxMessageLength
- Runtime config loading: REQUIRED to implement before cloud

.env.example
- Status: READY (template only)
- Variables: TELEGRAM_BOT_TOKEN, webhook URL
- Secrets management: REQUIRED to move to proper secrets management before cloud

Offer registry
- Status: TBD
- No standalone offer registry module exists
- Offers are hardcoded in test fixtures
- REQUIRED to implement before cloud: offer registry module with offer definitions

Agent registry
- Status: TBD
- No agent registry module exists
- Referenced in foundation-spec.md (TBD)
- REQUIRED to implement before cloud if multi-agent orchestration is needed

Policy packs
- Status: TBD
- No real policy packs loaded
- Policy check evaluates rules but no rules are defined
- REQUIRED to define and load policy packs for target networks before cloud

## F. Runtime Readiness

Node.js runtime
- Status: READY
- Required: Node.js v18+
- No native modules
- No binary dependencies
- No build step

Process management
- Status: REQUIRED
- No process manager configured (PM2, systemd, or equivalent)
- No restart-on-crash configured
- No graceful shutdown handler
- Must be resolved before cloud deployment

Port binding / HTTP server
- Status: REQUIRED
- No HTTP server exists
- No port binding
- Required for Telegram webhook endpoint and dashboard
- Must be implemented before cloud deployment

HTTPS / TLS
- Status: REQUIRED
- Telegram webhooks require HTTPS
- No TLS configuration exists
- Must be resolved before cloud deployment (reverse proxy or native TLS)

Health check endpoint
- Status: REQUIRED
- No health check endpoint exists
- Required for load balancer integration
- Must be implemented before cloud deployment

Persistent storage
- Status: REQUIRED
- Lead store: in-memory Map — data lost on restart
- Logger: in-memory array — data lost on restart
- Dedup index: in-memory Map — dedup state lost on restart
- Must be replaced with database or file-based storage before cloud

## G. Observability Readiness

Logging
- Status: READY (in-memory only)
- Logger module functional with append-only events
- PII masking verified
- 13 canonical event types defined
- Persistent logging: REQUIRED before cloud (file or database backed)
- Log rotation: REQUIRED before cloud (prevent unbounded growth)

Log export
- Status: TBD
- No export mechanism exists
- Manual copy-paste only for MVP
- REQUIRED before cloud: at least file-based export or API endpoint

Alerting
- Status: REQUIRED
- No alert mechanism exists
- No email, Telegram, or webhook alerts for critical failures
- Must implement at least one alert channel before cloud

Metrics
- Status: DEFERRED
- No metrics collection (Prometheus, StatsD, etc.)
- No dashboards, no counters, no histograms
- Can be added after first successful cloud launch

Tracing
- Status: DEFERRED
- Correlation IDs propagate through middleware and dispatch
- No distributed tracing (OpenTelemetry, Jaeger, etc.)
- Correlation chain resolution is manual (logger query)
- Can be added after first successful cloud launch

Dashboard
- Status: TBD
- Spec exists: dashboard-control-panel-mvp.md
- No implementation
- REQUIRED before cloud: at minimum, the dashboard data layer (module status, lead counts, dispatch status, audit log access)

## H. Operator Readiness

Runbook
- Status: READY
- runbook.md exists with startup, verification, smoke test, failure handling, and safe stop procedures
- Verified against current codebase

Dashboard spec
- Status: READY (spec only)
- dashboard-control-panel-mvp.md exists
- No implementation
- Operator cannot yet view system state without log parsing

Manual control actions
- Status: TBD
- Pause/resume dispatch: not implemented
- Manual retry: not implemented
- Manual reject: not implemented
- REQUIRED before cloud: at least pause/resume and manual retry

Policy management
- Status: TBD
- No runtime policy editing
- No policy pack hot-reload
- Policy packs must be defined in code before cloud
- Runtime policy editing: DEFERRED

## I. External Dependency Readiness

Telegram Bot API
- Status: REQUIRED
- Bot token: not set (TELEGRAM_BOT_TOKEN empty)
- Webhook registration: not implemented
- Polling: not implemented
- Must obtain bot token and implement webhook before cloud

CPA network — LeadGid
- Status: TBD
- No adapter implementation
- Referenced in MVP network priority register
- REQUIRED to implement at least one real adapter before cloud

CPA network — SalesDoubler
- Status: TBD
- No adapter implementation
- Referenced in MVP network priority register
- DEFERRED: implement after LeadGid or as alternative

CPA network — Admitad
- Status: TBD
- No adapter implementation
- Policy pack referenced (policy-pack-network-admitad.md, TBD)
- DEFERRED: implement after first network is live

CPA network — MaxBounty
- Status: TBD
- No adapter implementation
- Policy pack referenced (policy-pack-network-maxbounty.md, TBD)
- DEFERRED: implement after first network is live

Offer registry
- Status: REQUIRED
- No standalone module
- Offers hardcoded in test fixtures
- Must implement offer registry with real offer definitions before cloud

DNS / domain
- Status: REQUIRED
- No domain configured
- Required for HTTPS webhook endpoint
- Must be resolved before cloud deployment

## J. Blockers Before Cloud Launch

These items block cloud deployment. All must be resolved. None are optional.

1. Persistent storage for leads
- Current: in-memory Map
- Required: database or file-based storage that survives process restart
- Impact without fix: all leads lost on every restart

2. Persistent logging
- Current: in-memory array
- Required: file or database-backed logging
- Impact without fix: all audit trail lost on every restart

3. At least one real CPA adapter
- Current: mock adapter only
- Required: functional adapter for LeadGid or equivalent
- Impact without fix: no actual lead delivery to any network

4. Telegram webhook integration
- Current: programmatic only, no webhook
- Required: HTTPS endpoint + webhook registration + update processing
- Impact without fix: no inbound lead reception from Telegram

5. Environment secrets management
- Current: .env.example template, no secrets
- Required: TELEGRAM_BOT_TOKEN stored securely, not in plaintext files
- Impact without fix: credential exposure risk

6. Process management
- Current: manual node execution
- Required: PM2, systemd, or equivalent with restart-on-crash
- Impact without fix: process dies and stays dead

7. HTTPS / TLS
- Current: none
- Required: for Telegram webhook and dashboard access
- Impact without fix: Telegram webhook cannot be registered (requires HTTPS)

8. Offer registry
- Current: no standalone module, hardcoded in tests
- Required: offer definitions with offerId → networkId mapping
- Impact without fix: dispatch cannot resolve offers

9. Policy packs
- Current: no real packs loaded
- Required: at least global rules + target network rules
- Impact without fix: all leads pass policy unchecked (no enforcement)

10. Alerting
- Current: none
- Required: at least one channel (email, Telegram, webhook) for critical failures
- Impact without fix: operator has no visibility into failures

11. Dashboard data layer
- Current: spec only
- Required: module status, lead counts, dispatch status, audit access
- Impact without fix: operator has no visibility into system state

12. Manual control actions
- Current: not implemented
- Required: pause/resume dispatch, manual retry
- Impact without fix: operator cannot intervene when something goes wrong

## K. Deferred Items

These items are not required for first cloud launch. They can be addressed after the system is running with real traffic.

Multi-network adapter support
- Admitad adapter
- MaxBounty adapter
- CPL Alliance adapter
- Deferred until first network is stable

Historical analytics
- Lead conversion tracking over time
- Network performance comparison
- Offer performance metrics
- Deferred until sufficient data volume

Dashboard UI
- Frontend implementation
- Charts and visualizations
- Real-time updates
- Deferred until data layer is stable

Batch operations
- Bulk lead processing
- Bulk retry
- Bulk reject
- Deferred until operator workflow is established

Policy hot-reload
- Runtime rule editing without restart
- Policy pack versioning
- Deferred until policy model is stable

Rate limiting
- Per-network rate limits
- Per-offer rate limits
- Backpressure handling
- Deferred until real traffic patterns are understood

Concurrency hardening
- Multiple simultaneous lead processing
- Race condition prevention
- Lock management
- Deferred until load patterns are known

Multi-tenancy
- Multiple operator accounts
- Role-based access control
- Audit per-operator
- Deferred until single-operator mode is proven

Log rotation and archival
- Automatic log file rotation
- Long-term log storage
- Log compression
- Deferred until log volume is understood

Graceful shutdown
- In-flight lead completion before exit
- Webhook deregistration on stop
- State snapshot before shutdown
- Deferred until process management is stable

Metrics export
- Prometheus endpoint
- StatsD integration
- Custom dashboards
- Deferred until observability needs are clearer

Distributed tracing
- OpenTelemetry integration
- Cross-service correlation
- Deferred until system is multi-service

Additional spec documents
- foundation-spec.md
- agent-registry-spec.md
- offer-registry-spec.md
- canonical-lead-schema-spec.md
- middleware-contract-spec.md
- cpa-adapter-pattern-spec.md
- knowledge-pack-spec.md
- launch-readiness-record.md
- network-policy-intake.md
- policy-pack-global-rules.md
- policy-pack-network-maxbounty.md
- policy-pack-network-admitad.md
- guardian-policy-binding-spec.md
- mvp-network-priority-register.md
- These existed in prior sessions but are not in current workspace. Recreating them is DEFERRED unless needed for a specific implementation step.

## L. Exact Next Step

The highest-leverage action to reduce blockers is implementing persistent logging. This is the foundation for observability, audit, alerting, and dashboard — four of the twelve blockers depend on it. Without persistent logging, no other blocker resolution produces a system the operator can trust.

Step: implement a file-based logger that writes events to data/logs/ as append-only files, with daily rotation and PII masking preserved. Keep the in-memory logger as a fast cache layer. Update tests to verify file output. This converts blocker 2 from REQUIRED to READY and unblocks blockers 10, 11, and partial blocker 12.
