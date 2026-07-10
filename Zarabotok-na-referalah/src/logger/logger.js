// Logger
// Append-only event logger with PII masking
// Supports optional file-based persistence via FileSink

const { maskPII } = require('./pii-mask');

class Logger {
  constructor(options) {
    this.entries = [];
    this.fileSink = (options && options.fileSink) || null;
  }

  log(event, data) {
    const entry = {
      event,
      data: maskPII(data),
      timestamp: new Date().toISOString(),
      seq: this.entries.length + 1
    };
    this.entries.push(entry);

    // Persist to file if file sink is configured
    if (this.fileSink) {
      try {
        this.fileSink.write(entry);
      } catch (e) {
        // File write failure must not crash the logger
        // Entry is already in memory
      }
    }

    return entry;
  }

  query(filter) {
    return this.entries.filter(e => {
      if (filter.event && e.event !== filter.event) return false;
      if (filter.leadId && e.data.leadId !== filter.leadId) return false;
      if (filter.correlationId && e.data.correlationId !== filter.correlationId) return false;
      return true;
    });
  }

  all() {
    return [...this.entries];
  }

  count() {
    return this.entries.length;
  }
}

module.exports = { Logger };
