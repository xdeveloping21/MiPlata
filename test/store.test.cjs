const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openStore, validateState } = require('../desktop/store.cjs');

const initialState = path.join(__dirname, '..', 'initial-state.json');

test('savings saved as ARS by MisGastos are read as CLP', () => {
  const state = JSON.parse(fs.readFileSync(initialState, 'utf8'));
  state.transactions = [{ id: 'a1', kind: 'expense', amount: 10000, title: 'Ahorro', categoryId: 'savings', date: '2026-10-01', savingsCurrency: 'ARS', savingsAmount: 10000 }];
  const clean = validateState(state);
  assert.equal(clean.transactions[0].savingsCurrency, 'CLP');
});

test('store saves and restores a backup', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-store-test-'));
  try {
    const store = await openStore(folder, initialState);
    const current = store.getState();
    const data = { ...current.data, openingBalance: 1500000, transactions: [{ id: 't1', kind: 'expense', amount: 12500, title: 'Micro', categoryId: 'transport', date: '2026-10-08' }] };
    const saved = store.saveState(current.revision, data);
    assert.equal(saved.conflict, undefined);
    assert.equal(store.getState().data.transactions.length, 1);
    store.restoreState({ ...data, transactions: [] }, []);
    assert.equal(store.getState().data.transactions.length, 0);
    assert.equal(store.getState().data.openingBalance, 1500000);
    store.close();
    assert.ok(fs.existsSync(path.join(folder, 'miplata.sqlite')));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('receipts are stored apart and linked from a transaction', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-receipt-test-'));
  try {
    const store = await openStore(folder, initialState);
    assert.throws(() => store.saveReceipt(Buffer.from('<svg></svg>')), /no es una imagen/);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const { id } = store.saveReceipt(jpeg);
    assert.match(id, /^r[A-Za-z0-9_-]{16,64}$/);
    assert.deepEqual(store.readReceipt(id), { bytes: jpeg, type: 'image/jpeg' });
    assert.equal(store.readReceipt('../miplata'), null);
    const current = store.getState();
    const transaction = { id: 't1', kind: 'expense', amount: 8990, title: 'Supermercado', categoryId: 'transport', date: '2026-10-08', receiptId: id };
    store.saveState(current.revision, { ...current.data, transactions: [transaction] });
    assert.equal(store.getState().data.transactions[0].receiptId, id);
    assert.throws(() => validateState({ ...current.data, transactions: [{ ...transaction, receiptId: '../x' }] }), /Boleta inválida/);
    store.close();
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('documents keep their type and are rejected when the content does not match', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-document-test-'));
  try {
    const store = await openStore(folder, initialState);
    const pdf = Buffer.from('%PDF-1.7\nfactura de prueba\n%%EOF');
    assert.throws(() => store.saveDocument(pdf, 'factura.html'), /Sube un PDF/);
    assert.throws(() => store.saveDocument(Buffer.from('<html></html>'), 'factura.pdf'), /no parece un PDF/);
    assert.throws(() => store.saveDocument(Buffer.from([0, 1, 2]), 'datos.csv'), /no parece un CSV/);
    const saved = store.saveDocument(pdf, '../Factura 123.pdf');
    assert.equal(saved.name, '..Factura 123.pdf');
    assert.deepEqual(store.readDocument(saved.id), { bytes: pdf, extension: 'pdf' });
    const current = store.getState();
    const transaction = { id: 't1', kind: 'expense', amount: 8990, title: 'Factura luz', categoryId: 'services', date: '2026-10-08', documentId: saved.id, documentName: saved.name };
    store.saveState(current.revision, { ...current.data, transactions: [transaction] });
    assert.equal(store.getState().data.transactions[0].documentName, saved.name);
    assert.throws(() => validateState({ ...current.data, transactions: [{ ...transaction, documentName: 'virus.exe' }] }), /Documento inválido/);
    store.close();
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('each person keeps separate expenses, rules, receipts and devices', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-people-test-'));
  try {
    let store = await openStore(folder, initialState);
    const ownerState = store.getState();
    store.saveState(ownerState.revision, { ...ownerState.data, transactions: [{ id: 'o1', kind: 'expense', amount: 5000, title: 'Pan', categoryId: 'transport', date: '2026-10-08' }] });
    const ana = store.addPerson('  Ana  ');
    assert.equal(ana.name, 'Ana');
    assert.throws(() => store.addPerson('ana'), /Ya existe/);
    assert.throws(() => store.forPerson('pNoExiste123'), /no encontrada/);
    const anaScope = store.forPerson(ana.id);
    assert.equal(anaScope.getState().data.transactions.length, 0);
    const anaSaved = anaScope.saveState(anaScope.getState().revision, { ...anaScope.getState().data, transactions: [{ id: 'a1', kind: 'expense', amount: 1200, title: 'Café', categoryId: 'transport', date: '2026-10-08' }] });
    assert.equal(anaSaved.data.transactions[0].title, 'Café');
    assert.equal(store.getState().data.transactions[0].title, 'Pan');
    anaScope.setMerchantRule('Uber', 'transport');
    assert.deepEqual(store.merchantRules(), []);
    assert.equal(anaScope.merchantRules().length, 1);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const receipt = anaScope.saveReceipt(jpeg);
    assert.equal(store.readReceipt(receipt.id), null);
    assert.ok(anaScope.readReceipt(receipt.id));
    store.addDevice('iPhone', 'x'.repeat(40), ana.id);
    store.addDevice('Mi iPhone', 'y'.repeat(40));
    assert.equal(store.deviceForToken('x'.repeat(40)).person_id, ana.id);
    assert.equal(store.deviceForToken('y'.repeat(40)).person_id, 'owner');
    store.close();

    store = await openStore(folder, initialState);
    assert.equal(store.forPerson(ana.id).getState().data.transactions[0].title, 'Café');
    store.removePerson(ana.id);
    assert.equal(store.deviceForToken('x'.repeat(40)), null);
    assert.ok(store.deviceForToken('y'.repeat(40)));
    assert.equal(store.listPeople().length, 0);
    assert.equal(fs.existsSync(path.join(folder, 'people', ana.id)), false);
    assert.equal(store.getState().data.transactions[0].title, 'Pan');
    store.close();
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
