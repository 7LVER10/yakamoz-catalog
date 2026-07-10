// Telegram Runtime
// Entry point for running the Telegram adapter as a local runtime
// Supports two modes: 'local' (feed updates programmatically) and 'polling' (Telegram Bot API getUpdates)

const { TelegramAdapter } = require('../adapter/telegram');
const { UpdateCache } = require('../adapter/update-cache');
const { loadConfig, validateConfig } = require('../config/config-loader');

class TelegramRuntime {
  constructor(options) {
    options = options || {};
    this.config = options.config || loadConfig(options.configOverrides || {});
    this.middleware = options.middleware || null;
    this.logger = options.logger || null;
    this.adapter = null;
    this.running = false;
    this.pollTimer = null;
    this.offset = 0;
    this.status = {
      startedAt: null,
      stoppedAt: null,
      mode: this.config.mode,
      updatesProcessed: 0,
      errors: 0
    };
  }

  // Validate configuration before starting
  validate() {
    return validateConfig(this.config);
  }

  // Initialize adapter and prepare for running
  init() {
    const validation = this.validate();
    if (!validation.valid) {
      return { success: false, reason: 'config_invalid', errors: validation.errors };
    }

    this.adapter = new TelegramAdapter({
      botToken: this.config.botToken,
      middleware: this.middleware,
      logger: this.logger
    });

    const initResult = this.adapter.init();
    if (!initResult.success) {
      return { success: false, reason: 'adapter_init_failed', detail: initResult.reason };
    }

    return { success: true };
  }

  // Start the runtime
  start() {
    if (this.running) {
      return { success: false, reason: 'already_running' };
    }

    if (!this.adapter) {
      const initResult = this.init();
      if (!initResult.success) return initResult;
    }

    this.running = true;
    this.status.startedAt = new Date().toISOString();

    if (this.config.mode === 'polling') {
      this._startPolling();
    }

    return { success: true, mode: this.config.mode };
  }

  // Stop the runtime cleanly
  stop() {
    if (!this.running) {
      return { success: false, reason: 'not_running' };
    }

    this.running = false;
    this.status.stoppedAt = new Date().toISOString();

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    return { success: true };
  }

  // Feed an update manually (local mode)
  async feedUpdate(update) {
    if (!this.adapter) {
      return { success: false, reason: 'not_initialized' };
    }

    try {
      const result = await this.adapter.processUpdate(update);
      this.status.updatesProcessed++;
      return { success: true, result };
    } catch (err) {
      this.status.errors++;
      return { success: false, reason: err.message };
    }
  }

  // Feed multiple updates (batch local mode)
  async feedUpdates(updates) {
    const results = [];
    for (const update of updates) {
      results.push(await this.feedUpdate(update));
    }
    return results;
  }

  // Get runtime status
  getStatus() {
    return {
      ...this.status,
      running: this.running,
      adapterStatus: this.adapter ? this.adapter.status : null
    };
  }

  // Internal: start Telegram polling loop
  _startPolling() {
    const poll = async () => {
      if (!this.running) return;

      try {
        const updates = await this._getUpdates();
        for (const update of updates) {
          if (!this.running) break;
          await this.feedUpdate(update);
          this.offset = update.update_id + 1;
        }
      } catch (err) {
        this.status.errors++;
        if (this.logger) {
          this.logger.log('telegram_poll_error', { error: err.message });
        }
      }

      if (this.running) {
        this.pollTimer = setTimeout(poll, this.config.pollInterval);
      }
    };

    poll();
  }

  // Internal: call Telegram Bot API getUpdates
  _getUpdates() {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const url = `https://api.telegram.org/bot${this.config.botToken}/getUpdates?offset=${this.offset}&timeout=${this.config.pollTimeout}`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.ok && json.result) {
              resolve(json.result);
            } else {
              reject(new Error(json.description || 'API error'));
            }
          } catch (e) {
            reject(new Error('Invalid API response'));
          }
        });
      }).on('error', reject);
    });
  }
}

module.exports = { TelegramRuntime };
