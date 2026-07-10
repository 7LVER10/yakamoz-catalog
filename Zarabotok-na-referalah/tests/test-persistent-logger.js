// Test: Persistent File-Based Logger
// Covers: FileSink, Logger+FileSink integration, daily rotation, PII masking on disk

const { FileSink } = require('../src/logger/file-sink');
const { Logger } = require('../src/logger/logger');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const TEST_DIR = path.join(__dirname, '..', '.openclaw', 'tmp', 'test-logs-' + Date.now());

function assert(condition, name) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    const files = fs.readdirSync(TEST_DIR);
    for (const f of files) fs.unlinkSync(path.join(TEST_DIR, f));
    fs.rmdirSync(TEST_DIR);
  }
}

async function run() {
  console.log('=== Persistent Logger Tests ===');

  // --- FileSink Tests ---

  // 1. FileSink creates directory
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    assert(fs.existsSync(TEST_DIR), 'FileSink: directory created');
  }

  // 2. FileSink writes entry to today's file
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const entry = { event: 'test_event', data: { key: 'value' }, timestamp: '2026-07-11T00:00:00Z', seq: 1 };
    sink.write(entry);
    const file = sink.getCurrentFile();
    assert(fs.existsSync(file), 'FileSink: file created for today');
    const content = fs.readFileSync(file, 'utf8').trim();
    const parsed = JSON.parse(content);
    assert(parsed.event === 'test_event', 'FileSink: entry written correctly');
    assert(parsed.data.key === 'value', 'FileSink: data preserved');
  }

  // 3. FileSink appends (does not overwrite)
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    sink.write({ event: 'first', data: {}, timestamp: '2026-07-11T00:00:00Z', seq: 1 });
    sink.write({ event: 'second', data: {}, timestamp: '2026-07-11T00:00:01Z', seq: 2 });
    const content = fs.readFileSync(sink.getCurrentFile(), 'utf8').trim();
    const lines = content.split('\n');
    assert(lines.length === 2, 'FileSink: two entries appended');
    assert(JSON.parse(lines[0]).event === 'first', 'FileSink: first entry correct');
    assert(JSON.parse(lines[1]).event === 'second', 'FileSink: second entry correct');
  }

  // 4. FileSink readByDate returns entries
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const today = new Date().toISOString().slice(0, 10);
    sink.write({ event: 'a', data: {}, timestamp: '2026-07-11T00:00:00Z', seq: 1 });
    sink.write({ event: 'b', data: {}, timestamp: '2026-07-11T00:00:01Z', seq: 2 });
    const entries = sink.readByDate(today);
    assert(entries.length === 2, 'FileSink readByDate: returns 2 entries');
    assert(entries[0].event === 'a', 'FileSink readByDate: first entry');
    assert(entries[1].event === 'b', 'FileSink readByDate: second entry');
  }

  // 5. FileSink readByDate returns empty for missing date
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const entries = sink.readByDate('1999-01-01');
    assert(entries.length === 0, 'FileSink readByDate: empty for missing date');
  }

  // 6. FileSink listDates returns available dates
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const today = new Date().toISOString().slice(0, 10);
    sink.write({ event: 'x', data: {}, timestamp: today, seq: 1 });
    const dates = sink.listDates();
    assert(dates.length === 1, 'FileSink listDates: one date');
    assert(dates[0] === today, 'FileSink listDates: correct date');
  }

  // 7. FileSink readRange spans multiple days
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    // Manually create files for two dates
    const file1 = path.join(TEST_DIR, 'logs-2026-07-01.jsonl');
    const file2 = path.join(TEST_DIR, 'logs-2026-07-02.jsonl');
    fs.writeFileSync(file1, JSON.stringify({ event: 'day1', data: {}, timestamp: '2026-07-01T00:00:00Z', seq: 1 }) + '\n');
    fs.writeFileSync(file2, JSON.stringify({ event: 'day2', data: {}, timestamp: '2026-07-02T00:00:00Z', seq: 2 }) + '\n');
    const entries = sink.readRange('2026-07-01', '2026-07-02');
    assert(entries.length === 2, 'FileSink readRange: spans 2 days');
    assert(entries[0].event === 'day1', 'FileSink readRange: day1 entry');
    assert(entries[1].event === 'day2', 'FileSink readRange: day2 entry');
  }

  // 8. FileSink totalEntries counts across files
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const file1 = path.join(TEST_DIR, 'logs-2026-07-01.jsonl');
    const file2 = path.join(TEST_DIR, 'logs-2026-07-02.jsonl');
    fs.writeFileSync(file1, JSON.stringify({ event: 'a', data: {}, timestamp: '', seq: 1 }) + '\n' + JSON.stringify({ event: 'b', data: {}, timestamp: '', seq: 2 }) + '\n');
    fs.writeFileSync(file2, JSON.stringify({ event: 'c', data: {}, timestamp: '', seq: 3 }) + '\n');
    assert(sink.totalEntries() === 3, 'FileSink totalEntries: counts across files');
  }

  // 9. FileSink handles malformed JSONL gracefully
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const file = path.join(TEST_DIR, 'logs-2026-07-10.jsonl');
    fs.writeFileSync(file, '{"valid":true}\nnot json\n{"also_valid":true}\n');
    const entries = sink.readByDate('2026-07-10');
    assert(entries.length === 2, 'FileSink: skips malformed lines');
    assert(entries[0].valid === true, 'FileSink: valid entry preserved');
  }

  // --- Logger + FileSink Integration ---

  // 10. Logger with FileSink writes to both memory and file
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const logger = new Logger({ fileSink: sink });
    logger.log('test_event', { key: 'value' });
    assert(logger.count() === 1, 'Logger+FileSink: entry in memory');
    const today = new Date().toISOString().slice(0, 10);
    const fileEntries = sink.readByDate(today);
    assert(fileEntries.length === 1, 'Logger+FileSink: entry on disk');
    assert(fileEntries[0].event === 'test_event', 'Logger+FileSink: correct event on disk');
  }

  // 11. Logger without FileSink still works (backward compatible)
  {
    const logger = new Logger();
    logger.log('no_file', { key: 'value' });
    assert(logger.count() === 1, 'Logger no FileSink: works normally');
    assert(logger.all()[0].event === 'no_file', 'Logger no FileSink: entry correct');
  }

  // 12. PII masking preserved on disk
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const logger = new Logger({ fileSink: sink });
    logger.log('pii_test', { phone: '+79001234567', email: 'test@example.com' });
    const today = new Date().toISOString().slice(0, 10);
    const fileEntries = sink.readByDate(today);
    const raw = fs.readFileSync(sink.getCurrentFile(), 'utf8');
    assert(!raw.includes('79001234567'), 'PII on disk: raw phone not present');
    assert(!raw.includes('test@example.com'), 'PII on disk: raw email not present');
    assert(raw.includes('***'), 'PII on disk: masked value present');
    assert(fileEntries[0].data.phone.includes('***'), 'PII on disk: phone masked in parsed entry');
    assert(fileEntries[0].data.email.includes('***'), 'PII on disk: email masked in parsed entry');
  }

  // 13. File write failure does not crash logger
  {
    const badSink = {
      write: function() { throw new Error('disk full'); }
    };
    const logger = new Logger({ fileSink: badSink });
    let threw = false;
    try {
      logger.log('crash_test', { key: 'value' });
    } catch (e) {
      threw = true;
    }
    assert(threw === false, 'FileSink error: logger does not crash');
    assert(logger.count() === 1, 'FileSink error: entry still in memory');
  }

  // 14. Multiple loggers can share a FileSink
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const logger1 = new Logger({ fileSink: sink });
    const logger2 = new Logger({ fileSink: sink });
    logger1.log('from_logger1', {});
    logger2.log('from_logger2', {});
    const today = new Date().toISOString().slice(0, 10);
    const entries = sink.readByDate(today);
    assert(entries.length === 2, 'Shared FileSink: 2 entries from 2 loggers');
  }

  // 15. Logger query still works with FileSink
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const logger = new Logger({ fileSink: sink });
    logger.log('event_a', { leadId: 'ld_1' });
    logger.log('event_b', { leadId: 'ld_2' });
    logger.log('event_a', { leadId: 'ld_3' });
    const filtered = logger.query({ event: 'event_a' });
    assert(filtered.length === 2, 'Logger query with FileSink: filters correctly');
  }

  // 16. Daily rotation — today's file gets entries, yesterday does not
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const logger = new Logger({ fileSink: sink });
    logger.log('today_event', {});
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    assert(sink.readByDate(today).length === 1, 'Rotation: today has entry');
    assert(sink.readByDate(yesterday).length === 0, 'Rotation: yesterday empty');
  }

  // 17. seq number preserved on disk
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const logger = new Logger({ fileSink: sink });
    logger.log('first', {});
    logger.log('second', {});
    const today = new Date().toISOString().slice(0, 10);
    const entries = sink.readByDate(today);
    assert(entries[0].seq === 1, 'Seq on disk: first entry seq=1');
    assert(entries[1].seq === 2, 'Seq on disk: second entry seq=2');
  }

  // 18. timestamp preserved on disk
  {
    cleanup();
    const sink = new FileSink(TEST_DIR);
    const logger = new Logger({ fileSink: sink });
    const entry = logger.log('ts_test', {});
    const today = new Date().toISOString().slice(0, 10);
    const fileEntries = sink.readByDate(today);
    assert(fileEntries[0].timestamp === entry.timestamp, 'Timestamp on disk: matches memory entry');
  }

  cleanup();
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); cleanup(); process.exit(1); });
