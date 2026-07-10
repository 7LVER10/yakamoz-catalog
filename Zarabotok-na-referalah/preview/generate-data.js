// Dashboard Data Generator (updated)
// Uses PipelineRuntime with persistence to generate dashboard snapshot
// Run: node preview/generate-data.js

const { PipelineRuntime } = require('../src/runtime/pipeline-runtime');
const fs = require('fs');
const path = require('path');

async function generate() {
  // Initialize pipeline runtime with persistence enabled
  const runtime = new PipelineRuntime({
    persistent: true,
    configOverrides: { mode: 'local' }
  });
  runtime.init();

  const store = runtime.getStore();
  const logger = runtime.getLogger();

  // Run demo leads through the real pipeline
  const demoLeads = [
    { offerId: 'off_mock_01', contact: { phone: '+79001000001', email: 'alice@example.com' }, source: 'telegram', metadata: { correlationId: 'demo_corr_001' } },
    { offerId: 'off_mock_01', contact: { phone: '+79001000002', email: 'bob@example.com' }, source: 'telegram', metadata: { correlationId: 'demo_corr_002' } },
    { offerId: 'off_mock_02', contact: { phone: '+79001000003', email: 'charlie@example.com' }, source: 'telegram', metadata: { correlationId: 'demo_corr_003' } },
    { offerId: 'off_mock_01', contact: { phone: '+79001000004', email: 'diana@example.com' }, source: 'telegram', metadata: { correlationId: 'demo_corr_004' } },
    { offerId: 'off_mock_02', contact: { phone: '+79001000005', email: 'eve@example.com' }, source: 'telegram', metadata: { correlationId: 'demo_corr_005' } },
    // Duplicate — blocked by dedup
    { offerId: 'off_mock_01', contact: { phone: '+79001000001', email: 'alice@example.com' }, source: 'telegram', metadata: { correlationId: 'demo_corr_006' } },
    // Missing required field — rejected by validate
    { offerId: 'off_mock_01', contact: {}, source: 'telegram', metadata: { correlationId: 'demo_corr_007' } },
    // Offer not in registry — dispatch returns offer_not_found
    { offerId: 'off_missing', contact: { phone: '+79001000008', email: 'frank@example.com' }, source: 'telegram', metadata: { correlationId: 'demo_corr_008' } },
  ];

  for (const lead of demoLeads) {
    try {
      await runtime.processLead(lead);
    } catch (e) {
      // Expected for some demo leads
    }
  }

  // Exercise status transitions
  const allLeads = store.list();
  if (allLeads.length >= 5) {
    try { store.updateStatus(allLeads[0].id, 'validated'); } catch (e) {}
    try { store.updateStatus(allLeads[0].id, 'pending_delivery'); } catch (e) {}
    try { store.updateStatus(allLeads[0].id, 'delivered'); } catch (e) {}
    try { store.updateStatus(allLeads[1].id, 'validated'); } catch (e) {}
    try { store.updateStatus(allLeads[1].id, 'pending_delivery'); } catch (e) {}
    try { store.updateStatus(allLeads[1].id, 'delivered'); } catch (e) {}
    try { store.updateStatus(allLeads[2].id, 'validated'); } catch (e) {}
    try { store.updateStatus(allLeads[2].id, 'rejected'); } catch (e) {}
    try { store.updateStatus(allLeads[3].id, 'validated'); } catch (e) {}
    try { store.updateStatus(allLeads[3].id, 'pending_delivery'); } catch (e) {}
    try { store.updateStatus(allLeads[3].id, 'failed'); } catch (e) {}
  }

  // Generate dashboard snapshot from real data
  const snapshot = runtime.getDashboardSnapshot();

  // Write to preview/data.json
  const outputPath = path.join(__dirname, 'data.json');
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2));

  // Print summary
  console.log('Pipeline runtime: persistent=' + runtime.persistent);
  console.log('Dashboard snapshot written to ' + outputPath);
  console.log('Leads: ' + snapshot.leads.length);
  console.log('Lead counts: ' + JSON.stringify(snapshot.leadCounts));
  console.log('Dispatch entries: ' + snapshot.dispatchLog.length);
  console.log('Modules: ' + snapshot.modules.length);
  console.log('Alerts: ' + snapshot.alerts.length);
  console.log('Logger events: ' + logger.count());

  // Verify persistence — check data/leads/ directory
  const leadsDir = path.join(__dirname, '..', 'data', 'leads');
  if (fs.existsSync(leadsDir)) {
    const files = fs.readdirSync(leadsDir).filter(f => f.endsWith('.json'));
    console.log('Persistent lead files: ' + files.length);
  }

  // Verify persistence — check data/logs/ directory
  const logsDir = path.join(__dirname, '..', 'data', 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.jsonl'));
    console.log('Persistent log files: ' + files.length);
  }
}

generate().catch(err => { console.error(err); process.exit(1); });
