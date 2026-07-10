// Test: CPA Adapter Pattern — Unit Tests
// Covers: adapter-base, adapter-registry, delivery-result, error-taxonomy, mock-adapter

const { AdapterBase } = require('../src/adapter/cpa/adapter-base');
const { AdapterRegistry } = require('../src/adapter/cpa/adapter-registry');
const { DeliveryResult } = require('../src/adapter/cpa/delivery-result');
const { AdapterError, ERROR_TYPES, RETRYABLE_ERRORS } = require('../src/adapter/cpa/error-taxonomy');
const { MockAdapter } = require('../src/adapter/cpa/mock-adapter');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

function lead(id, offerId, contact) {
  return {
    id: id || 'ld_test',
    offerId: offerId || 'off_test',
    contact: contact || { phone: '+79001234567', email: 'test@example.com' },
    source: 'test',
    metadata: {}
  };
}

// --- Tests ---

console.log('=== CPA Adapter Pattern Tests ===');

// === DeliveryResult ===

// 1. Successful delivery
{
  const result = DeliveryResult.ok({ confirmationId: 'conf_1' }, 'adapter-1', 'ld_1');
  assert(result.success === true, 'DeliveryResult.ok: success=true');
  assert(result.retryable === false, 'DeliveryResult.ok: retryable=false');
  assert(result.error === null, 'DeliveryResult.ok: error=null');
  assert(result.data.confirmationId === 'conf_1', 'DeliveryResult.ok: data preserved');
  assert(result.adapterId === 'adapter-1', 'DeliveryResult.ok: adapterId set');
  assert(result.leadId === 'ld_1', 'DeliveryResult.ok: leadId set');
  assert(result.timestamp !== undefined, 'DeliveryResult.ok: timestamp set');
}

// 2. Destination rejection
{
  const result = DeliveryResult.reject('Not accepted', 'adapter-1', 'ld_2');
  assert(result.success === false, 'DeliveryResult.reject: success=false');
  assert(result.retryable === false, 'DeliveryResult.reject: retryable=false');
  assert(result.error === 'Not accepted', 'DeliveryResult.reject: error message');
}

// 3. Retryable result
{
  const err = new AdapterError(ERROR_TYPES.TRANSPORT, 'Connection refused');
  const result = DeliveryResult.retryable(err, 'adapter-1', 'ld_3');
  assert(result.success === false, 'DeliveryResult.retryable: success=false');
  assert(result.retryable === true, 'DeliveryResult.retryable: retryable=true');
  assert(result.error.type === 'transport', 'DeliveryResult.retryable: error type');
}

// === AdapterError / Error Taxonomy ===

// 4. Error types defined
{
  assert(ERROR_TYPES.TRANSPORT === 'transport', 'ERROR_TYPES: TRANSPORT');
  assert(ERROR_TYPES.TIMEOUT === 'timeout', 'ERROR_TYPES: TIMEOUT');
  assert(ERROR_TYPES.REJECTION === 'rejection', 'ERROR_TYPES: REJECTION');
  assert(ERROR_TYPES.MAPPING === 'mapping', 'ERROR_TYPES: MAPPING');
  assert(ERROR_TYPES.CONFIG === 'config', 'ERROR_TYPES: CONFIG');
  assert(ERROR_TYPES.UNKNOWN === 'unknown', 'ERROR_TYPES: UNKNOWN');
}

// 5. Retryable classification
{
  const transportErr = new AdapterError(ERROR_TYPES.TRANSPORT, 'conn refused');
  assert(transportErr.isRetryable() === true, 'transport is retryable');

  const timeoutErr = new AdapterError(ERROR_TYPES.TIMEOUT, 'timed out');
  assert(timeoutErr.isRetryable() === true, 'timeout is retryable');

  const rejectErr = new AdapterError(ERROR_TYPES.REJECTION, 'rejected');
  assert(rejectErr.isRetryable() === false, 'rejection is NOT retryable');

  const mapErr = new AdapterError(ERROR_TYPES.MAPPING, 'bad field');
  assert(mapErr.isRetryable() === false, 'mapping is NOT retryable');

  const configErr = new AdapterError(ERROR_TYPES.CONFIG, 'missing key');
  assert(configErr.isRetryable() === false, 'config is NOT retryable');

  const unknownErr = new AdapterError(ERROR_TYPES.UNKNOWN, '???');
  assert(unknownErr.isRetryable() === false, 'unknown is NOT retryable');
}

// 6. RETRYABLE_ERRORS list
{
  assert(RETRYABLE_ERRORS.length === 2, 'RETRYABLE_ERRORS: 2 entries');
  assert(RETRYABLE_ERRORS.includes('transport'), 'RETRYABLE_ERRORS: includes transport');
  assert(RETRYABLE_ERRORS.includes('timeout'), 'RETRYABLE_ERRORS: includes timeout');
}

// 7. AdapterError is an Error instance
{
  const err = new AdapterError(ERROR_TYPES.TRANSPORT, 'test');
  assert(err instanceof Error, 'AdapterError: instanceof Error');
  assert(err.type === 'transport', 'AdapterError: type field');
  assert(err.detail === null, 'AdapterError: detail defaults to null');
  assert(err.message === 'test', 'AdapterError: message preserved');
}

// 8. AdapterError with detail
{
  const err = new AdapterError(ERROR_TYPES.MAPPING, 'field mismatch', { field: 'email', reason: 'invalid' });
  assert(err.detail.field === 'email', 'AdapterError: detail preserved');
}

// === AdapterRegistry ===

// 9. Registry register + lookup
{
  const registry = new AdapterRegistry();
  const adapter = new MockAdapter();
  registry.register('net_a', adapter);
  assert(registry.get('net_a') === adapter, 'registry: lookup by networkId');
  assert(registry.has('net_a') === true, 'registry: has returns true');
}

// 10. Unknown adapter
{
  const registry = new AdapterRegistry();
  assert(registry.get('net_nonexistent') === null, 'registry: unknown returns null');
  assert(registry.has('net_nonexistent') === false, 'registry: has returns false');
}

// 11. Registry list
{
  const registry = new AdapterRegistry();
  registry.register('net_x', new MockAdapter());
  registry.register('net_y', new MockAdapter());
  registry.register('net_z', new MockAdapter());
  const list = registry.list();
  assert(list.length === 3, 'registry: list length');
  assert(list.includes('net_x'), 'registry: list includes net_x');
  assert(list.includes('net_y'), 'registry: list includes net_y');
  assert(list.includes('net_z'), 'registry: list includes net_z');
}

// 12. Registry overwrite
{
  const registry = new AdapterRegistry();
  const a1 = new MockAdapter();
  const a2 = new MockAdapter();
  a2.id = 'second';
  registry.register('net_same', a1);
  registry.register('net_same', a2);
  assert(registry.get('net_same').id === 'second', 'registry: overwrite works');
  assert(registry.list().length === 1, 'registry: list after overwrite');
}

// === MockAdapter ===

// 13. Successful delivery
{
  const adapter = new MockAdapter();
  const result = adapter.deliver(lead('ld_ok'), { offerId: 'off_ok' });
  assert(result.success === true, 'mock: successful delivery');
  assert(result.adapterId === 'mock-adapter', 'mock: adapterId set');
  assert(result.leadId === 'ld_ok', 'mock: leadId set');
  assert(result.data.confirmationId.startsWith('mock_'), 'mock: confirmationId format');
}

// 14. Destination rejection
{
  const adapter = new MockAdapter();
  adapter.failNext = 'reject';
  const result = adapter.deliver(lead('ld_rej'), { offerId: 'off_rej' });
  assert(result.success === false, 'mock reject: success=false');
  assert(result.retryable === false, 'mock reject: retryable=false');
  assert(result.error === 'Destination rejected the lead', 'mock reject: error message');
}

// 15. Transport error (retryable)
{
  const adapter = new MockAdapter();
  adapter.failNext = 'retryable';
  const result = adapter.deliver(lead('ld_retry'), { offerId: 'off_retry' });
  assert(result.success === false, 'mock retryable: success=false');
  assert(result.retryable === true, 'mock retryable: retryable=true');
  assert(result.error instanceof AdapterError, 'mock retryable: error is AdapterError');
  assert(result.error.type === ERROR_TYPES.TRANSPORT, 'mock retryable: error type=transport');
}

// 16. Timeout (retryable) — tested via AdapterError directly
// MockAdapter 'retryable' mode uses TRANSPORT; TIMEOUT is same retryability class
{
  const timeoutResult = DeliveryResult.retryable(
    new AdapterError(ERROR_TYPES.TIMEOUT, 'Request timed out'),
    'test-adapter',
    'ld_timeout'
  );
  assert(timeoutResult.success === false, 'timeout: success=false');
  assert(timeoutResult.retryable === true, 'timeout: retryable=true');
  assert(timeoutResult.error.type === 'timeout', 'timeout: error type=timeout');
  assert(timeoutResult.error.isRetryable() === true, 'timeout: isRetryable()');
}

// 17. Mapping error — tested via AdapterError directly
// MockAdapter doesn't have a mapping fail mode; verify error taxonomy
{
  const mapError = new AdapterError(ERROR_TYPES.MAPPING, 'Missing required field: email', { field: 'email' });
  assert(mapError.isRetryable() === false, 'mapping error: not retryable');
  assert(mapError.type === 'mapping', 'mapping error: type=mapping');

  const mapResult = DeliveryResult.reject(mapError, 'test-adapter', 'ld_map');
  assert(mapResult.success === false, 'mapping reject: success=false');
  assert(mapResult.retryable === false, 'mapping reject: retryable=false');
}

// 18. Adapter throws error
{
  const adapter = new MockAdapter();
  adapter.failNext = 'error';
  let caught = null;
  try {
    adapter.deliver(lead('ld_throw'), { offerId: 'off_throw' });
  } catch (e) {
    caught = e;
  }
  assert(caught !== null, 'mock error: exception thrown');
  assert(caught instanceof AdapterError, 'mock error: is AdapterError');
  assert(caught.type === ERROR_TYPES.UNKNOWN, 'mock error: type=unknown');
}

// 19. Config validation
{
  const adapter = new MockAdapter();
  assert(adapter.validateConfig() === true, 'mock: config valid by default');

  // Custom adapter with invalid config
  class BadAdapter extends AdapterBase {
    constructor(config) { super(config || {}); }
    validateConfig() {
      if (!this.config.apiKey) throw new AdapterError(ERROR_TYPES.CONFIG, 'Missing apiKey');
      return true;
    }
    deliver() { return DeliveryResult.ok({}, this.id, ''); }
    mapLead(lead) { return lead; }
  }
  const bad = new BadAdapter();
  let configErr = null;
  try { bad.validateConfig(); } catch (e) { configErr = e; }
  assert(configErr !== null, 'custom adapter: config validation throws');
  assert(configErr.type === ERROR_TYPES.CONFIG, 'custom adapter: error type=config');

  const good = new BadAdapter({ apiKey: 'key_123' });
  assert(good.validateConfig() === true, 'custom adapter: config valid with key');
}

// 20. mapLead
{
  const adapter = new MockAdapter();
  const mapped = adapter.mapLead(lead('ld_map', 'off_map', { phone: '+79009999', email: 'm@test.com' }));
  assert(mapped.externalId === 'ld_map', 'mapLead: externalId');
  assert(mapped.email === 'm@test.com', 'mapLead: email');
  assert(mapped.phone === '+79009999', 'mapLead: phone');
  assert(mapped.offerId === 'off_map', 'mapLead: offerId');
}

// 21. deliveryLog tracking
{
  const adapter = new MockAdapter();
  adapter.deliver(lead('ld_log1'), {});
  adapter.deliver(lead('ld_log2'), {});
  assert(adapter.deliveryLog.length === 2, 'deliveryLog: 2 entries');
  assert(adapter.deliveryLog[0].leadId === 'ld_log1', 'deliveryLog: first leadId');
  assert(adapter.deliveryLog[1].leadId === 'ld_log2', 'deliveryLog: second leadId');
}

// 22. DeliveryResult static factory consistency
{
  const ok = DeliveryResult.ok({}, 'a', 'l');
  const rej = DeliveryResult.reject('err', 'a', 'l');
  const ret = DeliveryResult.retryable('err', 'a', 'l');

  assert(ok.success === true && ok.retryable === false, 'factory: ok is success, not retryable');
  assert(rej.success === false && rej.retryable === false, 'factory: reject is fail, not retryable');
  assert(ret.success === false && ret.retryable === true, 'factory: retryable is fail, retryable');
}

// 23. DeliveryResult constructor defaults
{
  const r = new DeliveryResult({});
  assert(r.success === false, 'defaults: success=false');
  assert(r.retryable === false, 'defaults: retryable=false');
  assert(r.error === null, 'defaults: error=null');
  assert(r.data === null, 'defaults: data=null');
}

// === AdapterBase contract ===

// 24. AdapterBase abstract methods throw
{
  const base = new AdapterBase({});
  let vErr = null;
  try { base.validateConfig(); } catch (e) { vErr = e; }
  assert(vErr !== null, 'AdapterBase: validateConfig throws');

  let dErr = null;
  try { base.deliver({}, {}); } catch (e) { dErr = e; }
  assert(dErr !== null, 'AdapterBase: deliver throws');

  let mErr = null;
  try { base.mapLead({}); } catch (e) { mErr = e; }
  assert(mErr !== null, 'AdapterBase: mapLead throws');
}

// 25. MockAdapter extends AdapterBase
{
  const adapter = new MockAdapter();
  assert(adapter instanceof AdapterBase, 'MockAdapter: instanceof AdapterBase');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
