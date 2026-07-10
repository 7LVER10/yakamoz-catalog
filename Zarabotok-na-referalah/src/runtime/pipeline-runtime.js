// Pipeline Runtime
// Main composition layer — wires all modules into a single startable system
// Supports persistence (FileStore + FileSink) and in-memory modes

const { LeadStore } = require('../store/lead-store');
const { FileStore } = require('../store/file-store');
const { Logger } = require('../logger/logger');
const { FileSink } = require('../logger/file-sink');
const { AdapterRegistry } = require('../adapter/cpa/adapter-registry');
const { MockAdapter } = require('../adapter/cpa/mock-adapter');
const { Middleware } = require('../middleware/middleware');
const { createDispatch } = require('../middleware/dispatch');
const { Dashboard } = require('../dashboard/dashboard');
const { TelegramRuntime } = require('./telegram-runtime');
const { loadConfig } = require('../config/config-loader');
const path = require('path');

class PipelineRuntime {
  constructor(options) {
    options = options || {};

    this.config = options.config || loadConfig(options.configOverrides || {});
    this.persistent = options.persistent !== undefined ? options.persistent : true;

    // Components (set during init)
    this.logger = null;
    this.store = null;
    this.adapterRegistry = null;
    this.offerRegistry = null;
    this.dispatchFn = null;
    this.middleware = null;
    this.telegramRuntime = null;
    this.dashboard = null;

    this.running = false;
    this.status = {
      startedAt: null,
      stoppedAt: null,
      mode: this.config.mode || 'local',
      persistent: this.persistent
    };
  }

  // Initialize all modules and wire them together
  init() {
    // Logger
    const fileSink = this.persistent ? new FileSink() : null;
    this.logger = new Logger({ fileSink: fileSink });

    // Offer Registry
    this.offerRegistry = this._buildOfferRegistry();

    // Adapter Registry
    this.adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    mockAdapter.id = 'mock-adapter';
    this.adapterRegistry.register('net_mock', mockAdapter);

    // Lead Store
    const fileStore = this.persistent ? new FileStore() : null;
    this.store = new LeadStore({
      logger: this.logger,
      fileStore: fileStore
    });

    // Dispatch
    this.dispatchFn = createDispatch({
      offerRegistry: this.offerRegistry,
      adapterRegistry: this.adapterRegistry,
      logger: this.logger
    });

    // Middleware
    this.middleware = new Middleware({
      store: this.store,
      logger: this.logger,
      offerRegistry: this.offerRegistry,
      adapterRegistry: this.adapterRegistry
    });
    this.middleware.setDispatch(this.dispatchFn);

    // Telegram Runtime
    this.telegramRuntime = new TelegramRuntime({
      config: this.config,
      middleware: this.middleware,
      logger: this.logger
    });

    // Dashboard
    this.dashboard = new Dashboard({
      store: this.store,
      logger: this.logger,
      adapterRegistry: this.adapterRegistry,
      offerRegistry: this.offerRegistry,
      dispatchFn: this.dispatchFn
    });

    return { success: true };
  }

  // Start the pipeline runtime
  start() {
    if (this.running) {
      return { success: false, reason: 'already_running' };
    }

    if (!this.middleware) {
      this.init();
    }

    // Start Telegram runtime if adapter is available
    // In local mode without a token, skip Telegram runtime — pipeline works without it
    if (this.telegramRuntime && this.config.botToken) {
      const tgResult = this.telegramRuntime.start();
      if (!tgResult.success && tgResult.reason !== 'already_running') {
        return { success: false, reason: 'telegram_start_failed', detail: tgResult };
      }
    }

    this.running = true;
    this.status.startedAt = new Date().toISOString();

    return { success: true, mode: this.status.mode, persistent: this.persistent };
  }

  // Stop the pipeline runtime
  stop() {
    if (!this.running) {
      return { success: false, reason: 'not_running' };
    }

    if (this.telegramRuntime) {
      this.telegramRuntime.stop();
    }

    this.running = false;
    this.status.stoppedAt = new Date().toISOString();

    return { success: true };
  }

  // Process a lead directly through the middleware (bypass Telegram adapter)
  async processLead(leadData) {
    if (!this.middleware) {
      return { success: false, reason: 'not_initialized' };
    }
    try {
      const result = await this.middleware.process(leadData);
      return { success: true, result };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }

  // Feed a Telegram update through the adapter
  async feedUpdate(update) {
    // If telegram runtime is initialized, use it
    if (this.telegramRuntime && this.telegramRuntime.adapter) {
      return this.telegramRuntime.feedUpdate(update);
    }
    // Otherwise, process through adapter directly (local mode without token)
    if (!this.middleware) {
      return { success: false, reason: 'not_initialized' };
    }
    try {
      const { handleUpdate } = require('../adapter/update-handler');
      const result = handleUpdate(update);
      if (result.action === 'skip') {
        return { success: true, result };
      }
      const mwResult = await this.middleware.process(result.lead);
      return { success: true, result: { action: 'processed', updateId: update.update_id, middlewareResult: mwResult } };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }

  // Feed multiple Telegram updates
  async feedUpdates(updates) {
    const results = [];
    for (const update of updates) {
      results.push(await this.feedUpdate(update));
    }
    return results;
  }

  // Get dashboard snapshot
  getDashboardSnapshot() {
    if (!this.dashboard) return null;
    return this.dashboard.getSnapshot();
  }

  // Get dashboard instance
  getDashboard() {
    return this.dashboard;
  }

  // Get full system status
  getStatus() {
    return {
      running: this.running,
      persistent: this.persistent,
      startedAt: this.status.startedAt,
      stoppedAt: this.status.stoppedAt,
      mode: this.status.mode,
      store: this.store ? { leads: this.store.list().length } : null,
      logger: this.logger ? { events: this.logger.count() } : null,
      adapters: this.adapterRegistry ? this.adapterRegistry.list() : null,
      offers: this.offerRegistry ? (this.offerRegistry.offers ? this.offerRegistry.offers.size : 0) : null,
      telegram: this.telegramRuntime ? this.telegramRuntime.getStatus() : null
    };
  }

  // Get store instance
  getStore() {
    return this.store;
  }

  // Get logger instance
  getLogger() {
    return this.logger;
  }

  // Internal: build offer registry from config
  _buildOfferRegistry() {
    return {
      offers: new Map([
        ['off_mock_01', { id: 'off_mock_01', networkId: 'net_mock', name: 'Mock Offer 01' }],
        ['off_mock_02', { id: 'off_mock_02', networkId: 'net_mock', name: 'Mock Offer 02' }]
      ]),
      get(id) { return this.offers.get(id) || null; }
    };
  }
}

module.exports = { PipelineRuntime };
