// File Sink
// Handles file-based log persistence with daily rotation
// Append-only, JSONL format (one JSON object per line)

const fs = require('fs');
const path = require('path');

class FileSink {
  constructor(dir) {
    this.dir = dir || path.join(process.cwd(), 'data', 'logs');
    this._ensureDir();
  }

  // Append a single entry to today's log file
  write(entry) {
    const file = this._filePath(this._today());
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(file, line, 'utf8');
  }

  // Read all entries from a specific date (YYYY-MM-DD)
  readByDate(dateStr) {
    const file = this._filePath(dateStr);
    if (!fs.existsSync(file)) return [];
    return this._readFile(file);
  }

  // Read entries from a date range (inclusive)
  readRange(startDate, endDate) {
    const results = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      results.push(...this.readByDate(dateStr));
    }
    return results;
  }

  // List available log dates
  listDates() {
    if (!fs.existsSync(this.dir)) return [];
    return fs.readdirSync(this.dir)
      .filter(f => f.startsWith('logs-') && f.endsWith('.jsonl'))
      .map(f => f.replace('logs-', '').replace('.jsonl', ''))
      .sort();
  }

  // Get file path for current day
  getCurrentFile() {
    return this._filePath(this._today());
  }

  // Get total entry count across all log files
  totalEntries() {
    let count = 0;
    const dates = this.listDates();
    for (const date of dates) {
      count += this.readByDate(date).length;
    }
    return count;
  }

  // Internal: get file path for a date string
  _filePath(dateStr) {
    return path.join(this.dir, 'logs-' + dateStr + '.jsonl');
  }

  // Internal: get today's date string
  _today() {
    return new Date().toISOString().slice(0, 10);
  }

  // Internal: ensure log directory exists
  _ensureDir() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  // Internal: read and parse a JSONL file
  _readFile(file) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.trim()) return [];
    return content.trim().split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(e => e !== null);
  }
}

module.exports = { FileSink };
