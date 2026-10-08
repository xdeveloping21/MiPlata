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
