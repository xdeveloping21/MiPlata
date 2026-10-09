const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pack, unpack } = require('../desktop/respaldo.cjs');

test('the encrypted backup keeps every data file and needs the right passphrase', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-respaldo-test-'));
  try {
    fs.writeFileSync(path.join(folder, 'miplata.sqlite'), 'base de datos');
    fs.mkdirSync(path.join(folder, 'people', 'pabc12345', 'receipts'), { recursive: true });
    fs.writeFileSync(path.join(folder, 'people', 'pabc12345', 'receipts', 'boleta.jpg'), Buffer.from([1, 2, 3]));
    fs.mkdirSync(path.join(folder, 'backups'));
    fs.writeFileSync(path.join(folder, 'backups', 'vieja.sqlite'), 'no va');
    fs.writeFileSync(path.join(folder, 'miplata.sqlite.tmp'), 'no va');
    const { bytes } = pack(folder, 'frase de prueba larga');
    assert.equal(bytes.includes(Buffer.from('base de datos')), false);
    const restored = unpack(bytes, 'frase de prueba larga');
    assert.deepEqual(restored.files.map((file) => file.path), ['miplata.sqlite', 'people/pabc12345/receipts/boleta.jpg']);
    assert.deepEqual([...restored.files[1].data], [1, 2, 3]);
    assert.throws(() => unpack(bytes, 'otra frase cualquiera'), /no es correcta/);
    const damaged = Buffer.from(bytes); damaged[damaged.length - 20] ^= 1;
    assert.throws(() => unpack(damaged, 'frase de prueba larga'), /dañado/);
    assert.throws(() => pack(folder, 'corta'), /12 caracteres/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
