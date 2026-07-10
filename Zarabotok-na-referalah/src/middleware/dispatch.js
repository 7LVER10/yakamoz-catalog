// Dispatch Middleware Stage
// Routes policy-cleared leads to CPA adapter pattern for delivery
// No live network submission — mock/stub only for MVP
// No direct state mutation — delegates to adapter, logs, returns result

const { EVENTS } = require('../logger/event-types');

function createDispatch({ offerRegistry, adapterRegistry, logger }) {
  // Dispatch log for idempotency tracking
  // Key: leadId + offerId + networkId → delivery result
  const dispatchLog = new Map();

  async function dispatch(lead, context) {
    const correlationId = (lead.metadata && lead.metadata.correlationId) || 'unknown';

    // Step 1: Check policy result
    const policyCheck = lead.metadata && lead.metadata.policyCheck;
    if (!policyCheck || policyCheck.status !== 'approved') {
      const result = { dispatchStatus: 'skipped', reason: 'policy_not_approved' };
      logDispatch(logger, correlationId, lead, result);
      return result;
    }

    // Step 2: Look up offer to get networkId
    const offer = offerRegistry.get(lead.offerId);
    if (!offer) {
      const result = { dispatchStatus: 'offer_not_found', reason: 'offer_not_in_registry' };
      logDispatch(logger, correlationId, lead, result);
      return result;
    }

    const networkId = offer.networkId;

    // Step 3: Look up adapter
    const adapter = adapterRegistry.get(networkId);
    if (!adapter) {
      const result = { dispatchStatus: 'no_adapter', reason: 'no_adapter_for_network', networkId };
      logDispatch(logger, correlationId, lead, result);
      return result;
    }

    // Step 4: Validate adapter config
    try {
      adapter.validateConfig();
    } catch (err) {
      const result = { dispatchStatus: 'adapter_config_invalid', reason: err.message, networkId, adapterId: adapter.id };
      logDispatch(logger, correlationId, lead, result);
      return result;
    }

    // Step 5: Idempotency check
    const idemKey = `${lead.id}:${lead.offerId}:${networkId}`;
    if (dispatchLog.has(idemKey)) {
      const existing = dispatchLog.get(idemKey);
      const result = { ...existing, idempotentHit: true };
      logDispatch(logger, correlationId, lead, { dispatchStatus: 'idempotent_hit', originalStatus: existing.dispatchStatus });
      return result;
    }

    // Step 6: Call adapter.deliver()
    let deliveryResult;
    try {
      deliveryResult = adapter.deliver(lead, { offerId: lead.offerId, networkId });
    } catch (err) {
      const result = { dispatchStatus: 'error', reason: err.message, networkId, adapterId: adapter.id };
      dispatchLog.set(idemKey, result);
      logDispatch(logger, correlationId, lead, result);
      return result;
    }

    // Step 7: Map delivery result to dispatch status
    let dispatchStatus;
    if (deliveryResult.success) {
      dispatchStatus = 'delivered';
    } else if (deliveryResult.retryable) {
      dispatchStatus = 'retry_pending';
    } else {
      dispatchStatus = 'rejected';
    }

    const result = {
      dispatchStatus,
      networkId,
      adapterId: adapter.id,
      deliveryResult: {
        success: deliveryResult.success,
        retryable: deliveryResult.retryable,
        error: deliveryResult.error ? (deliveryResult.error.message || deliveryResult.error) : null,
        data: deliveryResult.data
      }
    };

    // Store for idempotency
    dispatchLog.set(idemKey, result);

    // Log
    logDispatch(logger, correlationId, lead, result);

    return result;
  }

  dispatch.getLog = function() {
    return Array.from(dispatchLog.values());
  };

  dispatch.getEntries = function() {
    const entries = [];
    for (const [key, value] of dispatchLog) {
      entries.push({ key, ...value });
    }
    return entries;
  };

  return dispatch;
}

function logDispatch(logger, correlationId, lead, result) {
  if (!logger) return;
  logger.log(EVENTS.DISPATCH_ATTEMPT, {
    correlationId,
    leadId: lead.id,
    offerId: lead.offerId,
    dispatchStatus: result.dispatchStatus,
    networkId: result.networkId || null,
    adapterId: result.adapterId || null,
    reason: result.reason || null
  });
}

module.exports = { createDispatch };
