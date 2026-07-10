// Middleware Pipeline
// Orchestrates: normalize → validate → dedup → policy-check → dispatch

const { normalize } = require('./normalize');
const { validate } = require('./validate');
const { policyCheck } = require('./policy-check');

class Middleware {
  constructor({ store, logger, policyPacks, offerRegistry, adapterRegistry }) {
    this.store = store;
    this.logger = logger;
    this.policyPacks = policyPacks || [];
    this.offerRegistry = offerRegistry || null;
    this.adapterRegistry = adapterRegistry || null;
    this.dispatchFn = null; // set via setDispatch()
  }

  setDispatch(dispatchFn) {
    this.dispatchFn = dispatchFn;
  }

  async process(rawLead) {
    const correlationId = rawLead.metadata && rawLead.metadata.correlationId
      ? rawLead.metadata.correlationId
      : 'corr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);

    const context = {
      correlationId,
      store: this.store,
      logger: this.logger,
      offerRegistry: this.offerRegistry,
      adapterRegistry: this.adapterRegistry
    };

    // Step 1: Normalize
    const lead = normalize({ ...rawLead });
    lead.metadata = lead.metadata || {};
    lead.metadata.correlationId = correlationId;
    lead.metadata.normalizedAt = new Date().toISOString();

    // Step 2: Validate
    const validation = validate(lead);
    if (!validation.valid) {
      this.logger.log('middleware_invalid', {
        correlationId,
        errors: validation.errors,
        offerId: lead.offerId
      });
      return { success: false, stage: 'validate', errors: validation.errors };
    }
    this.logger.log('middleware_valid', { correlationId, offerId: lead.offerId });

    // Step 3: Dedup + Create in store
    let stored;
    try {
      stored = this.store.create(lead);
    } catch (err) {
      if (err.message.includes('Duplicate')) {
        this.logger.log('lead_duplicate_blocked', { correlationId, offerId: lead.offerId });
        return { success: false, stage: 'dedup', errors: [err.message] };
      }
      throw err;
    }

    // Step 4: Policy check
    const policyResult = policyCheck(stored, this.policyPacks);
    stored.metadata.policyCheck = policyResult;
    this.logger.log('policy_check', {
      correlationId,
      leadId: stored.id,
      status: policyResult.status,
      enforcement: policyResult.enforcement
    });

    if (policyResult.status === 'blocked') {
      this.store.updateStatus(stored.id, 'rejected');
      return { success: false, stage: 'policy', policyResult, lead: stored };
    }

    // Step 5: Dispatch (if dispatch function is wired)
    let dispatchResult = null;
    if (this.dispatchFn) {
      dispatchResult = await this.dispatchFn(stored, context);
      stored.metadata.dispatchResult = dispatchResult;
    }

    return {
      success: true,
      lead: stored,
      policyResult,
      dispatchResult
    };
  }
}

module.exports = { Middleware };
