// Update Cache
// Tracks processed update_ids to prevent duplicate processing

class UpdateCache {
  constructor(maxAge) {
    this.processed = new Map(); // updateId -> timestamp
    this.maxAge = maxAge || 3600000; // 1 hour default
  }

  has(updateId) {
    this._evict();
    return this.processed.has(updateId);
  }

  add(updateId) {
    this.processed.set(updateId, Date.now());
  }

  size() {
    this._evict();
    return this.processed.size;
  }

  _evict() {
    const cutoff = Date.now() - this.maxAge;
    for (const [id, ts] of this.processed) {
      if (ts < cutoff) this.processed.delete(id);
    }
  }
}

module.exports = { UpdateCache };
