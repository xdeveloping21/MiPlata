function isSavedAdjustmentRequest(input) {
  return /(?:registr[eé]|guard[eé]|cargu[eé]|anot[eé]|\bya\s+(?:registr|guard|carg)|\bayer\b)/i.test(input)
    && /(?:descont|rest|quit|sac|divid|repart|separ)/i.test(input);
}

function buildSavedAdjustment({ message, choice, transactions, categories }) {
  const source = transactions.find((item) => item.id === choice?.sourceId);
  if (!source || source.kind !== 'expense' || ['savings', 'savings-return'].includes(source.categoryId)) throw new Error('No encontré un gasto guardado único para corregir');
  const mentionedAmounts = [...String(message).matchAll(/(?:^|\D)(\d[\d.,]*)(?=\D|$)/g)].map((match) => Number(match[1].replace(/\D/g, '')));
  if (!mentionedAmounts.includes(source.amount)) throw new Error('Indica el importe original del gasto guardado para evitar cambiar otro movimiento');
  const portion = Math.round(Number(choice.portionAmount));
  if (!Number.isSafeInteger(portion) || portion <= 0 || portion >= source.amount) throw new Error('El importe a descontar debe ser menor que el gasto original');
  const category = categories.find((item) => item.id === choice.categoryId && item.kind === 'expense' && !['savings', 'savings-return'].includes(item.id));
  const title = String(choice.title || '').trim();
  if (!category || !title || title.length > 80) throw new Error('Falta la categoría o el nombre de la parte nueva');
  const group = source.id;
  const time = String(source.note || '').match(/Hora:\s*([01]\d|2[0-3]):[0-5]\d/)?.[0].slice(6) || null;
  return [
    { title: source.title, kind: 'expense', amount: source.amount - portion, currency: 'CLP', date: source.date, time, categoryId: source.categoryId, include: true, reason: '', adjustmentGroup: group, sourceTransactionId: source.id,
      sourceOriginal: { amount: source.amount, title: source.title, categoryId: source.categoryId, date: source.date, kind: source.kind } },
    { title, kind: 'expense', amount: portion, currency: 'CLP', date: source.date, time: null, categoryId: category.id, include: true, reason: '', adjustmentGroup: group }
  ];
}

module.exports = { isSavedAdjustmentRequest, buildSavedAdjustment };
