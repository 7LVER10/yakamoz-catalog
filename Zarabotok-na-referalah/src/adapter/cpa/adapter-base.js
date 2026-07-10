// CPA Adapter Base
// Abstract base for CPA network adapters

class AdapterBase {
  constructor(config) {
    this.config = config || {};
    this.id = this.constructor.name;
  }

  validateConfig() {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  deliver(lead, campaign) {
    throw new Error('deliver() must be implemented by subclass');
  }

  mapLead(lead) {
    throw new Error('mapLead() must be implemented by subclass');
  }
}

module.exports = { AdapterBase };
