# Runbook

## A. Purpose

This document gives the operator a precise, step-by-step procedure for running the lead gen system in local/mock mode. It covers startup, verification, smoke testing, failure handling, safe shutdown, and preparation for cloud deployment.

This is a pre-launch runbook. The system is not production. It is a verified skeleton with mock delivery. Treat it accordingly.

## B. Current System Scope

The system is a modular AI-agent pipeline for affiliate/referral/CPA lead gen. Current status:

- Inbound: Telegram Adapter (update parsing, dedup, lead extraction)
- Pipeline: Middleware (normalize, validate, dedup, policy-check, dispatch)
- Storage: Lead Store (in-memory, with dedup index)
- Logging: Logger (append-only, PII-masked, in-memory)
- Outbound: CPA Adapter Pattern (mock adapter only — no live network delivery)
- Policy: Manual enforcement model (guardian recommends, operator executes)

Verified pipeline flow: Telegram Adapter → Middleware → Lead Store + Logger → CPA Adapter Pattern (mock)

Total verified tests: 255 across 5 suites, all passing.

Not included: live Telegram webhook, live CPA network submission, persistent storage, authentication, dashboard UI, cloud deployment.

## C. Required Local Files

The following files must be present in the workspace for the system to function:

Source modules (19 files):
- src/store/lead-schema.js
- src/store/lead-store.js
- src/store/dedup-index.js
- src/logger/logger.js
- src/logger/pii-mask.js
- src/logger/event-types.js
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

Test suites (5 files):
- tests/test-lead-store.js
- tests/test-middleware.js
- tests/test-telegram-adapter.js
- tests/test-cpa-adapter.js
- tests/test-dispatch.js

Configuration:
- package.json
- config/bot-config.json
- .env.example

Specification documents:
- foundation-spec.md (TBD — referenced in archive but not in workspace)
- agent-registry-spec.md (TBD)
- offer-registry-spec.md (TBD)
- canonical-lead-schema-spec.md (TBD)
- middleware-contract-spec.md (TBD)
- cpa-adapter-pattern-spec.md (TBD)
- knowledge-pack-spec.md (TBD)
- launch-readiness-record.md (TBD)
- network-policy-intake.md (TBD)
- policy-pack-global-rules.md (TBD)
- policy-pack-network-maxbounty.md (TBD)
- policy-pack-network-admitad.md (TBD)
- guardian-policy-binding-spec.md (TBD)
- mvp-network-priority-register.md (TBD)
- middleware-outbound-dispatch-implementation.md
- dashboard-control-panel-mvp.md

If any source module or test file is missing, the system will fail to import. Run the verification sequence (section F) to confirm all files are present.

## D. Environment Inputs

The system requires these environment inputs for MVP:

Required:
- TELEGRAM_BOT_TOKEN: Telegram bot token in format numeric_id:alphanumeric_string. Without this, the Telegram Adapter will not initialize. For mock-only testing, a syntactically valid but non-functional token is sufficient (e.g., 123456:ABCdefGHIjklMNOpqrSTUvwxYZ).

Optional (TBD):
- CPA network credentials: not needed for mock adapter. TBD when real adapters are implemented.
- Policy pack paths: not needed for MVP. Policy packs are loaded as code, not from env.
- Webhook URL: not needed for MVP. No live Telegram webhook.

To set environment inputs:
- Copy .env.example to .env
- Fill in TELEGRAM_BOT_TOKEN
- Source the .env file or export variables directly

For mock-only testing, no .env file is required. The system runs without it. The Telegram Adapter will report token validation failure if initialized without a valid token, but all other modules function independently.

## E. Local Startup Sequence

Step 1: Confirm Node.js version
- Required: Node.js v18 or later (system uses CommonJS modules)
- Check: node --version

Step 2: Confirm all files present
- Run: ls src/store/ src/logger/ src/middleware/ src/adapter/ src/adapter/cpa/ tests/
- All 19 source files and 5 test files must be present

Step 3: Install dependencies
- Run: npm install
- The system has zero external npm dependencies for MVP. This step is a formality. If package.json is present, npm install will succeed with nothing to install.

Step 4: Run full test suite
- Run: npm test
- Expected: 255 tests pass, 0 fail
- If any test fails, do not proceed. See Failure Handling (section H).

Step 5: System is ready
- After all tests pass, the system is in a verified state.
- No server starts. No port binds. No webhook registers.
- The system is a library, not a running process. It activates when called.

## F. Verification Sequence

Verification confirms that all modules import correctly and the pipeline is intact. Run this after any file change, environment change, or restart.

Verification step 1: Full test suite
- Run: npm test
- Expected: 255 passed, 0 failed
- This exercises: lead store, middleware integration, telegram adapter, CPA adapter pattern, dispatch layer

Verification step 2: Module import check
- Run: node -e "require('./src/store/lead-store'); require('./src/logger/logger'); require('./src/middleware/middleware'); require('./src/adapter/telegram'); require('./src/adapter/cpa/mock-adapter'); require('./src/middleware/dispatch'); console.log('All imports OK')"
- Expected: "All imports OK" printed, no errors

Verification step 3: Pipeline wiring check
- Run: node -e "
  const { Middleware } = require('./src/middleware/middleware');
  const { LeadStore } = require('./src/store/lead-store');
  const { Logger } = require('./src/logger/logger');
  const { AdapterRegistry } = require('./src/adapter/cpa/adapter-registry');
  const { MockAdapter } = require('./src/adapter/cpa/mock-adapter');
  const { createDispatch } = require('./src/middleware/dispatch');
  const logger = new Logger();
  const store = new LeadStore(logger);
  const ar = new AdapterRegistry();
  ar.register('net_mock', new MockAdapter());
  const mw = new Middleware({ store, logger, offerRegistry: { get: () => null }, adapterRegistry: ar });
  mw.setDispatch(createDispatch({ offerRegistry: { get: () => null }, adapterRegistry: ar, logger }));
  console.log('Pipeline wiring OK');
"
- Expected: "Pipeline wiring OK" printed, no errors

If any verification step fails, do not proceed to smoke testing. See Failure Handling (section H).

## G. Smoke Test Sequence

Smoke testing exercises the full pipeline with synthetic data. No real users, no real Telegram updates, no real CPA submissions. This proves the pipeline can process a lead end-to-end in mock mode.

Smoke test 1: Process a synthetic lead through the full pipeline
- Run: node -e "
  const { Middleware } = require('./src/middleware/middleware');
  const { LeadStore } = require('./src/store/lead-store');
  const { Logger } = require('./src/logger/logger');
  const { AdapterRegistry } = require('./src/adapter/cpa/adapter-registry');
  const { MockAdapter } = require('./src/adapter/cpa/mock-adapter');
  const { createDispatch } = require('./src/middleware/dispatch');
  const logger = new Logger();
  const store = new LeadStore(logger);
  const ar = new AdapterRegistry();
  const mock = new MockAdapter();
  ar.register('net_mock', mock);
  const offers = new Map([['off_smoke', { id: 'off_smoke', networkId: 'net_mock', name: 'Smoke Offer' }]]);
  const or = { get: (id) => offers.get(id) || null };
  const mw = new Middleware({ store, logger, offerRegistry: or, adapterRegistry: ar });
  mw.setDispatch(createDispatch({ offerRegistry: or, adapterRegistry: ar, logger }));
  (async () => {
    const result = await mw.process({
      offerId: 'off_smoke',
      contact: { phone: '+79001234567', email: 'smoke@test.com' },
      source: 'smoke-test',
      metadata: { correlationId: 'smoke_001' }
    });
    console.log('Lead ID:', result.lead.id);
    console.log('Lead Status:', result.lead.status);
    console.log('Dispatch Status:', result.dispatchResult.dispatchStatus);
    console.log('Adapter Calls:', mock.deliveryLog.length);
    console.log('Logger Events:', logger.count());
    console.log('SMOKE TEST:', result.success && result.dispatchResult.dispatchStatus === 'delivered' ? 'PASS' : 'FAIL');
  })();
"
- Expected: Lead ID printed, status "new", dispatch status "delivered", adapter calls 1, logger events >= 4, SMOKE TEST: PASS

Smoke test 2: Duplicate detection
- Run the same command again with the same contact details (same phone and email).
- Expected: success=false, stage=dedup, error contains "Duplicate"

Smoke test 3: Missing required field rejection
- Run the same pipeline wiring but with contact: {} (empty contact).
- Expected: success=false, stage=validate, errors contains "Missing required field"

Smoke test 4: Policy blocking (if a blocking policy pack is loaded)
- For MVP with no policy packs, policy-check returns approved by default.
- This test confirms the no-op path: lead passes through policy without blocking.
- Expected: policyResult.status === 'approved'

If any smoke test fails, do not proceed to cloud preparation. See Failure Handling (section H).

## H. Failure Handling

Failure category 1: Test suite failure
- Symptom: npm test reports failures
- Action: Read the failure output. Identify which test file and which assertion failed. Check the corresponding source module. Do not proceed until all tests pass.
- Common causes: file missing, module import error, logic change in source without test update

Failure category 2: Module import failure
- Symptom: require() throws MODULE_NOT_FOUND
- Action: Check that the file exists at the expected path. Check for typos in the require path. Check that the module exports what is expected.
- Common causes: file deleted, file renamed, export name changed

Failure category 3: Pipeline wiring failure
- Symptom: TypeError or undefined method during pipeline construction
- Action: Check that setDispatch() is called on the Middleware instance. Check that offerRegistry and adapterRegistry are passed to the constructor. Check that the adapter is registered before dispatch is created.
- Common causes: missing constructor argument, adapter not registered, dispatch not wired

Failure category 4: Smoke test failure — lead not delivered
- Symptom: dispatch status is not "delivered"
- Action: Check the dispatch status value:
  - skipped: policy blocked the lead. Check policyResult.
  - offer_not_found: offer not in offer registry. Check offerId and registry contents.
  - no_adapter: adapter not registered for the offer's networkId. Check adapter registry.
  - adapter_config_invalid: adapter.validateConfig() threw. Check adapter configuration.
  - error: adapter.deliver() threw an exception. Check adapter implementation.
  - retry_pending: adapter returned a retryable error. Check adapter behavior.
- Common causes: offer not registered, adapter not registered, adapter misconfigured

Failure category 5: Environment-related failure
- Symptom: Telegram Adapter init fails with token validation error
- Action: This is expected if TELEGRAM_BOT_TOKEN is not set. For mock-only testing, the Telegram Adapter can be bypassed. The middleware, store, logger, and CPA adapter pattern work independently without the Telegram Adapter.
- Common causes: missing token, invalid token format

General rule: if a failure cannot be diagnosed within 10 minutes, log the full error output, revert the last change, and re-run verification. Do not guess. Do not proceed with an unverified system.

## I. Safe Stop Procedure

The system is not a running process. There is no server to stop, no port to close, no webhook to unregister.

To stop the system:

1. If a smoke test or manual test is running in a terminal, press Ctrl+C or close the terminal. The process will exit. No cleanup is needed.

2. If the Telegram Adapter was initialized with a webhook (not MVP, but future), unregister the webhook before stopping: TBD — webhook management not implemented.

3. If any data needs to be preserved: the logger and lead store are in-memory only. If the process exits, all data is lost. To preserve data for debugging, export the logger output before exiting. TBD: no export mechanism implemented yet. Manual copy-paste is the only option for MVP.

4. After stopping, the workspace files are unchanged. No state files are written. No lock files are created. No cleanup is needed.

## J. Pre-Cloud Preparation

Before moving to cloud deployment, the following must be resolved. None of these are implemented yet. All are TBD.

Required before cloud:
1. Persistent storage: replace in-memory lead store with a database. Leads must survive process restarts.
2. Persistent logging: replace in-memory logger with file-based or database-backed logging. Audit trail must survive process restarts.
3. Authentication: add authentication to the dashboard and API endpoints. No open access in cloud.
4. Environment secrets management: move TELEGRAM_BOT_TOKEN and future CPA network credentials to a secrets manager. No plaintext .env files in cloud.
5. Process manager: use PM2, systemd, or equivalent to keep the process running and restart on crash.
6. Real CPA adapter: implement at least one real CPA network adapter (LeadGid or SalesDoubler from the MVP network priority register) to replace mock delivery.
7. Telegram webhook: implement webhook registration and HTTPS endpoint for receiving Telegram updates. Replace the current manual/mock flow.
8. Error alerting: implement at least one alert channel (email, Telegram, or webhook) for critical failures.
9. Rate limiting: add rate limiting to the middleware or dispatch layer to prevent runaway delivery.
10. Dashboard implementation: build the dashboard data layer and UI from the dashboard-control-panel-mvp.md spec.

Nice-to-have before cloud:
- Log rotation and archival
- Health check endpoint for load balancer
- Graceful shutdown handler
- Metrics export (Prometheus, StatsD, or equivalent)
- Multi-network adapter support (Admitad, MaxBounty)
- Policy pack hot-reload

Do not deploy to cloud until all "Required before cloud" items are resolved. The current system is a verified skeleton, not a deployable service.

## K. Known MVP Limits

These are not bugs. They are known constraints of the current MVP.

- All data is in-memory. Process restart loses everything.
- No external dependencies. Zero npm packages. Pure Node.js.
- Mock adapter only. No real CPA network delivery.
- No Telegram webhook. No polling. Telegram Adapter accepts data programmatically.
- No authentication. No authorization. No access control.
- No persistent logging. Logger is in-memory array.
- No rate limiting. No backpressure. No retry loops.
- No dashboard. No UI. No API server.
- Policy enforcement is manual. Policy-check evaluates rules but enforcement action is operator-driven.
- No batch operations. One lead at a time.
- No historical analytics. Current session only.
- PII masking is applied to logger output but not to lead store contents. Lead store contains raw contact data.
- Lead states are: new, validated, pending_delivery, delivered, rejected, failed. Terminal states (delivered, rejected) cannot transition further. Failed can retry to pending_delivery.
- Dispatch statuses are: delivered, retry_pending, rejected, skipped, offer_not_found, no_adapter, adapter_config_invalid, idempotent_hit, error.

## L. Exact Next Step

The runbook is complete. The system is verified at mock level. The next step is one of:

Option A: Implement .status() methods on LeadStore and Logger to enable module health checks. Required before dashboard implementation.

Option B: Implement a real CPA adapter (LeadGid or SalesDoubler) to move from mock to real delivery capability. Required before any real lead processing.

Option C: Implement the dashboard data layer (src/dashboard/dashboard.js + tests) from the dashboard-control-panel-mvp.md spec. Enables operator visibility before cloud launch.

Option D: Add persistent logging (file-based logger) so that audit trail survives process restarts. Required before cloud deployment.

Operator decides which option to pursue. All four are valid next steps. Option B is the highest-leverage move if the goal is real lead processing. Option D is the highest-leverage move if the goal is cloud readiness.
