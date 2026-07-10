// Test: Middleware Integration — Full Pipeline
// Exercises: normalize -> validate -> dedup -> policy-check -> dispatch
// Wired end-to-end through Middleware.process()

const { Middleware } = require('../src/middleware/middleware');
const { LeadStore } = require('../src/store/lead-store');
const { Logger } = require('../src/logger/logger');
const { AdapterRegistry } = require('../src/adapter/cpa/adapter-registry');
const { MockAdapter } = require('../src/adapter/cpa/mock-adapter');
const { createDispatch } = require('../src/middleware/dispatch');
const { EVENTS } = require('../src/logger/event-types');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

// --- Fixtures ---

const OFFERS = new Map([
  ['off_valid', { id: 'off_valid', networkId: 'net_mock', name: 'Valid Offer' }],
  ['off_no_adapter', { id: 'off_no_adapter', networkId: 'net_missing', name: 'No Adapter Offer' }]
]);

function offerRegistry() {
  return {
    get(id) { return OFFERS.get(id) || null; }
  };
}

function buildBlockingPolicy() {
  return {
    name: 'test-blocker',
    rules: [{
      evaluate: (lead) => {
        if (lead.contact && lead.contact.email && lead.contact.email.includes('blocked')) {
          return { severity: 'critical', enforcement: 'hard_pause', message: 'blocked by test policy' };
        }
        return null;
      }
    }]
  };
}

function setup(opts) {
  opts = opts || {};
  const logger = new Logger();
  const store = new LeadStore(logger);
  const adapterRegistry = new AdapterRegistry();
  const mockAdapter = new MockAdapter();
  adapterRegistry.register('net_mock', mockAdapter);

  const policyPacks = opts.blockingPolicy ? [buildBlockingPolicy()] : [];

  const mw = new Middleware({
    store,
    logger,
    policyPacks,
    offerRegistry: offerRegistry(),
    adapterRegistry
  });

  const dispatch = createDispatch({
    offerRegistry: offerRegistry(),
    adapterRegistry,
    logger
  });
  mw.setDispatch(dispatch);

  return { mw, store, logger, adapterRegistry, mockAdapter };
}

function uniquePhone(n) {
  return '+7900' + String(n).padStart(7, '0');
}

function uniqueEmail(n) {
  return 'user' + n + '@test.com';
}

// --- Tests ---

async function run() {
  console.log('=== Middleware Integration Tests ===');

  // 1. Valid lead passes full pipeline — delivered via mock
  {
    const { mw, logger } = setup();
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: '8 900 123-45-67', email: ' Test@Example.COM ' },
      source: 'telegram'
    });
    assert(result.success === true, 'valid lead: success');
    assert(result.lead !== undefined, 'valid lead: lead returned');
    assert(result.lead.status === 'new', 'valid lead: status unchanged (dispatch does not mutate)');
    assert(result.dispatchResult !== null, 'valid lead: dispatchResult present');
    assert(result.dispatchResult.dispatchStatus === 'delivered', 'valid lead: delivered');
    // Phone normalized from '8 900 123-45-67' to '+79001234567'
    assert(result.lead.contact.phone === '+79001234567', 'valid lead: phone normalized');
    // Email trimmed and lowercased
    assert(result.lead.contact.email === 'test@example.com', 'valid lead: email normalized');
  }

  // 2. Missing required field — rejected at validate stage
  {
    const { mw, logger } = setup();
    const result = await mw.process({
      offerId: 'off_valid',
      contact: {},
      source: 'test'
    });
    assert(result.success === false, 'missing field: success=false');
    assert(result.stage === 'validate', 'missing field: stage=validate');
    assert(result.errors.length > 0, 'missing field: errors returned');
    assert(result.dispatchResult === undefined, 'missing field: no dispatch');
    // Verify logger recorded it
    const invalidLogs = logger.query({ event: 'middleware_invalid' });
    assert(invalidLogs.length === 1, 'missing field: logged as middleware_invalid');
  }

  // 3. Duplicate lead — rejected at dedup stage
  {
    const { mw, logger } = setup();
    const r1 = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(100), email: uniqueEmail(100) },
      source: 'test'
    });
    assert(r1.success === true, 'dup: first lead succeeds');

    const r2 = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(100), email: uniqueEmail(100) },
      source: 'test'
    });
    assert(r2.success === false, 'dup: second lead fails');
    assert(r2.stage === 'dedup', 'dup: stage=dedup');
    assert(r2.errors[0].includes('Duplicate'), 'dup: error mentions duplicate');
    const dupLogs = logger.query({ event: 'lead_duplicate_blocked' });
    assert(dupLogs.length === 1, 'dup: logged as lead_duplicate_blocked');
  }

  // 4. Policy rejection blocks dispatch — lead not dispatched
  {
    const { mw, logger, mockAdapter } = setup({ blockingPolicy: true });
    const beforeCount = mockAdapter.deliveryLog.length;
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(200), email: 'blocked@test.com' },
      source: 'test'
    });
    assert(result.success === false, 'policy block: success=false');
    assert(result.stage === 'policy', 'policy block: stage=policy');
    assert(result.policyResult.status === 'blocked', 'policy block: status=blocked');
    assert(result.lead.status === 'rejected', 'policy block: lead status=rejected');
    assert(mockAdapter.deliveryLog.length === beforeCount, 'policy block: adapter not called');
    const policyLogs = logger.query({ event: 'policy_check' });
    assert(policyLogs.some(e => e.data.status === 'blocked'), 'policy block: logged');
  }

  // 5. Approved lead reaches mock dispatch — adapter.deliver() called
  {
    const { mw, mockAdapter } = setup();
    const beforeCount = mockAdapter.deliveryLog.length;
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(300), email: uniqueEmail(300) },
      source: 'test'
    });
    assert(result.success === true, 'approved: success');
    assert(result.dispatchResult.dispatchStatus === 'delivered', 'approved: delivered');
    assert(mockAdapter.deliveryLog.length === beforeCount + 1, 'approved: adapter called once');
  }

  // 6. Correlation ID survives full pipeline
  {
    const { mw, logger } = setup();
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(400), email: uniqueEmail(400) },
      source: 'test',
      metadata: { correlationId: 'custom_corr_42' }
    });
    assert(result.lead.metadata.correlationId === 'custom_corr_42', 'corrId: preserved from input');
    assert(result.dispatchResult !== null, 'corrId: dispatch ran');

    const dispatchLogs = logger.query({ event: EVENTS.DISPATCH_ATTEMPT });
    const match = dispatchLogs.find(e => e.data.correlationId === 'custom_corr_42');
    assert(match !== undefined, 'corrId: present in dispatch log');
  }

  // 7. Auto-generated correlation ID when not provided
  {
    const { mw, logger } = setup();
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(500), email: uniqueEmail(500) },
      source: 'test'
    });
    assert(result.lead.metadata.correlationId !== undefined, 'auto corrId: generated');
    assert(result.lead.metadata.correlationId.startsWith('corr_'), 'auto corrId: has corr_ prefix');

    const validLogs = logger.query({ event: 'middleware_valid' });
    const match = validLogs.find(e => e.data.correlationId === result.lead.metadata.correlationId);
    assert(match !== undefined, 'auto corrId: present in middleware_valid log');
  }

  // 8. Dispatch status mapping — adapter rejection
  {
    const { mw, mockAdapter } = setup();
    mockAdapter.failNext = 'reject';
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(600), email: uniqueEmail(600) },
      source: 'test'
    });
    assert(result.dispatchResult.dispatchStatus === 'rejected', 'dispatch status: reject mapped');
    assert(result.dispatchResult.deliveryResult.success === false, 'dispatch status: deliveryResult.success=false');
    assert(result.dispatchResult.deliveryResult.retryable === false, 'dispatch status: not retryable');
  }

  // 9. Dispatch status mapping — adapter retryable
  {
    const { mw, mockAdapter } = setup();
    mockAdapter.failNext = 'retryable';
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(700), email: uniqueEmail(700) },
      source: 'test'
    });
    assert(result.dispatchResult.dispatchStatus === 'retry_pending', 'dispatch status: retryable mapped');
    assert(result.dispatchResult.deliveryResult.retryable === true, 'dispatch status: retryable=true');
  }

  // 10. Dispatch status mapping — adapter error
  {
    const { mw, mockAdapter } = setup();
    mockAdapter.failNext = 'error';
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(800), email: uniqueEmail(800) },
      source: 'test'
    });
    assert(result.dispatchResult.dispatchStatus === 'error', 'dispatch status: error mapped');
    assert(result.dispatchResult.reason !== null, 'dispatch status: error reason present');
  }

  // 11. No direct unsafe mutation — lead fields intact after pipeline
  {
    const { mw } = setup();
    const input = {
      offerId: 'off_valid',
      contact: { phone: uniquePhone(900), email: uniqueEmail(900) },
      source: 'test',
      tags: ['alpha']
    };
    const result = await mw.process(input);
    const lead = result.lead;
    assert(lead.offerId === 'off_valid', 'mutation: offerId preserved');
    assert(lead.source === 'test', 'mutation: source preserved');
    assert(lead.tags[0] === 'alpha', 'mutation: tags preserved');
    assert(lead.id !== undefined && lead.id !== null, 'mutation: id assigned');
    assert(lead.createdAt !== undefined, 'mutation: createdAt set');
    assert(lead.metadata.dispatchResult !== undefined, 'mutation: dispatchResult attached to metadata');
    assert(lead.metadata.policyCheck !== undefined, 'mutation: policyCheck attached to metadata');
    assert(lead.metadata.normalizedAt !== undefined, 'mutation: normalizedAt attached to metadata');
  }

  // 12. Offer not in registry — dispatch returns offer_not_found
  {
    const { mw } = setup();
    const result = await mw.process({
      offerId: 'off_nonexistent',
      contact: { phone: uniquePhone(1000), email: uniqueEmail(1000) },
      source: 'test'
    });
    assert(result.success === true, 'offer missing: pipeline succeeds (policy=approved)');
    assert(result.dispatchResult.dispatchStatus === 'offer_not_found', 'offer missing: dispatchStatus=offer_not_found');
  }

  // 13. No dispatch wired — pipeline still works
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const mw = new Middleware({ store, logger, offerRegistry: offerRegistry() });
    // no setDispatch call
    const result = await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(1100), email: uniqueEmail(1100) },
      source: 'test'
    });
    assert(result.success === true, 'no dispatch: pipeline succeeds');
    assert(result.dispatchResult === null, 'no dispatch: dispatchResult=null');
  }

  // 14. PII not leaked in logger
  {
    const { mw, logger } = setup();
    await mw.process({
      offerId: 'off_valid',
      contact: { phone: '+79001234567', email: 'secret@example.com' },
      source: 'test'
    });
    const all = logger.all();
    const raw = JSON.stringify(all);
    assert(!raw.includes('79001234567'), 'PII: raw phone not in logs');
    assert(!raw.includes('secret@example.com'), 'PII: raw email not in logs');
  }

  // 15. Full pipeline log trace — all stages logged in order
  {
    const { mw, logger } = setup();
    await mw.process({
      offerId: 'off_valid',
      contact: { phone: uniquePhone(1200), email: uniqueEmail(1200) },
      source: 'test'
    });
    const events = logger.all().map(e => e.event);
    assert(events.includes('middleware_valid'), 'log trace: middleware_valid present');
    assert(events.includes('lead_created'), 'log trace: lead_created present');
    assert(events.includes('policy_check'), 'log trace: policy_check present');
    assert(events.includes(EVENTS.DISPATCH_ATTEMPT), 'log trace: dispatch_attempt present');
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
