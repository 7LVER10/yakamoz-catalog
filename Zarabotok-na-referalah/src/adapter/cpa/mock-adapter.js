// Mock CPA Adapter
// Test/stub adapter for MVP — no live network calls

const { AdapterBase } = require('./adapter-base');
const { DeliveryResult } = require('./delivery-result');
const { AdapterError, ERROR_TYPES } = require('./error-taxonomy');

class MockAdapter extends AdapterBase {
  constructor(config) {
    super(config);
    this.id = 'mock-adapter';
    this.deliveryLog = [];
    this.failNext = null; // null | 'reject' | 'retryable' | 'error'
  }

  validateConfig() {
    return true;
  }

  deliver(lead, campaign) {
    this.deliveryLog.push({ leadId: lead.id, offerId: lead.offerId, timestamp: new Date().toISOString() });

    if (this.failNext === 'reject') {
      this.failNext = null;
      return DeliveryResult.reject('Destination rejected the lead', this.id, lead.id);
    }
    if (this.failNext === 'retryable') {
      this.failNext = null;
      return DeliveryResult.retryable(new AdapterError(ERROR_TYPES.TRANSPORT, 'Transport timeout'), this.id, lead.id);
    }
    if (this.failNext === 'error') {
      this.failNext = null;
      throw new AdapterError(ERROR_TYPES.UNKNOWN, 'Unexpected adapter failure');
    }

    return DeliveryResult.ok({ networkId: 'mock', confirmationId: 'mock_' + Date.now() }, this.id, lead.id);
  }

  mapLead(lead) {
    return {
      externalId: lead.id,
      email: lead.contact.email || null,
      phone: lead.contact.phone || null,
      offerId: lead.offerId
    };
  }
}

module.exports = { MockAdapter };
