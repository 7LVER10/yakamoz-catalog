// Error Taxonomy
// Classification of CPA adapter errors

const ERROR_TYPES = {
  TRANSPORT: 'transport',
  TIMEOUT: 'timeout',
  REJECTION: 'rejection',
  MAPPING: 'mapping',
  CONFIG: 'config',
  UNKNOWN: 'unknown'
};

const RETRYABLE_ERRORS = [ERROR_TYPES.TRANSPORT, ERROR_TYPES.TIMEOUT];

class AdapterError extends Error {
  constructor(type, message, detail) {
    super(message);
    this.type = type || ERROR_TYPES.UNKNOWN;
    this.detail = detail || null;
  }

  isRetryable() {
    return RETRYABLE_ERRORS.includes(this.type);
  }
}

module.exports = { ERROR_TYPES, RETRYABLE_ERRORS, AdapterError };
