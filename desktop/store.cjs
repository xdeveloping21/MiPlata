const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const initSqlJs = require('sql.js');
const categoryIcons = require('../category-icons.js');

function validCategoryTone(tone) {
  return ['lavender', 'coral', 'mint', 'sky', 'rose', 'peach'].includes(tone) || (typeof tone === 'string' && /^#[0-9a-f]{6}$/i.test(tone));
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Datos inválidos');
  if (!Number.isSafeInteger(state.openingBalance) || Math.abs(state.openingBalance) > 1e12) throw new Error('Saldo inicial inválido');
  if (!['light', 'dark'].includes(state.theme)) throw new Error('Tema inválido');
  if (!Array.isArray(state.categories) || state.categories.length > 200 || !Array.isArray(state.transactions) || state.transactions.length > 100000) throw new Error('Listas inválidas');
  const categoryIds = new Set();
  const categories = state.categories.map((item) => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || categoryIds.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 32 || !['expense', 'income'].includes(item.kind) || !validCategoryTone(item.tone) || typeof item.icon !== 'string' || !Object.prototype.hasOwnProperty.call(categoryIcons, item.icon)) throw new Error('Categoría inválida');
    categoryIds.add(item.id);
    return { id: item.id, name: item.name.trim(), kind: item.kind, tone: item.tone, icon: item.icon };
  });
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  if (categoryMap.get('savings')?.kind !== 'expense' || categoryMap.get('savings-return')?.kind !== 'income') throw new Error('Faltan categorías de ahorro');
  const transactionIds = new Set();
  const balances = { CLP: 0, USD: 0 };
  const transactions = state.transactions.map((item) => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || transactionIds.has(item.id) || !['expense', 'income'].includes(item.kind) || !Number.isSafeInteger(item.amount) || item.amount <= 0 || item.amount > 1e12 || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 80 || !validDate(item.date) || categoryMap.get(item.categoryId)?.kind !== item.kind) throw new Error('Movimiento inválido');
    transactionIds.add(item.id);
    const clean = { id: item.id, kind: item.kind, amount: item.amount, title: item.title.trim(), categoryId: item.categoryId, date: item.date };
    if (item.createdAt !== undefined) {
      if (typeof item.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.createdAt) || Number.isNaN(Date.parse(item.createdAt))) throw new Error('Fecha de registro inválida');
      clean.createdAt = item.createdAt;
    }
    if (item.note !== undefined) {
      if (typeof item.note !== 'string' || item.note.length > 160) throw new Error('Detalle inválido');
      if (item.note.trim()) clean.note = item.note.trim();
    }
    if (item.categoryId === 'savings' || item.categoryId === 'savings-return') {
      // Los ahorros guardados como ARS por versiones anteriores se leen como CLP.
      const currency = !item.savingsCurrency || item.savingsCurrency === 'ARS' ? 'CLP' : item.savingsCurrency;
      const units = item.savingsAmount ?? item.amount;
      if (!['CLP', 'USD'].includes(currency) || typeof units !== 'number' || !Number.isFinite(units) || units <= 0 || !Number.isSafeInteger(Math.round(units * 100)) || Math.abs(units * 100 - Math.round(units * 100)) > 0.00001) throw new Error('Ahorro inválido');
      clean.savingsCurrency = currency;
      clean.savingsAmount = units;
      balances[currency] += (item.categoryId === 'savings' ? 1 : -1) * units;
    }
    return clean;
  });
  if (Object.values(balances).some((amount) => amount < -0.00001)) throw new Error('Un retiro supera el ahorro disponible');
  return { openingBalance: state.openingBalance, theme: state.theme, linked: false, categories, transactions };
}

async function openStore(userDataPath, initialStatePath) {
  fs.mkdirSync(userDataPath, { recursive: true });
  const dbPath = path.join(userDataPath, 'miplata.sqlite');
  const backupDir = path.join(userDataPath, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const SQL = await initSqlJs({ locateFile: (file) => require.resolve('sql.js/dist/' + file) });
  let db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  db.run('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, payload TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS merchant_rules (merchant_key TEXT PRIMARY KEY, merchant TEXT NOT NULL, category_id TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS discord_batches (id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, author_id TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS discord_seen (message_id TEXT PRIMARY KEY)');

  function persist() {
    const temporary = dbPath + '.tmp';
    fs.writeFileSync(temporary, Buffer.from(db.export()));
    fs.renameSync(temporary, dbPath);
    const latest = path.join(backupDir, new Date().toISOString().slice(0, 10) + '-latest.sqlite');
    fs.copyFileSync(dbPath, latest);
  }

  function backupDaily() {
    if (!fs.existsSync(dbPath)) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const target = path.join(backupDir, stamp + '.sqlite');
    if (!fs.existsSync(target)) fs.copyFileSync(dbPath, target);
  }

  function backupNow() {
    if (!fs.existsSync(dbPath)) return null;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(backupDir, stamp + '.sqlite');
    fs.copyFileSync(dbPath, target);
    return target;
  }

  const existing = db.exec('SELECT id FROM app_state WHERE id = 1');
  if (!existing.length || !existing[0].values.length) {
    const initial = validateState(JSON.parse(fs.readFileSync(initialStatePath, 'utf8')));
    db.run('INSERT INTO app_state (id, revision, payload) VALUES (1, 0, ?)', [JSON.stringify(initial)]);
    persist();
  }

  function getState() {
    const stmt = db.prepare('SELECT revision, payload FROM app_state WHERE id = 1');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return { revision: Number(row.revision), data: JSON.parse(row.payload) };
  }

  function saveState(expectedRevision, state) {
    const clean = validateState(state);
    const current = getState();
    if (expectedRevision !== current.revision) return { conflict: true, ...current };
    backupDaily();
    db.run('UPDATE app_state SET revision = ?, payload = ? WHERE id = 1', [current.revision + 1, JSON.stringify(clean)]);
    persist();
    return getState();
  }

  function restoreState(state, rules) {
    const clean = validateState(state);
    const restoredRules = rules === undefined ? null : validatedMerchantRules(rules, clean.categories);
    backupNow();
    const revision = getState().revision + 1;
    db.run('BEGIN TRANSACTION');
    try {
      db.run('UPDATE app_state SET revision = ?, payload = ? WHERE id = 1', [revision, JSON.stringify(clean)]);
      if (restoredRules) {
        db.run('DELETE FROM merchant_rules');
        restoredRules.forEach((rule) => db.run('INSERT OR REPLACE INTO merchant_rules VALUES (?, ?, ?)', [rule.key, rule.merchant, rule.categoryId]));
      }
      db.run('COMMIT');
    } catch (error) { db.run('ROLLBACK'); throw error; }
    persist();
    return getState();
  }

  function addDevice(name, token) {
    const id = crypto.randomUUID();
    db.run('INSERT INTO devices (id, token_hash, name, created_at) VALUES (?, ?, ?, ?)', [id, crypto.createHash('sha256').update(token).digest('hex'), String(name).slice(0, 80), new Date().toISOString()]);
    persist();
    return id;
  }

  function deviceForToken(token) {
    if (typeof token !== 'string' || token.length < 32 || token.length > 200) return null;
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const stmt = db.prepare('SELECT id, name, created_at FROM devices WHERE token_hash = ?');
    stmt.bind([hash]);
    const found = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return found;
  }

  function listDevices() {
    const result = db.exec('SELECT id, name, created_at FROM devices ORDER BY created_at DESC');
    return result.length ? result[0].values.map((row) => ({ id: row[0], name: row[1], createdAt: row[2] })) : [];
  }

  function revokeDevice(id) {
    db.run('DELETE FROM devices WHERE id = ?', [id]);
    persist();
  }

  function merchantKey(name) {
    return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function merchantRules() {
    const result = db.exec('SELECT merchant, category_id FROM merchant_rules ORDER BY merchant');
    return result.length ? result[0].values.map(([merchant, categoryId]) => ({ merchant, categoryId })) : [];
  }

  function setMerchantRule(merchant, categoryId) {
    const name = String(merchant || '').trim();
    const key = merchantKey(name);
    if (!key || name.length > 80 || !getState().data.categories.some((item) => item.id === categoryId && item.kind === 'expense')) throw new Error('Regla de comercio inválida');
    db.run('INSERT OR REPLACE INTO merchant_rules (merchant_key, merchant, category_id) VALUES (?, ?, ?)', [key, name, categoryId]);
    persist();
  }

  function validatedMerchantRules(rules, categories) {
    if (!Array.isArray(rules) || rules.length > 1000) throw new Error('Reglas inválidas');
    return rules.map((rule) => {
      const merchant = String(rule?.merchant || '').trim();
      const key = merchantKey(merchant);
      if (!key || merchant.length > 80 || !categories.some((item) => item.id === rule.categoryId && item.kind === 'expense')) throw new Error('Regla inválida');
      return { key, merchant, categoryId: rule.categoryId };
    });
  }

  function replaceMerchantRules(rules) {
    const clean = validatedMerchantRules(rules, getState().data.categories);
    db.run('DELETE FROM merchant_rules');
    clean.forEach((rule) => db.run('INSERT OR REPLACE INTO merchant_rules VALUES (?, ?, ?)', [rule.key, rule.merchant, rule.categoryId]));
    persist();
  }

  function batch(id) {
    const stmt = db.prepare('SELECT id, channel_id, author_id, status, payload FROM discord_batches WHERE id = ?');
    stmt.bind([id]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? { id: row.id, channelId: row.channel_id, authorId: row.author_id, status: row.status, rows: JSON.parse(row.payload) } : null;
  }

  function latestPendingBatch(channelId, authorId) {
    const stmt = db.prepare("SELECT id FROM discord_batches WHERE channel_id = ? AND author_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1");
    stmt.bind([channelId, authorId]);
    const id = stmt.step() ? stmt.getAsObject().id : null;
    stmt.free();
    return id ? batch(id) : null;
  }

  function latestUsefulBatch(channelId, authorId) {
    const stmt = db.prepare("SELECT id FROM discord_batches WHERE channel_id = ? AND author_id = ? AND status IN ('pending', 'committed') AND payload != '[]' ORDER BY created_at DESC LIMIT 1");
    stmt.bind([channelId, authorId]);
    const id = stmt.step() ? stmt.getAsObject().id : null;
    stmt.free();
    return id ? batch(id) : null;
  }

  function saveBatch(input) {
    if (!/^\d{17,22}$/.test(input.id) || !/^\d{17,22}$/.test(input.channelId) || !/^\d{17,22}$/.test(input.authorId) || !Array.isArray(input.rows) || input.rows.length > 30) throw new Error('Lote inválido');
    if (batch(input.id)) return batch(input.id);
    db.run('INSERT INTO discord_batches VALUES (?, ?, ?, ?, ?, ?)', [input.id, input.channelId, input.authorId, 'pending', JSON.stringify(input.rows), new Date().toISOString()]);
    persist();
    return batch(input.id);
  }

  function updateBatch(id, rows, status = 'pending') {
    if (!batch(id) || !Array.isArray(rows) || rows.length > 30 || !['pending', 'cancelled'].includes(status)) throw new Error('Lote inválido');
    db.run('UPDATE discord_batches SET payload = ?, status = ? WHERE id = ?', [JSON.stringify(rows), status, id]);
    persist();
    return batch(id);
  }

  function applyDiscordPlan(batchId, plan, expectedRevision) {
    const pending = batchId ? batch(batchId) : null;
    if (batchId && (!pending || pending.status !== 'pending')) throw new Error('La propuesta ya no está pendiente');
    if (!Array.isArray(plan.rows) || plan.rows.length > 30 || !Array.isArray(plan.createdCategories) || !Array.isArray(plan.rules)) throw new Error('Cambios de Discord inválidos');
    const current = getState();
    if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new Error('Las categorías cambiaron mientras analizaba el mensaje. Repite la instrucción.');
    const clean = validateState({ ...current.data, categories: plan.categories });
    const validRules = validatedMerchantRules(plan.rules, clean.categories);
    if (plan.createdCategories.length) backupDaily();
    db.run('BEGIN TRANSACTION');
    try {
      if (plan.createdCategories.length) db.run('UPDATE app_state SET revision = ?, payload = ? WHERE id = 1', [current.revision + 1, JSON.stringify(clean)]);
      if (pending) db.run('UPDATE discord_batches SET payload = ? WHERE id = ?', [JSON.stringify(plan.rows), batchId]);
      for (const rule of validRules) db.run('INSERT OR REPLACE INTO merchant_rules VALUES (?, ?, ?)', [rule.key, rule.merchant, rule.categoryId]);
      db.run('COMMIT');
    } catch (error) { db.run('ROLLBACK'); throw error; }
    persist();
  }

  function commitBatch(id) {
    const currentBatch = batch(id);
    if (!currentBatch || currentBatch.status !== 'pending') throw new Error('Este lote ya no está pendiente');
    const createdAt = new Date().toISOString();
    const current = getState();
    const groups = new Map();
    for (const row of currentBatch.rows) {
      if (!row.adjustmentGroup) continue;
      if (!groups.has(row.adjustmentGroup)) groups.set(row.adjustmentGroup, []);
      groups.get(row.adjustmentGroup).push(row);
    }
    const updates = new Map();
    for (const [groupId, rows] of groups) {
      const sourceRows = rows.filter((row) => row.sourceTransactionId === groupId);
      const source = current.data.transactions.find((item) => item.id === groupId);
      const reference = sourceRows[0]?.sourceOriginal;
      if (!source || sourceRows.length !== 1 || !reference || rows.some((row) => !row.include || row.kind !== source.kind || row.currency !== 'CLP' || row.date !== source.date || (row.sourceTransactionId && row.sourceTransactionId !== groupId))) throw new Error('La corrección guardada cambió. Cancélala y prepara una propuesta nueva.');
      if (['amount', 'title', 'categoryId', 'date', 'kind'].some((key) => source[key] !== reference[key]) || rows.reduce((sum, row) => sum + row.amount, 0) !== source.amount) throw new Error('El gasto original cambió o las partes no suman el mismo total');
      const edited = sourceRows[0];
      updates.set(groupId, { ...source, amount: edited.amount, title: edited.title, categoryId: edited.categoryId });
    }
    const entries = currentBatch.rows.filter((row) => row.include === true && !row.sourceTransactionId).map((row) => ({
      id: 'd' + crypto.randomUUID().replace(/-/g, ''), kind: row.kind, amount: row.amount, title: row.title,
      categoryId: row.categoryId, date: row.date, createdAt, ...(row.time ? { note: 'Hora: ' + row.time } : {})
    }));
    const transactions = current.data.transactions.map((item) => updates.get(item.id) || item).concat(entries);
    const clean = validateState({ ...current.data, transactions });
    if (groups.size) backupNow(); else backupDaily();
    db.run('BEGIN TRANSACTION');
    try {
      db.run('UPDATE app_state SET revision = ?, payload = ? WHERE id = 1', [current.revision + 1, JSON.stringify(clean)]);
      db.run("UPDATE discord_batches SET status = 'committed' WHERE id = ?", [id]);
      db.run('COMMIT');
    } catch (error) { db.run('ROLLBACK'); throw error; }
    persist();
    return entries.length + updates.size;
  }

  function hasSeenDiscordMessage(id) {
    const stmt = db.prepare('SELECT 1 FROM discord_seen WHERE message_id = ?');
    stmt.bind([id]);
    const found = stmt.step();
    stmt.free();
    return found;
  }

  function markDiscordMessageSeen(id) {
    db.run('INSERT OR IGNORE INTO discord_seen VALUES (?)', [id]);
    persist();
  }

  return { getState, saveState, restoreState, addDevice, deviceForToken, listDevices, revokeDevice, merchantRules, setMerchantRule, replaceMerchantRules, batch, latestPendingBatch, latestUsefulBatch, saveBatch, updateBatch, applyDiscordPlan, commitBatch, hasSeenDiscordMessage, markDiscordMessageSeen, backupDir, dbPath, backupNow, close: () => db.close() };
}

module.exports = { openStore, validateState };
