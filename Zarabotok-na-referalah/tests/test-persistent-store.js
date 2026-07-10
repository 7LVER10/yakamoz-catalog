// Test: Persistent Lead Storage
// Covers: FileStore, LeadStore+FileStore integration, restart survival

const { FileStore } = require('../src/store/file-store');
const { LeadStore } = require('../src/store/lead-store');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const TEST_DIR = path.join(__dirname, '..', '.openclaw', 'tmp', 'test-leads-' + Date.now());

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    const files = fs.readdirSync(TEST_DIR);
    for (const f of files) {
      fs.unlinkSync(path.join(TEST_DIR, f));
    }
    fs.rmdirSync(TEST_DIR);
  }
}

async function run() {
  console.log('=== Persistent Lead Storage Tests ===');

  // --- FileStore Tests ---

  // 1. FileStore creates directory
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    assert(fs.existsSync(TEST_DIR), 'FileStore: directory created');
  }

  // 2. FileStore saves and loads a lead
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    const lead = { id: 'ld_test1', offerId: 'off_1', status: 'new', contact: { phone: '+79001' }, createdAt: '2026-07-11T00:00:00Z', updatedAt: '2026-07-11T00:00:00Z' };
    fs2.save(lead);
    const loaded = fs2.load('ld_test1');
    assert(loaded !== null, 'FileStore load: not null');
    assert(loaded.id === 'ld_test1', 'FileStore load: correct id');
    assert(loaded.offerId === 'off_1', 'FileStore load: correct offerId');
    assert(loaded.status === 'new', 'FileStore load: correct status');
  }

  // 3. FileStore load returns null for missing lead
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    assert(fs2.load('nonexistent') === null, 'FileStore load: null for missing');
  }

  // 4. FileStore loadAll returns all leads
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    fs2.save({ id: 'ld_a', offerId: 'off_1', status: 'new' });
    fs2.save({ id: 'ld_b', offerId: 'off_2', status: 'delivered' });
    const all = fs2.loadAll();
    assert(all.length === 2, 'FileStore loadAll: returns 2');
    const ids = all.map(l => l.id);
    assert(ids.includes('ld_a'), 'FileStore loadAll: includes ld_a');
    assert(ids.includes('ld_b'), 'FileStore loadAll: includes ld_b');
  }

  // 5. FileStore save overwrites existing
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    fs2.save({ id: 'ld_over', offerId: 'off_1', status: 'new' });
    fs2.save({ id: 'ld_over', offerId: 'off_1', status: 'delivered' });
    const loaded = fs2.load('ld_over');
    assert(loaded.status === 'delivered', 'FileStore save: overwrites correctly');
  }

  // 6. FileStore remove deletes file
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    fs2.save({ id: 'ld_del', offerId: 'off_1', status: 'new' });
    assert(fs2.load('ld_del') !== null, 'FileStore remove: exists before');
    fs2.remove('ld_del');
    assert(fs2.load('ld_del') === null, 'FileStore remove: gone after');
  }

  // 7. FileStore listIds returns IDs
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    fs2.save({ id: 'ld_x', offerId: 'off_1', status: 'new' });
    fs2.save({ id: 'ld_y', offerId: 'off_2', status: 'new' });
    const ids = fs2.listIds();
    assert(ids.length === 2, 'FileStore listIds: 2 ids');
    assert(ids.includes('ld_x'), 'FileStore listIds: includes ld_x');
  }

  // 8. FileStore count
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    fs2.save({ id: 'ld_1', offerId: 'off_1', status: 'new' });
    fs2.save({ id: 'ld_2', offerId: 'off_2', status: 'new' });
    fs2.save({ id: 'ld_3', offerId: 'off_3', status: 'new' });
    assert(fs2.count() === 3, 'FileStore count: 3');
  }

  // 9. FileStore handles malformed JSON gracefully
  {
    cleanup();
    const fs2 = new FileStore(TEST_DIR);
    fs.writeFileSync(path.join(TEST_DIR, 'bad.json'), 'not json');
    fs2.save({ id: 'ld_good', offerId: 'off_1', status: 'new' });
    const all = fs2.loadAll();
    assert(all.length === 1, 'FileStore loadAll: skips malformed');
    assert(all[0].id === 'ld_good', 'FileStore loadAll: good lead preserved');
  }

  // --- LeadStore + FileStore Integration ---

  // 10. LeadStore with FileStore persists on create
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    const store = new LeadStore({ fileStore });
    const lead = store.create({ offerId: 'off_1', contact: { phone: '+79001000001', email: 'a@test.com' } });
    assert(lead.id !== null, 'LeadStore+FS create: lead has id');
    const loaded = fileStore.load(lead.id);
    assert(loaded !== null, 'LeadStore+FS create: persisted to disk');
    assert(loaded.offerId === 'off_1', 'LeadStore+FS create: correct data on disk');
  }

  // 11. LeadStore with FileStore loads on startup (simulates restart)
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    // First "session" — create leads
    const store1 = new LeadStore({ fileStore });
    const lead1 = store1.create({ offerId: 'off_1', contact: { phone: '+79002000001', email: 'b@test.com' } });
    const lead2 = store1.create({ offerId: 'off_2', contact: { phone: '+79002000002', email: 'c@test.com' } });
    store1.updateStatus(lead1.id, 'validated');

    // Second "session" — simulates restart
    const store2 = new LeadStore({ fileStore });
    assert(store2.list().length === 2, 'Restart: 2 leads loaded');
    const loaded1 = store2.get(lead1.id);
    assert(loaded1.status === 'validated', 'Restart: status preserved');
    const loaded2 = store2.get(lead2.id);
    assert(loaded2.status === 'new', 'Restart: new lead preserved');
  }

  // 12. Dedup works after restart
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    const store1 = new LeadStore({ fileStore });
    store1.create({ offerId: 'off_1', contact: { phone: '+79003000001', email: 'd@test.com' } });

    // Restart
    const store2 = new LeadStore({ fileStore });
    let dupCaught = false;
    try {
      store2.create({ offerId: 'off_1', contact: { phone: '+79003000001', email: 'd@test.com' } });
    } catch (e) {
      if (e.message.includes('Duplicate')) dupCaught = true;
    }
    assert(dupCaught, 'Restart dedup: duplicate caught after restart');
  }

  // 13. Status update persists to disk
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    const store = new LeadStore({ fileStore });
    const lead = store.create({ offerId: 'off_1', contact: { phone: '+79004000001', email: 'e@test.com' } });
    store.updateStatus(lead.id, 'validated');
    store.updateStatus(lead.id, 'pending_delivery');

    // Verify on disk
    const loaded = fileStore.load(lead.id);
    assert(loaded.status === 'pending_delivery', 'Status persist: correct on disk');
    assert(loaded.updatedAt !== lead.createdAt, 'Status persist: updatedAt changed');
  }

  // 14. Invalid transition still rejected with FileStore
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    const store = new LeadStore({ fileStore });
    const lead = store.create({ offerId: 'off_1', contact: { phone: '+79005000001', email: 'f@test.com' } });
    store.updateStatus(lead.id, 'validated');
    store.updateStatus(lead.id, 'pending_delivery');
    store.updateStatus(lead.id, 'delivered');

    let invalidCaught = false;
    try {
      store.updateStatus(lead.id, 'new');
    } catch (e) {
      if (e.message.includes('Invalid transition')) invalidCaught = true;
    }
    assert(invalidCaught, 'Invalid transition: still rejected with FileStore');
  }

  // 15. Immutable fields still protected with FileStore
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    const store = new LeadStore({ fileStore });
    const lead = store.create({ offerId: 'off_1', contact: { phone: '+79006000001', email: 'g@test.com' } });

    let immutCaught = false;
    try {
      store.update(lead.id, { id: 'changed' });
    } catch (e) {
      if (e.message.includes('immutable')) immutCaught = true;
    }
    assert(immutCaught, 'Immutable field: still protected with FileStore');
  }

  // 16. LeadStore without FileStore still works (backward compatible)
  {
    cleanup();
    const store = new LeadStore();
    const lead = store.create({ offerId: 'off_1', contact: { phone: '+79007000001', email: 'h@test.com' } });
    assert(lead.id !== null, 'No FileStore: create works');
    assert(store.get(lead.id) !== null, 'No FileStore: get works');
    assert(store.list().length === 1, 'No FileStore: list works');
  }

  // 17. LeadStore with logger only (backward compatible constructor)
  {
    cleanup();
    const store = new LeadStore({ logger: null });
    const lead = store.create({ offerId: 'off_1', contact: { phone: '+79008000001', email: 'i@test.com' } });
    assert(lead.id !== null, 'Logger-only constructor: works');
  }

  // 18. File write failure does not crash store
  {
    cleanup();
    const badFileStore = {
      save: function() { throw new Error('disk full'); },
      loadAll: function() { return []; }
    };
    const store = new LeadStore({ fileStore: badFileStore });
    let threw = false;
    try {
      store.create({ offerId: 'off_1', contact: { phone: '+79009000001', email: 'j@test.com' } });
    } catch (e) {
      threw = true;
    }
    assert(threw === false, 'File error: create does not crash');
    assert(store.list().length === 1, 'File error: lead still in memory');
  }

  // 19. Multiple status transitions persist correctly
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    const store = new LeadStore({ fileStore });
    const lead = store.create({ offerId: 'off_1', contact: { phone: '+79010000001', email: 'k@test.com' } });
    store.updateStatus(lead.id, 'validated');
    store.updateStatus(lead.id, 'pending_delivery');
    store.updateStatus(lead.id, 'failed');
    store.updateStatus(lead.id, 'pending_delivery');

    // Verify on disk
    const loaded = fileStore.load(lead.id);
    assert(loaded.status === 'pending_delivery', 'Multi-transition: final status on disk');

    // Verify after restart
    const store2 = new LeadStore({ fileStore });
    const reloaded = store2.get(lead.id);
    assert(reloaded.status === 'pending_delivery', 'Multi-transition: survives restart');
  }

  // 20. Leads with metadata persist correctly
  {
    cleanup();
    const fileStore = new FileStore(TEST_DIR);
    const store = new LeadStore({ fileStore });
    const lead = store.create({
      offerId: 'off_1',
      contact: { phone: '+79011000001', email: 'l@test.com' },
      metadata: { correlationId: 'corr_meta', policyCheck: { status: 'approved' } }
    });

    const loaded = fileStore.load(lead.id);
    assert(loaded.metadata.correlationId === 'corr_meta', 'Metadata persist: correlationId');
    assert(loaded.metadata.policyCheck.status === 'approved', 'Metadata persist: policyCheck');

    // After restart
    const store2 = new LeadStore({ fileStore });
    const reloaded = store2.get(lead.id);
    assert(reloaded.metadata.correlationId === 'corr_meta', 'Metadata restart: correlationId');
  }

  cleanup();
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); cleanup(); process.exit(1); });
