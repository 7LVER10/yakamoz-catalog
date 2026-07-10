// Telegram Adapter
// Inbound adapter for Telegram bot updates
// Processes updates through middleware pipeline

const { handleUpdate } = require('./update-handler');
const { UpdateCache } = require('./update-cache');

class TelegramAdapter {
  constructor({ botToken, middleware, logger }) {
    this.botToken = botToken || null;
    this.middleware = middleware;
    this.logger = logger || null;
    this.cache = new UpdateCache();
    this.status = {
      initialized: false,
      updatesProcessed: 0,
      updatesSkipped: 0,
      leadsCreated: 0,
      errors: 0,
      lastUpdateAt: null
    };
  }

  validateToken() {
    if (!this.botToken || typeof this.botToken !== 'string') {
      return { valid: false, reason: 'missing_token' };
    }
    // Telegram bot token format: <bot_id>:<alphanumeric>
    const parts = this.botToken.split(':');
    if (parts.length !== 2) {
      return { valid: false, reason: 'invalid_format' };
    }
    const botId = parts[0];
    if (!/^\d+$/.test(botId)) {
      return { valid: false, reason: 'invalid_bot_id' };
    }
    if (parts[1].length < 20) {
      return { valid: false, reason: 'invalid_token_length' };
    }
    return { valid: true };
  }

  init() {
    const tokenCheck = this.validateToken();
    if (!tokenCheck.valid) {
      this.status.initialized = false;
      return { success: false, reason: tokenCheck.reason };
    }
    this.status.initialized = true;
    return { success: true };
  }

  async processUpdate(update) {
    this.status.updatesProcessed++;
    this.status.lastUpdateAt = new Date().toISOString();

    // Dedup check
    const updateId = update && update.update_id;
    if (updateId !== undefined && this.cache.has(updateId)) {
      this.status.updatesSkipped++;
      if (this.logger) {
        this.logger.log('telegram_skipped', { updateId, reason: 'duplicate_update_id' });
      }
      return { action: 'skipped', reason: 'duplicate_update_id', updateId };
    }

    // Handle update
    const result = handleUpdate(update);

    if (result.action === 'skip') {
      this.status.updatesSkipped++;
      if (this.cache.has(updateId) === false && updateId !== undefined) {
        this.cache.add(updateId);
      }
      if (this.logger) {
        this.logger.log('telegram_skipped', { updateId, reason: result.reason });
      }
      return result;
    }

    // Mark as processed
    this.cache.add(updateId);

    // Feed lead through middleware
    if (this.middleware) {
      try {
        const mwResult = await this.middleware.process(result.lead);
        if (mwResult.success) {
          this.status.leadsCreated++;
        }
        return { action: 'processed', updateId, middlewareResult: mwResult };
      } catch (err) {
        this.status.errors++;
        return { action: 'error', updateId, error: err.message };
      }
    }

    return { action: 'processed_no_middleware', updateId, lead: result.lead };
  }
}

module.exports = { TelegramAdapter };
