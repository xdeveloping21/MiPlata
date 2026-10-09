const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { openGeo, parseIPv4, parseIPv6High } = require('../desktop/geo.cjs');
const { openStore } = require('../desktop/store.cjs');

test('IP addresses are parsed for the country lookup', () => {
  assert.equal(parseIPv4('190.22.10.5'), 190 * 2 ** 24 + 22 * 2 ** 16 + 10 * 256 + 5);
  assert.equal(parseIPv4('256.1.1.1'), null);
  assert.equal(parseIPv6High('2800:150:1::1'), 0x2800015000010000n);
  assert.equal(parseIPv6High('::1'), 0n);
  assert.equal(parseIPv6High('no-es-ip'), null);
});

test('the country comes from the local DB-IP file without downloading', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-geo-test-'));
  try {
    const rows = ['0.0.0.0,0.255.255.255,ZZ', '190.22.0.0,190.22.255.255,CL', '200.1.0.0,200.1.255.255,VE', '2800:150::,2800:150:ffff:ffff:ffff:ffff:ffff:ffff,CL'];
    fs.writeFileSync(path.join(folder, 'dbip-country-lite.csv.gz'), zlib.gzipSync(rows.join('\n') + '\n'));
    const geo = openGeo(folder, { download: false });
    await geo.ready;
    assert.equal(geo.lookup('190.22.10.5'), 'CL');
    assert.equal(geo.lookup('::ffff:200.1.1.1'), 'VE');
    assert.equal(geo.lookup('2800:150:1::1'), 'CL');
    assert.equal(geo.lookup('0.1.2.3'), null);
    assert.equal(geo.lookup('8.8.8.8'), null);
    geo.close();
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('the last connection of each device is remembered without touching the database', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-activity-test-'));
  try {
    let store = await openStore(folder, path.join(__dirname, '..', 'initial-state.json'));
    store.addDevice('iPhone', 'x'.repeat(40));
    const device = store.deviceForToken('x'.repeat(40));
    const before = fs.statSync(store.dbPath).mtimeMs;
    store.touchDevice(device.id, '::ffff:190.22.10.5');
    assert.equal(store.listDevices()[0].lastIp, '190.22.10.5');
    assert.ok(store.listDevices()[0].lastSeen);
    assert.equal(fs.statSync(store.dbPath).mtimeMs, before);
    store.close();
    store = await openStore(folder, path.join(__dirname, '..', 'initial-state.json'));
    assert.equal(store.listDevices()[0].lastIp, '190.22.10.5');
    store.revokeDevice(device.id);
    store.addDevice('Mac', 'y'.repeat(40));
    store.touchDevice(store.deviceForToken('y'.repeat(40)).id, '8.8.8.8');
    assert.equal(Object.keys(JSON.parse(fs.readFileSync(path.join(folder, 'device-activity.json'), 'utf8'))).length, 1);
    store.close();
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
