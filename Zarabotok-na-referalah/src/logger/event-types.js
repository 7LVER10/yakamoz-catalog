// Event Types
// Canonical event type constants

const EVENTS = {
  LEAD_CREATED: 'lead_created',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  LEAD_DUPLICATE_BLOCKED: 'lead_duplicate_blocked',
  MIDDLEWARE_VALID: 'middleware_valid',
  MIDDLEWARE_INVALID: 'middleware_invalid',
  MIDDLEWARE_NORMALIZED: 'middleware_normalized',
  POLICY_CHECK: 'policy_check',
  POLICY_BLOCKED: 'policy_blocked',
  DISPATCH_ATTEMPT: 'dispatch_attempt',
  ADAPTER_DELIVER: 'adapter_deliver',
  ADAPTER_ERROR: 'adapter_error',
  TELEGRAM_UPDATE: 'telegram_update',
  TELEGRAM_SKIPPED: 'telegram_skipped'
};

module.exports = { EVENTS };
