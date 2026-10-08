const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const categoryIcons = require('../category-icons.js');

const MODEL = 'claude-haiku-5-5';
const CLAUDE_TIMEOUT_MS = 180000;

function keyOf(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL').replace(/[^a-z0-9]+/g, ' ').trim();
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function claudeExecutable() {
  const installed = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');
  return fs.existsSync(installed) ? installed : 'claude';
}

async function runClaude(schema, prompt, images = []) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'miplata-claude-'));
  try {
    const content = images.map((image) => {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.mime) || !Buffer.isBuffer(image.bytes)) throw new Error('Formato de captura no válido');
      return { type: 'image', source: { type: 'base64', media_type: image.mime, data: image.bytes.toString('base64') } };
    });
    content.push({ type: 'text', text: prompt });
    const args = [
      '-p', '--model', MODEL, '--effort', 'low', '--tools', '', '--permission-mode', 'dontAsk',
      '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
      '--json-schema', JSON.stringify(schema)
    ];
    const environment = { ...process.env };
    delete environment.CLAUDECODE;
    delete environment.OPENAI_API_KEY;
    delete environment.CODEX_API_KEY;
    delete environment.ANTHROPIC_API_KEY;
    return await new Promise((resolve, reject) => {
      const child = spawn(claudeExecutable(), args, { cwd: folder, env: environment, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
      let settled = false;
      let timedOut = false;
      let errorOutput = '';
      let output = '';
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error); else resolve(value);
      };
      const timeout = setTimeout(() => { timedOut = true; child.kill(); }, CLAUDE_TIMEOUT_MS);
      child.stdout.on('data', (chunk) => { output += chunk.toString(); if (output.length > 2_000_000) child.kill(); });
      child.stderr.on('data', (chunk) => { errorOutput = (errorOutput + chunk.toString()).slice(-4000); });
      child.on('error', () => finish(new Error('No encuentro Claude Code CLI en esta PC. Instálalo e inicia sesión con tu cuenta de Claude.')));
      child.on('close', (code) => {
        if (timedOut) return finish(new Error('Claude Code tardó demasiado. Prueba de nuevo.'));
        if (code !== 0) return finish(new Error(/not logged in|authentication|unauthorized|login required/i.test(errorOutput) ? 'Inicia sesión en Claude Code CLI.' : 'Claude Code no pudo analizar el mensaje. Revisa la conexión o tu límite de uso.'));
        try {
          const result = output.trim().split(/\r?\n/).map((line) => JSON.parse(line)).findLast((entry) => entry.type === 'result');
          if (!result || result.is_error || !result.structured_output) throw new Error('Claude Code no devolvió una respuesta utilizable');
          finish(null, result.structured_output);
        } catch (error) { finish(error); }
      });
      child.stdin.on('error', () => {});
      child.stdin.end(JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n');
    });
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

const rowSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string' }, kind: { type: 'string', enum: ['expense', 'income'] },
    amount: { type: 'number' }, currency: { type: 'string', enum: ['CLP', 'USD', 'UNKNOWN'] },
    date: { type: 'string' }, time: { type: ['string', 'null'] },
    categoryId: { type: ['string', 'null'] }, include: { type: 'boolean' },
    reason: { type: ['string', 'null'] }
  },
  required: ['title', 'kind', 'amount', 'currency', 'date', 'time', 'categoryId', 'include', 'reason']
};

const extractionSchema = {
  type: 'object', additionalProperties: false,
  properties: { rows: { type: 'array', items: rowSchema } }, required: ['rows']
};

async function extractBatch({ images, caption, categories, rules, existing, today, referenceRows = [], runStructured = runClaude }) {
  const categoryList = categories.map((item) => ({ id: item.id, name: item.name, kind: item.kind }));
  const instructions = [
    'Extrae movimientos financieros de las imágenes o del mensaje. Responde solo según el esquema JSON.',
    'Cada fila visible es un movimiento distinto. No inventes filas cortadas ni importes ilegibles.',
    'amount siempre es positivo. El signo menos de la captura indica kind=expense y el signo más indica kind=income.',
    'Los importes usan formato chileno: el punto separa miles y la coma separa decimales (1.197 significa 1197; 1.197,50 significa 1197.5). Usa fecha visible, no la fecha actual cuando la imagen indique otra.',
    'Elige solamente categoryId de la lista. Si no hay una opción clara, usa null e include=false.',
    'Si el mensaje pide ignorar un comercio o fila, devuélvela con include=false y reason="Ignorado por indicación del usuario".',
    'En capturas, excluye cargos de tarjeta, cuotas que se pagarán como un único gasto, cargos USD y transferencias entre cuentas propias.',
    'Si el usuario escribe expresamente un pago único de tarjeta o cuotas como gasto nuevo, proponlo en CLP con la categoría de Crédito si existe. No lo excluyas solo por ser de tarjeta.',
    'Si el usuario se refiere a una fila anterior sin repetir el importe, usa las filas de referencia solo cuando el comercio coincida claramente. Prioriza el nombre sobre un número de fila ambiguo. Conserva importe y fecha originales. Si no puedes identificarla, devuelve rows=[].',
    'Si el mensaje pide descontar, dividir o corregir un movimiento YA GUARDADO, devuelve rows=[]; esta extracción no puede modificarlo y no debe proponer una parte nueva aislada.',
    'Un ingreso de origen incierto o una transferencia a una persona sin regla conocida: include=false hasta que el usuario aclare.',
    'No conviertas USD a CLP. Para CLP, conserva el valor tal como aparece; la app redondeará al peso al guardar.',
    'Máximo 30 filas. Usa nombres cortos y reconocibles como título.',
    'Fecha actual: ' + today,
    'Categorías: ' + JSON.stringify(categoryList),
    'Reglas conocidas: ' + JSON.stringify(rules),
    'Filas anteriores de referencia: ' + JSON.stringify(referenceRows.map((row) => ({ title: row.title, kind: row.kind, amount: row.amount, currency: row.currency, date: row.date, time: row.time, categoryId: row.categoryId }))),
    'Mensaje del usuario: ' + (caption || '(solo imagen)')
  ].join('\n');
  const output = await runStructured(extractionSchema, instructions, images);
  if (!Array.isArray(output.rows) || output.rows.length > 30) throw new Error('La captura contiene demasiados movimientos');
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  const ruleMap = new Map(rules.map((rule) => [keyOf(rule.merchant), rule.categoryId]));
  const ignorePhrase = String(caption || '').match(/(?:ignora|ignorá|omite|omití)\s+(?:el|la|los|las|lo de)?\s*([^.,;\n]+)/i)?.[1];
  const ignoreKey = keyOf(ignorePhrase);
  const seen = new Set();
  return output.rows.map((item) => {
    const title = String(item.title || '').trim().slice(0, 80);
    const dateKnown = validDate(item.date);
    const date = dateKnown ? item.date : today;
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || '') ? item.time : null;
    const amount = Math.round(Number(item.amount));
    const currency = item.currency;
    const ruleCategory = item.kind === 'expense' ? ruleMap.get(keyOf(title)) : null;
    const categoryId = ruleCategory || item.categoryId;
    const category = categoryMap.get(categoryId);
    let reason = item.reason ? String(item.reason).slice(0, 120) : '';
    let include = ruleCategory && !/ignorad|omitid|tarjeta/i.test(reason) ? true : item.include === true;
    if (!dateKnown) { include = false; reason = 'Fecha por confirmar'; }
    if (!title || !Number.isSafeInteger(amount) || amount <= 0) { include = false; reason = 'Importe o concepto ilegible'; }
    if (currency !== 'CLP') { include = false; reason = currency === 'USD' ? 'Gasto en USD para cargar con la tarjeta' : 'Moneda incierta'; }
    if (images.length && /tarjeta de cr[eé]dito|cr[eé]ditos? de mercado pago|pago de cuotas|cuotas? mercado pago/i.test(title + ' ' + reason)) { include = false; reason = 'Tarjeta o cuota para cargar por separado'; }
    if (!images.length && item.kind === 'expense' && dateKnown && Number.isSafeInteger(amount) && amount > 0 && currency === 'CLP' && category?.kind === 'expense' && /tarjeta|cuot|cr[eé]dit/i.test(title) && !/(?:ignora|omit[eií])/i.test(caption || '')) { include = true; reason = ''; }
    if (ignoreKey && (keyOf(title).includes(ignoreKey) || ignoreKey.includes(keyOf(title)))) { include = false; reason = 'Ignorado por indicación tuya'; }
    if (!category || category.kind !== item.kind || categoryId === 'savings' || categoryId === 'savings-return') { include = false; reason ||= 'Categoría por confirmar'; }
    const fingerprint = [keyOf(title), item.kind, date, amount, time || ''].join('|');
    if (seen.has(fingerprint)) { include = false; reason = 'Posible repetido en la captura'; }
    seen.add(fingerprint);
    if (existing.some((entry) => keyOf(entry.title) === keyOf(title) && entry.kind === item.kind && entry.date === date && entry.amount === amount)) {
      include = false; reason = 'Posible movimiento ya cargado';
    }
    return { title, kind: item.kind, amount, currency, date, time, categoryId: category?.kind === item.kind ? categoryId : null, include, reason };
  });
}

const correctionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    edits: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          action: { type: 'string', enum: ['update', 'ignore', 'include', 'remember', 'create_category', 'split'] },
          index: { type: 'integer' }, categoryId: { type: ['string', 'null'] },
          title: { type: ['string', 'null'] }, merchant: { type: ['string', 'null'] },
          remember: { type: 'boolean' }, categoryName: { type: ['string', 'null'] },
          kind: { type: ['string', 'null'], enum: ['expense', 'income', null] },
          icon: { type: ['string', 'null'] }, tone: { type: ['string', 'null'] },
          parts: { type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: { amount: { type: ['number', 'null'] }, categoryId: { type: ['string', 'null'] }, categoryName: { type: ['string', 'null'] }, title: { type: ['string', 'null'] } },
            required: ['amount', 'categoryId', 'categoryName', 'title']
          } }
        },
        required: ['action', 'index', 'categoryId', 'title', 'merchant', 'remember', 'categoryName', 'kind', 'icon', 'tone', 'parts']
      }
    },
    clarification: { type: ['string', 'null'] }
  },
  required: ['edits', 'clarification']
};

async function interpretCorrections({ message, batch, categories, history = [], runStructured = runClaude }) {
  const prompt = [
    'Eres el intérprete de instrucciones del dueño de MiPlata. Interpreta TODAS las acciones del mensaje actual sobre la propuesta pendiente, usando los mensajes recientes para resolver referencias como "ese", "el de arriba", "lo que te dije" o "divídelo". El mensaje actual tiene prioridad. No inventes una referencia si hay varias filas posibles: haz una pregunta concreta en clarification y devuelve edits=[].',
    'Devuelve una edición por cada fila mencionada, incluso si el usuario escribe varias instrucciones breves como "1 ropa 2 verdulería 3 ingreso extra ponle Trabajo Pintura". No te quedes solo con la primera.',
    'Cada edición usa los campos indicados. Para campos no aplicables: null, false o parts=[]. index es el número de fila (1 en adelante), o 0 para create_category y remember.',
    'action=update puede cambiar categoría y título juntos. categoryId=null y categoryName=null conservan la categoría; title=null conserva el título.',
    'Si dice "ponerle de nombre", "que sea" o "llámalo", pon el nuevo título exacto en title. No mantengas el nombre de la persona cuando pide reemplazarlo por un concepto.',
    'Si nombra una categoría existente, elige su categoryId y deja title=null salvo que pida cambiar el nombre. "1 ropa" solo cambia categoría a Ropa.',
    'Si usa un concepto que no es categoría existente, como "verdulería" o "costurera", elige una categoría existente apropiada para el tipo de fila y usa ese concepto como título. Verdulería va en Comida; costurera va en Ropa si existen.',
    '"Ingreso extra" corresponde a una categoría de ingreso como Otros ingresos, nunca a una categoría de gasto llamada Extras. Si agrega "ponle Trabajo Pintura", title="Trabajo Pintura".',
    'Si pide expresamente crear una categoría, action=create_category, index=0, categoryName con el nombre exacto, kind=expense o income, icon de la lista y tone entre lavender, coral, mint, sky, rose, peach. No crees categorías por inferencia cuando solo pide usar una categoría.',
    'Si crea una categoría y también pide usarla en una fila, agrega otra edición update o split con categoryName igual al nombre nuevo. Para una categoría existente usa categoryId.',
    'Si pide dividir una fila, action=split con 2 a 10 parts. Cada parte tiene amount en pesos enteros, categoryId o categoryName, y title opcional. Calcula los importes para que sumen exactamente el importe original. Si una parte es "el resto", usa amount=null solo en esa parte. Si no se puede determinar el reparto, pregunta en clarification y no hagas cambios.',
    'No dividas un gasto si no hay una fila pendiente identificable. Todas las ediciones de fila se refieren a la numeración original del lote.',
    'Si pide ignorar una fila, action=ignore. Si pide incluir una fila sin cambiarla, action=include.',
    'Una regla se puede recordar sin filas pendientes: action=remember, index=0, merchant con el nombre exacto del comercio o destinatario y categoryId de una categoría de gasto.',
    'Para cambios de filas, merchant=null normalmente; remember=true solo si pide expresamente recordar para el futuro. No inventes filas ni categorías.',
    'Si hay una petición entendible, no respondas con edits=[] por tener lenguaje coloquial. Si de verdad falta una referencia o un importe necesario, usa clarification con una pregunta breve. Cuando no haya acción ni ambigüedad, devuelve edits=[] y clarification=null.',
    'Íconos disponibles: ' + JSON.stringify(Object.entries(categoryIcons).map(([id, item]) => ({ id, label: item.label }))),
    'Categorías: ' + JSON.stringify(categories.map((item) => ({ id: item.id, name: item.name, kind: item.kind }))),
    'Filas: ' + JSON.stringify(batch.rows.map((row, index) => ({ index: index + 1, title: row.title, kind: row.kind, amount: row.amount, currency: row.currency, categoryId: row.categoryId, include: row.include, reason: row.reason }))),
    'Conversación reciente, en orden: ' + JSON.stringify(history),
    'Instrucción: ' + message
  ].join('\n');
  const result = await runStructured(correctionSchema, prompt);
  if (!Array.isArray(result.edits) || result.edits.length > 30) throw new Error('No pude interpretar todas las correcciones');
  return { edits: result.edits, clarification: typeof result.clarification === 'string' ? result.clarification.trim().slice(0, 180) : null };
}

const savedAdjustmentSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    sourceId: { type: ['string', 'null'] }, portionAmount: { type: ['number', 'null'] },
    categoryId: { type: ['string', 'null'] }, title: { type: ['string', 'null'] },
    clarification: { type: ['string', 'null'] }
  },
  required: ['sourceId', 'portionAmount', 'categoryId', 'title', 'clarification']
};

async function interpretSavedAdjustment({ message, transactions, categories, today, history = [], runStructured = runClaude }) {
  const names = new Map(categories.map((item) => [item.id, item.name]));
  const prompt = [
    'El dueño quiere corregir un gasto YA GUARDADO, no registrar un gasto adicional por el total mencionado.',
    'Elige una sola transacción existente por su importe, fecha, nombre o categoría. "Ayer" es el día anterior a la fecha actual. Si hay varias posibles, no elijas: pregunta en clarification.',
    'portionAmount es el monto que se descuenta de la transacción original para crear una segunda parte. Debe ser positivo y menor que el importe original.',
    'categoryId es la categoría de la parte nueva. title es el título de la parte nueva. Si dice "en Mascota Comida", Mascotas es la categoría y Comida es el título.',
    'No cambies la categoría ni el título del movimiento original. La app restará portionAmount y propondrá la parte nueva por separado. No guardará nada hasta que el dueño confirme.',
    'Si la instrucción no especifica con claridad movimiento original, importe a descontar, categoría o título nuevo, devuelve sourceId=null y una pregunta concreta en clarification.',
    'Fecha actual: ' + today,
    'Categorías: ' + JSON.stringify(categories.map((item) => ({ id: item.id, name: item.name, kind: item.kind }))),
    'Movimientos guardados: ' + JSON.stringify(transactions.slice(-80).map((item) => ({ id: item.id, title: item.title, amount: item.amount, date: item.date, category: names.get(item.categoryId), kind: item.kind }))),
    'Conversación reciente: ' + JSON.stringify(history),
    'Mensaje actual: ' + message
  ].join('\n');
  return runStructured(savedAdjustmentSchema, prompt);
}

module.exports = { extractBatch, interpretCorrections, interpretSavedAdjustment, runClaude, keyOf, validDate };
