// Dedup Index
// Tracks lead keys to prevent duplicates

class DedupIndex {
  constructor() {
    this.index = new Map();
  }

  has(key) {
    return this.index.has(key);
  }

  add(key, leadId) {
    this.index.set(key, leadId);
  }

  get(key) {
    return this.index.get(key) || null;
  }

  size() {
    return this.index.size;
  }
}

module.exports = { DedupIndex };
