const { Client, Events, GatewayIntentBits } = require('discord.js');
const { extractBatch, interpretCorrections, interpretSavedAdjustment } = require('./discord-ai.cjs');
const { applyCorrections } = require('./discord-corrections.cjs');
const { isSavedAdjustmentRequest, buildSavedAdjustment } = require('./discord-saved-adjustment.cjs');

function formatAmount(amount) { return '$' + Number(amount).toLocaleString('es-CL'); }

function todayInChile() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

function isNewMovementMessage(input) {
  if (isCategoryRequest(input) || /(?:^|\W)(?:divid[eií]|dividir|repart[eií]|repartir|separ[aá]|separar)(?:\W|$)/i.test(input)) return false;
  if (/^(?:ignora|ignor[aá]|omit[eií]|inclu[ií]|incluye|fila\s*\d+|(?:el|la)\s+\d+\s+(?:va|es|pon|cambi))/i.test(input)) return false;
  if (/\b(?:pon[eé]?|cambi[aá]|correg[ií]|corrige|va en)\b/i.test(input)) return false;
  return /(?:\$|\bCLP\b|\bUSD\b)\s*\d|\b\d{2,}(?:[.,]\d+)*\b/i.test(input) || /^(?:nuevo\s+(?:gasto|ingreso|movimiento)|(?:tambi[eé]n\s+)?(?:cre[aá]|agreg[aá]|registr[aá]|carg[aá])\b)/i.test(input);
}

function isCategoryRequest(input) {
  return /(?:^|\W)(?:cre[aá]|cre[aá]me|crear|hac[eé]|haz|hazme|agreg[aá]|agregar|nueva?)(?:\W|$).{0,45}\bcategor[ií]a\b|\bcategor[ií]a\b.{0,45}(?:^|\W)(?:cre[aá]|cre[aá]me|crear|hac[eé]|haz|hazme|agreg[aá]|agregar|nueva?)(?:\W|$)/i.test(input);
}

function isCorrectionMessage(input, pending) {
  if (!pending?.rows.length) return false;
  if (isCategoryRequest(input) || /(?:^|\W)(?:divid[eií]|dividir|repart[eií]|repartir|separ[aá]|separar)(?:\W|$)/i.test(input)) return true;
  if (/^\s*(?:(?:fila|el|la)\s+)?\d{1,2}\s+[a-záéíóú]/i.test(input)) return true;
  return !isNewMovementMessage(input);
}

function preview(batch, categories) {
  const names = new Map(categories.map((item) => [item.id, item.name]));
  const lines = batch.rows.map((row, index) => {
    const mark = row.include ? '✅' : '⏸️';
    const value = Number.isFinite(row.amount) ? row.currency === 'USD' ? 'US$' + row.amount : formatAmount(row.amount) : 'importe ilegible';
    const category = names.get(row.categoryId) || 'Sin categoría';
    const origin = row.sourceTransactionId ? ' · editar existente' : row.adjustmentGroup ? ' · parte nueva' : '';
    return `${mark} ${index + 1}. ${row.title} · ${value} · ${category}${origin}${row.include ? '' : ' (' + (row.reason || 'revisar') + ')'}`;
  });
  const ready = batch.rows.filter((row) => row.include).length;
  const savedAdjustment = batch.rows.some((row) => row.adjustmentGroup);
  return ['**Propuesta de MisGastos**', ...(lines.length ? lines : ['No encontré movimientos legibles. Prueba otra captura o escríbelos en un mensaje.']), '',
    ready ? savedAdjustment ? 'Escribe **guardar** para actualizar el gasto existente y agregar la parte nueva. También puedes escribir **cancelar**.' : `Escribe **guardar** para cargar ${ready} movimiento${ready === 1 ? '' : 's'}. Puedes corregir varias filas juntas: "1 Ropa y nombre Costurera, 2 Comida, ignora 3".` : 'No hay movimientos listos para guardar. Puedes corregir una o varias filas, o cancelar.'].join('\n').slice(0, 1900);
}

async function downloadImage(attachment) {
  const url = new URL(attachment.url);
  if (url.hostname !== 'cdn.discordapp.com' && url.hostname !== 'media.discordapp.net') throw new Error('Origen de imagen no permitido');
  if (attachment.size > 8_000_000) throw new Error('La captura supera 8 MB');
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
  if (!response.ok) throw new Error('No se pudo descargar la captura');
  const mime = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw new Error('Manda una imagen PNG, JPG o WebP');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 8_000_000) throw new Error('La captura supera 8 MB');
    chunks.push(chunk);
  }
  return { bytes: Buffer.concat(chunks), mime };
}

function createDiscordBot(store, config, onStatus = () => {}) {
  let client = null;
  let status = 'desconectado';
  let detail = '';
  let generation = 0;
  let processing = Promise.resolve();

  function info() { return config.publicSettings(status, detail); }
  function setStatus(next, message = '') {
    status = next;
    detail = String(message).slice(0, 150);
    try { onStatus(status, detail); } catch (_) { /* El diagnóstico no debe interrumpir Discord. */ }
  }

  async function recentHistory(message) {
    try {
      const recent = await message.channel.messages.fetch({ before: message.id, limit: 8 });
      return [...recent.values()].reverse().filter((item) => item.author.bot || item.author.id === message.author.id)
        .map((item) => ({ from: item.author.bot ? 'MisGastos' : 'Usuario', text: String(item.content || '').slice(0, 700) }));
    } catch (_) { return []; }
  }

  async function handlePlan(message, input, pending) {
    const state = store.getState();
    const categories = state.data.categories;
    const interpretation = await interpretCorrections({ message: input, batch: pending || { rows: [] }, categories, history: await recentHistory(message) });
    if (interpretation.clarification || !interpretation.edits.length) {
      await message.reply({ content: interpretation.clarification || 'No entendí qué cambiar. Dime la fila, el nombre de la categoría o cómo dividir el importe.', allowedMentions: { parse: [] } });
      return;
    }
    const result = applyCorrections({ message: input, rows: pending?.rows || [], categories, edits: interpretation.edits });
    store.applyDiscordPlan(pending?.id || null, result, state.revision);
    const created = result.createdCategories.length ? 'Creé ' + result.createdCategories.map((item) => `**${item.name}** (${item.kind === 'income' ? 'ingresos' : 'gastos'})`).join(', ') + '.\n' : '';
    const learned = result.rules.length ? 'Aprendí ' + result.rules.map((rule) => `${rule.merchant} en ${result.categories.find((item) => item.id === rule.categoryId).name}`).join(', ') + '.\n' : '';
    const changed = result.changed.length ? `Actualicé ${result.changed.length === 1 ? 'la fila' : 'las filas'} ${result.changed.join(', ')}.\n` : '';
    const content = pending ? created + changed + learned + preview({ ...pending, rows: result.rows }, result.categories)
      : created + learned || 'Esa categoría ya existía.';
    await message.reply({ content: content.slice(0, 1900), allowedMentions: { parse: [] } });
  }

  async function handleSavedAdjustment(message, input, pending) {
    const state = store.getState().data;
    const choice = await interpretSavedAdjustment({ message: input, transactions: state.transactions, categories: state.categories, today: todayInChile(), history: await recentHistory(message) });
    if (choice.clarification || !choice.sourceId) {
      await message.reply({ content: String(choice.clarification || '¿Cuál gasto guardado quieres corregir? Indica su importe original.').slice(0, 1900), allowedMentions: { parse: [] } });
      return;
    }
    const rows = buildSavedAdjustment({ message: input, choice, transactions: state.transactions, categories: state.categories });
    if (pending) store.updateBatch(pending.id, pending.rows, 'cancelled');
    const batch = store.saveBatch({ id: message.id, channelId: message.channelId, authorId: message.author.id, rows });
    await message.reply({ content: ('Voy a corregir el gasto ya guardado y crear una parte nueva. El total sigue siendo ' + formatAmount(rows[0].amount + rows[1].amount) + '.\n' + preview(batch, state.categories)).slice(0, 1900), allowedMentions: { parse: [] } });
  }

  async function processMessage(message, credentials) {
    if (message.author.bot || message.channelId !== credentials.channelId || !message.guild) return;
    if (store.hasSeenDiscordMessage(message.id)) return;
    const guild = message.guild.ownerId ? message.guild : await message.guild.fetch();
    if (message.author.id !== guild.ownerId) return;
    const attachments = [...message.attachments.values()].filter((item) => /^image\/(png|jpeg|webp)$/.test(item.contentType || '') || /\.(png|jpe?g|webp)$/i.test(item.name || '')).slice(0, 4);
    const input = message.content.trim();
    let pending = store.latestPendingBatch(message.channelId, message.author.id);

    try {
      if (pending && !pending.rows.length) {
        store.updateBatch(pending.id, pending.rows, 'cancelled');
        pending = null;
      }
      if (!pending && !attachments.length && /^(guardar|confirmar|listo|sí|si|cancelar|descartar|olvidar|mostrar|ver propuesta)$/i.test(input)) {
        await message.reply({ content: 'No hay una propuesta pendiente. Manda una captura o un gasto primero.', allowedMentions: { parse: [] } });
      } else if (!attachments.length && /^(?:ayuda|a\s+q(?:u[eé])?\s+te\s+refer[ií]s|refieres|qu[eé]\s+quer[eé]s|quieres\s+decir)\??$/i.test(input)) {
        await message.reply({ content: 'Primero te muestro una propuesta; no guardo movimientos hasta que escribas **guardar**. Puedes mandar una captura o un gasto como `Cuotas Mercado Pago $53.349 en Credito`. También puedes corregir varias filas, crear categorías o dividir un gasto: `divide 1 en $600 para Mascotas y el resto en Comida`. Escribe **cancelar** para descartar la propuesta.', allowedMentions: { parse: [] } });
      } else if (!pending && !attachments.length && (/^(record[aá]|recuerda|aprend[eé]|aprende|acordate|acu[eé]rdate)/i.test(input) || isCategoryRequest(input))) {
        await handlePlan(message, input, null);
      } else if (pending && !attachments.length && /^(mostrar|ver propuesta)$/i.test(input)) {
        await message.reply({ content: preview(pending, store.getState().data.categories), allowedMentions: { parse: [] } });
      } else if (pending && !attachments.length && /^(guardar|confirmar|listo|sí|si)$/i.test(input)) {
        const count = store.commitBatch(pending.id);
        const updated = pending.rows.filter((row) => row.include && row.sourceTransactionId).length;
        const result = updated ? `Listo. Corregí ${updated} movimiento${updated === 1 ? '' : 's'} guardado${updated === 1 ? '' : 's'} y agregué ${count - updated} parte${count - updated === 1 ? '' : 's'} nueva${count - updated === 1 ? '' : 's'}.` : count ? `Listo. Guardé ${count} movimiento${count === 1 ? '' : 's'} en MisGastos.` : 'No había movimientos listos para guardar.';
        await message.reply({ content: result, allowedMentions: { parse: [] } });
      } else if (pending && !attachments.length && /^(cancelar|descartar|olvidar)$/i.test(input)) {
        store.updateBatch(pending.id, pending.rows, 'cancelled');
        await message.reply({ content: 'Descarté la propuesta. No cargué movimientos.', allowedMentions: { parse: [] } });
      } else if (!attachments.length && isSavedAdjustmentRequest(input)) {
        await handleSavedAdjustment(message, input, pending);
      } else if (!attachments.length && isCorrectionMessage(input, pending)) {
        await handlePlan(message, input, pending);
      } else if (attachments.length || isNewMovementMessage(input)) {
        const images = await Promise.all(attachments.map(downloadImage));
        const state = store.getState().data;
        const referenceRows = !images.length && /\b(?:el de|la fila|el\s+\d+|era el|ya est[aá] guardado|captura anterior)\b/i.test(input)
          ? store.latestUsefulBatch(message.channelId, message.author.id)?.rows || [] : [];
        const rows = await extractBatch({ images, caption: input, categories: state.categories, rules: store.merchantRules(), existing: state.transactions, today: todayInChile(), referenceRows });
        if (!rows.length) {
          await message.reply({ content: 'No encontré un movimiento concreto para proponer. Si hablas de una captura anterior, dime el comercio y el importe, por ejemplo: `Cuotas Mercado Pago $53.349 en Credito`. No guardé nada.', allowedMentions: { parse: [] } });
        } else {
          if (pending) store.updateBatch(pending.id, pending.rows, 'cancelled');
          const batch = store.saveBatch({ id: message.id, channelId: message.channelId, authorId: message.author.id, rows });
          await message.reply({ content: preview(batch, state.categories), allowedMentions: { parse: [] } });
        }
      } else if (input) {
        await message.reply({ content: 'No hay una propuesta para corregir. Manda una captura o escribe un gasto con importe, por ejemplo: `Cuotas Mercado Pago $53.349 en Credito`. No guardé nada.', allowedMentions: { parse: [] } });
      } else return;
      store.markDiscordMessageSeen(message.id);
    } catch (error) {
      console.error('Discord processing error:', error);
      await message.reply({ content: 'No pude procesarlo: ' + String(error.message || 'error inesperado').slice(0, 180), allowedMentions: { parse: [] } }).catch(() => {});
      store.markDiscordMessageSeen(message.id);
    }
  }

  async function start() {
    const current = ++generation;
    if (client) { client.destroy(); client = null; }
    const credentials = config.credentials();
    if (!credentials.enabled) { setStatus('desconectado'); return; }
    if (!credentials.botToken || !credentials.channelId) { setStatus('error', 'Falta completar la configuración'); return; }
    const nextClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
    client = nextClient;
    setStatus('conectando');
    nextClient.on(Events.MessageCreate, (message) => {
      processing = processing.then(() => processMessage(message, credentials)).catch((error) => console.error('Discord queue error:', error));
    });
    nextClient.on(Events.Error, (error) => { console.error('Discord connection error:', error); setStatus('error', error.message); });
    nextClient.once(Events.ClientReady, async () => {
      if (current !== generation) return;
      setStatus('conectado', nextClient.user.tag);
      try {
        const channel = await nextClient.channels.fetch(credentials.channelId);
        if (!channel?.isTextBased() || !channel.messages) throw new Error('El bot no puede leer el canal configurado');
        const recent = await channel.messages.fetch({ limit: 100 });
        for (const message of [...recent.values()].reverse()) {
          processing = processing.then(() => processMessage(message, credentials)).catch((error) => console.error('Discord history error:', error));
        }
      } catch (error) { setStatus('error', error.message); }
    });
    try { await nextClient.login(credentials.botToken); }
    catch (error) {
      if (current === generation) { setStatus('error', error.message); nextClient.destroy(); client = null; }
    }
  }

  function stop() { generation++; if (client) client.destroy(); client = null; setStatus('desconectado'); }
  return { start, stop, info };
}

module.exports = { createDiscordBot, preview, downloadImage, isNewMovementMessage, isCorrectionMessage, isCategoryRequest };
