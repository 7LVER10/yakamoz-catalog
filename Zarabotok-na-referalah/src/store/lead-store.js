// Lead Store
// In-memory lead storage with validation, transitions, dedup
// Supports optional file-based persistence via FileStore

const { LEAD_STATES, LEAD_TRANSITIONS, IMMUTABLE_FIELDS, REQUIRED_FIELDS, createLead } = require('./lead-schema');
const { DedupIndex } = require('./dedup-index');

class LeadStore {
  constructor(options) {
    this.leads = new Map();
    this.dedup = new DedupIndex();
    this.logger = null;
    this.fileStore = null;

    // Accept both old format (logger instance) and new format (options object)
    if (options && typeof options === 'object' && ('logger' in options || 'fileStore' in options)) {
      this.logger = options.logger || null;
      this.fileStore = options.fileStore || null;
    } else if (options) {
      // Backward compatible: passing logger directly
      this.logger = options;
    }

    // Load existing leads from disk if file store is configured
    if (this.fileStore) {
      this._loadFromDisk();
    }
  }

  create(data) {
    const lead = createLead(data);
    if (!lead.id) {
      lead.id = this._generateId();
    }

    // Required field check
    for (const field of REQUIRED_FIELDS) {
      if (!lead[field] || (typeof lead[field] === 'object' && Object.keys(lead[field]).length === 0)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Dedup check
    const dedupKey = this._dedupKey(lead);
    if (this.dedup.has(dedupKey)) {
      throw new Error(`Duplicate lead detected: ${dedupKey}`);
    }

    this.leads.set(lead.id, lead);
    this.dedup.add(dedupKey, lead.id);

    // Persist to disk
    this._persist(lead);

    if (this.logger) {
      this.logger.log('lead_created', { leadId: lead.id, offerId: lead.offerId });
    }

    return lead;
  }

  get(leadId) {
    return this.leads.get(leadId) || null;
  }

  updateStatus(leadId, newStatus) {
    const lead = this.leads.get(leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    const allowed = LEAD_TRANSITIONS[lead.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${lead.status} → ${newStatus}`);
    }

    lead.status = newStatus;
    lead.updatedAt = new Date().toISOString();

    // Persist to disk
    this._persist(lead);

    if (this.logger) {
      this.logger.log('lead_status_changed', { leadId, from: lead.status, to: newStatus });
    }

    return lead;
  }

  update(leadId, updates) {
    const lead = this.leads.get(leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    for (const field of IMMUTABLE_FIELDS) {
      if (updates[field] !== undefined && updates[field] !== lead[field]) {
        throw new Error(`Cannot modify immutable field: ${field}`);
      }
    }

    Object.assign(lead, updates, { updatedAt: new Date().toISOString() });

    // Persist to disk
    this._persist(lead);

    return lead;
  }

  listByOffer(offerId) {
    const results = [];
    for (const lead of this.leads.values()) {
      if (lead.offerId === offerId) results.push(lead);
    }
    return results;
  }

  list() {
    return Array.from(this.leads.values());
  }

  // Internal: load leads from disk and rebuild in-memory state
  _loadFromDisk() {
    try {
      const leads = this.fileStore.loadAll();
      for (const lead of leads) {
        this.leads.set(lead.id, lead);
        const dedupKey = this._dedupKey(lead);
        this.dedup.add(dedupKey, lead.id);
      }
    } catch (e) {
      // Disk load failure must not crash the store
    }
  }

  // Internal: persist a lead to disk if file store is configured
  _persist(lead) {
    if (this.fileStore) {
      try {
        this.fileStore.save(lead);
      } catch (e) {
        // File write failure must not crash the store
      }
    }
  }

  _dedupKey(lead) {
    const phone = (lead.contact && lead.contact.phone) || '';
    const email = (lead.contact && lead.contact.email) || '';
    return `${lead.offerId}:${phone}:${email}`.toLowerCase();
  }

  _generateId() {
    return 'ld_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }
}

module.exports = { LeadStore };
