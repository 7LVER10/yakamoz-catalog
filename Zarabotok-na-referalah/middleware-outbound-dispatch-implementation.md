# Middleware Outbound Dispatch Implementation

## A. Purpose

Integrate outbound lead dispatch into the existing middleware pipeline so that after a lead passes normalization, validation, dedup, and policy-check, it is automatically routed to the CPA adapter pattern for delivery — without live network submission, using mock/stub delivery only for MVP.

## B. Scope

IN SCOPE:
- Dispatch decision logic inside middleware
- Integration with CPA adapter registry for delivery
- Dispatch result handling (success, retry, reject)
- Append-only dispatch logging via existing logger
- Idempotency guard on outbound dispatch

OUT OF SCOPE:
- Live CPA network submission
- Network-specific mapping logic
- Direct state mutation inside adapter pattern
- New policy research
- Production readiness claims

## C. Integration Role

The middleware pipeline currently ends after policy-check. A new stage — dispatch — is appended as the final pipeline step. It sits between policy-check approval and the CPA adapter pattern's deliver() call.

The dispatch stage does NOT own lead state mutation. It receives a validated, policy-cleared lead object and delegates delivery to the adapter pattern. It interprets the delivery result and logs the outcome.

Existing pipeline order after this change:
1. normalize
2. validate
3. dedup check
4. policy-check
5. dispatch (NEW)

## D. Dispatch Decision Model

The dispatch stage evaluates the following before calling the adapter:

1. Policy-check result: if status is not "approved", dispatch is skipped. The lead is logged as policy-blocked, not dispatched.

2. Adapter availability: the dispatch stage looks up the target adapter from the adapter-registry using the offer's networkId. If no adapter is registered, the lead is logged as "no_adapter" and held for manual review.

3. Adapter readiness: the dispatch stage calls adapter.validateConfig(). If config is invalid, the lead is logged as "adapter_config_invalid" and held.

4. Idempotency check: before dispatching, the stage checks if a delivery attempt already exists for this lead+offer+network combination in the dispatch log. If yes, the existing result is returned without re-dispatch.

5. Only if all checks pass does the stage call adapter.deliver(lead, campaign).

Decision outcomes:
- policy_blocked → skip dispatch, log, return
- no_adapter → hold for review, log
- adapter_config_invalid → hold for review, log
- already_dispatched → return existing result, log idempotency hit
- deliver_ok → log success, return delivery result
- deliver_retryable → log retryable error, return with retry signal
- deliver_reject → log rejection, return
- deliver_error → log error, return with error signal

## E. Processing Flow

Step 1: Receive lead object that has passed all prior middleware stages.

Step 2: Read policy-check result from lead.metadata.policyCheck. If not approved, log and return lead with dispatchStatus = "skipped".

Step 3: Extract networkId from lead.offerId via offer registry lookup. If offer not found, log and return with dispatchStatus = "offer_not_found".

Step 4: Look up adapter from adapter-registry by networkId. If not found, log and return with dispatchStatus = "no_adapter".

Step 5: Call adapter.validateConfig(). If invalid, log and return with dispatchStatus = "adapter_config_invalid".

Step 6: Check dispatch idempotency — query dispatch log for existing delivery with same leadId + offerId + networkId. If found, log idempotency hit and return existing result.

Step 7: Call adapter.deliver(lead, campaign). The adapter pattern handles its own error taxonomy and returns a DeliveryResult.

Step 8: Log the delivery attempt (append-only) with correlationId, leadId, offerId, networkId, adapterId, outcome, timestamp.

Step 9: Map DeliveryResult to dispatchStatus:
- DeliveryResult.success = true → dispatchStatus = "delivered"
- DeliveryResult.retryable = true → dispatchStatus = "retry_pending"
- DeliveryResult.retryable = false → dispatchStatus = "rejected"

Step 10: Attach dispatchStatus and dispatch metadata to lead object. Return lead to caller.

## F. Idempotency and Safety

Idempotency guard:
- Key: leadId + offerId + networkId
- Check point: before adapter.deliver() call
- Storage: append-only dispatch log (same log used for audit)
- Behavior: if key exists, return stored result, do not call adapter again

Safety constraints:
- No direct state mutation inside dispatch stage. Lead state is mutated only through the lead-store update path.
- Dispatch stage is pure middleware — it reads, decides, delegates, logs, and returns.
- All dispatch outcomes are append-only. No log entries are modified or deleted.
- Retry logic is NOT inside dispatch. Retry is a caller-level concern. Dispatch signals retry_pending; the caller decides when to re-invoke.

## G. Logging and Audit

Every dispatch attempt produces a log entry via the existing logger with event type "dispatch_attempt".

Log entry fields:
- correlationId (from lead.metadata.correlationId)
- leadId
- offerId
- networkId
- adapterId
- outcome (one of: skipped, offer_not_found, no_adapter, adapter_config_invalid, idempotent_hit, delivered, retry_pending, rejected, error)
- timestamp
- error detail (if applicable, PII-masked)

All log entries pass through the existing PII mask before storage.

Query path: logger.query({ event: "dispatch_attempt", leadId }) returns full dispatch history for a lead.

## H. Files To Create

1. src/middleware/dispatch.js — the dispatch stage implementation
- exports: dispatch(lead, context)
- context must contain: offerRegistry, adapterRegistry, logger
- returns: lead with dispatchStatus attached

2. tests/test-dispatch.js — dispatch stage tests
- test: approved lead → mock adapter → delivered
- test: policy-blocked lead → skipped, no adapter call
- test: offer not found → offer_not_found
- test: no adapter registered → no_adapter
- test: adapter config invalid → adapter_config_invalid
- test: idempotency hit → returns existing result, no second call
- test: adapter returns retryable → retry_pending
- test: adapter returns reject → rejected
- test: adapter throws → error
- test: dispatch log entry has correlationId
- test: PII masked in log

## I. Verification

All tests must pass:
- npm run test (existing tests must not break)
- npm run test -- tests/test-dispatch.js (new tests)

Manual verification:
- dispatch.js exports a single function with correct signature
- no direct lead-store mutation inside dispatch
- all log entries go through existing logger
- no adapter.deliver() call without prior idempotency check

## J. MVP Limits

- Only mock adapter is exercised. No live network delivery.
- Retry logic is signal-only. No automatic retry loop inside dispatch.
- Offer registry lookup is assumed to be synchronous and in-memory.
- Adapter registry is assumed to be pre-populated at startup.
- No batching. One lead, one dispatch, one result.
- No rate limiting inside dispatch stage.
- All TBD items from policy layer remain TBD.

## K. Exact Next Step

Create src/middleware/dispatch.js and tests/test-dispatch.js, wire dispatch into the existing middleware pipeline, run all tests, confirm no regressions.
