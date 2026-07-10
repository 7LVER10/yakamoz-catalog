// Test: Pipeline Runtime
// Covers: full pipeline wiring, persistence, lifecycle, dashboard integration

const { PipelineRuntime } = require('../src/runtime/pipeline-runtime');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const TEST_DIR = path.join(__dirname, '..', '.openclaw', 'tmp', 'test-pipeline-' + Date.now());

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

function cleanup() {
  // Clean up data/leads and data/logs created during tests
  const dirs = [
    path.join(__dirname, '..', 'data', 'leads'),
    path.join(__dirname, '..', 'data', 'logs')
  ];
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        try { fs.unlinkSync(path.join(dir, f)); } catch (e) {}
      }
    }
  }
}

async function run() {
  console.log('=== Pipeline Runtime Tests ===');

  // 1. Init creates all modules
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.init();
    assert(runtime.logger !== null, 'init: logger created');
    assert(runtime.store !== null, 'init: store created');
    assert(runtime.adapterRegistry !== null, 'init: adapterRegistry created');
    assert(runtime.offerRegistry !== null, 'init: offerRegistry created');
    assert(runtime.dispatchFn !== null, 'init: dispatchFn created');
    assert(runtime.middleware !== null, 'init: middleware created');
    assert(runtime.telegramRuntime !== null, 'init: telegramRuntime created');
    assert(runtime.dashboard !== null, 'init: dashboard created');
  }

  // 2. Init with persistence enabled
  {
    cleanup();
    const runtime = new PipelineRuntime({ persistent: true });
    runtime.init();
    assert(runtime.persistent === true, 'persistent init: persistent=true');
    assert(runtime.store.fileStore !== null, 'persistent init: store has fileStore');
    assert(runtime.logger.fileSink !== null, 'persistent init: logger has fileSink');
  }

  // 3. Init without persistence
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.init();
    assert(runtime.persistent === false, 'non-persistent init: persistent=false');
    assert(runtime.store.fileStore === null, 'non-persistent init: store has no fileStore');
    assert(runtime.logger.fileSink === null, 'non-persistent init: logger has no fileSink');
  }

  // 4. Start and stop lifecycle
  {
    const runtime = new PipelineRuntime({ persistent: false });
    const startResult = runtime.start();
    assert(startResult.success === true, 'lifecycle: start succeeds');
    assert(runtime.running === true, 'lifecycle: running=true');
    assert(runtime.status.startedAt !== null, 'lifecycle: startedAt set');

    const stopResult = runtime.stop();
    assert(stopResult.success === true, 'lifecycle: stop succeeds');
    assert(runtime.running === false, 'lifecycle: running=false');
    assert(runtime.status.stoppedAt !== null, 'lifecycle: stoppedAt set');
  }

  // 5. Start auto-initializes
  {
    const runtime = new PipelineRuntime({ persistent: false });
    assert(runtime.middleware === null, 'pre-start: middleware is null');
    runtime.start();
    assert(runtime.middleware !== null, 'post-start: middleware is initialized');
    runtime.stop();
  }

  // 6. Double start fails
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.start();
    const result = runtime.start();
    assert(result.success === false, 'double start: fails');
    assert(result.reason === 'already_running', 'double start: reason=already_running');
    runtime.stop();
  }

  // 7. Stop when not running fails
  {
    const runtime = new PipelineRuntime({ persistent: false });
    const result = runtime.stop();
    assert(result.success === false, 'stop not running: fails');
    assert(result.reason === 'not_running', 'stop not running: reason=not_running');
  }

  // 8. processLead works through full pipeline
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.start();
    const result = await runtime.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79001000001', email: 'test@example.com' },
      source: 'telegram',
      metadata: { correlationId: 'pipe_test_001' }
    });
    assert(result.success === true, 'processLead: success');
    assert(result.result.success === true, 'processLead: pipeline success');
    assert(result.result.lead !== undefined, 'processLead: lead returned');
    assert(result.result.dispatchResult !== null, 'processLead: dispatchResult present');
    runtime.stop();
  }

  // 9. processLead persists when persistence enabled
  {
    cleanup();
    const runtime = new PipelineRuntime({ persistent: true });
    runtime.start();
    const result = await runtime.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79002000001', email: 'persist@test.com' },
      source: 'telegram'
    });
    const leadId = result.result.lead.id;
    const file = path.join(__dirname, '..', 'data', 'leads', leadId + '.json');
    assert(fs.existsSync(file), 'processLead persist: lead file on disk');
    runtime.stop();
  }

  // 10. feedUpdate works through Telegram adapter
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.start();
    const result = await runtime.feedUpdate({
      update_id: 9001,
      message: {
        message_id: 9001,
        from: { id: 1000, first_name: 'Test', username: 'testuser', language_code: 'en' },
        chat: { id: 1000, type: 'private' },
        date: Date.now(),
        text: '/start off_mock_01'
      }
    });
    assert(result.success === true, 'feedUpdate: success');
    assert(result.result.action === 'processed', 'feedUpdate: action=processed');
    runtime.stop();
  }

  // 11. getDashboardSnapshot returns real data
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.start();
    await runtime.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79003000001', email: 'snap@test.com' },
      source: 'telegram'
    });
    const snapshot = runtime.getDashboardSnapshot();
    assert(snapshot !== null, 'snapshot: not null');
    assert(snapshot.leads.length === 1, 'snapshot: 1 lead');
    assert(snapshot.leadCounts.total === 1, 'snapshot: total=1');
    assert(snapshot.modules.length > 0, 'snapshot: modules present');
    assert(snapshot.timestamp !== undefined, 'snapshot: timestamp present');
    runtime.stop();
  }

  // 12. getStatus returns complete system status
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.start();
    await runtime.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79004000001', email: 'status@test.com' },
      source: 'telegram'
    });
    const status = runtime.getStatus();
    assert(status.running === true, 'getStatus: running=true');
    assert(status.store.leads === 1, 'getStatus: store.leads=1');
    assert(status.logger.events > 0, 'getStatus: logger.events > 0');
    assert(status.adapters.includes('net_mock'), 'getStatus: adapters include net_mock');
    assert(status.offers >= 2, 'getStatus: offers >= 2');
    assert(status.telegram !== null, 'getStatus: telegram status present');
    runtime.stop();
  }

  // 13. Leads survive restart with persistence
  {
    cleanup();
    // Session 1
    const runtime1 = new PipelineRuntime({ persistent: true });
    runtime1.start();
    await runtime1.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79005000001', email: 'restart@test.com' },
      source: 'telegram'
    });
    runtime1.stop();

    // Session 2 — simulates restart
    const runtime2 = new PipelineRuntime({ persistent: true });
    runtime2.start();
    const store = runtime2.getStore();
    assert(store.list().length === 1, 'restart: 1 lead loaded');
    assert(store.list()[0].contact.email === 'restart@test.com', 'restart: lead data preserved');
    runtime2.stop();
  }

  // 14. Dedup works across restart
  {
    cleanup();
    const runtime1 = new PipelineRuntime({ persistent: true });
    runtime1.start();
    await runtime1.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79006000001', email: 'dedup@test.com' },
      source: 'telegram'
    });
    runtime1.stop();

    const runtime2 = new PipelineRuntime({ persistent: true });
    runtime2.start();
    let dupCaught = false;
    try {
      await runtime2.processLead({
        offerId: 'off_mock_01',
        contact: { phone: '+79006000001', email: 'dedup@test.com' },
        source: 'telegram'
      });
    } catch (e) {
      if (e.message && e.message.includes('Duplicate')) dupCaught = true;
    }
    // The middleware catches the duplicate and returns success:false
    // Let's also check via the store
    const result = await runtime2.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79006000001', email: 'dedup@test.com' },
      source: 'telegram'
    });
    assert(result.result.success === false, 'restart dedup: duplicate blocked');
    runtime2.stop();
  }

  // 15. Dashboard reads from persistent store after restart
  {
    cleanup();
    const runtime1 = new PipelineRuntime({ persistent: true });
    runtime1.start();
    await runtime1.processLead({
      offerId: 'off_mock_01',
      contact: { phone: '+79007000001', email: 'dash@test.com' },
      source: 'telegram'
    });
    runtime1.stop();

    const runtime2 = new PipelineRuntime({ persistent: true });
    runtime2.start();
    const snapshot = runtime2.getDashboardSnapshot();
    assert(snapshot.leads.length === 1, 'dashboard restart: 1 lead visible');
    assert(snapshot.leadCounts.total === 1, 'dashboard restart: total=1');
    runtime2.stop();
  }

  // 16. getStore and getLogger return instances
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.init();
    assert(runtime.getStore() !== null, 'getStore: not null');
    assert(runtime.getLogger() !== null, 'getLogger: not null');
  }

  // 17. Process multiple leads through pipeline
  {
    const runtime = new PipelineRuntime({ persistent: false });
    runtime.start();
    await runtime.processLead({ offerId: 'off_mock_01', contact: { phone: '+79008000001', email: 'a@test.com' }, source: 'telegram' });
    await runtime.processLead({ offerId: 'off_mock_02', contact: { phone: '+79008000002', email: 'b@test.com' }, source: 'telegram' });
    await runtime.processLead({ offerId: 'off_mock_01', contact: { phone: '+79008000003', email: 'c@test.com' }, source: 'telegram' });
    assert(runtime.getStore().list().length === 3, 'multi-lead: 3 leads in store');
    const snapshot = runtime.getDashboardSnapshot();
    assert(snapshot.leads.length === 3, 'multi-lead: 3 leads in snapshot');
    assert(snapshot.leadCounts.total === 3, 'multi-lead: total=3');
    runtime.stop();
  }

  cleanup();
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); cleanup(); process.exit(1); });
