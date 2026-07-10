// Test: Dashboard Data Layer
// Verifies dashboard reads real data from store, logger, adapters, dispatch

const { Dashboard } = require('../src/dashboard/dashboard');
const { LeadStore } = require('../src/store/lead-store');
const { Logger } = require('../src/logger/logger');
const { AdapterRegistry } = require('../src/adapter/cpa/adapter-registry');
const { MockAdapter } = require('../src/adapter/cpa/mock-adapter');
const { Middleware } = require('../src/middleware/middleware');
const { createDispatch } = require('../src/middleware/dispatch');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

function setup() {
  const logger = new Logger();
  const store = new LeadStore(logger);
  const adapterRegistry = new AdapterRegistry();
  const mockAdapter = new MockAdapter();
  mockAdapter.id = 'mock-adapter';
  adapterRegistry.register('net_mock', mockAdapter);

  const offerRegistry = {
    offers: new Map([
      ['off_1', { id: 'off_1', networkId: 'net_mock', name: 'Offer 1' }],
      ['off_2', { id: 'off_2', networkId: 'net_mock', name: 'Offer 2' }]
    ]),
    get(id) { return this.offers.get(id) || null; }
  };

  const dispatchFn = createDispatch({ offerRegistry, adapterRegistry, logger });
  const middleware = new Middleware({ store, logger, offerRegistry, adapterRegistry });
  middleware.setDispatch(dispatchFn);

  const dashboard = new Dashboard({ store, logger, adapterRegistry, offerRegistry, dispatchFn });

  return { dashboard, store, logger, adapterRegistry, middleware, dispatchFn };
}

async function run() {
  console.log('=== Dashboard Tests ===');

  // 1. getLeads returns empty when no leads
  {
    const { dashboard } = setup();
    const leads = dashboard.getLeads();
    assert(leads.length === 0, 'getLeads: empty when no leads');
  }

  // 2. getLeads returns real leads after pipeline processing
  {
    const { dashboard, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79001000001', email: 'a@test.com' }, source: 'telegram', metadata: { correlationId: 'c1' } });
    await middleware.process({ offerId: 'off_2', contact: { phone: '+79001000002', email: 'b@test.com' }, source: 'telegram', metadata: { correlationId: 'c2' } });
    const leads = dashboard.getLeads();
    assert(leads.length === 2, 'getLeads: returns 2 leads');
    assert(leads[0].id !== null, 'getLeads: lead has id');
    assert(leads[0].offerId === 'off_1', 'getLeads: lead has offerId');
    assert(leads[0].metadata.correlationId === 'c1', 'getLeads: lead has correlationId');
  }

  // 3. getLeadCounts returns correct counts by status
  {
    const { dashboard, store, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79002000001', email: 'c@test.com' }, source: 'telegram' });
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79002000002', email: 'd@test.com' }, source: 'telegram' });
    const counts = dashboard.getLeadCounts();
    assert(counts.total === 2, 'counts: total=2');
    assert(counts.new === 2, 'counts: new=2');
    assert(counts.delivered === 0, 'counts: delivered=0');
  }

  // 4. getLeadCounts reflects status transitions
  {
    const { dashboard, store, middleware } = setup();
    const r = await middleware.process({ offerId: 'off_1', contact: { phone: '+79003000001', email: 'e@test.com' }, source: 'telegram' });
    store.updateStatus(r.lead.id, 'validated');
    const counts = dashboard.getLeadCounts();
    assert(counts.new === 0, 'counts after transition: new=0');
    assert(counts.validated === 1, 'counts after transition: validated=1');
  }

  // 5. getLeadDetail returns full lead data
  {
    const { dashboard, middleware } = setup();
    const r = await middleware.process({ offerId: 'off_1', contact: { phone: '+79004000001', email: 'f@test.com' }, source: 'telegram', metadata: { correlationId: 'detail_test' } });
    const detail = dashboard.getLeadDetail(r.lead.id);
    assert(detail !== null, 'detail: not null');
    assert(detail.id === r.lead.id, 'detail: correct id');
    assert(detail.metadata.correlationId === 'detail_test', 'detail: correlationId preserved');
    assert(detail.contact.phone === '+79004000001', 'detail: contact preserved');
  }

  // 6. getLeadDetail returns null for nonexistent lead
  {
    const { dashboard } = setup();
    const detail = dashboard.getLeadDetail('nonexistent');
    assert(detail === null, 'detail: null for nonexistent');
  }

  // 7. getDispatchLog returns dispatch entries after pipeline
  {
    const { dashboard, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79005000001', email: 'g@test.com' }, source: 'telegram', metadata: { correlationId: 'disp_test' } });
    const log = dashboard.getDispatchLog();
    assert(log.length > 0, 'dispatchLog: has entries');
    assert(log[0].dispatchStatus !== undefined, 'dispatchLog: has dispatchStatus');
  }

  // 8. getDispatchCounts returns correct breakdown
  {
    const { dashboard, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79006000001', email: 'h@test.com' }, source: 'telegram' });
    const counts = dashboard.getDispatchCounts();
    assert(counts.total > 0, 'dispatchCounts: total > 0');
    assert(counts.delivered !== undefined, 'dispatchCounts: has delivered');
  }

  // 9. getModuleStatus returns all expected modules
  {
    const { dashboard } = setup();
    const modules = dashboard.getModuleStatus();
    const names = modules.map(m => m.name);
    assert(names.includes('Lead Store'), 'modules: Lead Store present');
    assert(names.includes('Logger'), 'modules: Logger present');
    assert(names.includes('CPA Adapter Registry'), 'modules: CPA Adapter Registry present');
    assert(names.includes('Dispatch'), 'modules: Dispatch present');
    assert(names.includes('Middleware'), 'modules: Middleware present');
  }

  // 10. getModuleStatus shows correct lead count
  {
    const { dashboard, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79007000001', email: 'i@test.com' }, source: 'telegram' });
    const modules = dashboard.getModuleStatus();
    const storeModule = modules.find(m => m.name === 'Lead Store');
    assert(storeModule.stats.leads === 1, 'modules: lead count correct');
  }

  // 11. getModuleStatus shows registered adapters
  {
    const { dashboard } = setup();
    const modules = dashboard.getModuleStatus();
    const arModule = modules.find(m => m.name === 'CPA Adapter Registry');
    assert(arModule.stats.registered.includes('net_mock'), 'modules: net_mock registered');
  }

  // 12. getPolicySummary returns counts from logger
  {
    const { dashboard, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79008000001', email: 'j@test.com' }, source: 'telegram' });
    const policy = dashboard.getPolicySummary();
    assert(policy.total > 0, 'policy: checks > 0');
    assert(policy.approved >= 0, 'policy: approved >= 0');
  }

  // 13. getRecentAlerts returns alerts from logger events
  {
    const { dashboard, middleware } = setup();
    // Process a duplicate to trigger lead_duplicate_blocked event
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79009000001', email: 'k@test.com' }, source: 'telegram' });
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79009000001', email: 'k@test.com' }, source: 'telegram' });
    const alerts = dashboard.getRecentAlerts();
    assert(alerts.length > 0, 'alerts: has entries');
    assert(alerts[0].severity !== undefined, 'alerts: has severity');
    assert(alerts[0].message !== undefined, 'alerts: has message');
  }

  // 14. getRecentAlerts respects limit
  {
    const { dashboard, logger } = setup();
    // Generate many events
    for (let i = 0; i < 30; i++) {
      logger.log('adapter_error', { error: 'test ' + i });
    }
    const alerts = dashboard.getRecentAlerts(5);
    assert(alerts.length <= 5, 'alerts: respects limit');
  }

  // 15. getSnapshot returns complete data structure
  {
    const { dashboard, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79010000001', email: 'l@test.com' }, source: 'telegram' });
    const snapshot = dashboard.getSnapshot();
    assert(snapshot.leads !== undefined, 'snapshot: has leads');
    assert(snapshot.leadCounts !== undefined, 'snapshot: has leadCounts');
    assert(snapshot.dispatchLog !== undefined, 'snapshot: has dispatchLog');
    assert(snapshot.dispatchCounts !== undefined, 'snapshot: has dispatchCounts');
    assert(snapshot.modules !== undefined, 'snapshot: has modules');
    assert(snapshot.policy !== undefined, 'snapshot: has policy');
    assert(snapshot.alerts !== undefined, 'snapshot: has alerts');
    assert(snapshot.timestamp !== undefined, 'snapshot: has timestamp');
  }

  // 16. LeadStore.list() returns all leads
  {
    const { store, middleware } = setup();
    await middleware.process({ offerId: 'off_1', contact: { phone: '+79011000001', email: 'm@test.com' }, source: 'telegram' });
    await middleware.process({ offerId: 'off_2', contact: { phone: '+79011000002', email: 'n@test.com' }, source: 'telegram' });
    const all = store.list();
    assert(all.length === 2, 'store.list(): returns all leads');
  }

  // 17. dispatchFn.getLog() returns dispatch entries
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    adapterRegistry.register('net_mock', new MockAdapter());
    const offerRegistry = {
      offers: new Map([['off_x', { id: 'off_x', networkId: 'net_mock', name: 'X' }]]),
      get(id) { return this.offers.get(id) || null; }
    };
    const dispatchFn = createDispatch({ offerRegistry, adapterRegistry, logger });
    const middleware = new Middleware({ store, logger, offerRegistry, adapterRegistry });
    middleware.setDispatch(dispatchFn);

    await middleware.process({ offerId: 'off_x', contact: { phone: '+79012000001', email: 'o@test.com' }, source: 'telegram' });
    const log = dispatchFn.getLog();
    assert(log.length > 0, 'dispatchFn.getLog(): returns entries');
    assert(log[0].dispatchStatus !== undefined, 'dispatchFn.getLog(): has dispatchStatus');
  }

  // 18. dispatchFn.getEntries() returns entries with key
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    adapterRegistry.register('net_mock', new MockAdapter());
    const offerRegistry = {
      offers: new Map([['off_y', { id: 'off_y', networkId: 'net_mock', name: 'Y' }]]),
      get(id) { return this.offers.get(id) || null; }
    };
    const dispatchFn = createDispatch({ offerRegistry, adapterRegistry, logger });
    const middleware = new Middleware({ store, logger, offerRegistry, adapterRegistry });
    middleware.setDispatch(dispatchFn);

    await middleware.process({ offerId: 'off_y', contact: { phone: '+79013000001', email: 'p@test.com' }, source: 'telegram' });
    const entries = dispatchFn.getEntries();
    assert(entries.length > 0, 'dispatchFn.getEntries(): returns entries');
    assert(entries[0].key !== undefined, 'dispatchFn.getEntries(): has key');
  }

  // 19. Dashboard with null modules — graceful degradation
  {
    const dashboard = new Dashboard({});
    const leads = dashboard.getLeads();
    assert(leads.length === 0, 'null store: empty leads');
    const modules = dashboard.getModuleStatus();
    assert(modules.length === 1, 'null modules: only middleware');
    const policy = dashboard.getPolicySummary();
    assert(policy.total === 0, 'null logger: zero policy');
  }

  // 20. Dispatch log captures error and retryable statuses
  {
    const logger = new Logger();
    const store = new LeadStore(logger);
    const adapterRegistry = new AdapterRegistry();
    const mock = new MockAdapter();
    adapterRegistry.register('net_mock', mock);
    const offerRegistry = {
      offers: new Map([['off_z', { id: 'off_z', networkId: 'net_mock', name: 'Z' }]]),
      get(id) { return this.offers.get(id) || null; }
    };
    const dispatchFn = createDispatch({ offerRegistry, adapterRegistry, logger });
    const middleware = new Middleware({ store, logger, offerRegistry, adapterRegistry });
    middleware.setDispatch(dispatchFn);

    // Normal delivery
    await middleware.process({ offerId: 'off_z', contact: { phone: '+79014000001', email: 'q@test.com' }, source: 'telegram' });

    // Error delivery
    mock.failNext = 'error';
    try {
      await middleware.process({ offerId: 'off_z', contact: { phone: '+79014000002', email: 'r@test.com' }, source: 'telegram' });
    } catch (e) {}

    const dashboard = new Dashboard({ store, logger, adapterRegistry, offerRegistry, dispatchFn });
    const counts = dashboard.getDispatchCounts();
    assert(counts.delivered >= 1, 'dispatch counts: has delivered');
    assert(counts.error >= 1, 'dispatch counts: has error');
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
