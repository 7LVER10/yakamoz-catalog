# Dashboard Control Panel MVP

## A. Purpose

Give the operator a single-screen view of the running lead gen system before cloud launch. The dashboard must show what is happening, what failed, and what needs manual action — without requiring log file parsing or SSH access.

This is an operator tool, not a user-facing product. No branding, no multi-tenancy, no role-based access for MVP.

## B. Operator Goals

The operator needs to answer these questions at a glance:

1. Are leads flowing? How many in the last hour / today?
2. Which leads failed and why?
3. Which dispatches are stuck (retry_pending, error)?
4. Is any module unhealthy or misconfigured?
5. Is policy blocking too aggressively or not enough?
6. Can I pause a pipeline segment or retry a specific lead right now?
7. What happened in the last N minutes — full audit trail?

If the operator cannot answer any of these within 30 seconds of opening the dashboard, the dashboard has failed its MVP purpose.

## C. Core Views

The MVP dashboard has four views. No sidebar navigation, no nested menus. Four tabs or four sections on a single scrollable page.

1. Lead Monitoring — what is happening to leads
2. Dispatch Monitoring — what is happening to outbound delivery
3. Agent / Module Status — are the pieces healthy
4. Policy / Alerts — what is being blocked and what needs attention

Each view pulls data from the existing logger and store. No new data layer. No new database. The logger is the source of truth for events; the lead store is the source of truth for current state.

## D. Lead Monitoring View

Shows lead pipeline health and anomalies.

Content:

- Total leads by status: new, validated, pending_delivery, delivered, rejected, failed
- Recent leads list (last 50 or last 1 hour, whichever is smaller), showing: leadId, offerId, source, status, createdAt, updatedAt
- Duplicate detection count: how many leads were blocked by dedup in the current session
- Validation failure count: how many leads were rejected at the validate stage
- Filter by status: operator can filter the recent list to see only rejected, only failed, etc.
- Click-through detail: selecting a lead shows its full metadata including policyCheck result, dispatchResult, correlationId

Data source: lead-store getAll() or listByOffer() + logger query for event counts.

MVP limitation: no historical persistence across restarts. If the process restarts, the store is empty. TBD for post-MVP.

## E. Dispatch Monitoring View

Shows outbound delivery health and stuck items.

Content:

- Dispatch status breakdown: delivered, retry_pending, rejected, skipped, offer_not_found, no_adapter, adapter_config_invalid, idempotent_hit, error
- Stuck dispatches: leads in retry_pending or error state that have not been retried
- Recent dispatch log (last 50 entries), showing: leadId, offerId, networkId, adapterId, dispatchStatus, reason, timestamp
- Adapter performance summary: per-adapter success/reject/error counts in current session
- Manual retry trigger: operator can flag a specific lead for re-dispatch (see Manual Control Actions)

Data source: logger query for dispatch_attempt events + lead-store for current lead state.

MVP limitation: retry_pending is signal-only. No automatic retry loop. Operator must manually trigger retry. TBD for post-MVP.

## F. Agent / Module Status View

Shows whether each module in the pipeline is operational.

Content:

- Module list with health indicators:
  - Lead Store: up/down, lead count, dedup index size
  - Logger: up/down, event count, last event timestamp
  - Middleware: up/down, last processed timestamp
  - Telegram Adapter: up/down, initialized status, updatesProcessed, updatesSkipped, leadsCreated, errors, lastUpdateAt
  - CPA Adapter Registry: registered adapters list, per-adapter config validation status
  - Offer Registry: registered offers count
- Configuration warnings: if a required config is missing or invalid (e.g., bot token not set, adapter config incomplete)
- Pipeline flow indicator: a simple linear visualization showing the path Telegram Adapter → Middleware → Store → Dispatch and whether each step has processed data recently

Data source: each module exposes a status or count method. For MVP, the adapter.status object is the model. Other modules should expose similar status objects (TBD: lead-store and logger do not yet expose a .status method — will need minimal additions).

MVP limitation: no real-time heartbeat polling. Status is snapshot on page load or manual refresh. TBD for post-MVP.

## G. Policy / Alert View

Shows policy enforcement activity and items requiring operator attention.

Content:

- Policy check summary: total checks, approved count, blocked count in current session
- Recent policy blocks (last 20): leadId, offerId, enforcement action, severity, finding message, timestamp
- Severity distribution: count of findings by severity (info, caution, warning, critical)
- Alerts requiring action: leads stuck in require_review or soft_pause state
- Policy pack summary: which packs are loaded, how many rules each contains

Data source: logger query for policy_check and policy_blocked events.

MVP limitation: policy packs are static (loaded at startup). No hot-reload. No runtime rule editing. TBD for post-MVP.

## H. Manual Control Actions

The operator must be able to take these actions from the dashboard. These are not automatic — each requires explicit operator confirmation.

1. Pause dispatch: stops the dispatch stage from processing new leads. Leads accumulate in pending_delivery status. Implemented as a flag in the dispatch module. Operator clicks pause; dispatch checks flag before calling adapter.deliver().

2. Resume dispatch: clears the pause flag. Pending leads can flow again on next processing cycle.

3. Retry a lead: marks a specific failed or retry_pending lead for re-dispatch. The lead's metadata gets a retryRequested flag. On next processing cycle (or manual trigger), the dispatch stage re-evaluates the lead. Requires clearing the idempotency key for that lead.

4. Reject a lead: manually sets a lead's status to rejected. Used when the operator determines a lead should not be delivered. Requires a reason string that is logged.

5. View lead detail: expands a lead to show all fields, full metadata, all log entries with matching correlationId.

Implementation note: these actions are API endpoints or function calls, not UI buttons. The dashboard UI layer (TBD) calls these functions. For MVP, the actions are exposed as callable functions on the dashboard data layer.

MVP limitation: no batch operations. One lead at a time. No undo. All actions are logged.

## I. Audit Visibility

The operator must be able to see a complete audit trail.

Content:

- Full event log viewer: chronological list of all logger entries, filterable by event type, leadId, correlationId, timestamp range
- Correlation chain: given a correlationId, show all events from the same processing chain (telegram update → middleware stages → policy check → dispatch)
- PII visibility note: the dashboard shows PII-masked data by default. Raw PII is never displayed in the dashboard. If the operator needs raw data, they must access the source directly (outside the dashboard).
- Export: operator can download the current log as a text file. No format restrictions for MVP.

Data source: logger.all() and logger.query().

MVP limitation: no log persistence across restarts. Logs are in-memory only. TBD: file-based log persistence for post-MVP.

## J. MVP Data Sources

All dashboard data comes from existing modules. No new data stores.

- Lead Store: lead statuses, lead counts, lead details, dedup stats
- Logger: all events, event counts, correlation queries
- Telegram Adapter: adapter.status object (initialized, counters, timestamps)
- CPA Adapter Registry: registered adapters list, adapter.validateConfig() per adapter
- Offer Registry: registered offers count and list
- Policy Check: policy pack metadata (loaded packs, rule counts)
- Dispatch: dispatch log (idempotency map entries), dispatch status counts

The dashboard reads from these sources. It does not write to them except through the Manual Control Actions defined in section H.

## K. Files To Create Later

When the dashboard is implemented, these files will be needed:

1. src/dashboard/dashboard.js — main dashboard data layer, aggregates data from all modules, exposes status methods and control actions
2. src/dashboard/lead-view.js — lead monitoring data aggregation
3. src/dashboard/dispatch-view.js — dispatch monitoring data aggregation
4. src/dashboard/status-view.js — module health data aggregation
5. src/dashboard/policy-view.js — policy/alert data aggregation
6. src/dashboard/audit-view.js — audit log data aggregation and correlation chain resolution
7. src/dashboard/control-actions.js — pause, resume, retry, reject action implementations
8. tests/test-dashboard.js — dashboard data layer tests

These files do not exist yet. This document is the spec, not the implementation.

## L. MVP Limits

- No persistent storage. All data is in-memory. Process restart loses state.
- No authentication. Dashboard is accessible to anyone who can reach the endpoint.
- No real-time updates. Page refresh or manual reload only.
- No charts, graphs, or visualizations. Text and numbers only.
- No email/SMS/Telegram alerts. The dashboard is the alert surface.
- No multi-user. Single operator.
- No historical analytics. Current session only.
- No export to third-party tools (Slack, Notion, etc.).
- No mobile responsiveness. Desktop only.
- No frontend framework. Plain HTML or simple server-rendered page. TBD at implementation time.
- Manual enforcement only. Dashboard recommends, operator executes.

## M. Exact Next Step

Pause dashboard work. The spec is complete. The next priority is one of:

Option A: expose .status() methods on LeadStore and Logger so the dashboard data layer can query module health when implementation begins.

Option B: advance to a concrete CPA adapter (e.g., LeadGid or SalesDoubler from the MVP network priority register) to move from mock to real delivery capability.

Option C: implement the dashboard data layer (src/dashboard/dashboard.js + tests) without the UI, so the aggregation logic is verified before any frontend work.

Operator decides.
