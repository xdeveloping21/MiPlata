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

const RECEIPT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const RECEIPT_MAX_BYTES = 6_000_000;
// Una boleta sin movimiento que la use se borra después de este plazo.
const RECEIPT_ORPHAN_MS = 30 * 24 * 60 * 60 * 1000;

function validReceiptId(value) {
  return typeof value === 'string' && /^r[A-Za-z0-9_-]{16,64}$/.test(value);
}

function receiptExtension(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (bytes.length > 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// Documentos de respaldo (factura, boleta en PDF, planilla). Solo estas extensiones.
const DOCUMENT_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'ods', 'csv', 'docx', 'doc', 'odt', 'xml', 'txt'];
const DOCUMENT_MAX_BYTES = 15_000_000;

function validDocumentId(value) {
  return typeof value === 'string' && /^d[A-Za-z0-9_-]{16,64}$/.test(value);
}

function cleanDocumentName(value) {
  const name = String(value || '').replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, '').trim().slice(-120);
  const extension = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  return extension && DOCUMENT_EXTENSIONS.includes(extension) && name.length > extension.length + 1 ? { name, extension } : null;
}

// Revisa que el contenido corresponda a la extensión, para no guardar otra cosa con nombre de PDF.
function documentMatches(extension, bytes) {
  const head = bytes.toString('latin1', 0, 8);
  if (extension === 'pdf') return head.startsWith('%PDF-');
  if (['xlsx', 'docx', 'ods', 'odt'].includes(extension)) return head.startsWith('PK\u0003\u0004');
  if (['xls', 'doc'].includes(extension)) return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  return !bytes.subarray(0, 65536).includes(0);
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
    if (item.receiptId !== undefined) {
      if (!validReceiptId(item.receiptId)) throw new Error('Boleta inválida');
      clean.receiptId = item.receiptId;
    }
    if (item.documentId !== undefined || item.documentName !== undefined) {
      if (!validDocumentId(item.documentId) || !cleanDocumentName(item.documentName) || cleanDocumentName(item.documentName).name !== item.documentName) throw new Error('Documento inválido');
      clean.documentId = item.documentId;
      clean.documentName = item.documentName;
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
  const clean = { openingBalance: state.openingBalance, theme: state.theme, linked: false, categories, transactions };
  // Presupuesto del mes, meta de ahorro y pagos fijos (barra lateral). Todos son opcionales.
  if (state.monthlyBudget !== undefined) {
    if (!Number.isSafeInteger(state.monthlyBudget) || state.monthlyBudget < 0 || state.monthlyBudget > 1e12) throw new Error('Presupuesto inválido');
    if (state.monthlyBudget > 0) clean.monthlyBudget = state.monthlyBudget;
  }
  if (state.savingsGoal !== undefined && state.savingsGoal !== null) {
    const goal = state.savingsGoal;
    if (!goal || typeof goal.name !== 'string' || !goal.name.trim() || goal.name.length > 32 || !Number.isSafeInteger(goal.target) || goal.target <= 0 || goal.target > 1e12) throw new Error('Meta de ahorro inválida');
    clean.savingsGoal = { name: goal.name.trim(), target: goal.target };
  }
  if (state.recurring !== undefined) {
    if (!Array.isArray(state.recurring) || state.recurring.length > 50) throw new Error('Pagos fijos inválidos');
    const recurringIds = new Set();
    clean.recurring = state.recurring.map((item) => {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || recurringIds.has(item.id) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 80 || !Number.isSafeInteger(item.amount) || item.amount <= 0 || item.amount > 1e12 || !Number.isInteger(item.day) || item.day < 1 || item.day > 31 || categoryMap.get(item.categoryId)?.kind !== 'expense' || item.categoryId === 'savings') throw new Error('Pago fijo inválido');
      recurringIds.add(item.id);
      return { id: item.id, title: item.title.trim(), amount: item.amount, categoryId: item.categoryId, day: item.day };
    });
  }
  return clean;
}

const OWNER = 'owner';
const PEOPLE_MAX = 20;
const AVATAR_MAX_BYTES = 1_500_000;

function validPersonId(value) {
  return typeof value === 'string' && /^p[A-Za-z0-9_-]{8,40}$/.test(value);
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_MS = 7 * 24 * 60 * 60 * 1000;

function cleanUsername(value) {
  const username = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error('El usuario debe tener entre 3 y 30 letras, números, puntos o guiones, sin espacios');
  return username;
}

function checkPassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 200) throw new Error('La contraseña debe tener al menos 8 caracteres');
  return value;
}

// scrypt con sal aleatoria: la contraseña nunca se guarda tal cual.
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return 'scrypt$' + salt.toString('base64url') + '$' + hash.toString('base64url');
}

function passwordMatches(password, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'base64url'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function normalizeInvite(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hashInvite(code) {
  return crypto.createHash('sha256').update(normalizeInvite(code)).digest('hex');
}

function cleanPersonName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 40) throw new Error('Escribe un nombre de hasta 40 caracteres');
  return name;
}

async function openStore(userDataPath, initialStatePath) {
  fs.mkdirSync(userDataPath, { recursive: true });
  const dbPath = path.join(userDataPath, 'miplata.sqlite');
  const backupDir = path.join(userDataPath, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const receiptDir = path.join(userDataPath, 'receipts');
  fs.mkdirSync(receiptDir, { recursive: true });
  const documentDir = path.join(userDataPath, 'documents');
  fs.mkdirSync(documentDir, { recursive: true });
  const peopleDir = path.join(userDataPath, 'people');
  const SQL = await initSqlJs({ locateFile: (file) => require.resolve('sql.js/dist/' + file) });
  let db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  // Los datos del dueño siguen en app_state y merchant_rules, igual que en versiones anteriores.
  // Cada persona adicional tiene su fila en person_state y sus reglas en person_rules.
  db.run('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, payload TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS merchant_rules (merchant_key TEXT PRIMARY KEY, merchant TEXT NOT NULL, category_id TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS person_state (person_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS person_rules (person_id TEXT NOT NULL, merchant_key TEXT NOT NULL, merchant TEXT NOT NULL, category_id TEXT NOT NULL, PRIMARY KEY (person_id, merchant_key))');
  db.run('CREATE TABLE IF NOT EXISTS accounts (person_id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS profiles (person_id TEXT PRIMARY KEY, display_name TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS invites (code_hash TEXT PRIMARY KEY, person_id TEXT NOT NULL, expires_at INTEGER NOT NULL)');
  const deviceColumns = db.exec('PRAGMA table_info(devices)')[0].values.map((row) => row[1]);
  if (!deviceColumns.includes('person_id')) db.run("ALTER TABLE devices ADD COLUMN person_id TEXT NOT NULL DEFAULT 'owner'");

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

  function initialState() {
    return validateState(JSON.parse(fs.readFileSync(initialStatePath, 'utf8')));
  }

  const existing = db.exec('SELECT id FROM app_state WHERE id = 1');
  if (!existing.length || !existing[0].values.length) {
    db.run('INSERT INTO app_state (id, revision, payload) VALUES (1, 0, ?)', [JSON.stringify(initialState())]);
    persist();
  }

  function one(sql, params) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const found = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return found;
  }

  function all(sql, params) {
    const result = db.exec(sql, params);
    return result.length ? result[0].values : [];
  }

  function personExists(personId) {
    return personId === OWNER || (validPersonId(personId) && Boolean(one('SELECT id FROM people WHERE id = ?', [personId])));
  }

  function merchantKey(name) {
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-CL').replace(/[^a-z0-9]+/g, ' ').trim();
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

  // Todo lo que pertenece a una persona: sus gastos, reglas de comercio, boletas y documentos.
  function scope(personId) {
    if (!personExists(personId)) throw new Error('Persona no encontrada');
    const owner = personId === OWNER;
    const home = owner ? userDataPath : path.join(peopleDir, personId);
    const receipts = owner ? receiptDir : path.join(peopleDir, personId, 'receipts');
    const documents = owner ? documentDir : path.join(peopleDir, personId, 'documents');
    if (!owner) {
      fs.mkdirSync(receipts, { recursive: true });
      fs.mkdirSync(documents, { recursive: true });
    }

    function writeState(revision, clean) {
      if (owner) db.run('UPDATE app_state SET revision = ?, payload = ? WHERE id = 1', [revision, JSON.stringify(clean)]);
      else db.run('INSERT OR REPLACE INTO person_state (person_id, revision, payload) VALUES (?, ?, ?)', [personId, revision, JSON.stringify(clean)]);
    }

    function writeRules(rules) {
      if (owner) {
        db.run('DELETE FROM merchant_rules');
        rules.forEach((rule) => db.run('INSERT OR REPLACE INTO merchant_rules VALUES (?, ?, ?)', [rule.key, rule.merchant, rule.categoryId]));
      } else {
        db.run('DELETE FROM person_rules WHERE person_id = ?', [personId]);
        rules.forEach((rule) => db.run('INSERT OR REPLACE INTO person_rules VALUES (?, ?, ?, ?)', [personId, rule.key, rule.merchant, rule.categoryId]));
      }
    }

    function getState() {
      const row = owner ? one('SELECT revision, payload FROM app_state WHERE id = 1', []) : one('SELECT revision, payload FROM person_state WHERE person_id = ?', [personId]);
      if (!row) return { revision: 0, data: initialState() };
      return { revision: Number(row.revision), data: JSON.parse(row.payload) };
    }

    function saveState(expectedRevision, state) {
      const clean = validateState(state);
      const current = getState();
      if (expectedRevision !== current.revision) return { conflict: true, ...current };
      backupDaily();
      writeState(current.revision + 1, clean);
      persist();
      cleanupReceipts();
      return getState();
    }

    function restoreState(state, rules) {
      const clean = validateState(state);
      const restoredRules = rules === undefined ? null : validatedMerchantRules(rules, clean.categories);
      backupNow();
      const revision = getState().revision + 1;
      db.run('BEGIN TRANSACTION');
      try {
        writeState(revision, clean);
        if (restoredRules) writeRules(restoredRules);
        db.run('COMMIT');
      } catch (error) { db.run('ROLLBACK'); throw error; }
      persist();
      return getState();
    }

    function saveReceipt(bytes) {
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > RECEIPT_MAX_BYTES) throw new Error('La imagen es demasiado grande');
      const extension = receiptExtension(bytes);
      if (!extension) throw new Error('El archivo no es una imagen JPG, PNG o WebP');
      const id = 'r' + crypto.randomBytes(18).toString('base64url');
      fs.writeFileSync(path.join(receipts, id + '.' + extension), bytes, { flag: 'wx' });
      return { id };
    }

    function readReceipt(id) {
      if (!validReceiptId(id)) return null;
      for (const [extension, type] of Object.entries(RECEIPT_TYPES)) {
        const file = path.join(receipts, id + '.' + extension);
        if (fs.existsSync(file)) return { bytes: fs.readFileSync(file), type };
      }
      return null;
    }

    function saveDocument(bytes, originalName) {
      const clean = cleanDocumentName(originalName);
      if (!clean) throw new Error('Sube un PDF, Excel, Word, CSV, XML o TXT');
      if (!Buffer.isBuffer(bytes) || !bytes.length) throw new Error('El archivo está vacío');
      if (bytes.length > DOCUMENT_MAX_BYTES) throw new Error('El archivo supera los 15 MB');
      if (!documentMatches(clean.extension, bytes)) throw new Error('El archivo no parece un ' + clean.extension.toUpperCase() + ' válido');
      const id = 'd' + crypto.randomBytes(18).toString('base64url');
      fs.writeFileSync(path.join(documents, id + '.' + clean.extension), bytes, { flag: 'wx' });
      return { id, name: clean.name };
    }

    function readDocument(id) {
      if (!validDocumentId(id)) return null;
      for (const extension of DOCUMENT_EXTENSIONS) {
        const file = path.join(documents, id + '.' + extension);
        if (fs.existsSync(file)) return { bytes: fs.readFileSync(file), extension };
      }
      return null;
    }

    function cleanupReceipts() {
      try {
        const transactions = getState().data.transactions;
        const used = new Set(transactions.flatMap((item) => [item.receiptId, item.documentId]).filter(Boolean));
        for (const folder of [receipts, documents]) {
          for (const name of fs.readdirSync(folder)) {
            const file = path.join(folder, name);
            if (used.has(name.replace(/\.[a-z0-9]+$/, ''))) continue;
            const stat = fs.statSync(file);
            if (stat.isFile() && Date.now() - stat.mtimeMs > RECEIPT_ORPHAN_MS) fs.unlinkSync(file);
          }
        }
      } catch (error) { console.error('No se pudieron limpiar las boletas y documentos:', error); }
    }

    function merchantRules() {
      const rows = owner ? all('SELECT merchant, category_id FROM merchant_rules ORDER BY merchant') : all('SELECT merchant, category_id FROM person_rules WHERE person_id = ? ORDER BY merchant', [personId]);
      return rows.map(([merchant, categoryId]) => ({ merchant, categoryId }));
    }

    function setMerchantRule(merchant, categoryId) {
      const name = String(merchant || '').trim();
      const key = merchantKey(name);
      if (!key || name.length > 80 || !getState().data.categories.some((item) => item.id === categoryId && item.kind === 'expense')) throw new Error('Regla de comercio inválida');
      if (owner) db.run('INSERT OR REPLACE INTO merchant_rules (merchant_key, merchant, category_id) VALUES (?, ?, ?)', [key, name, categoryId]);
      else db.run('INSERT OR REPLACE INTO person_rules (person_id, merchant_key, merchant, category_id) VALUES (?, ?, ?, ?)', [personId, key, name, categoryId]);
      persist();
    }

    function replaceMerchantRules(rules) {
      writeRules(validatedMerchantRules(rules, getState().data.categories));
      persist();
    }

    function avatarFile() {
      for (const extension of Object.keys(RECEIPT_TYPES)) {
        const file = path.join(home, 'avatar.' + extension);
        if (fs.existsSync(file)) return { file, extension };
      }
      return null;
    }

    function getProfile() {
      const name = owner ? one('SELECT display_name FROM profiles WHERE person_id = ?', [OWNER])?.display_name || '' : personName(personId) || '';
      const avatar = avatarFile();
      return { name, username: accountFor(personId)?.username || null, avatar: avatar ? Math.round(fs.statSync(avatar.file).mtimeMs) : null };
    }

    function setName(value) {
      const clean = cleanPersonName(value);
      if (owner) db.run('INSERT OR REPLACE INTO profiles (person_id, display_name) VALUES (?, ?)', [OWNER, clean]);
      else {
        if (listPeople().some((person) => person.id !== personId && person.name.toLocaleLowerCase('es-CL') === clean.toLocaleLowerCase('es-CL'))) throw new Error('Ya existe una persona con ese nombre');
        db.run('UPDATE people SET name = ? WHERE id = ?', [clean, personId]);
      }
      persist();
      return getProfile();
    }

    function saveAvatar(bytes) {
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > AVATAR_MAX_BYTES) throw new Error('La foto es demasiado grande');
      const extension = receiptExtension(bytes);
      if (!extension) throw new Error('La foto debe ser JPG, PNG o WebP');
      removeAvatar();
      fs.mkdirSync(home, { recursive: true });
      fs.writeFileSync(path.join(home, 'avatar.' + extension), bytes);
      return getProfile();
    }

    function readAvatar() {
      const avatar = avatarFile();
      return avatar ? { bytes: fs.readFileSync(avatar.file), type: RECEIPT_TYPES[avatar.extension] } : null;
    }

    function removeAvatar() {
      for (const extension of Object.keys(RECEIPT_TYPES)) fs.rmSync(path.join(home, 'avatar.' + extension), { force: true });
      return getProfile();
    }

    // La propia persona cambia su contraseña escribiendo la actual.
    function changePassword(current, next) {
      const account = one('SELECT password_hash FROM accounts WHERE person_id = ?', [personId]);
      if (!account) throw new Error('Todavía no tienes usuario');
      if (!passwordMatches(current, account.password_hash)) return false;
      setPassword(personId, next);
      return true;
    }

    return { personId, getProfile, setName, saveAvatar, readAvatar, removeAvatar, changePassword, getState, saveState, restoreState, saveReceipt, readReceipt, saveDocument, readDocument, cleanupReceipts, merchantRules, setMerchantRule, replaceMerchantRules, receiptDir: receipts, documentDir: documents };
  }

  function listPeople() {
    return all('SELECT people.id, people.name, people.created_at, accounts.username FROM people LEFT JOIN accounts ON accounts.person_id = people.id ORDER BY people.created_at').map(([id, name, createdAt, username]) => ({ id, name, createdAt, username: username || null }));
  }

  function addPerson(name) {
    const clean = cleanPersonName(name);
    if (listPeople().length >= PEOPLE_MAX) throw new Error('Puedes tener hasta ' + PEOPLE_MAX + ' personas');
    if (listPeople().some((person) => person.name.toLocaleLowerCase('es-CL') === clean.toLocaleLowerCase('es-CL'))) throw new Error('Ya existe una persona con ese nombre');
    const id = 'p' + crypto.randomBytes(12).toString('base64url');
    db.run('INSERT INTO people (id, name, created_at) VALUES (?, ?, ?)', [id, clean, new Date().toISOString()]);
    db.run('INSERT INTO person_state (person_id, revision, payload) VALUES (?, 0, ?)', [id, JSON.stringify(initialState())]);
    persist();
    return { id, name: clean };
  }

  function removePerson(id) {
    if (id === OWNER || !personExists(id)) throw new Error('Persona no encontrada');
    backupNow();
    db.run('BEGIN TRANSACTION');
    try {
      db.run('DELETE FROM devices WHERE person_id = ?', [id]);
      db.run('DELETE FROM person_rules WHERE person_id = ?', [id]);
      db.run('DELETE FROM person_state WHERE person_id = ?', [id]);
      db.run('DELETE FROM people WHERE id = ?', [id]);
      db.run('DELETE FROM accounts WHERE person_id = ?', [id]);
      db.run('DELETE FROM invites WHERE person_id = ?', [id]);
      db.run('COMMIT');
    } catch (error) { db.run('ROLLBACK'); throw error; }
    persist();
    fs.rmSync(path.join(peopleDir, id), { recursive: true, force: true });
  }

  function accountFor(personId) {
    return one('SELECT username, created_at FROM accounts WHERE person_id = ?', [personId]);
  }

  // Código de un solo uso para que una persona (o el dueño) cree su usuario y contraseña.
  function createInvite(personId) {
    if (!personExists(personId)) throw new Error('Persona no encontrada');
    if (accountFor(personId)) throw new Error('Esta persona ya tiene usuario. Si olvidó la contraseña, cámbiala desde aquí.');
    const bytes = crypto.randomBytes(8);
    const raw = Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join('');
    const expiresAt = Date.now() + INVITE_MS;
    db.run('DELETE FROM invites WHERE person_id = ? OR expires_at < ?', [personId, Date.now()]);
    db.run('INSERT INTO invites (code_hash, person_id, expires_at) VALUES (?, ?, ?)', [hashInvite(raw), personId, expiresAt]);
    persist();
    return { code: raw.slice(0, 4) + '-' + raw.slice(4), expiresAt };
  }

  function registerAccount(code, username, password) {
    const invite = one('SELECT person_id, expires_at FROM invites WHERE code_hash = ?', [hashInvite(code)]);
    if (!invite || Number(invite.expires_at) < Date.now() || !personExists(invite.person_id)) throw new Error('El código de invitación no es válido o ya venció');
    const cleanName = cleanUsername(username);
    checkPassword(password);
    if (accountFor(invite.person_id)) throw new Error('Esta persona ya tiene usuario');
    if (one('SELECT person_id FROM accounts WHERE username = ?', [cleanName])) throw new Error('Ese usuario ya existe. Elige otro.');
    db.run('BEGIN TRANSACTION');
    try {
      db.run('INSERT INTO accounts (person_id, username, password_hash, created_at) VALUES (?, ?, ?, ?)', [invite.person_id, cleanName, hashPassword(password), new Date().toISOString()]);
      db.run('DELETE FROM invites WHERE person_id = ?', [invite.person_id]);
      db.run('COMMIT');
    } catch (error) { db.run('ROLLBACK'); throw error; }
    persist();
    return invite.person_id;
  }

  function verifyLogin(username, password) {
    let cleanName;
    try { cleanName = cleanUsername(username); } catch (error) { return null; }
    const account = one('SELECT person_id, password_hash FROM accounts WHERE username = ?', [cleanName]);
    if (!account) {
      passwordMatches(password, hashPassword('relleno-para-igualar-el-tiempo'));
      return null;
    }
    return passwordMatches(password, account.password_hash) && personExists(account.person_id) ? account.person_id : null;
  }

  function setPassword(personId, password) {
    checkPassword(password);
    if (!accountFor(personId)) throw new Error('Esta persona todavía no tiene usuario');
    db.run('UPDATE accounts SET password_hash = ? WHERE person_id = ?', [hashPassword(password), personId]);
    persist();
  }

  function setUsername(personId, username) {
    const clean = cleanUsername(username);
    if (!accountFor(personId)) throw new Error('Esta persona todavía no tiene usuario');
    const taken = one('SELECT person_id FROM accounts WHERE username = ?', [clean]);
    if (taken && taken.person_id !== personId) throw new Error('Ese usuario ya existe. Elige otro.');
    db.run('UPDATE accounts SET username = ? WHERE person_id = ?', [clean, personId]);
    persist();
  }

  // Quita el usuario y cierra todas sus sesiones; los gastos de la persona se conservan.
  function deleteAccount(personId) {
    if (!personExists(personId)) throw new Error('Persona no encontrada');
    db.run('BEGIN TRANSACTION');
    try {
      db.run('DELETE FROM accounts WHERE person_id = ?', [personId]);
      db.run('DELETE FROM invites WHERE person_id = ?', [personId]);
      db.run('DELETE FROM devices WHERE person_id = ?', [personId]);
      db.run('COMMIT');
    } catch (error) { db.run('ROLLBACK'); throw error; }
    persist();
  }

  function personName(id) {
    if (id === OWNER) return null;
    return one('SELECT name FROM people WHERE id = ?', [id])?.name || null;
  }

  const ownerScope = scope(OWNER);
  ownerScope.cleanupReceipts();
  listPeople().forEach((person) => scope(person.id).cleanupReceipts());

  function lastBackupAt() {
    try {
      const times = fs.readdirSync(backupDir).filter((name) => name.endsWith('.sqlite')).map((name) => fs.statSync(path.join(backupDir, name)).mtimeMs);
      return times.length ? new Date(Math.max(...times)).toISOString() : null;
    } catch (error) { return null; }
  }

  function addDevice(name, token, personId = OWNER) {
    if (!personExists(personId)) throw new Error('Persona no encontrada');
    const id = crypto.randomUUID();
    db.run('INSERT INTO devices (id, token_hash, name, created_at, person_id) VALUES (?, ?, ?, ?, ?)', [id, crypto.createHash('sha256').update(token).digest('hex'), String(name).slice(0, 80), new Date().toISOString(), personId]);
    persist();
    return id;
  }

  function deviceForToken(token) {
    if (typeof token !== 'string' || token.length < 32 || token.length > 200) return null;
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return one('SELECT id, name, created_at, person_id FROM devices WHERE token_hash = ?', [hash]);
  }

  function listDevices() {
    return all('SELECT id, name, created_at, person_id FROM devices ORDER BY created_at DESC').map((row) => ({ id: row[0], name: row[1], createdAt: row[2], personId: row[3] }));
  }

  function revokeDevice(id) {
    db.run('DELETE FROM devices WHERE id = ?', [id]);
    persist();
  }

  return { ...ownerScope, forPerson: scope, listPeople, addPerson, removePerson, personName, accountFor, createInvite, registerAccount, verifyLogin, setPassword, setUsername, deleteAccount, addDevice, deviceForToken, listDevices, revokeDevice, lastBackupAt, backupDir, dbPath, backupNow, close: () => db.close() };
}

module.exports = { openStore, validateState, OWNER };
