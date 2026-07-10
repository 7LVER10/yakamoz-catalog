// Delivery Result
// Standardized result from CPA adapter delivery attempts

class DeliveryResult {
  constructor({ success, retryable, error, data, adapterId, leadId }) {
    this.success = success || false;
    this.retryable = retryable || false;
    this.error = error || null;
    this.data = data || null;
    this.adapterId = adapterId || null;
    this.leadId = leadId || null;
    this.timestamp = new Date().toISOString();
  }

  static ok(data, adapterId, leadId) {
    return new DeliveryResult({ success: true, data, adapterId, leadId });
  }

  static reject(error, adapterId, leadId) {
    return new DeliveryResult({ success: false, retryable: false, error, adapterId, leadId });
  }

  static retryable(error, adapterId, leadId) {
    return new DeliveryResult({ success: false, retryable: true, error, adapterId, leadId });
  }
}

module.exports = { DeliveryResult };
