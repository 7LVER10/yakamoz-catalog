// Test: Middleware Dispatch Integration
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

// Mock offer registry
const offerRegistry = {
  offers: new Map([
    ['off_mock', { id: 'off_mock', networkId: 'net_mock', name: 'Mock Offer' }],
    ['off_no_adapter', { id: 'off_no_adapter', networkId: 'net_unknown', name: 'No Adapter Offer' }]
  ]),
  get(id) { return this.offers.get(id) || null; }
};

function setup() {
  const logger = new Logger();
  const store = new LeadStore(logger);
  const adapterRegistry = new AdapterRegistry();
  const mockAdapter = new MockAdapter();
  adapterRegistry.register('net_mock', mockAdapter);

  const middleware = new Middleware({ store, logger, offerRegistry, adapterRegistry });
  const dispatch = createDispatch({ offerRegistry, adapterRegistry, logger });
  middleware.setDispatch(dispatch);

  return { middleware, store, logger, adapterRegistry, mockAdapter };
}

async function runTests() {
  console.log('=== Dispatch Tests ===');

  // Test 1: approved lead -> mock adapter -> delivered
  {
    const { middleware, logger, mockAdapter } = setup();
    const result = await middleware.process({
      offerId: 'off_mock',
      contact: { phone: '+79001234567', email: 'test@example.com' },
      source: 'test'
    });
    assert(result.success === true, 'approved lead -> success');
    assert(result.dispatchResult !== null, 'dispatch result present');
    assert(result.dispatchResult.dispatchStatus === 'delivered', 'dispatch status delivered');
    assert(result.lead.metadata.dispatchResult.dispatchStatus === 'delivered', 'dispatch result on lead');
  }

  // Test 2: policy-blocked lead path
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const blockingPolicy = {
      name: 'block-all',
      rules: [{
        evaluate: () => ({ severity: 'critical', enforcement: 'hard_pause', message: 'blocked' })
      }]
    };
    const adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    adapterRegistry.register('net_mock', mockAdapter);

    const mw = new Middleware({ store, logger, policyPacks: [blockingPolicy], offerRegistry, adapterRegistry });
    const dispatch = createDispatch({ offerRegistry, adapterRegistry, logger });
    mw.setDispatch(dispatch);

    const result = await mw.process({
      offerId: 'off_mock',
      contact: { phone: '+79000000000', email: 'blocked@example.com' },
      source: 'test'
    });
    // With evaluateRule() fix, rule.evaluate IS called now — lead is blocked
    assert(result.success === false, 'policy-blocked: success=false');
    assert(result.stage === 'policy', 'policy-blocked: stage=policy');
    assert(result.dispatchResult === undefined, 'policy-blocked: no dispatch reached');
  }

  // Test 3: offer not found -> offer_not_found
  {
    const { middleware, logger } = setup();
    const result = await middleware.process({
      offerId: 'off_nonexistent',
      contact: { phone: '+79000000001', email: 'unique@example.com' },
      source: 'test'
    });
    assert(result.dispatchResult !== null && result.dispatchResult.dispatchStatus === 'offer_not_found', 'offer not found');
  }

  // Test 4: no adapter registered -> no_adapter
  {
    const { middleware, logger } = setup();
    const result = await middleware.process({
      offerId: 'off_no_adapter',
      contact: { phone: '+79000000002', email: 'noadapter@example.com' },
      source: 'test'
    });
    assert(result.dispatchResult !== null && result.dispatchResult.dispatchStatus === 'no_adapter', 'no adapter');
  }

  // Test 5: adapter config invalid -> adapter_config_invalid
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    const badAdapter = new MockAdapter();
    badAdapter.validateConfig = () => { throw new Error('Invalid config'); };
    adapterRegistry.register('net_bad', badAdapter);

    const offerRegistryBad = {
      offers: new Map([['off_bad', { id: 'off_bad', networkId: 'net_bad', name: 'Bad Offer' }]]),
      get(id) { return this.offers.get(id) || null; }
    };

    const mw = new Middleware({ store, logger, offerRegistry: offerRegistryBad, adapterRegistry });
    const dispatch = createDispatch({ offerRegistry: offerRegistryBad, adapterRegistry, logger });
    mw.setDispatch(dispatch);

    const result = await mw.process({
      offerId: 'off_bad',
      contact: { phone: '+79000000003', email: 'bad@example.com' },
      source: 'test'
    });
    assert(result.dispatchResult !== null && result.dispatchResult.dispatchStatus === 'adapter_config_invalid', 'adapter config invalid');
  }

  // Test 6: idempotency hit -> returns existing result, no second call
  {
    const logger = new Logger();
    const adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    adapterRegistry.register('net_mock', mockAdapter);

    const offerReg = {
      offers: new Map([['off_idem', { id: 'off_idem', networkId: 'net_mock', name: 'Idem Offer' }]]),
      get(id) { return this.offers.get(id) || null; }
    };

    const dispatch = createDispatch({ offerRegistry: offerReg, adapterRegistry, logger });
    const testLead = { id: 'ld_idem_test', offerId: 'off_idem', contact: { phone: '+79001' }, metadata: { correlationId: 'c1', policyCheck: { status: 'approved' } } };

    const d1 = await dispatch(testLead, {});
    const d2 = await dispatch(testLead, {});
    assert(d1.dispatchStatus === 'delivered', 'first dispatch delivered');
    assert(d2.dispatchStatus === 'delivered', 'idempotency hit returns delivered');
    assert(mockAdapter.deliveryLog.length === 1, 'adapter called only once');
  }

  // Test 7: adapter returns retryable -> retry_pending
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    mockAdapter.failNext = 'retryable';
    adapterRegistry.register('net_retry', mockAdapter);

    const offerReg = {
      offers: new Map([['off_retry', { id: 'off_retry', networkId: 'net_retry', name: 'Retry Offer' }]]),
      get(id) { return this.offers.get(id) || null; }
    };

    const mw = new Middleware({ store, logger, offerRegistry: offerReg, adapterRegistry });
    const dispatch = createDispatch({ offerRegistry: offerReg, adapterRegistry, logger });
    mw.setDispatch(dispatch);

    const result = await mw.process({
      offerId: 'off_retry',
      contact: { phone: '+79000000004', email: 'retry@example.com' },
      source: 'test'
    });
    assert(result.dispatchResult.dispatchStatus === 'retry_pending', 'retryable -> retry_pending');
  }

  // Test 8: adapter returns reject -> rejected
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    mockAdapter.failNext = 'reject';
    adapterRegistry.register('net_reject', mockAdapter);

    const offerReg = {
      offers: new Map([['off_reject', { id: 'off_reject', networkId: 'net_reject', name: 'Reject Offer' }]]),
      get(id) { return this.offers.get(id) || null; }
    };

    const mw = new Middleware({ store, logger, offerRegistry: offerReg, adapterRegistry });
    const dispatch = createDispatch({ offerRegistry: offerReg, adapterRegistry, logger });
    mw.setDispatch(dispatch);

    const result = await mw.process({
      offerId: 'off_reject',
      contact: { phone: '+79000000005', email: 'reject@example.com' },
      source: 'test'
    });
    assert(result.dispatchResult.dispatchStatus === 'rejected', 'reject -> rejected');
  }

  // Test 9: adapter throws -> error
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    mockAdapter.failNext = 'error';
    adapterRegistry.register('net_error', mockAdapter);

    const offerReg = {
      offers: new Map([['off_error', { id: 'off_error', networkId: 'net_error', name: 'Error Offer' }]]),
      get(id) { return this.offers.get(id) || null; }
    };

    const mw = new Middleware({ store, logger, offerRegistry: offerReg, adapterRegistry });
    const dispatch = createDispatch({ offerRegistry: offerReg, adapterRegistry, logger });
    mw.setDispatch(dispatch);

    const result = await mw.process({
      offerId: 'off_error',
      contact: { phone: '+79000000006', email: 'error@example.com' },
      source: 'test'
    });
    assert(result.dispatchResult.dispatchStatus === 'error', 'adapter throw -> error');
  }

  // Test 10: dispatch log entry has correlationId
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    adapterRegistry.register('net_log', mockAdapter);

    const offerReg = {
      offers: new Map([['off_log', { id: 'off_log', networkId: 'net_log', name: 'Log Offer' }]]),
      get(id) { return this.offers.get(id) || null; }
    };

    const mw = new Middleware({ store, logger, offerRegistry: offerReg, adapterRegistry });
    const dispatch = createDispatch({ offerRegistry: offerReg, adapterRegistry, logger });
    mw.setDispatch(dispatch);

    await mw.process({
      offerId: 'off_log',
      contact: { phone: '+79000000007', email: 'log@example.com' },
      source: 'test',
      metadata: { correlationId: 'test_corr_123' }
    });

    const dispatchLogs = logger.query({ event: EVENTS.DISPATCH_ATTEMPT });
    assert(dispatchLogs.length > 0, 'dispatch log entries exist');
    assert(dispatchLogs.some(e => e.data.correlationId !== undefined), 'correlationId in dispatch log');
  }

  // Test 11: PII masked in dispatch log
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    const mockAdapter = new MockAdapter();
    adapterRegistry.register('net_pii', mockAdapter);

    const offerReg = {
      offers: new Map([['off_pii', { id: 'off_pii', networkId: 'net_pii', name: 'PII Offer' }]]),
      get(id) { return this.offers.get(id) || null; }
    };

    const mw = new Middleware({ store, logger, offerRegistry: offerReg, adapterRegistry });
    const dispatch = createDispatch({ offerRegistry: offerReg, adapterRegistry, logger });
    mw.setDispatch(dispatch);

    await mw.process({
      offerId: 'off_pii',
      contact: { phone: '+79001234567', email: 'pii@example.com' },
      source: 'test'
    });

    const allLogs = logger.all();
    const hasRawPhone = allLogs.some(e => JSON.stringify(e.data).includes('79001234567'));
    assert(!hasRawPhone, 'raw phone not in logs (PII masked)');
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error(err); process.exit(1); });
