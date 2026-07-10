// Test: Telegram Runtime
// Covers: config loading, validation, runtime lifecycle, local mode update feeding

const { loadConfig, validateConfig } = require('../src/config/config-loader');
const { TelegramRuntime } = require('../src/runtime/telegram-runtime');
const { Middleware } = require('../src/middleware/middleware');
const { LeadStore } = require('../src/store/lead-store');
const { Logger } = require('../src/logger/logger');
const { AdapterRegistry } = require('../src/adapter/cpa/adapter-registry');
const { MockAdapter } = require('../src/adapter/cpa/mock-adapter');
const { createDispatch } = require('../src/middleware/dispatch');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

function buildMiddleware() {
  const logger = new Logger();
  const store = new LeadStore(logger);
  const adapterRegistry = new AdapterRegistry();
  adapterRegistry.register('net_mock', new MockAdapter());
  const offerRegistry = {
    offers: new Map([['off_tg', { id: 'off_tg', networkId: 'net_mock', name: 'TG Offer' }]]),
    get(id) { return this.offers.get(id) || null; }
  };
  const mw = new Middleware({ store, logger, offerRegistry, adapterRegistry });
  const dispatch = createDispatch({ offerRegistry, adapterRegistry, logger });
  mw.setDispatch(dispatch);
  return { mw, logger, store };
}

function msgUpdate(id, text) {
  return {
    update_id: id,
    message: {
      message_id: id,
      from: { id: 1000, first_name: 'Test', username: 'testuser', language_code: 'en' },
      chat: { id: 1000, type: 'private' },
      date: Date.now(),
      text: text
    }
  };
}

async function run() {
  console.log('=== Telegram Runtime Tests ===');

  // --- Config Tests ---

  // 1. loadConfig returns defaults when no files exist
  {
    const config = loadConfig({ configPath: '/nonexistent', envPath: '/nonexistent' });
    assert(config.botToken === '', 'config defaults: empty botToken');
    assert(config.mode === 'local', 'config defaults: mode=local');
    assert(config.pollInterval === 3000, 'config defaults: pollInterval=3000');
    assert(config.pollTimeout === 30, 'config defaults: pollTimeout=30');
  }

  // 2. loadConfig reads from bot-config.json
  {
    const config = loadConfig({ configPath: path.join(__dirname, '..', 'config', 'bot-config.json'), envPath: '/nonexistent' });
    assert(typeof config.allowedChatTypes === 'object', 'config file: allowedChatTypes loaded');
    assert(config.maxMessageLength === 4096, 'config file: maxMessageLength loaded');
  }

  // 3. loadConfig overrides work
  {
    const config = loadConfig({ botToken: '123:abcdefg12345678901234567890', mode: 'polling', configPath: '/nonexistent', envPath: '/nonexistent' });
    assert(config.botToken === '123:abcdefg12345678901234567890', 'config override: botToken');
    assert(config.mode === 'polling', 'config override: mode');
  }

  // 4. validateConfig — valid token
  {
    const result = validateConfig({ botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' });
    assert(result.valid === true, 'validateConfig: valid token passes');
  }

  // 5. validateConfig — missing token
  {
    const result = validateConfig({ botToken: '', mode: 'local' });
    assert(result.valid === false, 'validateConfig: missing token fails');
    assert(result.errors.length > 0, 'validateConfig: missing token has errors');
  }

  // 6. validateConfig — invalid format
  {
    const result = validateConfig({ botToken: 'nocolon', mode: 'local' });
    assert(result.valid === false, 'validateConfig: no colon fails');
  }

  // 7. validateConfig — invalid bot id
  {
    const result = validateConfig({ botToken: 'abc:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' });
    assert(result.valid === false, 'validateConfig: alpha bot id fails');
  }

  // 8. validateConfig — short token
  {
    const result = validateConfig({ botToken: '123:short', mode: 'local' });
    assert(result.valid === false, 'validateConfig: short token fails');
  }

  // 9. validateConfig — polling mode requires token
  {
    const result = validateConfig({ botToken: '', mode: 'polling' });
    assert(result.valid === false, 'validateConfig: polling without token fails');
  }

  // --- Runtime Lifecycle Tests ---

  // 10. Runtime init with valid config
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    const result = runtime.init();
    assert(result.success === true, 'runtime init: success');
    assert(runtime.adapter !== null, 'runtime init: adapter created');
    assert(runtime.adapter.status.initialized === true, 'runtime init: adapter initialized');
  }

  // 11. Runtime init with invalid config
  {
    const runtime = new TelegramRuntime({
      config: { botToken: '', mode: 'local' }
    });
    const result = runtime.init();
    assert(result.success === false, 'runtime init invalid: fails');
    assert(result.reason === 'config_invalid', 'runtime init invalid: reason=config_invalid');
  }

  // 12. Runtime start and stop lifecycle
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    runtime.init();

    const startResult = runtime.start();
    assert(startResult.success === true, 'runtime start: success');
    assert(runtime.running === true, 'runtime start: running=true');
    assert(runtime.status.startedAt !== null, 'runtime start: startedAt set');

    const stopResult = runtime.stop();
    assert(stopResult.success === true, 'runtime stop: success');
    assert(runtime.running === false, 'runtime stop: running=false');
    assert(runtime.status.stoppedAt !== null, 'runtime stop: stoppedAt set');
  }

  // 13. Runtime start without init — auto-initializes
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    const result = runtime.start();
    assert(result.success === true, 'runtime auto-init: start succeeds');
    assert(runtime.adapter !== null, 'runtime auto-init: adapter created');
    runtime.stop();
  }

  // 14. Runtime double start fails
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    runtime.start();
    const result = runtime.start();
    assert(result.success === false, 'runtime double start: fails');
    assert(result.reason === 'already_running', 'runtime double start: reason=already_running');
    runtime.stop();
  }

  // 15. Runtime stop when not running fails
  {
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' }
    });
    const result = runtime.stop();
    assert(result.success === false, 'runtime stop not running: fails');
    assert(result.reason === 'not_running', 'runtime stop not running: reason=not_running');
  }

  // --- Local Mode Update Feeding ---

  // 16. feedUpdate processes a valid message
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    runtime.start();

    const result = await runtime.feedUpdate(msgUpdate(1, '/start off_tg'));
    assert(result.success === true, 'feedUpdate: success');
    assert(result.result.action === 'processed', 'feedUpdate: action=processed');
    assert(runtime.status.updatesProcessed === 1, 'feedUpdate: updatesProcessed=1');
    runtime.stop();
  }

  // 17. feedUpdate handles duplicate update_id
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    runtime.start();

    await runtime.feedUpdate(msgUpdate(100, '/start off_tg'));
    const result = await runtime.feedUpdate(msgUpdate(100, '/start off_tg'));
    assert(result.result.action === 'skipped', 'feedUpdate dup: action=skipped');
    runtime.stop();
  }

  // 18. feedUpdate handles no-text message
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    runtime.start();

    const update = { update_id: 200, message: { message_id: 200, from: { id: 1 }, chat: { id: 1, type: 'private' }, date: Date.now() } };
    const result = await runtime.feedUpdate(update);
    assert(result.result.action === 'skip', 'feedUpdate no-text: action=skip');
    runtime.stop();
  }

  // 19. feedUpdates processes batch
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    runtime.start();

    const results = await runtime.feedUpdates([
      msgUpdate(300, '/start off_tg'),
      msgUpdate(301, '/start off_tg'),
      msgUpdate(302, '/start off_tg')
    ]);
    assert(results.length === 3, 'feedUpdates batch: 3 results');
    assert(results.every(r => r.success), 'feedUpdates batch: all succeed');
    assert(runtime.status.updatesProcessed === 3, 'feedUpdates batch: 3 processed');
    runtime.stop();
  }

  // 20. getStatus returns complete status
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    runtime.start();
    await runtime.feedUpdate(msgUpdate(400, '/start off_tg'));

    const status = runtime.getStatus();
    assert(status.running === true, 'getStatus: running=true');
    assert(status.mode === 'local', 'getStatus: mode=local');
    assert(status.updatesProcessed === 1, 'getStatus: updatesProcessed=1');
    assert(status.adapterStatus !== null, 'getStatus: adapterStatus present');
    assert(status.adapterStatus.leadsCreated >= 1, 'getStatus: leadsCreated >= 1');
    runtime.stop();
  }

  // 21. feedUpdate before start fails gracefully
  {
    const { mw } = buildMiddleware();
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' },
      middleware: mw
    });
    // Not started, not initialized
    const result = await runtime.feedUpdate(msgUpdate(500, '/start off_tg'));
    assert(result.success === false, 'feedUpdate before init: fails');
    assert(result.reason === 'not_initialized', 'feedUpdate before init: reason=not_initialized');
  }

  // 22. Runtime without middleware processes updates
  {
    const runtime = new TelegramRuntime({
      config: { botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ', mode: 'local' }
    });
    runtime.start();
    const result = await runtime.feedUpdate(msgUpdate(600, '/start off_tg'));
    assert(result.success === true, 'no middleware: feedUpdate succeeds');
    assert(result.result.action === 'processed_no_middleware', 'no middleware: action=processed_no_middleware');
    runtime.stop();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
