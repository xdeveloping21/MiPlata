const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDiagnosticLog, MAX_DAILY_BYTES } = require('../desktop/diagnostic-log.cjs');

test('diagnostic logs keep seven days and flag a session without a clean exit', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-logs-test-'));
  const logDir = path.join(folder, 'logs');
  fs.mkdirSync(logDir);
  fs.writeFileSync(path.join(logDir, '2026-09-26.log'), 'old\n');
  fs.writeFileSync(path.join(logDir, '2026-09-27.log'), 'kept\n');
  fs.writeFileSync(path.join(logDir, 'notes.txt'), 'untouched\n');
  fs.writeFileSync(path.join(logDir, 'active-session.json'), JSON.stringify({ pid: 123, startedAt: '2026-10-02T10:00:00.000Z' }));
  const log = createDiagnosticLog(folder, { now: () => new Date(2026, 9, 3, 12) });
  try {
    log.start('0.2.5');
    assert.equal(fs.existsSync(path.join(logDir, '2026-09-26.log')), false);
    assert.equal(fs.existsSync(path.join(logDir, '2026-09-27.log')), true);
    assert.equal(fs.existsSync(path.join(logDir, 'notes.txt')), true);
    const entries = fs.readFileSync(path.join(logDir, '2026-10-03.log'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(entries[0].event, 'previous_session_without_clean_exit');
    assert.equal(entries[0].previousPid, 123);
    assert.equal(entries[1].event, 'app_started');
    log.stop('tray_exit');
    assert.equal(fs.existsSync(path.join(logDir, 'active-session.json')), false);
    assert.match(fs.readFileSync(path.join(logDir, '2026-10-03.log'), 'utf8'), /"event":"app_stopped"/);
  } finally {
    const resolved = path.resolve(folder);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

test('a daily diagnostic file cannot grow past its size limit', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-logs-size-'));
  const log = createDiagnosticLog(folder, { now: () => new Date(2026, 9, 3, 12) });
  try {
    log.start('0.2.5');
    for (let i = 0; i < 200; i++) log.write('error', 'test_error', { message: 'x'.repeat(10000) });
    const file = path.join(log.directory, '2026-10-03.log');
    assert.ok(fs.statSync(file).size <= MAX_DAILY_BYTES);
    log.stop('test');
  } finally {
    const resolved = path.resolve(folder);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
