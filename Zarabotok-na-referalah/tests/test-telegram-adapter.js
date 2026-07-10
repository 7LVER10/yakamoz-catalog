// Test: Telegram Adapter — Inbound Adapter Verification
// Covers: telegram.js, update-handler.js, update-cache.js
// Mock/stub only — no live Telegram calls

const { TelegramAdapter } = require('../src/adapter/telegram');
const { handleUpdate, detectType, extractOfferId, normalizeLanguage } = require('../src/adapter/update-handler');
const { UpdateCache } = require('../src/adapter/update-cache');
const { Middleware } = require('../src/middleware/middleware');
const { LeadStore } = require('../src/store/lead-store');
const { Logger } = require('../src/logger/logger');
const { AdapterRegistry } = require('../src/adapter/cpa/adapter-registry');
const { MockAdapter } = require('../src/adapter/cpa/mock-adapter');
const { createDispatch } = require('../src/middleware/dispatch');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

// Fixtures

function msgUpdate(updateId, text, fromId, opts) {
  opts = opts || {};
  return {
    update_id: updateId,
    message: {
      message_id: opts.messageId || updateId,
      from: {
        id: fromId || 12345,
        first_name: opts.firstName || 'Test',
        last_name: opts.lastName || 'User',
        username: opts.username || 'testuser',
        language_code: opts.langCode || 'en'
      },
      chat: {
        id: opts.chatId || fromId || 12345,
        type: opts.chatType || 'private'
      },
      date: Date.now(),
      text: text
    }
  };
}

function buildMiddleware() {
  const logger = new Logger();
  const store = new LeadStore(logger);
  const adapterRegistry = new AdapterRegistry();
  adapterRegistry.register('net_mock', new MockAdapter());

  const offerRegistry = {
    offers: new Map([
      ['off_tg', { id: 'off_tg', networkId: 'net_mock', name: 'TG Offer' }]
    ]),
    get(id) { return this.offers.get(id) || null; }
  };

  const mw = new Middleware({ store, logger, offerRegistry, adapterRegistry });
  const dispatch = createDispatch({ offerRegistry, adapterRegistry, logger });
  mw.setDispatch(dispatch);

  return { mw, logger, store };
}

async function run() {
  console.log('=== Telegram Adapter Tests ===');

  // === UpdateCache Tests ===

  // 1. Cache tracks processed updates
  {
    const cache = new UpdateCache();
    assert(cache.has(1) === false, 'cache: empty has() returns false');
    cache.add(1);
    assert(cache.has(1) === true, 'cache: after add, has() returns true');
    assert(cache.size() === 1, 'cache: size after add');
  }

  // 2. Cache deduplication
  {
    const cache = new UpdateCache();
    cache.add(42);
    cache.add(42);
    assert(cache.size() === 1, 'cache: duplicate add does not grow');
  }

  // 3. Cache eviction
  {
    const cache = new UpdateCache(50); // 50ms max age
    cache.add(1);
    assert(cache.has(1) === true, 'cache: fresh entry exists');
    const start = Date.now();
    while (Date.now() - start < 60) {}
    assert(cache.has(1) === false, 'cache: expired entry evicted');
  }

  // === Update Handler Tests ===

  // 4. Valid message → lead created
  {
    const update = msgUpdate(100, '/start off_tg', 111, { langCode: 'ru' });
    const result = handleUpdate(update);
    assert(result.action === 'process', 'valid message: action=process');
    assert(result.lead !== undefined, 'valid message: lead present');
    assert(result.lead.offerId === 'off_tg', 'valid message: offerId extracted');
    assert(result.lead.source === 'telegram', 'valid message: source=telegram');
    assert(result.lead.contact.telegramId === 111, 'valid message: telegramId');
    assert(result.lead.contact.username === 'testuser', 'valid message: username');
    assert(result.lead.metadata.updateId === 100, 'valid message: updateId in metadata');
  }

  // 5. No text content → skipped
  {
    const update = { update_id: 200, message: { message_id: 200, from: { id: 1 }, chat: { id: 1, type: 'private' }, date: Date.now() } };
    const result = handleUpdate(update);
    assert(result.action === 'skip', 'no text: action=skip');
    assert(result.reason === 'no_text_content', 'no text: reason=no_text_content');
  }

  // 6. Empty text → skipped
  {
    const update = msgUpdate(201, '', 1);
    const result = handleUpdate(update);
    assert(result.action === 'skip', 'empty text: action=skip');
    assert(result.reason === 'no_text_content', 'empty text: reason=no_text_content');
  }

  // 7. Unsupported type (edited_message) → skipped
  {
    const update = { update_id: 300, edited_message: { message_id: 300, text: 'edited' } };
    const result = handleUpdate(update);
    assert(result.action === 'skip', 'edited_message: action=skip');
    assert(result.reason === 'unsupported_type', 'edited_message: reason=unsupported_type');
  }

  // 8. Unsupported type (callback_query) → skipped
  {
    const update = { update_id: 301, callback_query: { id: 'cb1' } };
    const result = handleUpdate(update);
    assert(result.action === 'skip', 'callback_query: action=skip');
    assert(result.reason === 'unsupported_type', 'callback_query: reason=unsupported_type');
  }

  // 9. Unsupported type (inline_query) → skipped
  {
    const update = { update_id: 302, inline_query: { id: 'in1' } };
    const result = handleUpdate(update);
    assert(result.action === 'skip', 'inline_query: action=skip');
  }

  // 10. Invalid update (null) → skipped
  {
    const result = handleUpdate(null);
    assert(result.action === 'skip', 'null update: action=skip');
    assert(result.reason === 'invalid_update', 'null update: reason=invalid_update');
  }

  // 11. Missing update_id → skipped
  {
    const result = handleUpdate({ message: { text: 'hi' } });
    assert(result.action === 'skip', 'missing update_id: action=skip');
    assert(result.reason === 'missing_update_id', 'missing update_id: reason');
  }

  // 12. Language normalization
  {
    assert(normalizeLanguage('EN') === 'en', 'lang: EN → en');
    assert(normalizeLanguage(' ru ') === 'ru', 'lang: " ru " → ru');
    assert(normalizeLanguage('zh-CN') === 'zh', 'lang: zh-CN → zh (2 chars)');
    assert(normalizeLanguage(null) === null, 'lang: null → null');
    assert(normalizeLanguage('') === null, 'lang: empty → null');
  }

  // 13. extractOfferId
  {
    assert(extractOfferId('/start off_abc') === 'off_abc', 'extract: /start off_abc');
    assert(extractOfferId('/start') === null, 'extract: /start no arg');
    assert(extractOfferId('hello world') === null, 'extract: plain text');
    assert(extractOfferId('/start off_123 extra') === 'off_123', 'extract: /start with extra');
  }

  // 14. detectType
  {
    assert(detectType({ message: {} }) === 'message', 'detectType: message');
    assert(detectType({ edited_message: {} }) === 'unsupported', 'detectType: edited_message');
    assert(detectType({ callback_query: {} }) === 'unsupported', 'detectType: callback_query');
    assert(detectType({}) === 'unsupported', 'detectType: empty object');
  }

  // === TelegramAdapter Tests ===

  // 15. Bot token validation — valid
  {
    const adapter = new TelegramAdapter({ botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ' });
    const result = adapter.validateToken();
    assert(result.valid === true, 'token valid: correct format');
  }

  // 16. Bot token validation — missing
  {
    const adapter = new TelegramAdapter({});
    const result = adapter.validateToken();
    assert(result.valid === false, 'token missing: invalid');
    assert(result.reason === 'missing_token', 'token missing: reason');
  }

  // 17. Bot token validation — invalid format (no colon)
  {
    const adapter = new TelegramAdapter({ botToken: 'nocolon' });
    const result = adapter.validateToken();
    assert(result.valid === false, 'token no colon: invalid');
    assert(result.reason === 'invalid_format', 'token no colon: reason');
  }

  // 18. Bot token validation — non-numeric bot id
  {
    const adapter = new TelegramAdapter({ botToken: 'abc:ABCdefGHIjklMNOpqrSTUvwxYZ' });
    const result = adapter.validateToken();
    assert(result.valid === false, 'token alpha bot id: invalid');
    assert(result.reason === 'invalid_bot_id', 'token alpha bot id: reason');
  }

  // 19. Bot token validation — short token
  {
    const adapter = new TelegramAdapter({ botToken: '123:short' });
    const result = adapter.validateToken();
    assert(result.valid === false, 'token short: invalid');
    assert(result.reason === 'invalid_token_length', 'token short: reason');
  }

  // 20. Init with valid token
  {
    const adapter = new TelegramAdapter({ botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ' });
    const result = adapter.init();
    assert(result.success === true, 'init valid: success');
    assert(adapter.status.initialized === true, 'init valid: status.initialized');
  }

  // 21. Init with invalid token
  {
    const adapter = new TelegramAdapter({ botToken: 'bad' });
    const result = adapter.init();
    assert(result.success === false, 'init invalid: success=false');
    assert(adapter.status.initialized === false, 'init invalid: status.initialized=false');
  }

  // 22. Valid message → lead created via adapter + middleware
  {
    const { mw, logger } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw,
      logger
    });
    adapter.init();

    const result = await adapter.processUpdate(msgUpdate(500, '/start off_tg', 222));
    assert(result.action === 'processed', 'valid msg via adapter: action=processed');
    assert(result.middlewareResult !== undefined, 'valid msg via adapter: middlewareResult present');
    assert(result.middlewareResult.success === true, 'valid msg via adapter: middleware success');
    assert(adapter.status.leadsCreated === 1, 'valid msg via adapter: leadsCreated=1');
  }

  // 23. Duplicate update_id → skipped
  {
    const { mw, logger } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw,
      logger
    });
    adapter.init();

    await adapter.processUpdate(msgUpdate(600, '/start off_tg', 333));
    const result2 = await adapter.processUpdate(msgUpdate(600, '/start off_tg', 333));
    assert(result2.action === 'skipped', 'dup update: action=skipped');
    assert(result2.reason === 'duplicate_update_id', 'dup update: reason');
    assert(adapter.status.updatesSkipped >= 1, 'dup update: updatesSkipped incremented');
  }

  // 24. No text content → skipped via adapter
  {
    const { mw, logger } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw,
      logger
    });
    adapter.init();

    const update = { update_id: 700, message: { message_id: 700, from: { id: 1 }, chat: { id: 1, type: 'private' }, date: Date.now() } };
    const result = await adapter.processUpdate(update);
    assert(result.action === 'skip', 'no text via adapter: action=skip');
    assert(result.reason === 'no_text_content', 'no text via adapter: reason');
  }

  // 25. Unsupported type → skipped via adapter
  {
    const { mw, logger } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw,
      logger
    });
    adapter.init();

    const update = { update_id: 800, callback_query: { id: 'cb2' } };
    const result = await adapter.processUpdate(update);
    assert(result.action === 'skip', 'unsupported via adapter: action=skip');
    assert(result.reason === 'unsupported_type', 'unsupported via adapter: reason');
  }

  // 26. Correlation propagation — updateId in middleware logs
  {
    const { mw, logger } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw,
      logger
    });
    adapter.init();

    await adapter.processUpdate(msgUpdate(900, '/start off_tg', 444));
    const allLogs = logger.all();
    const hasCorr = allLogs.some(e => e.data && e.data.correlationId);
    assert(hasCorr, 'corrId: present in logs via middleware');
  }

  // 27. Multiple messages same user — different update_ids
  {
    const { mw, logger } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw,
      logger
    });
    adapter.init();

    const r1 = await adapter.processUpdate(msgUpdate(1001, '/start off_tg', 555));
    const r2 = await adapter.processUpdate(msgUpdate(1002, '/start off_tg', 555));
    assert(r1.action === 'processed', 'multi-msg: first processed');
    // Second message from same user to same offer hits lead-store dedup
    // (same offerId + empty phone + empty email = same dedup key)
    // Adapter dedup (update_id) passes, but middleware dedup catches it
    assert(r2.action === 'processed', 'multi-msg: second passes adapter');
    assert(r2.middlewareResult.success === false, 'multi-msg: second blocked by middleware dedup');
    assert(r2.middlewareResult.stage === 'dedup', 'multi-msg: blocked at dedup stage');
    assert(adapter.status.leadsCreated === 1, 'multi-msg: 1 lead created (dedup correct)');
  }

  // 28. Language normalization in lead contact
  {
    const { mw } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw
    });
    adapter.init();

    const result = await adapter.processUpdate(msgUpdate(1100, '/start off_tg', 666, { langCode: 'RU' }));
    assert(result.middlewareResult.lead.contact.languageCode === 'ru', 'lang norm: RU → ru in lead');
  }

  // 29. Adapter status tracking
  {
    const { mw } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw
    });
    adapter.init();

    await adapter.processUpdate(msgUpdate(1200, '/start off_tg', 777));
    await adapter.processUpdate(msgUpdate(1201, '/start off_tg', 777));

    assert(adapter.status.updatesProcessed === 2, 'status: updatesProcessed=2');
    assert(adapter.status.leadsCreated >= 1, 'status: leadsCreated >= 1');
    assert(adapter.status.lastUpdateAt !== null, 'status: lastUpdateAt set');
    assert(adapter.status.initialized === true, 'status: initialized=true');
  }

  // 30. Adapter without middleware — returns lead directly
  {
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ'
    });
    adapter.init();

    const result = await adapter.processUpdate(msgUpdate(1300, '/start off_tg', 888));
    assert(result.action === 'processed_no_middleware', 'no middleware: action=processed_no_middleware');
    assert(result.lead !== undefined, 'no middleware: lead present');
    assert(result.lead.offerId === 'off_tg', 'no middleware: offerId correct');
  }

  // 31. Logger records skipped updates
  {
    const { mw, logger } = buildMiddleware();
    const adapter = new TelegramAdapter({
      botToken: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      middleware: mw,
      logger
    });
    adapter.init();

    await adapter.processUpdate({ update_id: 1400, edited_message: { text: 'edited' } });
    const skipped = logger.query({ event: 'telegram_skipped' });
    assert(skipped.length >= 1, 'logger: telegram_skipped recorded');
    assert(skipped.some(e => e.data.reason === 'unsupported_type'), 'logger: reason in log');
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
