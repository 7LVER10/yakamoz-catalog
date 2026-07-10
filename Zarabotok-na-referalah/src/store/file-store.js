// File Store
// Handles file-based lead persistence
// Each lead stored as a separate JSON file: {leadId}.json

const fs = require('fs');
const path = require('path');

class FileStore {
  constructor(dir) {
    this.dir = dir || path.join(process.cwd(), 'data', 'leads');
    this._ensureDir();
  }

  // Save a lead to disk
  save(lead) {
    const file = this._filePath(lead.id);
    fs.writeFileSync(file, JSON.stringify(lead, null, 2), 'utf8');
  }

  // Load a single lead by ID
  load(leadId) {
    const file = this._filePath(leadId);
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  // Load all leads from disk
  loadAll() {
    if (!fs.existsSync(this.dir)) return [];
    const files = fs.readdirSync(this.dir).filter(f => f.endsWith('.json'));
    const leads = [];
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8'));
        if (data && data.id) leads.push(data);
      } catch (e) {
        // skip malformed files
      }
    }
    return leads;
  }

  // Delete a lead from disk
  remove(leadId) {
    const file = this._filePath(leadId);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  // List stored lead IDs
  listIds() {
    if (!fs.existsSync(this.dir)) return [];
    return fs.readdirSync(this.dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  // Count stored leads
  count() {
    return this.listIds().length;
  }

  // Internal: file path for a lead ID
  _filePath(leadId) {
    return path.join(this.dir, leadId + '.json');
  }

  // Internal: ensure directory exists
  _ensureDir() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }
}

module.exports = { FileStore };
