// CPA Adapter Registry
// Registry for CPA network adapters

class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
  }

  register(networkId, adapter) {
    this.adapters.set(networkId, adapter);
  }

  get(networkId) {
    return this.adapters.get(networkId) || null;
  }

  has(networkId) {
    return this.adapters.has(networkId);
  }

  list() {
    return Array.from(this.adapters.keys());
  }
}

module.exports = { AdapterRegistry };
