// Test: Lead Store
const { LeadStore } = require('../src/store/lead-store');
const { Logger } = require('../src/logger/logger');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

console.log('=== Lead Store Tests ===');

const logger = new Logger();
const store = new LeadStore(logger);

// Create
const lead = store.create({ offerId: 'off_1', contact: { phone: '+79001234567', email: 'test@example.com' }, source: 'telegram' });
assert(lead.id !== null, 'create lead');
assert(lead.status === 'new', 'initial status is new');

// Get
const got = store.get(lead.id);
assert(got !== null, 'get lead');
assert(got.id === lead.id, 'get returns same lead');

// Update status
const updated = store.updateStatus(lead.id, 'validated');
assert(updated.status === 'validated', 'update status');

// Invalid transition
try {
  store.updateStatus(lead.id, 'new');
  assert(false, 'invalid transition should throw');
} catch (e) {
  assert(e.message.includes('Invalid transition'), 'invalid transition rejected');
}

// Immutable field
try {
  store.update(lead.id, { id: 'changed' });
  assert(false, 'immutable field should throw');
} catch (e) {
  assert(e.message.includes('immutable'), 'immutable field rejected');
}

// Duplicate detection
try {
  store.create({ offerId: 'off_1', contact: { phone: '+79001234567', email: 'test@example.com' }, source: 'telegram' });
  assert(false, 'duplicate should throw');
} catch (e) {
  assert(e.message.includes('Duplicate'), 'duplicate detection');
}

// No false duplicate
const lead2 = store.create({ offerId: 'off_1', contact: { phone: '+79009999999', email: 'other@example.com' }, source: 'telegram' });
assert(lead2.id !== lead.id, 'no false duplicate');

// List by offer
const list = store.listByOffer('off_1');
assert(list.length === 2, 'list by offer');

// Logger correlation
const logs = logger.query({ event: 'lead_created' });
assert(logs.length >= 2, 'logger has lead_created events');

// PII masking
const { maskPhone, maskEmail } = require('../src/logger/pii-mask');
assert(maskPhone('+79001234567') === '+79***67', 'phone masking');
assert(maskEmail('test@example.com') === 't***t@example.com', 'email masking');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
