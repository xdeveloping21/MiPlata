const crypto = require('node:crypto');
const categoryIcons = require('../category-icons.js');

function keyOf(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL').replace(/[^a-z0-9]+/g, ' ').trim();
}

function mentionedRows(message, count) {
  const indexes = new Set();
  const text = String(message);
  const pattern = /(?:^|[\s,;])(?:(?:fila|el|la)\s+)?(\d{1,2})(?=\s|[.,;:]|$)/gi;
  for (const match of text.matchAll(pattern)) {
    const index = Number(match[1]);
    const before = text.slice(Math.max(0, match.index - 15), match.index + match[0].length - match[1].length);
    if (/\b(?:en|de|por|entre|cada|x|a)\s*$/i.test(before) || /\$\s*$/.test(before)) continue;
    if (index >= 1 && index <= count) indexes.add(index);
  }
  return indexes;
}

function applyCorrections({ message, rows, categories, edits }) {
  if (!Array.isArray(edits) || !edits.length) throw new Error('No entendí qué cambiar. Dime qué fila o categoría quieres modificar.');
  const requested = mentionedRows(message, rows.length);
  const changed = new Set();
  const nextRows = rows.map((row) => ({ ...row }));
  const nextCategories = [...categories];
  const categoryMap = new Map(nextCategories.map((category) => [category.id, category]));
  const createdCategories = [];
  const rules = new Map();
  const splitRows = new Map();

  for (const edit of edits.filter((item) => item?.action === 'create_category')) {
    const name = String(edit.categoryName || '').trim();
    if (edit.index !== 0 || !name || name.length > 32 || !['expense', 'income'].includes(edit.kind)) throw new Error('La categoría nueva necesita nombre y tipo válidos');
    const duplicate = nextCategories.find((item) => item.kind === edit.kind && keyOf(item.name) === keyOf(name));
    if (duplicate) continue;
    const icon = Object.hasOwn(categoryIcons, edit.icon) ? edit.icon : 'wallet';
    const tone = ['lavender', 'coral', 'mint', 'sky', 'rose', 'peach'].includes(edit.tone) ? edit.tone : 'lavender';
    const category = { id: 'c' + crypto.randomUUID().replace(/-/g, ''), name, kind: edit.kind, icon, tone };
    nextCategories.push(category);
    categoryMap.set(category.id, category);
    createdCategories.push(category);
  }

  function resolveCategory(id, name, kind) {
    const category = id ? categoryMap.get(id) : name ? nextCategories.find((item) => item.kind === kind && keyOf(item.name) === keyOf(name)) : null;
    if ((id || name) && (!category || category.kind !== kind || ['savings', 'savings-return'].includes(category.id))) throw new Error('No encontré una categoría válida para ese movimiento');
    return category;
  }

  for (const edit of edits) {
    if (!edit || !['update', 'ignore', 'include', 'remember', 'create_category', 'split'].includes(edit.action) || !Number.isInteger(edit.index)) throw new Error('No pude interpretar una de las correcciones');
    if (edit.action === 'create_category') continue;
    if (edit.action === 'remember') {
      const merchant = String(edit.merchant || '').trim();
      const category = resolveCategory(edit.categoryId, edit.categoryName, 'expense');
      if (edit.index !== 0 || !merchant || merchant.length > 80 || !category) throw new Error('No pude identificar el comercio y su categoría para recordarlos');
      rules.set(merchant, category.id);
      continue;
    }
    const row = nextRows[edit.index - 1];
    if (!row || (requested.size && !requested.has(edit.index))) throw new Error('No pude identificar una de las filas mencionadas');
    if (changed.has(edit.index)) throw new Error('La fila ' + edit.index + ' tiene instrucciones que se contradicen');
    changed.add(edit.index);

    if (edit.action === 'ignore') {
      if (row.adjustmentGroup) throw new Error('No puedes ignorar una sola parte de un gasto guardado. Escribe cancelar para descartar toda la corrección.');
      row.include = false;
      row.reason = 'Ignorado por indicación tuya';
      continue;
    }
    if (edit.action === 'include') {
      if (row.currency !== 'CLP' || categoryMap.get(row.categoryId)?.kind !== row.kind) throw new Error('Primero indica una categoría válida en CLP para la fila ' + edit.index);
      row.include = true;
      row.reason = '';
      continue;
    }

    if (edit.action === 'split') {
      const parts = edit.parts;
      if (!Array.isArray(parts) || parts.length < 2 || parts.length > 10 || row.currency !== 'CLP' || !Number.isSafeInteger(row.amount) || row.amount <= 0) throw new Error('No puedo dividir la fila ' + edit.index + ' en esas partes');
      let remainderIndex = -1;
      let used = 0;
      const divided = parts.map((part, partIndex) => {
        if (!part || typeof part !== 'object') throw new Error('Falta una parte de la división');
        const amount = part.amount == null ? null : Math.round(Number(part.amount));
        if (amount === null) {
          if (remainderIndex !== -1) throw new Error('Indica un solo resto para la fila ' + edit.index);
          remainderIndex = partIndex;
        } else {
          if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Los importes de la fila ' + edit.index + ' deben ser positivos');
          used += amount;
        }
        const category = resolveCategory(part.categoryId, part.categoryName, row.kind) || categoryMap.get(row.categoryId);
        if (!category || category.kind !== row.kind || ['savings', 'savings-return'].includes(category.id)) throw new Error('Indica la categoría de cada parte de la fila ' + edit.index);
        const title = part.title == null ? row.title : String(part.title).trim();
        if (!title || title.length > 80) throw new Error('Nombre inválido en la división de la fila ' + edit.index);
        const dividedPart = { ...row, amount, categoryId: category.id, title };
        if (partIndex > 0) { delete dividedPart.sourceTransactionId; delete dividedPart.sourceOriginal; }
        return dividedPart;
      });
      if (remainderIndex !== -1) divided[remainderIndex].amount = row.amount - used;
      if (divided.some((part) => !Number.isSafeInteger(part.amount) || part.amount <= 0) || divided.reduce((sum, part) => sum + part.amount, 0) !== row.amount) throw new Error('Las partes de la fila ' + edit.index + ' deben sumar ' + row.amount + ' pesos');
      const needsReview = /tarjeta|cuota|usd|d[oó]lar|repetid|ya cargado|moneda|fecha|ilegible/i.test(row.reason || '');
      for (const part of divided) {
        if (!needsReview) { part.include = true; part.reason = ''; }
      }
      splitRows.set(edit.index, divided);
      continue;
    }

    const category = resolveCategory(edit.categoryId, edit.categoryName, row.kind);
    const title = edit.title == null ? null : String(edit.title).trim();
    if (title !== null && (!title || title.length > 80)) throw new Error('El nombre de la fila ' + edit.index + ' no es válido');
    if (!category && title === null) throw new Error('No pude interpretar el cambio de la fila ' + edit.index);
    if (category) row.categoryId = category.id;
    if (title !== null) row.title = title;
    const validCategory = categoryMap.get(row.categoryId)?.kind === row.kind;
    const needsReview = row.currency !== 'CLP' || /tarjeta|cuota|usd|d[oó]lar|repetid|ya cargado|moneda|fecha|ilegible/i.test(row.reason || '');
    if (validCategory && !needsReview) { row.include = true; row.reason = ''; }
    if (row.kind === 'expense' && validCategory && (edit.remember === true || (category && !/solo esta vez/i.test(message)))) rules.set(rows[edit.index - 1].title, row.categoryId);
  }

  const missing = [...requested].filter((index) => !changed.has(index));
  if (missing.length) throw new Error('No pude interpretar la' + (missing.length === 1 ? ' fila ' : 's filas ') + missing.join(', ') + '. No cambié ninguna fila.');
  const flattened = nextRows.flatMap((row, index) => splitRows.get(index + 1) || [row]);
  if (flattened.length > 30) throw new Error('La propuesta no puede superar 30 movimientos');
  return { rows: flattened, changed: [...changed].sort((a, b) => a - b), rules: [...rules].map(([merchant, categoryId]) => ({ merchant, categoryId })), categories: nextCategories, createdCategories };
}

module.exports = { applyCorrections, mentionedRows };
