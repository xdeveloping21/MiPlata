const STORAGE_KEY = 'miplata-prototype-v2';
const SAMPLE_MONTH = '2026-09';
const QR_CODE = 'A7F3K9M2';
const LIVE = Boolean(window.MISGASTOS_LIVE);
const DESKTOP = Boolean(window.MISGASTOS_DESKTOP);
// Nombre de la persona dueña de este celular cuando no es el dueño de la PC o del servidor.
const PERSON_NAME = typeof window.MIPLATA_PERSON === 'string' ? window.MIPLATA_PERSON : '';
const SAVINGS_CURRENCIES = [
  { code: 'CLP', name: 'Pesos chilenos', short: 'Pesos' },
  { code: 'USD', name: 'Dólares estadounidenses', short: 'Dólares' }
];
const LEGACY_EUR = { code: 'EUR', name: 'Euros', short: 'Euros' };

const sampleData = {
  openingBalance: 300000,
  theme: 'light',
  linked: false,
  categories: [
    { id: 'housing', name: 'Vivienda', kind: 'expense', tone: 'lavender', icon: 'home' },
    { id: 'food', name: 'Alimentación', kind: 'expense', tone: 'coral', icon: 'basket' },
    { id: 'services', name: 'Servicios', kind: 'expense', tone: 'sky', icon: 'bolt' },
    { id: 'transport', name: 'Transporte', kind: 'expense', tone: 'mint', icon: 'bus' },
    { id: 'health', name: 'Salud', kind: 'expense', tone: 'rose', icon: 'heart' },
    { id: 'dining', name: 'Restaurantes', kind: 'expense', tone: 'peach', icon: 'utensils' },
    { id: 'savings', name: 'Ahorro', kind: 'expense', tone: 'lavender', icon: 'savings' },
    { id: 'salary', name: 'Salario', kind: 'income', tone: 'mint', icon: 'briefcase' },
    { id: 'other-income', name: 'Otros ingresos', kind: 'income', tone: 'sky', icon: 'sparkles' },
    { id: 'savings-return', name: 'Retiro de ahorro', kind: 'income', tone: 'mint', icon: 'savings' }
  ],
  transactions: [
    { id: 't1', kind: 'expense', amount: 280000, title: 'Alquiler', categoryId: 'housing', date: '2026-09-03' },
    { id: 't2', kind: 'income', amount: 1600000, title: 'Salario', categoryId: 'salary', date: '2026-09-05' },
    { id: 't3', kind: 'expense', amount: 92300, title: 'Supermercado Disco', categoryId: 'food', date: '2026-09-11' },
    { id: 't4', kind: 'expense', amount: 46200, title: 'Transporte SUBE', categoryId: 'transport', date: '2026-09-15' },
    { id: 't5', kind: 'expense', amount: 38500, title: 'Restaurante La Parada', categoryId: 'dining', date: '2026-09-19' },
    { id: 't6', kind: 'expense', amount: 68500, title: 'Internet y servicios', categoryId: 'services', date: '2026-09-23' },
    { id: 't7', kind: 'expense', amount: 40000, title: 'Farmacia', categoryId: 'health', date: '2026-09-27' },
    { id: 't8', kind: 'income', amount: 250000, title: 'Venta', categoryId: 'other-income', date: '2026-09-29' },
    { id: 't9', kind: 'expense', amount: 150000, title: 'Fondo de emergencia', categoryId: 'savings', date: '2026-07-18' },
    { id: 't10', kind: 'expense', amount: 150000, title: 'Ahorro en dólares', categoryId: 'savings', date: '2026-08-14', savingsCurrency: 'USD', savingsAmount: 100 }
  ]
};

const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  chart: '<path d="M4 19V5M10 19v-8M16 19V3M22 19v-12"/>',
  savings: '<path d="M5 8h14a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a2 2 0 0 1 2-2zM7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3M12 12v5m-2.5-2.5h5"/>',
  categories: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrowUp: '<path d="m7 14 5-5 5 5"/>',
  arrowDown: '<path d="m7 10 5 5 5-5"/>',
  arrowRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  user: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM20 14v3h-3M14 20h3M20 20h1"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a3 3 0 0 1-3-3"/><path d="M22 12h-6a2 2 0 0 0 0 4h6"/>',
  basket: '<path d="m4 10 2 10h12l2-10zM8 10l4-7 4 7M3 10h18M9 14v3m6-3v3"/>',
  bus: '<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19v2m8-2v2M8 15h.01M16 15h.01"/>',
  heart: '<path d="M20.8 8.4c0 4.6-8.8 10.9-8.8 10.9S3.2 13 3.2 8.4a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3z"/>',
  utensils: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M18 21V3c-3 2-4 5-4 9h4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  sparkles: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 18l.5 1.5L21 20l-1.5.5L19 22l-.5-1.5L17 20l1.5-.5z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M4 7h16M10 3h4m-8 4 1 14h10l1-14M10 11v6m4-6v6"/>',
  edit: '<path d="m4 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11zM14.5 7.5l3 3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 6M3 4v7h7"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'
};

function icon(name, size) {
  return '<svg class="icon" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (iconPaths[name] || CATEGORY_ICON_CATALOG[name]?.svg || iconPaths.info) + '</svg>';
}

const PRESET_TONES = ['lavender', 'coral', 'mint', 'sky', 'rose', 'peach'];
const TONE_LABELS = { lavender: 'Verde', coral: 'Coral', mint: 'Menta', sky: 'Celeste', rose: 'Rosa', peach: 'Durazno' };

function isCustomTone(tone) { return typeof tone === 'string' && /^#[0-9a-f]{6}$/i.test(tone); }

function toneClass(tone) {
  return isCustomTone(tone) ? 'tone-custom' : 'tone-' + (PRESET_TONES.includes(tone) || tone === 'muted' ? tone : 'lavender');
}

function toneColor(tone) {
  return isCustomTone(tone) ? tone : 'var(--tone-' + (PRESET_TONES.includes(tone) || tone === 'muted' ? tone : 'lavender') + ')';
}

function toneStyle(tone) {
  if (!isCustomTone(tone)) return '';
  const parts = [1, 3, 5].map(function (index) { return parseInt(tone.slice(index, index + 2), 16); });
  const luminance = parts[0] * .2126 + parts[1] * .7152 + parts[2] * .0722;
  const dark = data.theme === 'dark';
  const ink = (dark && luminance < 130) || (!dark && luminance > 175)
    ? parts.map(function (value) { return Math.round(value * .42 + (dark ? 255 : 0) * .58); })
    : parts;
  return ' style="--category-color:' + tone + ';--category-wash:rgba(' + parts.join(',') + ',.18);--category-ink:rgb(' + ink.join(',') + ')"';
}

function freshData() {
  const copy = JSON.parse(JSON.stringify(sampleData));
  if (LIVE) { copy.openingBalance = 0; copy.transactions = []; copy.linked = false; }
  return copy;
}

function loadData() {
  if (LIVE) return freshData();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.transactions) && Array.isArray(saved.categories)) {
      const matchesExample = function (count) { return saved.transactions.length === count && sampleData.transactions.slice(0, count).every(function (expected) {
        return saved.transactions.some(function (entry) { return entry.id === expected.id && entry.kind === expected.kind && entry.amount === expected.amount && entry.title === expected.title && entry.categoryId === expected.categoryId && entry.date === expected.date; });
      }); };
      if (saved.openingBalance === 0 && matchesExample(8)) {
        saved.openingBalance = sampleData.openingBalance;
        saved.transactions.push({ ...sampleData.transactions[8] }, { ...sampleData.transactions[9] });
      } else if (saved.openingBalance === 150000 && matchesExample(9)) {
        saved.openingBalance = sampleData.openingBalance;
        saved.transactions.push({ ...sampleData.transactions[9] });
      }
      sampleData.categories.filter(function (category) { return category.id === 'savings' || category.id === 'savings-return'; }).forEach(function (category) {
        if (!saved.categories.some(function (entry) { return entry.id === category.id; })) saved.categories.push({ ...category });
      });
      return saved;
    }
  } catch (error) {
    console.warn('No se pudo cargar la demostración', error);
  }
  return freshData();
}

let data = loadData();
let route = 'home';
let selectedMonth = LIVE ? todayDate().slice(0, 7) : SAMPLE_MONTH;
let annualYear = LIVE ? new Date().getFullYear() : 2026;
let filter = 'all';
let query = '';
let categoryKind = 'expense';
let selectedCategoryId = null;
let conceptFilter = null;
let modal = null;
let pairingStep = 'start';
let toastTimer = null;
let stateRevision = 0;
let saveQueue = Promise.resolve();
let savesPending = 0;
let saveGeneration = 0;
let desktopInfo = { networks: [], devices: [], people: [], pending: [], backupDir: '' };
let pairingInfo = null;
let selectedNetwork = '';
let pairPerson = 'owner';
let restoreCandidate = null;
let filtersOpen = false;
let rangeFrom = '';
let rangeTo = '';
let amountMin = '';
let amountMax = '';

function saveData() {
  if (LIVE) {
    const snapshot = JSON.parse(JSON.stringify(data));
    const generation = saveGeneration;
    savesPending++;
    saveQueue = saveQueue.then(async function () {
      if (generation !== saveGeneration) return;
      const response = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: stateRevision, data: snapshot }) });
      const result = await response.json();
      if (response.status === 409) {
        saveGeneration++;
        stateRevision = result.revision;
        data = result.data;
        render();
        toast('Otro dispositivo cambió los datos. Vuelve a intentar tu cambio.');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'No se pudieron guardar los datos');
      stateRevision = result.revision;
    }).catch(async function (error) {
      saveGeneration++;
      console.error(error);
      try {
        const response = await fetch('/api/state', { cache: 'no-store' });
        if (response.ok) { const saved = await response.json(); stateRevision = saved.revision; data = saved.data; render(); }
      } catch (ignored) { console.warn('No se pudo recuperar el estado guardado', ignored); }
      toast('No se pudo guardar: ' + error.message);
    }).finally(function () { savesPending--; });
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function money(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(amount).replace(/\u00a0/g, ' ');
}

// Montos en campos de texto: se muestran con punto de miles (10000 -> 10.000) y coma decimal.
function formatAmountValue(amount) {
  return Number.isFinite(Number(amount)) && amount !== '' ? Number(amount).toLocaleString('es-CL', { maximumFractionDigits: 2 }) : '';
}

function formatAmountText(text, allowDecimals, allowNegative) {
  const value = String(text || '');
  const negative = allowNegative && /^\s*-/.test(value);
  const parts = value.split(',');
  const whole = parts[0].replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  let result = (negative ? '-' : '') + whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (allowDecimals && parts.length > 1) result += ',' + parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
  return result;
}

// Devuelve NaN si el texto no es un monto bien escrito, para que el formulario lo rechace.
function parseAmountText(text) {
  const clean = String(text || '').trim();
  if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(clean)) return NaN;
  return Number(clean.replace(/\./g, '').replace(',', '.'));
}

function reformatAmountInput(input) {
  const before = input.value;
  const caret = input.selectionStart ?? before.length;
  const digitsBeforeCaret = before.slice(0, caret).replace(/[^\d,-]/g, '').length;
  const after = formatAmountText(before, 'amountDecimals' in input.dataset, 'amountNegative' in input.dataset);
  if (after === before) return;
  input.value = after;
  let position = 0;
  for (let seen = 0; position < after.length && seen < digitsBeforeCaret; position++) {
    if (/[\d,-]/.test(after[position])) seen++;
  }
  input.setSelectionRange(position, position);
}

function shortMoney(amount) {
  if (amount >= 1000000) return '$ ' + (amount / 1000000).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M';
  if (amount >= 1000) return '$ ' + Math.round(amount / 1000).toLocaleString('es-CL') + ' mil';
  return money(amount);
}

function prettyDate(date) {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date + 'T12:00:00'));
}

function numericDate(date) {
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date + 'T12:00:00'));
}

function monthLabel(month) {
  const date = new Date(month + '-01T12:00:00');
  const label = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Fecha de hoy según el reloj del equipo (no UTC), en formato AAAA-MM-DD.
function todayDate() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

// Fecha sugerida para un movimiento nuevo: hoy si se está viendo el mes actual; si no, el último día del mes elegido.
function defaultEntryDate() {
  const today = todayDate();
  return selectedMonth === today.slice(0, 7) ? today : lastDateOfMonth(selectedMonth);
}

function lastDateOfMonth(month) {
  const parts = month.split('-').map(Number);
  const day = new Date(parts[0], parts[1], 0).getDate();
  return month + '-' + String(day).padStart(2, '0');
}

function categoryById(id) {
  return data.categories.find(function (category) { return category.id === id; }) || null;
}

function conceptKey(title) {
  return String(title || '').trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL');
}

function conceptGroups(categoryId, items) {
  const groups = new Map();
  (items || sortedTransactions()).filter(function (item) { return item.categoryId === categoryId; }).forEach(function (item) {
    const key = conceptKey(item.title);
    const current = groups.get(key) || { key: key, title: item.title, count: 0, total: 0, lastDate: item.date };
    current.count++;
    current.total += item.amount;
    if (item.date > current.lastDate) { current.title = item.title; current.lastDate = item.date; }
    groups.set(key, current);
  });
  return Array.from(groups.values());
}

function matchingConcepts(categoryId, query) {
  const key = conceptKey(query);
  if (key.length < 2 || !categoryId) return [];
  return conceptGroups(categoryId).filter(function (group) { return group.key.includes(key); })
    .sort(function (a, b) {
      return Number(b.key.startsWith(key)) - Number(a.key.startsWith(key)) || b.count - a.count || b.lastDate.localeCompare(a.lastDate);
    }).slice(0, 5);
}

function sortedTransactions() {
  return data.transactions.map(function (item, index) {
    const time = /^Hora:\s*([01]\d|2[0-3]):([0-5]\d)(?:\s|$)/.exec(item.note || '');
    return { item: item, index: index, time: time ? Number(time[1]) * 60 + Number(time[2]) : -1 };
  })
    .sort(function (a, b) {
      const aRegistered = Boolean(a.item.createdAt);
      const bRegistered = Boolean(b.item.createdAt);
      return Number(bRegistered) - Number(aRegistered) ||
        (aRegistered ? b.item.createdAt.localeCompare(a.item.createdAt) : 0) ||
        b.item.date.localeCompare(a.item.date) || b.time - a.time || a.index - b.index;
    })
    .map(function (entry) { return entry.item; });
}

function selectedTransactions() {
  return sortedTransactions().filter(function (item) { return item.date.startsWith(selectedMonth); });
}

function yearTransactions(year) {
  return sortedTransactions().filter(function (item) { return item.date.startsWith(String(year) + '-'); });
}

function savingsTransactions() {
  return sortedTransactions().filter(function (item) { return item.categoryId === 'savings' || item.categoryId === 'savings-return'; });
}

function isSavingsEntry(item) {
  return item.categoryId === 'savings' || item.categoryId === 'savings-return';
}

function savingsCurrency(item) {
  return item.savingsCurrency === 'EUR' || item.savingsCurrency === 'USD' ? item.savingsCurrency : 'CLP';
}

function savingsUnits(item) {
  return Number.isFinite(item.savingsAmount) && item.savingsAmount > 0 ? item.savingsAmount : item.amount;
}

function savingsBalances(items) {
  const balances = { CLP: 0, USD: 0, EUR: 0 };
  (items || savingsTransactions()).forEach(function (item) {
    if (!isSavingsEntry(item)) return;
    const currency = savingsCurrency(item);
    balances[currency] += (item.categoryId === 'savings' ? 1 : -1) * savingsUnits(item);
  });
  return balances;
}

function formatSavings(currency, amount) {
  const symbol = currency === 'USD' ? 'US$' : currency === 'EUR' ? '€' : '$';
  const value = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.abs(amount));
  return (amount < 0 ? '- ' : '') + symbol + ' ' + value;
}

function savingsBalancesValid(items) {
  return Object.values(savingsBalances(items)).every(function (amount) { return amount >= -0.00001; });
}

function totals() {
  const all = data.transactions.reduce(function (sum, item) {
    return sum + (item.kind === 'income' ? item.amount : -item.amount);
  }, data.openingBalance);
  const month = selectedTransactions().reduce(function (sum, item) {
    sum[item.kind] += item.amount;
    return sum;
  }, { income: 0, expense: 0 });
  return { balance: all, income: month.income, expense: month.expense };
}

function customSelect(id, label, name, value, choices, className) {
  const selected = choices.find(function (choice) { return choice.value === value; }) || choices[0];
  const selectedContent = selected ? (selected.leading || '') + '<span>' + escapeHtml(selected.label) + '</span>' : '<span>Elige una opción</span>';
  return '<div class="custom-select ' + (className || '') + '" data-dropdown="' + id + '">' +
    (className === 'form-dropdown' ? '<span class="field-label" id="' + id + '-label">' + escapeHtml(label) + '</span>' : '') +
    (name ? '<input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(selected ? selected.value : '') + '" />' : '') +
    '<button class="dropdown-trigger" type="button" data-dropdown-trigger aria-label="' + escapeHtml(label) + '" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '-menu"><span class="dropdown-value">' + selectedContent + '</span>' + icon('arrowDown', 16) + '</button>' +
    '<div class="dropdown-menu" id="' + id + '-menu" role="listbox" aria-label="' + escapeHtml(label) + '">' +
      choices.map(function (choice) { return '<button class="dropdown-option" type="button" role="option" data-dropdown-option data-value="' + escapeHtml(choice.value) + '" aria-selected="' + (selected && selected.value === choice.value ? 'true' : 'false') + '"><span class="dropdown-option-content">' + (choice.leading || '') + '<span>' + escapeHtml(choice.label) + '</span></span>' + icon('check', 16) + '</button>'; }).join('') +
    '</div></div>';
}

function periodYearMarkup(year) {
  const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return '<div class="period-year"><button class="calendar-nav" type="button" data-period-year-shift="-1" aria-label="Año anterior">' + icon('chevronLeft', 17) + '</button><strong>' + year + '</strong><button class="calendar-nav" type="button" data-period-year-shift="1" aria-label="Año siguiente">' + icon('arrowRight', 17) + '</button></div>' +
    '<div class="period-months">' + labels.map(function (label, index) {
      const month = year + '-' + String(index + 1).padStart(2, '0');
      const hasData = data.transactions.some(function (item) { return item.date.startsWith(month); });
      return '<button class="period-month' + (hasData ? ' has-data' : '') + '" type="button" data-period-month="' + month + '" aria-label="' + escapeHtml(monthLabel(month)) + '" aria-pressed="' + String(month === selectedMonth) + '">' + label + '</button>';
    }).join('') + '</div><p class="period-hint">El punto indica un mes con movimientos.</p>';
}

function periodPicker(withArrows) {
  const year = Number(selectedMonth.slice(0, 4));
  return '<div class="period-picker" data-period-picker data-view-year="' + year + '">' +
    (withArrows ? '<button class="period-step" type="button" data-period-shift="-1" aria-label="Mes anterior">' + icon('chevronLeft', 17) + '</button>' : '') +
    '<button class="period-trigger" type="button" data-period-trigger aria-label="Elegir mes y año" aria-haspopup="dialog" aria-expanded="false" aria-controls="period-popover">' + icon('calendar', 16) + '<span>' + escapeHtml(monthLabel(selectedMonth)) + '</span>' + icon('arrowDown', 15) + '</button>' +
    (withArrows ? '<button class="period-step" type="button" data-period-shift="1" aria-label="Mes siguiente">' + icon('arrowRight', 17) + '</button>' : '') +
    '<div class="period-popover" id="period-popover" role="dialog" aria-label="Elegir mes y año">' + periodYearMarkup(year) + '</div></div>';
}

function shiftSelectedMonth(amount) {
  const parts = selectedMonth.split('-').map(Number);
  const next = new Date(parts[0], parts[1] - 1 + amount, 1);
  selectedMonth = next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0');
  render();
}

function calendarMarkup(month, selectedDate) {
  const parts = month.split('-').map(Number);
  const firstWeekday = (new Date(parts[0], parts[1] - 1, 1).getDay() + 6) % 7;
  const days = new Date(parts[0], parts[1], 0).getDate();
  const cells = Array(firstWeekday).fill('<span class="calendar-empty"></span>');
  for (let day = 1; day <= days; day += 1) {
    const value = month + '-' + String(day).padStart(2, '0');
    cells.push('<button type="button" class="calendar-day" data-calendar-day="' + value + '" aria-label="' + escapeHtml(prettyDate(value)) + '" aria-pressed="' + String(value === selectedDate) + '">' + day + '</button>');
  }
  return '<div class="calendar-head"><button class="calendar-nav" type="button" data-calendar-shift="-1" aria-label="Mes anterior">' + icon('chevronLeft', 17) + '</button><strong>' + escapeHtml(monthLabel(month)) + '</strong><button class="calendar-nav" type="button" data-calendar-shift="1" aria-label="Mes siguiente">' + icon('arrowRight', 17) + '</button></div>' +
    '<div class="calendar-weekdays"><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span><span>Do</span></div>' +
    '<div class="calendar-grid">' + cells.join('') + '</div>';
}

function datePicker(date) {
  return '<div class="date-picker" data-date-picker data-calendar-month="' + date.slice(0, 7) + '"><span class="field-label" id="date-label">Fecha</span><input type="hidden" name="date" value="' + escapeHtml(date) + '" />' +
    '<button class="date-trigger" type="button" data-date-trigger aria-label="Fecha" aria-haspopup="dialog" aria-expanded="false" aria-controls="date-popover"><span data-date-label>' + escapeHtml(numericDate(date)) + '</span>' + icon('calendar', 18) + '</button>' +
    '<div class="date-popover" id="date-popover" role="dialog" aria-label="Elegir fecha">' + calendarMarkup(date.slice(0, 7), date) + '</div></div>';
}

function categoryIcon(category, size) {
  const cat = category || { tone: 'lavender', icon: 'wallet' };
  return '<span class="category-icon ' + toneClass(cat.tone) + '"' + toneStyle(cat.tone) + '>' + icon(cat.icon, size || 20) + '</span>';
}

function toast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const node = document.createElement('div');
  node.className = 'toast';
  node.setAttribute('role', 'status');
  node.textContent = message;
  document.body.appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { node.remove(); }, 3200);
}

function navItem(id, label, iconName) {
  const active = route === id || (route === 'pair' && id === 'settings') || (route === 'annual' && id === 'home') || (route === 'category-detail' && id === 'categories');
  return '<button class="nav-item' + (active ? ' is-active' : '') + '" data-route="' + id + '" type="button" aria-current="' + (active ? 'page' : 'false') + '">' +
    icon(iconName, 20) + '<span>' + label + '</span></button>';
}

// Barra lateral: presupuesto del mes, meta de ahorro, pagos fijos y estado de la PC.
function dateFromKey(value) { return new Date(value + 'T12:00:00'); }

function daysBetween(from, to) { return Math.round((dateFromKey(to) - dateFromKey(from)) / 86400000); }

function daysInMonth(month) { return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(); }

function nextMonthKey(month) {
  const next = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1);
  return next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0');
}

function budgetSpent(month) {
  return data.transactions.filter(function (item) { return item.kind === 'expense' && item.categoryId !== 'savings' && item.date.startsWith(month); }).reduce(function (sum, item) { return sum + item.amount; }, 0);
}

function savingsGoalProgress() {
  return Math.max(0, data.transactions.reduce(function (sum, item) { return item.categoryId === 'savings' ? sum + item.amount : item.categoryId === 'savings-return' ? sum - item.amount : sum; }, 0));
}

// Un pago fijo se da por pagado en el mes si hay un gasto con el mismo nombre y categoría.
function recurringPaid(entry, month) {
  const key = conceptKey(entry.title);
  return data.transactions.some(function (item) { return item.kind === 'expense' && item.categoryId === entry.categoryId && item.date.startsWith(month) && conceptKey(item.title) === key; });
}

function upcomingPayments() {
  const today = todayDate();
  const month = today.slice(0, 7);
  return (data.recurring || []).map(function (entry) {
    const dueMonth = recurringPaid(entry, month) ? nextMonthKey(month) : month;
    const due = dueMonth + '-' + String(Math.min(entry.day, daysInMonth(dueMonth))).padStart(2, '0');
    return { entry: entry, due: due, days: daysBetween(today, due) };
  }).sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
}

function dueLabel(payment) {
  if (payment.days < -1) return 'Venció hace ' + -payment.days + ' días';
  if (payment.days === -1) return 'Venció ayer';
  if (payment.days === 0) return 'Vence hoy';
  if (payment.days === 1) return 'Mañana';
  if (payment.days <= 7) return 'En ' + payment.days + ' días';
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(dateFromKey(payment.due));
}

function backupLabel(iso) {
  const date = new Date(iso);
  const day = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  const time = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  const ago = daysBetween(day, todayDate());
  return ago === 0 ? 'hoy ' + time : ago === 1 ? 'ayer ' + time : prettyDate(day);
}

function sideStatusMarkup() {
  const devices = ownerDevices();
  const phone = devices.length === 1 ? escapeHtml(devices[0].name || 'Celular') + ' vinculado' : devices.length ? devices.length + ' celulares vinculados' : 'Sin celular vinculado';
  return '<div class="side-status" data-side-status><button type="button" data-action="show-qr"><i class="side-dot' + (devices.length ? '' : ' off') + '"></i>' + phone + '</button>' +
    '<span><i class="side-dot' + (desktopInfo.lastBackup ? '' : ' off') + '"></i>Copia de seguridad: ' + (desktopInfo.lastBackup ? backupLabel(desktopInfo.lastBackup) : 'pendiente') + '</span></div>';
}

function sidebarWidgets() {
  const today = todayDate();
  const month = today.slice(0, 7);
  const monthName = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(dateFromKey(month + '-01')).toUpperCase();
  let html = '<div class="side-widgets"><button class="side-add" type="button" data-action="add-transaction">' + icon('plus', 17) + ' Agregar gasto <kbd>Ctrl+N</kbd></button>';
  if (data.monthlyBudget) {
    const spent = budgetSpent(month);
    const percent = Math.round(spent / data.monthlyBudget * 100);
    const left = data.monthlyBudget - spent;
    const daysLeft = daysInMonth(month) - Number(today.slice(8)) + 1;
    html += '<button class="side-card side-month' + (percent >= 100 ? ' is-over' : percent >= 85 ? ' is-warn' : '') + '" type="button" data-action="edit-budget"><span class="side-eyebrow">PRESUPUESTO DE ' + monthName + '</span><span class="side-month-body"><span class="side-ring" style="--percent:' + Math.min(100, percent) + '%"><span>' + percent + ' %</span></span>' +
      '<span><strong>' + money(Math.abs(left)) + '</strong><small>' + (left >= 0 ? 'te quedan de ' + money(data.monthlyBudget) : 'sobre tu presupuesto') + '</small><small>' + daysLeft + (daysLeft === 1 ? ' día restante' : ' días restantes') + '</small></span></span></button>';
  } else {
    html += '<button class="side-card side-empty" type="button" data-action="edit-budget"><span class="side-eyebrow">PRESUPUESTO</span><span>' + icon('plus', 15) + ' Define cuánto quieres gastar al mes</span></button>';
  }
  if (data.savingsGoal) {
    const saved = savingsGoalProgress();
    const percent = Math.min(100, Math.round(saved / data.savingsGoal.target * 100));
    html += '<button class="side-card side-goal" type="button" data-action="edit-goal"><span class="side-eyebrow">META DE AHORRO</span><strong><span>' + escapeHtml(data.savingsGoal.name) + '</span><span>' + percent + ' %</span></strong><span class="side-track"><i style="width:' + percent + '%"></i></span><small>' + money(saved) + ' de ' + money(data.savingsGoal.target) + '</small></button>';
  } else {
    html += '<button class="side-card side-empty" type="button" data-action="edit-goal"><span class="side-eyebrow">META DE AHORRO</span><span>' + icon('plus', 15) + ' Crea una meta, como unas vacaciones</span></button>';
  }
  const upcoming = upcomingPayments().slice(0, 3);
  if (upcoming.length) {
    html += '<section class="side-card side-upcoming"><span class="side-eyebrow">PRÓXIMOS PAGOS <button class="side-link" type="button" data-action="manage-recurring">Editar</button></span>' + upcoming.map(function (payment) {
      return '<button class="side-up' + (payment.days < 0 ? ' is-late' : payment.days <= 3 ? ' is-soon' : '') + '" type="button" data-pay-recurring="' + escapeHtml(payment.entry.id) + '" title="Registrar este pago">' + categoryIcon(categoryById(payment.entry.categoryId), 14) + '<span><b>' + escapeHtml(payment.entry.title) + '</b><small>' + dueLabel(payment) + '</small></span><em>' + money(payment.entry.amount) + '</em></button>';
    }).join('') + '</section>';
  } else {
    html += '<button class="side-card side-empty" type="button" data-action="manage-recurring"><span class="side-eyebrow">PRÓXIMOS PAGOS</span><span>' + icon('plus', 15) + ' Agrega tus pagos fijos, como el arriendo</span></button>';
  }
  return html + '</div>';
}

function ownerDevices() {
  return (desktopInfo.devices || []).filter(function (device) { return !device.personId || device.personId === 'owner'; });
}

function personById(id) {
  return (desktopInfo.people || []).find(function (person) { return person.id === id; }) || null;
}

function personModal() {
  return sideDialog('PERSONAS', 'Agregar persona', '<form id="person-form" novalidate><p class="savings-form-note">Tendrá sus propios gastos, categorías y ahorros, separados de los tuyos. Después vinculas su celular con un QR.</p>' +
    '<label class="field-label" for="person-name">Nombre</label><input class="text-input" id="person-name" name="name" maxlength="40" autocomplete="off" placeholder="Ejemplo: Camila" required />' +
    '<div class="dialog-actions"><button class="button button-outline" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Agregar persona</button></div></form>');
}

function serverAddress() {
  const networks = desktopInfo.networks || [];
  const chosen = networks.find(function (item) { return item.label.indexOf('Internet') === 0; }) || networks.find(function (item) { return item.label.indexOf('Tailscale') === 0; }) || networks[0];
  return chosen ? chosen.url || 'http://' + chosen.address + ':4174' : 'la dirección de MiPlata';
}

function inviteModal() {
  const days = Math.max(1, Math.round((modal.expiresAt - Date.now()) / 86400000));
  return sideDialog('INVITACIÓN', modal.personId === 'owner' ? 'Tu código de invitación' : 'Código para ' + escapeHtml(modal.personName), '<div class="invite-code">' + escapeHtml(modal.code) + '</div>' +
    '<p class="savings-form-note">Sirve una sola vez y vence en ' + days + (days === 1 ? ' día' : ' días') + '. Compártelo solo con ' + (modal.personId === 'owner' ? 'tus dispositivos' : escapeHtml(modal.personName)) + '.</p>' +
    '<ol class="invite-steps"><li>Abrir <strong>' + escapeHtml(serverAddress()) + '</strong> en el celular' + (serverAddress().indexOf('https://') === 0 ? '' : ', con Tailscale conectado') + '.</li><li>Tocar <strong>¿Tienes un código de invitación?</strong></li><li>Escribir este código y elegir usuario y contraseña.</li></ol>' +
    '<div class="dialog-actions"><button class="button button-outline" type="button" data-action="copy-invite">Copiar código</button><button class="button button-primary" type="button" data-action="close-modal">Listo</button></div>');
}

function passwordModal() {
  const person = modal.personId === 'owner' ? { name: 'ti' } : personById(modal.personId);
  return sideDialog('CUENTA', 'Nueva contraseña', '<form id="password-form" novalidate><p class="savings-form-note">Escribe la nueva contraseña para ' + escapeHtml(person ? person.name : '') + '. Los dispositivos que ya tienen la sesión iniciada seguirán conectados; puedes revocarlos aquí mismo.</p>' +
    '<label class="field-label" for="new-password">Nueva contraseña (mínimo 8 caracteres)</label><input class="text-input" id="new-password" name="password" type="password" autocomplete="new-password" required />' +
    '<label class="field-label" for="new-password-2">Repítela</label><input class="text-input" id="new-password-2" name="password2" type="password" autocomplete="new-password" required />' +
    '<div class="dialog-actions"><button class="button button-outline" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Guardar contraseña</button></div></form>');
}

function sideDialog(eyebrow, title, body) {
  return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-head"><div><p class="eyebrow">' + eyebrow + '</p><h2 id="dialog-title">' + title + '</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' + body + '</div>';
}

function budgetModal() {
  return sideDialog('TU MES', 'Presupuesto mensual', '<form id="budget-form" novalidate><p class="savings-form-note">Cuánto quieres gastar como máximo cada mes. Lo que apartas para ahorros no cuenta como gasto.</p>' +
    '<label class="field-label" for="monthly-budget">Monto mensual</label><div class="amount-input"><span>$</span><input id="monthly-budget" name="budget" type="text" inputmode="numeric" autocomplete="off" data-amount-input value="' + (data.monthlyBudget ? formatAmountValue(data.monthlyBudget) : '') + '" placeholder="0" required /></div>' +
    '<div class="dialog-actions">' + (data.monthlyBudget ? '<button class="button button-danger" type="button" data-action="remove-budget">' + icon('trash', 17) + '<span>Quitar</span></button>' : '') + '<button class="button button-primary" type="submit">Guardar presupuesto</button></div></form>');
}

function goalModal() {
  const goal = data.savingsGoal;
  return sideDialog('TUS AHORROS', 'Meta de ahorro', '<form id="goal-form" novalidate><p class="savings-form-note">El avance se calcula con lo que llevas ahorrado en la sección Ahorros.</p>' +
    '<label class="field-label" for="goal-name">Nombre de la meta</label><input class="text-input" id="goal-name" name="name" maxlength="32" value="' + escapeHtml(goal ? goal.name : '') + '" placeholder="Ejemplo: Vacaciones" required />' +
    '<label class="field-label" for="goal-target">Monto que quieres juntar</label><div class="amount-input"><span>$</span><input id="goal-target" name="target" type="text" inputmode="numeric" autocomplete="off" data-amount-input value="' + (goal ? formatAmountValue(goal.target) : '') + '" placeholder="0" required /></div>' +
    '<div class="dialog-actions">' + (goal ? '<button class="button button-danger" type="button" data-action="remove-goal">' + icon('trash', 17) + '<span>Quitar</span></button>' : '') + '<button class="button button-primary" type="submit">Guardar meta</button></div></form>');
}

function recurringModal() {
  const choices = data.categories.filter(function (category) { return category.kind === 'expense' && category.id !== 'savings'; }).map(function (category) {
    return { value: category.id, label: category.name, leading: '<span class="dropdown-symbol ' + toneClass(category.tone) + '"' + toneStyle(category.tone) + '>' + icon(category.icon, 16) + '</span>' };
  });
  const list = (data.recurring || []).map(function (entry) {
    return '<div class="recurring-row">' + categoryIcon(categoryById(entry.categoryId), 16) + '<span><strong>' + escapeHtml(entry.title) + '</strong><small>Día ' + entry.day + ' de cada mes <span class="detail-separator">·</span> ' + money(entry.amount) + '</small></span><button class="icon-button subtle" type="button" data-delete-recurring="' + escapeHtml(entry.id) + '" aria-label="Eliminar ' + escapeHtml(entry.title) + '">' + icon('trash', 17) + '</button></div>';
  }).join('');
  return sideDialog('TUS CUENTAS', 'Pagos fijos', (list ? '<div class="recurring-list">' + list + '</div>' : '<p class="savings-form-note">Agrega lo que pagas todos los meses. MiPlata te avisará cuándo vence cada uno y lo dará por pagado cuando registres el gasto.</p>') +
    '<form id="recurring-form" novalidate><label class="field-label" for="recurring-title">Nombre</label><input class="text-input" id="recurring-title" name="title" maxlength="80" placeholder="Ejemplo: Internet" required />' +
    '<div class="form-row"><div><label class="field-label" for="recurring-amount">Monto</label><input class="text-input" id="recurring-amount" name="amount" type="text" inputmode="numeric" autocomplete="off" data-amount-input placeholder="$ 0" required /></div>' +
    '<div><label class="field-label" for="recurring-day">Día de pago</label><input class="text-input" id="recurring-day" name="day" type="number" min="1" max="31" inputmode="numeric" placeholder="1 a 31" required /></div></div>' +
    customSelect('recurring-category', 'Categoría', 'category', choices[0] ? choices[0].value : '', choices, 'form-dropdown') +
    '<div class="dialog-actions"><button class="button button-primary" type="submit">' + icon('plus', 17) + ' Agregar pago fijo</button></div></form>');
}

function shell(content) {
  const themeIcon = data.theme === 'light' ? 'moon' : 'sun';
  return (LIVE ? '' : '<div class="prototype-ribbon"><span class="prototype-dot"></span> PROTOTIPO DE DISEÑO <span class="ribbon-separator">|</span> Datos ficticios</div>') +
    '<div class="app-shell">' +
      (LIVE ? '' : '<div class="titlebar"><div class="titlebar-brand"><span class="brand-mark"><img src="assets/miplata-logo.png" alt="" width="28" height="28" style="display:block;width:28px;height:28px;max-width:28px;max-height:28px" /></span><span>MiPlata</span></div><div class="titlebar-label">Vista previa para revisar el diseño</div><div class="window-controls" aria-hidden="true"><span></span><span></span><span></span></div></div>') +
      '<aside class="sidebar"><div class="sidebar-brand"><span class="brand-mark large"><img src="assets/miplata-logo.png" alt="" width="42" height="42" style="display:block;width:42px;height:42px;max-width:42px;max-height:42px" /></span><div><strong>MiPlata</strong><small>' + (PERSON_NAME ? 'Gastos de ' + escapeHtml(PERSON_NAME) : 'Tu dinero, en orden') + '</small></div></div>' +
        '<nav class="side-nav" aria-label="Principal">' +
          navItem('home', 'Inicio', 'home') + navItem('transactions', 'Movimientos', 'list') + navItem('categories', 'Categorías', 'categories') + navItem('savings', 'Ahorros', 'savings') + navItem('settings', 'Ajustes', 'settings') +
        '</nav>' + sidebarWidgets() + '<div class="sidebar-foot">' + (LIVE && DESKTOP ? sideStatusMarkup() : '<span class="demo-status"><span class="status-dot"></span> ' + (LIVE ? 'Datos guardados en tu PC' : 'Modo demostración') + '</span><small>' + (LIVE ? 'Se sincronizan con tus celulares vinculados.' : 'Los cambios solo viven en este navegador.') + '</small>') + '</div></aside>' +
      '<div class="app-body"><div class="mobile-topbar"><div class="mobile-wordmark"><span class="brand-mark"><img src="assets/miplata-logo.png" alt="" width="29" height="29" style="display:block;width:29px;height:29px;max-width:29px;max-height:29px" /></span><strong>MiPlata</strong>' + (PERSON_NAME ? '<span class="person-chip">' + escapeHtml(PERSON_NAME) + '</span>' : '') + '</div><button class="icon-button" data-action="toggle-theme" aria-label="Cambiar tema" type="button">' + icon(themeIcon, 20) + '</button></div>' +
        '<main class="main-content" id="main-content">' + content + '</main></div>' +
      '<nav class="mobile-nav" aria-label="Principal">' +
        navItem('home', 'Inicio', 'home') + navItem('transactions', 'Movimientos', 'list') + navItem('categories', 'Categorías', 'categories') + navItem('savings', 'Ahorros', 'savings') + navItem('settings', 'Ajustes', 'settings') +
      '</nav>' +
    '</div>' + (modal ? renderModal() : '');
}

function pageHeader(eyebrow, title, subtitle, actions, className) {
  return '<header class="page-header ' + (className || '') + '"><div><p class="eyebrow">' + eyebrow + '</p><h1>' + title + '</h1><p class="page-subtitle">' + subtitle + '</p></div><div class="page-actions">' + (actions || '') + '</div></header>';
}

function summaryCard(t) {
  return '<section class="balance-card"><div class="balance-top"><span>Saldo actual</span><span class="balance-wallet">' + icon('wallet', 22) + '</span></div>' +
    '<div class="balance-value">' + money(t.balance) + '</div><div class="balance-caption">Tu dinero disponible hoy</div>' +
    '<div class="balance-mobile-metrics"><div><span class="metric-symbol income">' + icon('arrowUp', 16) + '</span><small>Ingresos</small><strong>' + money(t.income) + '</strong></div><div><span class="metric-symbol expense">' + icon('arrowDown', 16) + '</span><small>Gastos</small><strong>' + money(t.expense) + '</strong></div></div>' +
    '<button class="mobile-add-button" data-action="add-transaction" type="button">' + icon('plus', 19) + ' Agregar movimiento</button></section>';
}

function metricCard(label, value, kind, iconName) {
  return '<section class="metric-card ' + kind + '"><span class="metric-symbol ' + kind + '">' + icon(iconName, 23) + '</span><div><span class="metric-label">' + label + '</span><strong>' + money(value) + '</strong><small>' + monthLabel(selectedMonth) + '</small></div></section>';
}

function weekTotals(items) {
  const weeks = [0, 0, 0, 0];
  (items || selectedTransactions().filter(function (item) { return item.kind === 'expense'; })).forEach(function (item) {
    weeks[Math.min(3, Math.floor((Number(item.date.slice(8, 10)) - 1) / 7))] += item.amount;
  });
  return weeks;
}

function renderChart(items, heading) {
  const weeks = weekTotals(items);
  const max = items ? Math.max(1, ...weeks) : Math.max(100000, ...weeks);
  const title = heading || 'Gastos por semana';
  const parts = selectedMonth.split('-').map(Number);
  const lastDay = new Date(parts[0], parts[1], 0).getDate();
  const labels = ['1 al 7', '8 al 14', '15 al 21', '22 al ' + lastDay];
  const bars = weeks.map(function (value, index) {
    const height = value ? Math.max(8, Math.round(value / max * 100)) : 3;
    return '<div class="bar-group"><div class="bar-track"><div class="bar-fill bar-' + index + '" style="height:' + height + '%"><span class="bar-tooltip">' + money(value) + '</span></div></div><span class="bar-label">' + labels[index] + '</span></div>';
  }).join('');
  return '<section class="panel chart-panel"><div class="panel-heading"><div><p class="section-eyebrow">DE UN VISTAZO</p><h2>' + title + '</h2></div><span class="panel-period">' + escapeHtml(monthLabel(selectedMonth)) + '</span></div>' +
    (weeks.some(Boolean)
      ? '<div class="chart-wrap"><div class="chart-axis"><span>' + money(max) + '</span><span>' + money(Math.round(max / 2)) + '</span><span>$ 0</span></div><div class="chart-body"><div class="chart-line top"></div><div class="chart-line middle"></div><div class="chart-line bottom"></div><div class="bars" role="img" aria-label="' + title + ' en ' + escapeHtml(monthLabel(selectedMonth)) + '">' + bars + '</div></div></div><p class="chart-footnote">Desliza por cada semana para ver el total.</p>'
      : '<div class="chart-empty">' + icon('chart', 26) + '<strong>Sin movimientos en este mes</strong><span>Elige otro período o agrega un movimiento.</span></div>') + '</section>';
}

function breakdownData(items) {
  const expenses = items.filter(function (item) { return item.kind === 'expense'; });
  const total = expenses.reduce(function (sum, item) { return sum + item.amount; }, 0);
  const byCategory = new Map();
  expenses.forEach(function (item) {
    const entry = byCategory.get(item.categoryId) || { id: item.categoryId, amount: 0, count: 0 };
    entry.amount += item.amount;
    entry.count++;
    byCategory.set(item.categoryId, entry);
  });
  const entries = Array.from(byCategory.values()).map(function (entry) {
    const category = categoryById(entry.id);
    return Object.assign(entry, { name: category?.name || 'Sin categoría', tone: category?.tone || 'lavender' });
  }).sort(function (a, b) { return b.amount - a.amount; });
  return { total: total, entries: entries };
}

function donutChart(entries, total, label, interactive, detailed) {
  const circumference = 2 * Math.PI * 80;
  let progress = 0;
  const segments = entries.map(function (entry) {
    const length = total ? entry.amount / total * circumference : 0;
    const markup = '<circle cx="100" cy="100" r="80" fill="none" stroke="' + toneColor(entry.tone) + '" stroke-width="36" stroke-dasharray="' + length + ' ' + (circumference - length) + '" stroke-dashoffset="' + -progress + '" />';
    progress += length;
    return markup;
  }).join('');
  const tag = interactive ? 'button' : 'div';
  const attrs = interactive ? ' type="button" data-action="breakdown-detail" data-breakdown-scope="' + (detailed === 'annual' ? 'annual' : 'month') + '" aria-label="Ver detalle de gastos por categoría en ' + escapeHtml(label) + '"' : ' role="img" aria-label="Distribución de gastos por categoría en ' + escapeHtml(label) + '"';
  return '<' + tag + ' class="donut' + (detailed === 'large' ? ' donut-large' : '') + (interactive ? ' donut-button' : '') + '"' + attrs + '><svg class="donut-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><circle cx="100" cy="100" r="80" fill="none" stroke="var(--border)" stroke-width="36" /><g transform="rotate(-90 100 100)">' + segments + '</g></svg><span class="donut-center"><small>Total</small><strong>' + money(total) + '</strong></span></' + tag + '>';
}

function categoryBreakdown(items, label) {
  items = items || selectedTransactions();
  label = label || monthLabel(selectedMonth);
  const breakdown = breakdownData(items);
  const top = breakdown.entries.slice(0, 3);
  const other = breakdown.entries.slice(3).reduce(function (sum, entry) { return sum + entry.amount; }, 0);
  if (other) top.push({ name: 'Otros', amount: other, tone: 'muted' });
  const list = top.length ? top.map(function (entry) {
    return '<li>' + (entry.id ? '<button class="legend-link" type="button" data-category-detail="' + escapeHtml(entry.id) + '" aria-label="Ver detalle de ' + escapeHtml(entry.name) + '">' : '<span class="legend-link">') + '<span class="legend-name"><span class="legend-dot ' + toneClass(entry.tone) + '"' + toneStyle(entry.tone) + '></span>' + escapeHtml(entry.name) + '</span><strong>' + money(entry.amount) + '</strong>' + (entry.id ? '</button>' : '</span>') + '</li>';
  }).join('') : '<li class="empty-legend">Todavía no hay gastos en este período.</li>';
  return '<section class="panel breakdown-panel"><div class="panel-heading"><div><p class="section-eyebrow">EN QUÉ SE FUE</p><h2>Por categoría</h2></div><span class="panel-period">' + escapeHtml(label) + '</span></div><div class="breakdown-body">' + donutChart(top, breakdown.total, label, breakdown.total > 0, route === 'annual' ? 'annual' : 'month') + '<ul class="legend">' + list + '</ul></div>' + (breakdown.total > 0 ? '<p class="breakdown-hint">Toca la rueda para ver el detalle.</p>' : '') + '</section>';
}

function transactionRow(item, compact) {
  const category = categoryById(item.categoryId);
  return '<button class="transaction-row' + (compact ? ' is-compact' : '') + '" type="button" data-edit-transaction="' + escapeHtml(item.id) + '">' +
    categoryIcon(category) +
    '<span class="transaction-detail"><strong>' + escapeHtml(item.title) + (item.receiptId ? '<span class="receipt-mark" title="Tiene boleta" aria-label="Tiene boleta">' + icon('receipt', 13) + '</span>' : '') + (item.documentId ? '<span class="receipt-mark" title="Tiene documento" aria-label="Tiene documento">' + icon('file', 13) + '</span>' : '') + '</strong><small>' + (item.note ? escapeHtml(item.note) + ' <span class="detail-separator">·</span> ' : '') + escapeHtml(category ? category.name : 'Sin categoría') + ' <span class="detail-separator">·</span> ' + prettyDate(item.date) + (isSavingsEntry(item) && savingsCurrency(item) !== 'CLP' ? ' <span class="detail-separator">·</span> ' + escapeHtml(formatSavings(savingsCurrency(item), savingsUnits(item))) + ' ahorrados' : '') + '</small></span>' +
    '<span class="transaction-amount ' + item.kind + '">' + (item.kind === 'income' ? '+ ' : '- ') + money(item.amount) + '</span>' +
    icon('arrowRight', 17) + '</button>';
}

function recentPanel() {
  const recent = selectedTransactions().slice(0, 4);
  return '<section class="panel recent-panel"><div class="panel-heading"><div><p class="section-eyebrow">ACTIVIDAD</p><h2>Movimientos del mes</h2></div><button class="text-button" data-route="transactions" type="button">Ver todos ' + icon('arrowRight', 16) + '</button></div>' +
    '<div class="transaction-list">' + (recent.length ? recent.map(function (item) { return transactionRow(item, true); }).join('') : '<div class="empty-state">No hay movimientos en este mes.</div>') + '</div></section>';
}

function renderHome() {
  const t = totals();
  const header = pageHeader('TU PANORAMA', 'Tu dinero, claro.', 'Todo lo importante de tus gastos en un solo lugar.',
    '<button class="button button-outline connect-button" data-action="show-qr" type="button">' + icon('phone', 18) + '<span>Conectar iPhone</span>' + icon('arrowRight', 17) + '</button>');
  return '<div class="home-page">' + header +
    '<div class="mobile-month"><span>Tu saldo, de un vistazo</span></div>' +
    '<div class="summary-grid">' + summaryCard(t) +
      metricCard('Ingresos del mes', t.income, 'income', 'arrowUp') +
      metricCard('Gastos del mes', t.expense, 'expense', 'arrowDown') +
      '<button class="add-card" data-action="add-transaction" type="button"><span class="add-card-icon">' + icon('plus', 25) + '</span><strong>Agregar movimiento</strong><small>Gasto o ingreso en segundos</small></button></div>' +
    '<section class="period-bar"><div class="period-copy"><p class="section-eyebrow">ANÁLISIS MENSUAL</p><strong>Elige un mes para ver sus gráficos</strong></div><div class="period-actions">' + periodPicker(true) + '<button class="period-annual-button" data-route="annual" type="button">Resumen anual ' + icon('arrowRight', 16) + '</button></div></section>' +
    '<div class="home-grid">' + renderChart() + recentPanel() + categoryBreakdown() + '</div></div>';
}

function annualChart(items) {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const values = monthNames.map(function () { return { income: 0, expense: 0 }; });
  items.forEach(function (item) { values[Number(item.date.slice(5, 7)) - 1][item.kind] += item.amount; });
  const maximum = Math.max(100000, ...values.flatMap(function (value) { return [value.income, value.expense]; }));
  const columns = values.map(function (value, index) {
    const month = annualYear + '-' + String(index + 1).padStart(2, '0');
    const incomeHeight = value.income ? Math.max(4, value.income / maximum * 100) : 0;
    const expenseHeight = value.expense ? Math.max(4, value.expense / maximum * 100) : 0;
    return '<button class="annual-month" type="button" data-annual-month="' + month + '" aria-label="' + escapeHtml(monthLabel(month)) + ': ingresos ' + money(value.income) + ', gastos ' + money(value.expense) + '. Ver mes">' +
      '<span class="annual-bar-pair"><span class="annual-bar income" style="height:' + incomeHeight + '%"></span><span class="annual-bar expense" style="height:' + expenseHeight + '%"></span></span><span class="annual-month-label">' + monthNames[index] + '</span></button>';
  }).join('');
  return '<section class="panel annual-chart-panel"><div class="panel-heading"><div><p class="section-eyebrow">MES A MES</p><h2>Ingresos y gastos</h2></div><span class="panel-period">' + annualYear + '</span></div>' +
    (items.length ? '<div class="annual-chart-scroll"><div class="annual-chart"><div class="annual-chart-grid"><span>' + shortMoney(maximum) + '</span><span>' + shortMoney(Math.round(maximum / 2)) + '</span><span>$ 0</span></div><div class="annual-columns" role="group" aria-label="Movimientos por mes en ' + annualYear + '">' + columns + '</div></div></div><div class="annual-chart-footer"><span class="annual-legend"><i class="income"></i> Ingresos <i class="expense"></i> Gastos</span><span>Toca un mes para verlo en detalle.</span></div>'
      : '<div class="chart-empty">' + icon('chart', 26) + '<strong>Sin movimientos en ' + annualYear + '</strong><span>Prueba otro año o agrega un movimiento.</span></div>') + '</section>';
}

function renderAnnual() {
  const items = yearTransactions(annualYear);
  const income = items.filter(function (item) { return item.kind === 'income'; }).reduce(function (sum, item) { return sum + item.amount; }, 0);
  const expense = items.filter(function (item) { return item.kind === 'expense'; }).reduce(function (sum, item) { return sum + item.amount; }, 0);
  const saved = savingsBalances(items);
  const stat = function (label, value, kind, iconName) { return '<div class="annual-stat ' + kind + '"><span>' + icon(iconName, 19) + label + '</span><strong>' + money(value) + '</strong></div>'; };
  const savingsValues = SAVINGS_CURRENCIES.concat(saved.EUR !== 0 ? [LEGACY_EUR] : []).filter(function (currency) { return saved[currency.code] !== 0; }).map(function (currency) {
    return '<strong>' + escapeHtml(formatSavings(currency.code, saved[currency.code])) + '</strong>';
  }).join('') || '<strong>Sin aportes</strong>';
  return '<div class="annual-page">' + pageHeader('TODO EL AÑO', 'Resumen anual', 'Compara tus ingresos, gastos y ahorros durante el año.', '') +
    '<div class="annual-period-bar"><button class="period-annual-button" data-route="home" type="button">' + icon('chevronLeft', 16) + ' Volver al mes</button><div class="annual-year-controls"><button class="period-step" type="button" data-annual-year-shift="-1" aria-label="Año anterior">' + icon('chevronLeft', 17) + '</button><strong>' + annualYear + '</strong><button class="period-step" type="button" data-annual-year-shift="1" aria-label="Año siguiente">' + icon('arrowRight', 17) + '</button></div></div>' +
    '<div class="annual-stats">' + stat('Ingresos', income, 'income', 'arrowUp') + stat('Gastos', expense, 'expense', 'arrowDown') + stat('Resultado', income - expense, 'result', 'wallet') + '<div class="annual-stat savings"><span>' + icon('savings', 19) + ' Ahorro neto</span><div class="annual-savings-values">' + savingsValues + '</div></div></div>' +
    '<div class="annual-grid">' + annualChart(items) + categoryBreakdown(items, String(annualYear)) + '</div></div>';
}

function renderSavings() {
  const items = savingsTransactions();
  const saved = savingsBalances(items);
  const deposits = items.filter(function (item) { return item.categoryId === 'savings'; }).length;
  const withdrawals = items.filter(function (item) { return item.categoryId === 'savings-return'; }).length;
  const shownCurrencies = SAVINGS_CURRENCIES.concat(items.some(function (item) { return savingsCurrency(item) === 'EUR'; }) ? [LEGACY_EUR] : []);
  const currencyRows = shownCurrencies.map(function (currency) {
    return '<div class="savings-currency-row"><span class="savings-currency-code">' + currency.code + '</span><span class="savings-currency-name">' + currency.short + '</span><strong>' + escapeHtml(formatSavings(currency.code, saved[currency.code])) + '</strong></div>';
  }).join('');
  const actions = '<button class="button button-primary" data-action="add-savings" type="button">' + icon('plus', 18) + ' Agregar ahorro</button>';
  return '<div class="savings-page">' + pageHeader('TU RESERVA', 'Ahorros', 'Anota lo que separas y mira cuánto llevas guardado.', actions) +
    '<div class="savings-overview"><section class="savings-hero"><span class="savings-hero-icon">' + icon('savings', 24) + '</span><p>Tu ahorro, moneda por moneda</p><div class="savings-currency-list">' + currencyRows + '</div><span class="savings-no-conversion">Cada saldo se muestra por separado.</span><button class="button button-outline" data-action="withdraw-savings" type="button"' + (Object.values(saved).some(function (amount) { return amount > 0; }) ? '' : ' disabled') + '>Registrar retiro ' + icon('arrowRight', 16) + '</button></section>' +
      '<section class="panel savings-explainer"><p class="section-eyebrow">CÓMO FUNCIONA</p><h2>Un gasto que suma a tus ahorros</h2><p>Cada aporte aparece como gasto en CLP en Movimientos. Si guardas dólares, cargas también cuánto te costaron en pesos. No se usa una cotización automática.</p><div class="savings-mini-stats"><div><span>Aportes</span><strong>' + deposits + '</strong></div><div><span>Retiros</span><strong>' + withdrawals + '</strong></div></div></section></div>' +
    '<section class="panel savings-history"><div class="panel-heading"><div><p class="section-eyebrow">HISTORIAL</p><h2>Aportes y retiros</h2></div><span class="panel-period">Todos los meses</span></div><div class="transaction-list">' + (items.length ? items.map(savingsRow).join('') : '<div class="empty-state"><strong>Todavía no anotaste ahorros</strong><span>Agrega un aporte para empezar.</span></div>') + '</div></section></div>';
}

function savingsRow(item) {
  const currency = savingsCurrency(item);
  const deposit = item.categoryId === 'savings';
  return '<button class="transaction-row savings-row" type="button" data-edit-savings="' + escapeHtml(item.id) + '">' + categoryIcon(categoryById(item.categoryId)) +
    '<span class="transaction-detail"><strong>' + escapeHtml(item.title) + '</strong><small>' + (deposit ? 'Aporte' : 'Retiro') + ' <span class="detail-separator">·</span> ' + prettyDate(item.date) + ' <span class="detail-separator">·</span> ' + (deposit ? 'Gastaste ' : 'Recibiste ') + money(item.amount) + ' CLP</small></span>' +
    '<span class="transaction-amount ' + (deposit ? 'income' : 'expense') + '">' + (deposit ? '+ ' : '- ') + escapeHtml(formatSavings(currency, savingsUnits(item))) + '</span>' + icon('arrowRight', 17) + '</button>';
}

// Filtros por rango de fechas y de montos. Si hay fechas, se busca en todos los meses.
function activeFilterCount() {
  return [rangeFrom, rangeTo, amountMin, amountMax].filter(Boolean).length;
}

function filteredTransactions() {
  const dates = [rangeFrom, rangeTo];
  if (rangeFrom && rangeTo && rangeFrom > rangeTo) dates.reverse();
  let min = amountMin ? parseAmountText(amountMin) : NaN;
  let max = amountMax ? parseAmountText(amountMax) : NaN;
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) { const swap = min; min = max; max = swap; }
  const source = rangeFrom || rangeTo ? sortedTransactions() : selectedTransactions();
  return source.filter(function (item) {
    const category = categoryById(item.categoryId);
    const matchesFilter = filter === 'all' || item.kind === filter;
    const matchesQuery = !query || (item.title + ' ' + (category ? category.name : '')).toLocaleLowerCase('es-CL').includes(query.toLocaleLowerCase('es-CL'));
    const matchesDate = (!dates[0] || item.date >= dates[0]) && (!dates[1] || item.date <= dates[1]);
    const matchesAmount = (!Number.isFinite(min) || item.amount >= min) && (!Number.isFinite(max) || item.amount <= max);
    return matchesFilter && matchesQuery && matchesDate && matchesAmount;
  });
}

function filtersPanel() {
  return '<div class="filters-panel" id="transaction-filters">' +
    '<div class="filter-field"><label class="field-label" for="filter-from">Desde</label><input class="text-input" id="filter-from" type="date" data-list-filter="from" value="' + escapeHtml(rangeFrom) + '" /></div>' +
    '<div class="filter-field"><label class="field-label" for="filter-to">Hasta</label><input class="text-input" id="filter-to" type="date" data-list-filter="to" value="' + escapeHtml(rangeTo) + '" /></div>' +
    '<div class="filter-field"><label class="field-label" for="filter-min">Monto mínimo</label><div class="filter-amount"><span>$</span><input id="filter-min" type="text" inputmode="numeric" autocomplete="off" data-amount-input data-list-filter="min" placeholder="0" value="' + escapeHtml(amountMin) + '" /></div></div>' +
    '<div class="filter-field"><label class="field-label" for="filter-max">Monto máximo</label><div class="filter-amount"><span>$</span><input id="filter-max" type="text" inputmode="numeric" autocomplete="off" data-amount-input data-list-filter="max" placeholder="Sin límite" value="' + escapeHtml(amountMax) + '" /></div></div>' +
    '<button class="text-button filters-clear" type="button" data-action="clear-filters">' + icon('close', 15) + ' Limpiar filtros</button></div>';
}

function transactionResults() {
  const visible = filteredTransactions();
  let summary = '';
  if (activeFilterCount()) {
    const expense = visible.filter(function (item) { return item.kind === 'expense'; }).reduce(function (sum, item) { return sum + item.amount; }, 0);
    const income = visible.filter(function (item) { return item.kind === 'income'; }).reduce(function (sum, item) { return sum + item.amount; }, 0);
    const range = rangeFrom && rangeTo ? 'Del ' + numericDate(rangeFrom < rangeTo ? rangeFrom : rangeTo) + ' al ' + numericDate(rangeFrom < rangeTo ? rangeTo : rangeFrom) : rangeFrom ? 'Desde el ' + numericDate(rangeFrom) : rangeTo ? 'Hasta el ' + numericDate(rangeTo) : escapeHtml(monthLabel(selectedMonth));
    summary = '<div class="filter-summary"><span>' + range + ' <span class="detail-separator">·</span> ' + visible.length + (visible.length === 1 ? ' movimiento' : ' movimientos') + '</span><span>Gastos <strong>' + money(expense) + '</strong> <span class="detail-separator">·</span> Ingresos <strong>' + money(income) + '</strong></span></div>';
  }
  return summary + '<section class="panel all-transactions"><div class="list-heading"><span>Movimiento</span><span>Categoría</span><span>Fecha</span><span>Importe</span></div>' +
    '<div class="transaction-list">' + (visible.length ? visible.map(function (item) { return transactionRow(item, false); }).join('') : '<div class="empty-state"><strong>Sin movimientos para mostrar</strong><span>' + (activeFilterCount() ? 'Prueba con otros filtros.' : 'Prueba otro mes o agrega uno nuevo.') + '</span></div>') + '</div></section>';
}

function filterToggleMarkup() {
  const count = activeFilterCount();
  return '<button class="filter-toggle' + (filtersOpen || count ? ' is-active' : '') + '" type="button" data-action="toggle-filters" aria-expanded="' + String(filtersOpen) + '" aria-controls="transaction-filters">' + icon('settings', 17) + '<span>Filtros</span>' + (count ? '<span class="filter-count">' + count + '</span>' : '') + '</button>';
}

function renderTransactions() {
  const actions = '<button class="button button-primary" data-action="add-transaction" type="button">' + icon('plus', 18) + ' Agregar movimiento</button>';
  return pageHeader('TU HISTORIAL', 'Movimientos', 'Encuentra y edita cada ingreso o gasto.', actions, 'transactions-header') +
    '<div class="section-toolbar"><div class="filter-tabs" role="group" aria-label="Tipo de movimiento">' +
      ['all', 'expense', 'income'].map(function (value) {
        const label = { all: 'Todos', expense: 'Gastos', income: 'Ingresos' }[value];
        return '<button type="button" data-filter="' + value + '" class="' + (filter === value ? 'selected' : '') + '">' + label + '</button>';
      }).join('') + '</div>' +
      '<div class="toolbar-right"><label class="search-field">' + icon('search', 17) + '<input id="transaction-search" placeholder="Buscar movimiento" value="' + escapeHtml(query) + '" aria-label="Buscar movimiento" /></label><span data-filter-toggle>' + filterToggleMarkup() + '</span>' + (rangeFrom || rangeTo ? '' : periodPicker(false)) + '</div></div>' +
    (filtersOpen ? filtersPanel() : '') +
    '<div id="transaction-results">' + transactionResults() + '</div>';
}

// Al escribir en un filtro solo se redibuja la lista, para no perder el foco del campo.
function applyListFilter(input) {
  const key = input.dataset.listFilter;
  const hadRange = Boolean(rangeFrom || rangeTo);
  if (key === 'from') rangeFrom = input.value;
  else if (key === 'to') rangeTo = input.value;
  else if (key === 'min') amountMin = input.value;
  else if (key === 'max') amountMax = input.value;
  if (hadRange !== Boolean(rangeFrom || rangeTo)) {
    const position = input.type === 'text' ? input.selectionStart : null;
    render();
    const replacement = document.getElementById(input.id);
    if (replacement) { replacement.focus(); if (position !== null) replacement.setSelectionRange(position, position); }
    return;
  }
  const results = document.getElementById('transaction-results');
  if (results) results.innerHTML = transactionResults();
  const toggle = document.querySelector('[data-filter-toggle]');
  if (toggle) toggle.innerHTML = filterToggleMarkup();
}

function categoryRow(category, index, list) {
  const hasItems = data.transactions.some(function (item) { return item.categoryId === category.id; });
  const isSavings = category.id === 'savings' || category.id === 'savings-return';
  return '<div class="category-row" draggable="true" data-category-row="' + escapeHtml(category.id) + '">' +
    '<span class="drag-handle" aria-hidden="true">' + icon('grip', 20) + '</span><button class="category-open" type="button" data-category-detail="' + escapeHtml(category.id) + '" aria-label="Ver análisis de ' + escapeHtml(category.name) + '">' + categoryIcon(category) +
    '<span class="category-detail"><strong>' + escapeHtml(category.name) + '</strong><small>' + (isSavings ? 'Vinculada a Ahorros' : hasItems ? 'Ver análisis mensual' : 'Sin movimientos') + '</small></span></button>' +
    '<div class="category-row-actions"><button class="move-arrow" type="button" data-category-move="' + category.id + '" data-direction="-1" aria-label="Subir ' + escapeHtml(category.name) + '"' + (index === 0 ? ' disabled' : '') + '>' + icon('arrowUp', 17) + '</button>' +
    '<button class="move-arrow" type="button" data-category-move="' + category.id + '" data-direction="1" aria-label="Bajar ' + escapeHtml(category.name) + '"' + (index === list.length - 1 ? ' disabled' : '') + '>' + icon('arrowDown', 17) + '</button>' +
    '<button class="icon-button subtle" type="button" data-edit-category="' + category.id + '" aria-label="Editar ' + escapeHtml(category.name) + '">' + icon('edit', 18) + '</button></div></div>';
}

function renderCategories() {
  const list = data.categories.filter(function (category) { return category.kind === categoryKind; });
  return pageHeader('A TU MANERA', 'Categorías', 'Cambia los nombres y el orden cuando quieras.',
    '<button class="button button-primary" data-action="add-category" type="button">' + icon('plus', 17) + ' Nueva categoría</button>') +
    '<div class="section-toolbar"><div class="filter-tabs" role="group" aria-label="Tipo de categoría">' +
      '<button type="button" data-category-kind="expense" class="' + (categoryKind === 'expense' ? 'selected' : '') + '">Gastos</button>' +
      '<button type="button" data-category-kind="income" class="' + (categoryKind === 'income' ? 'selected' : '') + '">Ingresos</button></div>' +
      '<p class="reorder-hint">' + icon('grip', 17) + ' Arrastra en PC o usa las flechas en el iPhone.</p></div>' +
    '<section class="panel category-panel"><div class="category-list">' + list.map(function (category, index) { return categoryRow(category, index, list); }).join('') + '</div></section>' +
    '<div class="info-banner">' + icon('info', 19) + '<div><strong>¿Quieres mover un gasto?</strong><span>Entra en Movimientos, toca el gasto y elige otra categoría.</span></div><button class="text-button" data-route="transactions" type="button">Ir a movimientos ' + icon('arrowRight', 15) + '</button></div>';
}

function renderCategoryDetail() {
  const category = categoryById(selectedCategoryId);
  if (!category) return renderCategories();
  const items = selectedTransactions().filter(function (item) { return item.categoryId === category.id; });
  const groups = conceptGroups(category.id, items).sort(function (a, b) { return b.total - a.total || a.title.localeCompare(b.title, 'es-CL'); });
  const allGroups = conceptGroups(category.id);
  if (conceptFilter && !groups.some(function (group) { return group.key === conceptFilter; })) conceptFilter = null;
  const total = items.reduce(function (sum, item) { return sum + item.amount; }, 0);
  const shownItems = conceptFilter ? items.filter(function (item) { return conceptKey(item.title) === conceptFilter; }) : items;
  const selectedGroup = groups.find(function (group) { return group.key === conceptFilter; });
  const groupRows = groups.length ? groups.map(function (group) {
    const percent = total ? Math.round(group.total / total * 100) : 0;
    const percentLabel = group.total > 0 && percent === 0 ? '&lt;1%' : percent + '%';
    return '<button class="concept-row' + (conceptFilter === group.key ? ' selected' : '') + '" type="button" data-concept-filter="' + escapeHtml(group.key) + '" aria-pressed="' + String(conceptFilter === group.key) + '"><span class="concept-row-head"><strong>' + escapeHtml(group.title) + '</strong><span>' + money(group.total) + ' <small>' + percentLabel + '</small></span></span><span class="concept-track"><span style="width:' + (group.total / total * 100).toFixed(1) + '%"></span></span><small>' + group.count + (group.count === 1 ? ' movimiento' : ' movimientos') + '</small></button>';
  }).join('') : '<div class="chart-empty">' + icon('chart', 26) + '<strong>Sin movimientos en este mes</strong><span>Elige otro período o agrega uno nuevo.</span></div>';
  return '<div class="category-detail-page" style="--category-accent:' + toneColor(category.tone) + '">' +
    '<button class="back-button category-back" data-route="categories" type="button">' + icon('chevronLeft', 17) + ' Categorías</button>' +
    pageHeader('ANÁLISIS DE CATEGORÍA', escapeHtml(category.name), category.kind === 'income' ? 'Mira de dónde vienen tus ingresos.' : 'Descubre en qué se fue el dinero.', '<button class="button button-primary" type="button" data-add-category-transaction="' + escapeHtml(category.id) + '">' + icon('plus', 17) + ' Agregar movimiento</button>') +
    '<section class="period-bar category-period"><div class="period-copy"><p class="section-eyebrow">PERÍODO</p><strong>Elige un mes para analizar</strong></div>' + periodPicker(true) + '</section>' +
    '<div class="category-stats"><div class="category-total">' + categoryIcon(category, 23) + '<span>' + (category.kind === 'income' ? 'Ingresos del mes' : 'Gastos del mes') + '</span><strong>' + money(total) + '</strong></div><div><span>Movimientos</span><strong>' + items.length + '</strong></div><div><span>Comercios o conceptos</span><strong>' + groups.length + '</strong></div></div>' +
    '<div class="category-detail-grid">' + renderChart(shownItems, selectedGroup ? escapeHtml(selectedGroup.title) + ' por semana' : category.kind === 'income' ? 'Ingresos por semana' : 'Gastos por semana') +
    '<section class="panel concepts-panel"><div class="panel-heading"><div><p class="section-eyebrow">DENTRO DE ' + escapeHtml(category.name.toLocaleUpperCase('es-CL')) + '</p><h2>Por comercio o concepto</h2></div>' + (allGroups.length > 1 ? '<button class="text-button" type="button" data-action="merge-concepts">Unir nombres</button>' : '') + '</div><div class="concept-list">' + groupRows + '</div></section></div>' +
    '<section class="panel category-history"><div class="panel-heading"><div><p class="section-eyebrow">HISTORIAL</p><h2>' + (selectedGroup ? escapeHtml(selectedGroup.title) : 'Movimientos del mes') + '</h2></div>' + (selectedGroup ? '<button class="text-button" data-concept-filter="" type="button">Ver todos</button>' : '<span class="panel-period">' + items.length + (items.length === 1 ? ' movimiento' : ' movimientos') + '</span>') + '</div><div class="transaction-list">' + (shownItems.length ? shownItems.map(function (item) { return transactionRow(item, false); }).join('') : '<div class="empty-state">No hay movimientos en este período.</div>') + '</div></section></div>';
}

function renderSettings() {
  if (LIVE) {
    const deviceRow = function (device) {
      return '<div class="linked-device"><span>' + icon('phone', 19) + '<strong>' + escapeHtml(device.name) + '</strong></span><button class="text-button" data-revoke-device="' + escapeHtml(device.id) + '" type="button">Revocar</button></div>';
    };
    const devices = ownerDevices().map(deviceRow).join('');
    const accountButton = function (id, username) {
      return username
        ? '<button class="text-button" data-person-password="' + escapeHtml(id) + '" type="button">' + icon('edit', 16) + ' Cambiar contraseña</button>'
        : '<button class="text-button" data-person-invite="' + escapeHtml(id) + '" type="button">' + icon('plus', 16) + ' Crear invitación</button>';
    };
    const ownerRow = '<div class="person-row"><div class="person-head"><span class="person-avatar">' + icon('user', 17) + '</span><div><strong>Tú</strong><small>' + (desktopInfo.ownerAccount ? 'Usuario: ' + escapeHtml(desktopInfo.ownerAccount) : 'Sin usuario: crea una invitación para entrar desde otros dispositivos') + '</small></div></div>' +
      '<div class="person-actions">' + accountButton('owner', desktopInfo.ownerAccount) + '</div></div>';
    const people = ownerRow + (desktopInfo.people || []).map(function (person) {
      const own = desktopInfo.devices.filter(function (device) { return device.personId === person.id; });
      const devicesLabel = own.length ? own.length + (own.length === 1 ? ' dispositivo' : ' dispositivos') : 'sin dispositivos';
      return '<div class="person-row"><div class="person-head"><span class="person-avatar">' + escapeHtml(person.name.slice(0, 1).toLocaleUpperCase('es-CL')) + '</span><div><strong>' + escapeHtml(person.name) + '</strong><small>' + (person.username ? 'Usuario: ' + escapeHtml(person.username) : 'Sin usuario') + ' · ' + devicesLabel + '</small></div>' +
        '<button class="icon-button person-remove" data-remove-person="' + escapeHtml(person.id) + '" type="button" aria-label="Eliminar a ' + escapeHtml(person.name) + '">' + icon('trash', 17) + '</button></div>' +
        '<div class="person-actions">' + accountButton(person.id, person.username) + '<button class="text-button" data-pair-person="' + escapeHtml(person.id) + '" type="button">' + icon('qr', 16) + ' Conectar con QR</button></div>' +
        own.map(deviceRow).join('') + '</div>';
    }).join('');
    return pageHeader('PREFERENCIAS', 'Ajustes', 'Tu dinero y tus dispositivos, bajo tu control.', '') +
      '<div class="settings-grid"><section class="panel settings-panel"><div class="settings-heading"><span class="settings-icon">' + icon('sun', 20) + '</span><div><h2>Apariencia</h2><p>Elige cómo quieres ver MiPlata.</p></div></div>' +
        '<div class="theme-options"><button type="button" data-theme-option="light" class="theme-option' + (data.theme === 'light' ? ' selected' : '') + '"><span class="theme-swatch light-swatch"></span><span><strong>Claro</strong><small>Blanco y verde menta</small></span>' + (data.theme === 'light' ? icon('check', 18) : '') + '</button>' +
        '<button type="button" data-theme-option="dark" class="theme-option' + (data.theme === 'dark' ? ' selected' : '') + '"><span class="theme-swatch dark-swatch"></span><span><strong>Oscuro</strong><small>Verde oscuro y contraste suave</small></span>' + (data.theme === 'dark' ? icon('check', 18) : '') + '</button></div></section>' +
      '<section class="panel settings-panel"><div class="settings-heading"><span class="settings-icon">' + icon('wallet', 20) + '</span><div><h2>Saldo inicial</h2><p>' + money(data.openingBalance) + '</p></div></div><button class="setting-action" data-action="edit-opening-balance" type="button"><span>' + icon('edit', 18) + ' Cambiar saldo inicial</span>' + icon('arrowRight', 18) + '</button></section>' +
      '<section class="panel settings-panel"><div class="settings-heading"><span class="settings-icon">' + icon('phone', 20) + '</span><div><h2>' + (DESKTOP ? 'Tu iPhone' : 'Este dispositivo') + '</h2><p>' + (DESKTOP ? 'Vincula y revoca dispositivos desde esta PC.' : 'Tiene tu sesión iniciada y quedó como dispositivo de confianza.') + '</p></div></div>' +
        (DESKTOP ? '' : '<button class="setting-action" data-action="logout" type="button"><span>' + icon('close', 18) + ' Cerrar sesión en este dispositivo</span>' + icon('arrowRight', 18) + '</button>') +
        (DESKTOP ? '<button class="setting-action" data-action="show-qr" type="button"><span>' + icon('qr', 18) + ' Conectar iPhone con QR</span>' + icon('arrowRight', 18) + '</button>' + (devices || '<p class="settings-note">Todavía no hay celulares vinculados.</p>') : '') + '</section>' +
      (DESKTOP ? '<section class="panel settings-panel"><div class="settings-heading"><span class="settings-icon">' + icon('download', 20) + '</span><div><h2>Copias de seguridad</h2><p>Se guarda una copia local diaria cuando cambias datos.</p></div></div>' +
        '<button class="setting-action" data-action="export-data" type="button"><span>' + icon('download', 18) + ' Exportar mis datos</span>' + icon('arrowRight', 18) + '</button>' +
        '<button class="setting-action" data-action="restore-data" type="button"><span>' + icon('reset', 18) + ' Restaurar una copia</span>' + icon('arrowRight', 18) + '</button><input id="restore-file" type="file" accept=".json,application/json" hidden />' +
        '<p class="settings-note">Copias automáticas en ' + escapeHtml(desktopInfo.backupDir || 'la carpeta de datos de MiPlata') + '</p></section>' +
      '<section class="panel settings-panel people-panel"><div class="settings-heading"><span class="settings-icon">' + icon('user', 20) + '</span><div><h2>Personas y cuentas</h2><p>Cada persona entra con su usuario y ve solo sus propios gastos.</p></div></div>' + people +
        ((desktopInfo.people || []).length ? '' : '<p class="settings-note">Agrega a alguien de tu familia o a un amigo para que lleve sus gastos aquí, sin ver los tuyos.</p>') +
        '<button class="setting-action" data-action="add-person" type="button"><span>' + icon('plus', 18) + ' Agregar persona</span>' + icon('arrowRight', 18) + '</button></section>' : '') + '</div>';
  }
  return pageHeader('PREFERENCIAS', 'Ajustes', 'Personaliza esta vista previa y prueba el enlace con tu iPhone.', '') +
    '<div class="settings-grid"><section class="panel settings-panel"><div class="settings-heading"><span class="settings-icon">' + icon('sun', 20) + '</span><div><h2>Apariencia</h2><p>Elige cómo quieres ver MiPlata.</p></div></div>' +
      '<div class="theme-options"><button type="button" data-theme-option="light" class="theme-option' + (data.theme === 'light' ? ' selected' : '') + '"><span class="theme-swatch light-swatch"></span><span><strong>Claro</strong><small>Blanco y verde menta</small></span>' + (data.theme === 'light' ? icon('check', 18) : '') + '</button>' +
      '<button type="button" data-theme-option="dark" class="theme-option' + (data.theme === 'dark' ? ' selected' : '') + '"><span class="theme-swatch dark-swatch"></span><span><strong>Oscuro</strong><small>Verde oscuro y contraste suave</small></span>' + (data.theme === 'dark' ? icon('check', 18) : '') + '</button></div></section>' +
    '<section class="panel settings-panel"><div class="settings-heading"><span class="settings-icon">' + icon('phone', 20) + '</span><div><h2>Tu iPhone</h2><p>' + (data.linked ? 'iPhone vinculado en esta demostración.' : 'Prueba cómo sería el primer enlace por QR.') + '</p></div></div>' +
      '<button class="setting-action" data-action="open-pair" type="button"><span>' + icon('qr', 18) + ' Ver flujo de vinculación</span>' + icon('arrowRight', 18) + '</button>' +
      '<button class="setting-action" data-action="show-qr" type="button"><span>' + icon('phone', 18) + ' Ver QR en la PC</span>' + icon('arrowRight', 18) + '</button></section>' +
    '<section class="panel settings-panel"><div class="settings-heading"><span class="settings-icon">' + icon('reset', 20) + '</span><div><h2>Datos de demostración</h2><p>Son ficticios y se guardan solo en este navegador.</p></div></div>' +
      '<button class="setting-action" data-action="reset-demo" type="button"><span>' + icon('reset', 18) + ' Restaurar ejemplo original</span>' + icon('arrowRight', 18) + '</button></section></div>' +
    '<p class="settings-note">Esta es una vista de diseño. No guarda datos financieros reales ni conecta dispositivos.</p>';
}

function qrMarkup() {
  const size = 25;
  let cells = '';
  function finder(x, y, ox, oy) {
    const dx = x - ox;
    const dy = y - oy;
    if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return null;
    return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = finder(x, y, 0, 0);
      const b = finder(x, y, 18, 0);
      const c = finder(x, y, 0, 18);
      const fixed = a !== null ? a : b !== null ? b : c !== null ? c : null;
      const filled = fixed !== null ? fixed : ((x * 19 + y * 23 + x * y * 7 + (x ^ y) * 11) % 17) < 8;
      cells += '<span class="' + (filled ? 'filled' : '') + '"></span>';
    }
  }
  return '<div class="qr-art" aria-label="Representación visual de un QR de demostración">' + cells + '</div>';
}

function renderPairPage() {
  const content = pairingStep === 'start'
    ? '<p>Escanea el QR que muestra MiPlata en tu PC o ingresa el código manualmente.</p><div class="scanner-preview"><div class="scan-corners">' + icon('qr', 90) + '</div><span>Vista de cámara simulada</span></div>' +
      '<form id="pair-form" novalidate><label class="field-label" for="pair-code">Código de vinculación</label><input class="text-input pair-code" id="pair-code" name="code" autocomplete="off" maxlength="8" placeholder="A7F3K9M2" required />' +
      '<button class="button button-primary full-width" type="submit">Continuar ' + icon('arrowRight', 17) + '</button></form>'
    : pairingStep === 'pending'
      ? '<div class="pair-status-symbol">' + icon('phone', 35) + '</div><h2>Esperando aprobación</h2><p>En la PC aparecería una solicitud para permitir el acceso de este iPhone.</p><button class="button button-primary full-width" data-action="simulate-approval" type="button">Simular aprobación en PC</button>'
      : '<div class="pair-status-symbol success">' + icon('check', 38) + '</div><h2>iPhone vinculado</h2><p>En la app real, tus movimientos aparecerían aquí al conectarte con tu PC.</p><button class="button button-primary full-width" data-route="home" type="button">Volver al inicio</button>';
  return '<div class="pair-page"><button class="back-button" data-route="settings" type="button">' + icon('chevronLeft', 18) + ' Ajustes</button>' +
    '<p class="eyebrow">ACCESO MÓVIL</p><h1>Vincular con tu PC</h1>' + content +
    '<div class="pair-demo-note">' + icon('info', 17) + '<span>Demostración visual. Todavía no se activa la cámara ni se enlazan dispositivos.</span></div></div>';
}

function transactionModal() {
  const item = modal.id ? data.transactions.find(function (entry) { return entry.id === modal.id; }) : null;
  const kind = modal.kind || (item && item.kind) || 'expense';
  const categories = data.categories.filter(function (entry) { return entry.kind === kind; });
  const prefill = !item && modal.prefill;
  const date = item ? item.date : prefill ? prefill.date : defaultEntryDate();
  return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog transaction-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<div class="dialog-head"><div><p class="eyebrow">MOVIMIENTO</p><h2 id="dialog-title">' + (item ? 'Editar movimiento' : 'Agregar movimiento') + '</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
    '<form id="transaction-form" novalidate><div class="kind-switch"><button type="button" data-modal-kind="expense" class="' + (kind === 'expense' ? 'selected' : '') + '">Gasto</button><button type="button" data-modal-kind="income" class="' + (kind === 'income' ? 'selected' : '') + '">Ingreso</button></div>' +
    '<label class="field-label" for="amount">Monto</label><div class="amount-input"><span>$</span><input id="amount" name="amount" inputmode="numeric" type="text" autocomplete="off" data-amount-input value="' + (item ? formatAmountValue(item.amount) : prefill ? formatAmountValue(prefill.amount) : '') + '" placeholder="0" required autofocus /></div>' +
    '<label class="field-label" for="title">Descripción</label><div class="description-autocomplete"><input class="text-input" id="title" name="title" maxlength="80" autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="description-suggestions" value="' + escapeHtml(item ? item.title : prefill ? prefill.title : '') + '" placeholder="' + (kind === 'income' ? '¿De dónde vino el ingreso?' : '¿En qué gastaste?') + '" required /><div id="description-suggestions" class="description-suggestions" role="listbox" hidden></div></div>' +
    '<label class="field-label" for="transaction-note">Detalle <span class="field-optional">(opcional)</span></label><input class="text-input" id="transaction-note" name="note" maxlength="160" value="' + escapeHtml(item ? item.note || '' : '') + '" placeholder="Ejemplo: latte y medialuna" />' +
    '<div class="form-row"><div>' + customSelect('category-picker', 'Categoría', 'category', item ? item.categoryId : modal.categoryId || '', categories.map(function (category) {
      return { value: category.id, label: category.name, leading: '<span class="dropdown-symbol ' + toneClass(category.tone) + '"' + toneStyle(category.tone) + '>' + icon(category.icon, 16) + '</span>' };
    }), 'form-dropdown') + '</div><div>' + datePicker(date) + '</div></div>' +
    '<span class="field-label" id="receipt-label">Boleta o captura <span class="field-optional">(opcional)</span></span><div class="receipt-field" data-receipt-field>' + receiptFieldMarkup() + '</div>' +
    '<span class="field-label">Factura o documento <span class="field-optional">(opcional)</span></span><div class="receipt-field" data-document-field>' + documentFieldMarkup() + '</div>' +
    '<div class="dialog-actions">' + (item ? '<button class="button button-danger" type="button" data-action="delete-transaction">' + icon('trash', 17) + '<span>Eliminar</span></button>' : '') +
      '<button class="button button-primary" type="submit">' + (item ? 'Guardar cambios' : kind === 'income' ? 'Guardar ingreso' : 'Guardar gasto') + '</button></div></form></div>';
}

// Boletas: se guardan aparte en la PC y el movimiento solo guarda su identificador.
const RECEIPT_DEMO_KEY = 'miplata-prototype-receipts';

function demoReceipts() {
  try { return JSON.parse(localStorage.getItem(RECEIPT_DEMO_KEY)) || {}; } catch (error) { return {}; }
}

function receiptSrc(id) {
  return LIVE ? '/api/receipts/' + encodeURIComponent(id) : demoReceipts()[id] || '';
}

function receiptFieldMarkup() {
  if (modal.receiptUploading) return '<div class="receipt-empty is-busy">' + icon('image', 20) + '<span>Preparando la imagen...</span></div>';
  const picker = '<input id="receipt-file" type="file" accept="image/*" hidden />';
  if (!modal.receiptId) {
    return '<label class="receipt-empty" for="receipt-file">' + icon('image', 20) + '<span><strong>Adjuntar foto o captura</strong><small>Toma una foto de la boleta o elige una imagen.</small></span></label>' + picker;
  }
  return '<div class="receipt-preview"><button class="receipt-thumb" type="button" data-action="view-receipt" aria-label="Ver boleta"><img src="' + escapeHtml(receiptSrc(modal.receiptId)) + '" alt="Boleta adjunta" data-receipt-image /></button>' +
    '<div class="receipt-actions"><button class="text-button" type="button" data-action="view-receipt">' + icon('eye', 15) + ' Ver</button><label class="text-button" for="receipt-file">' + icon('image', 15) + ' Cambiar</label><button class="text-button receipt-remove" type="button" data-action="remove-receipt">' + icon('trash', 15) + ' Quitar</button></div></div>' + picker;
}

// Documentos: PDF, planillas o XML de la factura. Se descargan o se abren con el programa del equipo.
const DOCUMENT_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'ods', 'csv', 'docx', 'doc', 'odt', 'xml', 'txt'];
const DOCUMENT_DEMO_KEY = 'miplata-prototype-documents';

function documentHref(id, name) {
  if (!LIVE) { try { return (JSON.parse(localStorage.getItem(DOCUMENT_DEMO_KEY)) || {})[id] || '#'; } catch (error) { return '#'; } }
  return '/api/documents/' + encodeURIComponent(id) + '?name=' + encodeURIComponent(name);
}

function documentFieldMarkup() {
  if (modal.documentUploading) return '<div class="receipt-empty is-busy">' + icon('file', 20) + '<span>Subiendo el archivo...</span></div>';
  const picker = '<input id="document-file" type="file" accept="' + DOCUMENT_EXTENSIONS.map(function (extension) { return '.' + extension; }).join(',') + '" hidden />';
  if (!modal.documentId) {
    return '<label class="receipt-empty" for="document-file">' + icon('file', 20) + '<span><strong>Adjuntar archivo</strong><small>PDF, Excel, Word, CSV o XML, hasta 15 MB.</small></span></label>' + picker;
  }
  return '<div class="document-preview"><span class="document-icon">' + icon('file', 20) + '</span><span class="document-name" title="' + escapeHtml(modal.documentName) + '">' + escapeHtml(modal.documentName) + '</span></div>' +
    '<div class="receipt-actions document-actions"><a class="text-button" href="' + escapeHtml(documentHref(modal.documentId, modal.documentName)) + '" download="' + escapeHtml(modal.documentName) + '">' + icon('download', 15) + ' Abrir</a><label class="text-button" for="document-file">' + icon('file', 15) + ' Cambiar</label><button class="text-button receipt-remove" type="button" data-action="remove-document">' + icon('trash', 15) + ' Quitar</button></div>' + picker;
}

function refreshDocumentField() {
  const field = document.querySelector('[data-document-field]');
  if (field && modal && modal.type === 'transaction') field.innerHTML = documentFieldMarkup();
}

async function storeDocument(file) {
  const extension = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1];
  if (!extension || !DOCUMENT_EXTENSIONS.includes(extension.toLowerCase())) throw new Error('Sube un PDF, Excel, Word, CSV, XML o TXT');
  if (file.size > 15000000) throw new Error('El archivo supera los 15 MB');
  if (!LIVE) {
    if (file.size > 1500000) throw new Error('En la demostración el archivo debe pesar menos de 1,5 MB');
    const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12).padEnd(10, '0');
    let documents = {};
    try { documents = JSON.parse(localStorage.getItem(DOCUMENT_DEMO_KEY)) || {}; } catch (error) { documents = {}; }
    documents[id] = await readFileAsDataUrl(file);
    try { localStorage.setItem(DOCUMENT_DEMO_KEY, JSON.stringify(documents)); } catch (error) { throw new Error('No queda espacio en este navegador para el archivo'); }
    return { id: id, name: file.name };
  }
  const response = await fetch('/api/documents?name=' + encodeURIComponent(file.name), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo guardar el archivo');
  return result;
}

function refreshReceiptField() {
  const field = document.querySelector('[data-receipt-field]');
  if (field && modal && modal.type === 'transaction') field.innerHTML = receiptFieldMarkup();
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(new Error('No se pudo leer la imagen')); };
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = function () { resolve(image); };
    image.onerror = function () { reject(new Error('No se pudo abrir la imagen. Prueba con una foto JPG o PNG.')); };
    image.src = source;
  });
}

// Achica la imagen a un tamaño legible (2000 px por lado como máximo) antes de guardarla.
async function compressReceipt(file) {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen');
  if (file.size > 40000000) throw new Error('La imagen es demasiado grande');
  const image = await loadImage(await readFileAsDataUrl(file));
  const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function storeReceipt(file) {
  const canvas = await compressReceipt(file);
  if (!LIVE) {
    const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12).padEnd(10, '0');
    const receipts = demoReceipts();
    receipts[id] = canvas.toDataURL('image/jpeg', 0.7);
    try { localStorage.setItem(RECEIPT_DEMO_KEY, JSON.stringify(receipts)); } catch (error) { throw new Error('No queda espacio en este navegador para la imagen'); }
    return id;
  }
  const blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.82); });
  if (!blob) throw new Error('No se pudo preparar la imagen');
  const response = await fetch('/api/receipts', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo guardar la boleta');
  return result.id;
}

function openReceiptViewer(id) {
  closeReceiptViewer();
  document.body.insertAdjacentHTML('beforeend', '<div class="receipt-viewer" role="dialog" aria-modal="true" aria-label="Boleta" data-receipt-viewer><button class="icon-button receipt-viewer-close" type="button" data-action="close-receipt-viewer" aria-label="Cerrar">' + icon('close', 20) + '</button><div class="receipt-viewer-backdrop" data-action="close-receipt-viewer"></div><img src="' + escapeHtml(receiptSrc(id)) + '" alt="Boleta" data-receipt-image /></div>');
  document.querySelector('.receipt-viewer-close').focus();
}

function closeReceiptViewer() {
  const viewer = document.querySelector('[data-receipt-viewer]');
  if (!viewer) return false;
  viewer.remove();
  return true;
}

function updateDescriptionSuggestions() {
  const input = document.getElementById('title');
  const list = document.getElementById('description-suggestions');
  const category = document.querySelector('[data-dropdown="category-picker"] input[name="category"]');
  if (!input || !list || !category) return;
  const matches = matchingConcepts(category.value, input.value).filter(function (group) { return group.key !== conceptKey(input.value); });
  list.innerHTML = matches.map(function (group, index) {
    return '<button class="description-suggestion" type="button" role="option" id="description-suggestion-' + index + '" data-description-choice="' + escapeHtml(group.title) + '"><strong>' + escapeHtml(group.title) + '</strong><span>' + group.count + (group.count === 1 ? ' vez' : ' veces') + '</span></button>';
  }).join('');
  list.hidden = !matches.length;
  input.setAttribute('aria-expanded', String(Boolean(matches.length)));
  input.removeAttribute('aria-activedescendant');
}

function hideDescriptionSuggestions() {
  const input = document.getElementById('title');
  const list = document.getElementById('description-suggestions');
  if (list) list.hidden = true;
  if (input) { input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
}

function savingsModal() {
  const item = modal.id ? data.transactions.find(function (entry) { return entry.id === modal.id; }) : null;
  const action = item ? (item.categoryId === 'savings' ? 'deposit' : 'withdrawal') : modal.action;
  const deposit = action === 'deposit';
  const currency = item ? savingsCurrency(item) : 'CLP';
  const date = item ? item.date : defaultEntryDate();
  const balances = savingsBalances();
  const availableCurrencies = SAVINGS_CURRENCIES.concat((currency === 'EUR' && item) || (!deposit && balances.EUR > 0) ? [LEGACY_EUR] : []);
  const choices = availableCurrencies.filter(function (entry) { return deposit || balances[entry.code] > 0 || entry.code === currency && item; }).map(function (entry) {
    return { value: entry.code, label: entry.name + ' (' + entry.code + ')', leading: '<span class="currency-option-code">' + entry.code + '</span>' };
  });
  return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog savings-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<div class="dialog-head"><div><p class="eyebrow">AHORROS</p><h2 id="dialog-title">' + (item ? deposit ? 'Editar aporte' : 'Editar retiro' : deposit ? 'Agregar ahorro' : 'Retirar de ahorros') + '</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
    '<form id="savings-form" novalidate><p class="savings-form-note">' + (deposit ? 'Se anotará como gasto en CLP y aumentará el ahorro en la moneda elegida.' : 'Se anotará como ingreso en CLP y disminuirá el ahorro en la moneda elegida.') + '</p>' +
    customSelect('savings-currency', 'Moneda del ahorro', 'currency', currency, choices, 'form-dropdown') +
    '<label class="field-label" for="savings-units">' + (deposit ? 'Monto que guardas' : 'Monto que retiras') + '</label><div class="amount-input"><span data-savings-currency-symbol>' + (currency === 'USD' ? 'US$' : currency === 'EUR' ? '€' : '$') + '</span><input id="savings-units" name="units" inputmode="decimal" type="text" autocomplete="off" data-amount-input data-amount-decimals value="' + (item ? formatAmountValue(savingsUnits(item)) : '') + '" placeholder="0" required autofocus /></div>' +
    '<div data-foreign-cost' + (currency === 'CLP' ? ' hidden' : '') + '><label class="field-label" for="savings-ars-amount">' + (deposit ? 'Costo en pesos (CLP)' : 'Pesos recibidos (CLP)') + '</label><div class="amount-input"><span>$</span><input id="savings-ars-amount" name="arsAmount" inputmode="numeric" type="text" autocomplete="off" data-amount-input value="' + (item && currency !== 'CLP' ? formatAmountValue(item.amount) : '') + '" placeholder="0"' + (currency === 'CLP' ? '' : ' required') + ' /></div><p class="field-help">Ingresa el importe real. No se aplica una cotización automática.</p></div>' +
    '<label class="field-label" for="savings-title">Descripción</label><input class="text-input" id="savings-title" name="title" maxlength="80" value="' + escapeHtml(item ? item.title : '') + '" placeholder="' + (deposit ? 'Ejemplo: Fondo de emergencia' : 'Ejemplo: Retiro para imprevisto') + '" required />' +
    datePicker(date) +
    (item ? '<button class="text-button savings-move-button" type="button" data-action="move-savings-category">Mover a otra categoría ' + icon('arrowRight', 15) + '</button>' : '') +
    '<div class="dialog-actions">' + (item ? '<button class="button button-danger" type="button" data-action="delete-transaction">' + icon('trash', 17) + '<span>Eliminar</span></button>' : '') +
    '<button class="button button-primary" type="submit">' + (deposit ? 'Guardar aporte' : 'Guardar retiro') + '</button></div></form></div>';
}

function categoryModal() {
  const category = modal.id ? categoryById(modal.id) : null;
  const selectedIcon = category && CATEGORY_ICON_CATALOG[category.icon] ? category.icon : 'basket';
  const selectedTone = category ? category.tone : 'lavender';
  const customColor = isCustomTone(selectedTone) ? selectedTone.toUpperCase() : '#1FA774';
  const customSelected = isCustomTone(selectedTone);
  return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog category-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<div class="dialog-head"><div><p class="eyebrow">CATEGORÍAS</p><h2 id="dialog-title">' + (category ? 'Editar categoría' : 'Nueva categoría') + '</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
    '<form id="category-form" novalidate><label class="field-label" for="category-name">Nombre</label><input class="text-input" id="category-name" name="name" maxlength="32" value="' + escapeHtml(category ? category.name : '') + '" placeholder="Ejemplo: Mascotas" required />' +
    '<span class="field-label" id="icon-picker-label">Ícono</span><div class="category-icon-picker" role="group" aria-labelledby="icon-picker-label"><div class="icon-search-wrap">' + icon('search', 17) + '<input id="icon-search" type="search" placeholder="Buscar, por ejemplo: moto" autocomplete="off" aria-label="Buscar ícono" /></div>' +
    '<input type="hidden" name="icon" value="' + escapeHtml(selectedIcon) + '" /><div class="icon-choice-grid" role="radiogroup" aria-label="Ícono de categoría">' +
      Object.entries(CATEGORY_ICON_CATALOG).map(function (entry) { const name = entry[0], item = entry[1]; return '<button class="icon-choice' + (name === selectedIcon ? ' selected' : '') + '" type="button" role="radio" data-icon-choice="' + name + '" data-icon-search="' + escapeHtml(item.label + ' ' + item.keywords) + '" aria-checked="' + String(name === selectedIcon) + '" aria-label="' + escapeHtml(item.label) + '">' + icon(name, 20) + '<span>' + escapeHtml(item.label) + '</span></button>'; }).join('') +
    '</div><p class="icon-empty" hidden>No encontramos ese ícono.</p></div>' +
    '<span class="field-label">Color</span><div class="tone-options" role="group" aria-label="Color de categoría">' +
      PRESET_TONES.map(function (tone) { return '<label class="tone-option tone-' + tone + '" aria-label="' + TONE_LABELS[tone] + '"><input type="radio" name="tone" value="' + tone + '"' + (selectedTone === tone ? ' checked' : '') + ' /><span></span></label>'; }).join('') +
      '<input class="visually-hidden" type="radio" id="custom-tone-radio" name="tone" value="custom"' + (customSelected ? ' checked' : '') + ' /></div>' +
    '<button class="custom-tone-toggle' + (customSelected ? ' selected' : '') + '" type="button" data-custom-tone-toggle aria-expanded="' + String(customSelected) + '"><span class="custom-tone-dot" style="background:' + customColor + '"></span><span>Color personalizado</span>' + icon('arrowDown', 16) + '</button>' +
    '<div class="custom-tone-panel" data-custom-tone-panel' + (customSelected ? '' : ' hidden') + '><label class="custom-color-swatch" style="background:' + customColor + '" aria-label="Elegir color"><input id="category-color" type="color" value="' + customColor + '" /></label><div><label class="field-label" for="category-color-hex">Código HEX</label><input class="text-input color-hex-input" id="category-color-hex" name="customTone" maxlength="7" value="' + customColor + '" placeholder="#1FA774" spellcheck="false" /></div></div>' +
    '<div class="dialog-actions">' + (category && category.id !== 'savings' && category.id !== 'savings-return' ? '<button class="button button-danger" type="button" data-action="delete-category">' + icon('trash', 17) + '<span>Eliminar</span></button>' : '') +
      '<button class="button button-primary" type="submit">Guardar categoría</button></div></form></div>';
}

function qrModal() {
  if (LIVE) {
    const request = desktopInfo.pending[0];
    const person = pairPerson === 'owner' ? null : personById(pairPerson);
    const networks = desktopInfo.networks.map(function (option) { return '<button class="network-option' + (selectedNetwork === option.address ? ' selected' : '') + '" data-pair-address="' + escapeHtml(option.address) + '" type="button">' + escapeHtml(option.label) + '</button>'; }).join('');
    return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog qr-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
      '<div class="dialog-head"><div><p class="eyebrow">ACCESO MÓVIL</p><h2 id="dialog-title">' + (request ? 'Solicitud de acceso' : person ? 'Conectar celular de ' + escapeHtml(person.name) : 'Conectar iPhone') + '</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
      (request ? '<div class="approval-icon">' + icon('phone', 30) + '</div><p class="qr-intro">' + (request.personName ? '<strong>' + escapeHtml(request.name) + '</strong> solicita acceso a los gastos de <strong>' + escapeHtml(request.personName) + '</strong>. Permite el acceso solo si es el celular de esa persona.' : '<strong>' + escapeHtml(request.name) + '</strong> solicita acceso a tus gastos. Permite el acceso solo si es tu celular.') + '</p><div class="approval-actions"><button class="button button-outline" data-pair-decision="deny" data-request-id="' + escapeHtml(request.id) + '" type="button">Rechazar</button><button class="button button-primary" data-pair-decision="approve" data-request-id="' + escapeHtml(request.id) + '" type="button">Permitir acceso</button></div>' :
      '<p class="qr-intro">' + (person ? 'Pídele a ' + escapeHtml(person.name) + ' que escanee este QR con su celular. Verá solo sus propios gastos.' : 'Elige la conexión, escanea el QR con Safari y aprueba la solicitud en esta PC.') + '</p><div class="network-options">' + (networks || '<p>Conecta la PC a Wi-Fi o Tailscale para generar el QR.</p>') + '</div>' +
      (pairingInfo ? '<div class="qr-wrap"><img class="real-qr" src="' + pairingInfo.qr + '" alt="QR para vincular el iPhone" /></div><p class="pair-url">' + escapeHtml(pairingInfo.url) + '</p><p class="qr-disclaimer">Este QR vence en 5 minutos. Fuera de casa, usa Tailscale en la PC y el iPhone.</p>' : '<p class="qr-disclaimer">Preparando QR...</p>')) + '</div>';
  }
  const pending = pairingStep === 'desktop-pending';
  return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog qr-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<div class="dialog-head"><div><p class="eyebrow">ACCESO MÓVIL</p><h2 id="dialog-title">' + (pending ? 'Solicitud de iPhone' : 'Conectar iPhone') + '</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
    (pending
      ? '<div class="approval-icon">' + icon('phone', 30) + '</div><p class="qr-intro">Un iPhone solicita acceso a MiPlata. En la app real, aprobarías un dispositivo concreto desde esta ventana.</p><div class="approval-actions"><button class="button button-outline" data-action="deny-pair" type="button">Rechazar</button><button class="button button-primary" data-action="approve-pair" type="button">Permitir acceso</button></div>'
      : '<p class="qr-intro">Escanea este código desde tu iPhone y aprueba la solicitud en esta PC.</p><div class="qr-wrap">' + qrMarkup() + '</div><div class="pair-code-display"><small>CÓDIGO MANUAL</small><strong>' + QR_CODE + '</strong></div>' +
        '<button class="button button-outline full-width" data-action="simulate-request" type="button">Simular solicitud desde el iPhone</button><p class="qr-disclaimer">QR ilustrativo. El enlace real se implementará después de aprobar el diseño.</p>') +
    '</div>';
}

function confirmationModal() {
  const item = modal.action === 'delete-transaction' ? data.transactions.find(function (entry) { return entry.id === modal.id; }) : null;
  const category = modal.action === 'delete-category' ? categoryById(modal.id) : null;
  const device = modal.action === 'revoke-device' ? desktopInfo.devices.find(function (entry) { return entry.id === modal.id; }) : null;
  const person = modal.action === 'remove-person' ? personById(modal.id) : null;
  const title = person ? 'Eliminar persona' : modal.action === 'reset' ? 'Restaurar el ejemplo' : modal.action === 'restore' ? 'Restaurar copia' : device ? 'Revocar dispositivo' : item ? 'Eliminar movimiento' : 'Eliminar categoría';
  const description = person ? 'Se borrarán todos los gastos, boletas y documentos de "' + escapeHtml(person.name) + '", y sus celulares perderán el acceso. Esto no se puede deshacer.'
    : modal.action === 'reset'
    ? 'Se descartarán los cambios que hiciste en esta demostración y volverán los datos originales.'
    : modal.action === 'restore' ? 'Se reemplazarán los datos actuales por los de la copia elegida. Antes se guardará una copia automática de seguridad.'
    : device ? '¿Quieres quitar el acceso de "' + escapeHtml(device.name) + '"? Tendrás que vincularlo otra vez por QR.'
    : item ? '¿Quieres eliminar "' + escapeHtml(item.title) + '"? Este movimiento dejará de aparecer en el saldo y los gráficos.'
    : '¿Quieres eliminar la categoría "' + escapeHtml(category ? category.name : '') + '"?';
  const actionLabel = person ? 'Eliminar persona' : modal.action === 'reset' ? 'Restaurar ejemplo' : modal.action === 'restore' ? 'Restaurar copia' : device ? 'Revocar acceso' : 'Eliminar';
  return '<div class="modal-backdrop" data-action="cancel-confirm"></div><div class="dialog confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="confirm-description">' +
    '<div class="dialog-head"><div><p class="eyebrow">CONFIRMACIÓN</p><h2 id="dialog-title">' + title + '</h2></div><button class="icon-button" data-action="cancel-confirm" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
    '<p class="confirm-description" id="confirm-description">' + description + '</p><div class="dialog-actions confirm-actions"><button class="button button-outline" data-action="cancel-confirm" type="button">Cancelar</button><button class="button button-danger" data-action="confirm-action" type="button">' + actionLabel + '</button></div></div>';
}

function mergeConceptsModal() {
  const category = categoryById(modal.categoryId);
  const groups = conceptGroups(modal.categoryId).sort(function (a, b) { return a.title.localeCompare(b.title, 'es-CL'); });
  const choices = groups.map(function (group) { return { value: group.key, label: group.title }; });
  return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog merge-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<div class="dialog-head"><div><p class="eyebrow">' + escapeHtml(category ? category.name.toLocaleUpperCase('es-CL') : 'CATEGORÍA') + '</p><h2 id="dialog-title">Unir nombres</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
    '<p class="savings-form-note">Si escribiste el mismo comercio de distintas formas, unifica sus movimientos para verlo en un solo gráfico.</p>' +
    '<form id="merge-concepts-form" novalidate>' +
      customSelect('merge-source', 'Nombre actual', 'source', groups[0] && groups[0].key, choices, 'form-dropdown') +
      customSelect('merge-target', 'Unir con', 'target', groups[1] && groups[1].key, choices, 'form-dropdown') +
      '<p class="merge-hint">Se cambiará la descripción de todos los movimientos de esta categoría que tengan el primer nombre. Montos, fechas y detalles se conservan.</p>' +
      '<div class="dialog-actions"><button class="button button-outline" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Unir nombres</button></div></form></div>';
}

function breakdownModal() {
  const annual = modal.scope === 'annual';
  const label = annual ? String(annualYear) : monthLabel(selectedMonth);
  const breakdown = breakdownData(annual ? yearTransactions(annualYear) : selectedTransactions());
  const rows = breakdown.entries.map(function (entry) {
    const percent = breakdown.total ? entry.amount / breakdown.total * 100 : 0;
    const value = percent < 1 ? '&lt;1%' : percent.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + '%';
    const inner = '<span class="breakdown-detail-name"><span class="legend-dot ' + toneClass(entry.tone) + '"' + toneStyle(entry.tone) + '></span><strong>' + escapeHtml(entry.name) + '</strong></span><span class="breakdown-detail-value"><strong>' + money(entry.amount) + '</strong><small>' + value + '</small></span><span class="breakdown-detail-meta">' + entry.count + (entry.count === 1 ? ' movimiento' : ' movimientos') + '</span><span class="breakdown-detail-track"><span style="width:' + percent.toFixed(2) + '%;background:' + toneColor(entry.tone) + '"></span></span>';
    return annual
      ? '<div class="breakdown-detail-row">' + inner + '</div>'
      : '<button class="breakdown-detail-row" type="button" data-category-detail="' + escapeHtml(entry.id) + '" aria-label="Ver análisis de ' + escapeHtml(entry.name) + '">' + inner + '</button>';
  }).join('');
  return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog breakdown-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<div class="dialog-head"><div><p class="eyebrow">' + (annual ? 'RESUMEN ANUAL' : 'RESUMEN MENSUAL') + '</p><h2 id="dialog-title">Gastos por categoría</h2><span class="breakdown-period">' + escapeHtml(label) + '</span></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div>' +
    '<div class="breakdown-dialog-chart">' + donutChart(breakdown.entries, breakdown.total, label, false, 'large') + '<p>' + breakdown.entries.length + (breakdown.entries.length === 1 ? ' categoría' : ' categorías') + ' · ' + breakdown.entries.reduce(function (sum, entry) { return sum + entry.count; }, 0) + ' gastos</p></div>' +
    '<div class="breakdown-detail-list">' + rows + '</div>' +
    (annual ? '<p class="breakdown-detail-note">Elige un mes para analizar una categoría y sus movimientos.</p>' : '<p class="breakdown-detail-note">Toca una categoría para ver sus movimientos y comercios.</p>') + '</div>';
}

function renderModal() {
  if (modal.type === 'breakdown') return breakdownModal();
  if (modal.type === 'transaction') return transactionModal();
  if (modal.type === 'merge-concepts') return mergeConceptsModal();
  if (modal.type === 'savings') return savingsModal();
  if (modal.type === 'category') return categoryModal();
  if (modal.type === 'qr') return qrModal();
  if (modal.type === 'balance') return '<div class="modal-backdrop" data-action="close-modal"></div><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-head"><div><p class="eyebrow">TUS DATOS</p><h2 id="dialog-title">Saldo inicial</h2></div><button class="icon-button" data-action="close-modal" type="button" aria-label="Cerrar">' + icon('close', 20) + '</button></div><form id="balance-form"><p class="savings-form-note">El saldo actual suma tus movimientos a este importe.</p><label class="field-label" for="opening-balance">Saldo inicial en pesos</label><div class="amount-input"><span>$</span><input id="opening-balance" name="balance" type="text" inputmode="numeric" autocomplete="off" data-amount-input data-amount-negative value="' + formatAmountValue(data.openingBalance) + '" required /></div><div class="dialog-actions"><button class="button button-outline" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Guardar saldo</button></div></form></div>';
  if (modal.type === 'confirmation') return confirmationModal();
  if (modal.type === 'budget') return budgetModal();
  if (modal.type === 'person') return personModal();
  if (modal.type === 'invite') return inviteModal();
  if (modal.type === 'password') return passwordModal();
  if (modal.type === 'goal') return goalModal();
  if (modal.type === 'recurring') return recurringModal();
  return '';
}

function render() {
  document.body.classList.toggle('live-app', LIVE);
  document.documentElement.dataset.theme = data.theme;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', data.theme === 'light' ? '#f7faf8' : '#0c1512');
  let content = '';
  if (route === 'home') content = renderHome();
  else if (route === 'annual') content = renderAnnual();
  else if (route === 'transactions') content = renderTransactions();
  else if (route === 'categories') content = renderCategories();
  else if (route === 'category-detail') content = renderCategoryDetail();
  else if (route === 'savings') content = renderSavings();
  else if (route === 'pair') content = renderPairPage();
  else content = renderSettings();
  document.getElementById('app').innerHTML = shell(content);
  document.body.classList.toggle('modal-open', Boolean(modal));
}

function moveCategory(id, direction) {
  const kind = (categoryById(id) || {}).kind;
  const group = data.categories.filter(function (category) { return category.kind === kind; });
  const index = group.findIndex(function (category) { return category.id === id; });
  const other = group[index + direction];
  if (!other) return;
  const a = data.categories.findIndex(function (category) { return category.id === id; });
  const b = data.categories.findIndex(function (category) { return category.id === other.id; });
  [data.categories[a], data.categories[b]] = [data.categories[b], data.categories[a]];
  saveData();
  render();
}

function openTransaction(kind, id, categoryId) {
  const item = id ? data.transactions.find(function (entry) { return entry.id === id; }) : null;
  modal = { type: 'transaction', kind: item ? item.kind : kind, id: id || null, categoryId: categoryId || null, receiptId: item && item.receiptId || null, documentId: item && item.documentId || null, documentName: item && item.documentName || null };
  render();
  const amount = document.getElementById('amount');
  if (amount && !id) amount.focus();
}

function openSavings(action, id) {
  const item = id ? data.transactions.find(function (entry) { return entry.id === id; }) : null;
  modal = { type: 'savings', action: item ? item.categoryId === 'savings' ? 'deposit' : 'withdrawal' : action, id: id || null };
  render();
  if (!id) document.getElementById('savings-units')?.focus();
}

function updateSavingsCurrencyUi(form, currency) {
  const foreign = currency !== 'CLP';
  const costField = form.querySelector('[data-foreign-cost]');
  costField.hidden = !foreign;
  costField.querySelector('input').required = foreign;
  form.querySelector('[data-savings-currency-symbol]').textContent = currency === 'USD' ? 'US$' : currency === 'EUR' ? '€' : '$';
}

function navigate(next) {
  if (next === 'annual') annualYear = Number(selectedMonth.slice(0, 4));
  route = next;
  modal = null;
  window.scrollTo({ top: 0, behavior: 'instant' });
  render();
}

function closeDropdowns(except) {
  document.querySelectorAll('.custom-select.is-open').forEach(function (dropdown) {
    if (dropdown === except) return;
    dropdown.classList.remove('is-open');
    dropdown.querySelector('[data-dropdown-trigger]').setAttribute('aria-expanded', 'false');
  });
}

function openDropdown(dropdown, focusOption) {
  closeDropdowns(dropdown);
  dropdown.classList.add('is-open');
  dropdown.querySelector('[data-dropdown-trigger]').setAttribute('aria-expanded', 'true');
  if (focusOption) {
    const selected = dropdown.querySelector('[data-dropdown-option][aria-selected="true"]');
    (selected || dropdown.querySelector('[data-dropdown-option]'))?.focus();
  }
}

function closeDatePickers(except) {
  document.querySelectorAll('.date-picker.is-open').forEach(function (picker) {
    if (picker === except) return;
    picker.classList.remove('is-open');
    picker.querySelector('[data-date-trigger]').setAttribute('aria-expanded', 'false');
  });
}

function closePeriodPickers(except) {
  document.querySelectorAll('.period-picker.is-open').forEach(function (picker) {
    if (picker === except) return;
    picker.classList.remove('is-open');
    picker.querySelector('[data-period-trigger]').setAttribute('aria-expanded', 'false');
  });
}

document.addEventListener('click', function (event) {
  if (event.target.matches('.custom-select.is-open')) { closeDropdowns(); return; }
  if (event.target.matches('.date-picker.is-open')) { closeDatePickers(); return; }
  if (event.target.matches('.period-picker.is-open')) { closePeriodPickers(); return; }
  const annualMonth = event.target.closest('[data-annual-month]');
  if (annualMonth) { selectedMonth = annualMonth.dataset.annualMonth; navigate('home'); return; }
  const annualShift = event.target.closest('[data-annual-year-shift]');
  if (annualShift) {
    const nextYear = annualYear + Number(annualShift.dataset.annualYearShift);
    if (nextYear >= 1900 && nextYear <= 9999) { annualYear = nextYear; render(); }
    return;
  }
  const periodMonth = event.target.closest('[data-period-month]');
  if (periodMonth) {
    selectedMonth = periodMonth.dataset.periodMonth;
    render();
    document.querySelector('[data-period-trigger]')?.focus();
    return;
  }
  const periodYearShift = event.target.closest('[data-period-year-shift]');
  if (periodYearShift) {
    const picker = periodYearShift.closest('[data-period-picker]');
    const year = Number(picker.dataset.viewYear) + Number(periodYearShift.dataset.periodYearShift);
    if (year < 1900 || year > 9999) return;
    picker.dataset.viewYear = year;
    picker.querySelector('.period-popover').innerHTML = periodYearMarkup(year);
    picker.querySelector('[data-period-year-shift="' + periodYearShift.dataset.periodYearShift + '"]').focus();
    return;
  }
  const periodTrigger = event.target.closest('[data-period-trigger]');
  if (periodTrigger) {
    const picker = periodTrigger.closest('[data-period-picker]');
    const wasOpen = picker.classList.contains('is-open');
    closeDropdowns(); closeDatePickers(); closePeriodPickers();
    if (!wasOpen) { picker.classList.add('is-open'); periodTrigger.setAttribute('aria-expanded', 'true'); }
    return;
  }
  const periodShift = event.target.closest('[data-period-shift]');
  if (periodShift) { shiftSelectedMonth(Number(periodShift.dataset.periodShift)); return; }
  const calendarDay = event.target.closest('[data-calendar-day]');
  if (calendarDay) {
    const picker = calendarDay.closest('[data-date-picker]');
    const date = calendarDay.dataset.calendarDay;
    picker.querySelector('[name="date"]').value = date;
    picker.querySelector('[data-date-label]').textContent = numericDate(date);
    closeDatePickers();
    picker.querySelector('[data-date-trigger]').focus();
    return;
  }
  const calendarShift = event.target.closest('[data-calendar-shift]');
  if (calendarShift) {
    const picker = calendarShift.closest('[data-date-picker]');
    const parts = picker.dataset.calendarMonth.split('-').map(Number);
    const next = new Date(parts[0], parts[1] - 1 + Number(calendarShift.dataset.calendarShift), 1);
    const month = next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0');
    picker.dataset.calendarMonth = month;
    picker.querySelector('.date-popover').innerHTML = calendarMarkup(month, picker.querySelector('[name="date"]').value);
    picker.querySelector('[data-calendar-shift="' + calendarShift.dataset.calendarShift + '"]').focus();
    return;
  }
  const dateTrigger = event.target.closest('[data-date-trigger]');
  if (dateTrigger) {
    const picker = dateTrigger.closest('[data-date-picker]');
    const wasOpen = picker.classList.contains('is-open');
    closeDropdowns(); closePeriodPickers();
    closeDatePickers();
    if (!wasOpen) {
      picker.classList.add('is-open');
      dateTrigger.setAttribute('aria-expanded', 'true');
    }
    return;
  }
  const dropdownOption = event.target.closest('[data-dropdown-option]');
  if (dropdownOption) {
    const dropdown = dropdownOption.closest('[data-dropdown]');
    const value = dropdownOption.dataset.value;
    if (dropdown.dataset.dropdown === 'month-picker') {
      selectedMonth = value;
      render();
      document.querySelector('[data-dropdown="month-picker"] [data-dropdown-trigger]')?.focus();
    } else {
      dropdown.querySelector('input[type="hidden"]').value = value;
      dropdown.querySelector('.dropdown-value').innerHTML = dropdownOption.querySelector('.dropdown-option-content').innerHTML;
      dropdown.querySelectorAll('[data-dropdown-option]').forEach(function (option) {
        option.setAttribute('aria-selected', String(option === dropdownOption));
      });
      closeDropdowns();
      if (dropdown.dataset.dropdown === 'savings-currency') updateSavingsCurrencyUi(dropdown.closest('form'), value);
      if (dropdown.dataset.dropdown === 'category-picker') updateDescriptionSuggestions();
      dropdown.querySelector('[data-dropdown-trigger]').focus();
    }
    return;
  }
  const dropdownTrigger = event.target.closest('[data-dropdown-trigger]');
  if (dropdownTrigger) {
    const dropdown = dropdownTrigger.closest('[data-dropdown]');
    closeDatePickers(); closePeriodPickers();
    if (dropdown.classList.contains('is-open')) closeDropdowns();
    else openDropdown(dropdown, false);
    return;
  }
  if (!event.target.closest('[data-dropdown]')) closeDropdowns();
  if (!event.target.closest('[data-date-picker]')) closeDatePickers();
  if (!event.target.closest('[data-period-picker]')) closePeriodPickers();
  const descriptionChoice = event.target.closest('[data-description-choice]');
  if (descriptionChoice) {
    const input = document.getElementById('title');
    input.value = descriptionChoice.dataset.descriptionChoice;
    hideDescriptionSuggestions();
    input.focus();
    return;
  }
  if (!event.target.closest('.description-autocomplete')) hideDescriptionSuggestions();
  const iconChoice = event.target.closest('[data-icon-choice]');
  if (iconChoice) {
    const picker = iconChoice.closest('.category-icon-picker');
    picker.querySelector('[name="icon"]').value = iconChoice.dataset.iconChoice;
    picker.querySelectorAll('[data-icon-choice]').forEach(function (choice) {
      choice.classList.toggle('selected', choice === iconChoice);
      choice.setAttribute('aria-checked', String(choice === iconChoice));
    });
    return;
  }
  const customToneToggle = event.target.closest('[data-custom-tone-toggle]');
  if (customToneToggle) {
    document.getElementById('custom-tone-radio').checked = true;
    document.querySelector('[data-custom-tone-panel]').hidden = false;
    customToneToggle.classList.add('selected');
    customToneToggle.setAttribute('aria-expanded', 'true');
    return;
  }
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) { navigate(routeButton.dataset.route); return; }
  const categoryDetail = event.target.closest('[data-category-detail]');
  if (categoryDetail) {
    const category = categoryById(categoryDetail.dataset.categoryDetail);
    if (!category) return;
    if (category.id === 'savings' || category.id === 'savings-return') { navigate('savings'); return; }
    selectedCategoryId = category.id;
    categoryKind = category.kind;
    conceptFilter = null;
    navigate('category-detail');
    return;
  }
  const conceptButton = event.target.closest('[data-concept-filter]');
  if (conceptButton) { conceptFilter = conceptButton.dataset.conceptFilter || null; render(); return; }
  const categoryAdd = event.target.closest('[data-add-category-transaction]');
  if (categoryAdd) {
    const category = categoryById(categoryAdd.dataset.addCategoryTransaction);
    if (category) openTransaction(category.kind, null, category.id);
    return;
  }
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) { filter = filterButton.dataset.filter; render(); return; }
  const categoryKindButton = event.target.closest('[data-category-kind]');
  if (categoryKindButton) { categoryKind = categoryKindButton.dataset.categoryKind; render(); return; }
  const editTransaction = event.target.closest('[data-edit-transaction]');
  if (editTransaction) {
    const item = data.transactions.find(function (entry) { return entry.id === editTransaction.dataset.editTransaction; });
    if (item && isSavingsEntry(item)) openSavings(null, item.id);
    else openTransaction(null, editTransaction.dataset.editTransaction);
    return;
  }
  const payRecurring = event.target.closest('[data-pay-recurring]');
  if (payRecurring) {
    const payment = upcomingPayments().find(function (entry) { return entry.entry.id === payRecurring.dataset.payRecurring; });
    if (!payment) return;
    modal = { type: 'transaction', kind: 'expense', id: null, categoryId: payment.entry.categoryId, receiptId: null, documentId: null, documentName: null, prefill: { amount: payment.entry.amount, title: payment.entry.title, date: payment.days < 0 ? todayDate() : payment.due } };
    render();
    return;
  }
  const deleteRecurring = event.target.closest('[data-delete-recurring]');
  if (deleteRecurring) {
    data.recurring = (data.recurring || []).filter(function (entry) { return entry.id !== deleteRecurring.dataset.deleteRecurring; });
    saveData(); render(); toast('Pago fijo eliminado');
    return;
  }
  const editSavings = event.target.closest('[data-edit-savings]');
  if (editSavings) { openSavings(null, editSavings.dataset.editSavings); return; }
  const editCategory = event.target.closest('[data-edit-category]');
  if (editCategory) { modal = { type: 'category', id: editCategory.dataset.editCategory }; render(); return; }
  const move = event.target.closest('[data-category-move]');
  if (move) { moveCategory(move.dataset.categoryMove, Number(move.dataset.direction)); return; }
  const setTheme = event.target.closest('[data-theme-option]');
  if (setTheme) { data.theme = setTheme.dataset.themeOption; saveData(); render(); return; }
  const network = event.target.closest('[data-pair-address]');
  if (network && LIVE && DESKTOP) { selectedNetwork = network.dataset.pairAddress; pairingInfo = null; render(); startPairing(selectedNetwork); return; }
  const decision = event.target.closest('[data-pair-decision]');
  if (decision && LIVE && DESKTOP) {
    apiPost('/api/pair/decision', { id: decision.dataset.requestId, approve: decision.dataset.pairDecision === 'approve' })
      .then(function () { return refreshDesktopInfo(false); })
      .then(function () {
        // El QR ya no sirve después de aprobar: se cierra la ventana si no queda otra solicitud.
        if (decision.dataset.pairDecision === 'approve' && modal && modal.type === 'qr' && !desktopInfo.pending.length) { modal = null; pairingInfo = null; render(); }
        toast(decision.dataset.pairDecision === 'approve' ? 'Celular vinculado' : 'Solicitud rechazada');
      })
      .catch(function (error) { toast(error.message); });
    return;
  }
  const pairFor = event.target.closest('[data-pair-person]');
  if (pairFor && LIVE && DESKTOP) { pairPerson = pairFor.dataset.pairPerson; modal = { type: 'qr' }; pairingInfo = null; render(); startPairing(selectedNetwork); return; }
  const invite = event.target.closest('[data-person-invite]');
  if (invite && LIVE && DESKTOP) {
    const personId = invite.dataset.personInvite;
    const person = personId === 'owner' ? { name: 'ti' } : personById(personId);
    apiPost('/api/invites', { personId: personId }).then(function (result) { modal = { type: 'invite', personId: personId, personName: person ? person.name : '', code: result.code, expiresAt: result.expiresAt }; render(); }).catch(function (error) { toast(error.message); });
    return;
  }
  const passwordFor = event.target.closest('[data-person-password]');
  if (passwordFor && LIVE && DESKTOP) { modal = { type: 'password', personId: passwordFor.dataset.personPassword }; render(); document.getElementById('new-password')?.focus(); return; }
  const removePerson = event.target.closest('[data-remove-person]');
  if (removePerson && LIVE && DESKTOP) { modal = { type: 'confirmation', action: 'remove-person', id: removePerson.dataset.removePerson }; render(); return; }
  const revoke = event.target.closest('[data-revoke-device]');
  if (revoke && LIVE && DESKTOP) { modal = { type: 'confirmation', action: 'revoke-device', id: revoke.dataset.revokeDevice }; render(); return; }
  const modalKind = event.target.closest('[data-modal-kind]');
  if (modalKind && modal && modal.type === 'transaction') {
    const currentAmount = document.getElementById('amount').value;
    const currentTitle = document.getElementById('title').value;
    const currentNote = document.getElementById('transaction-note').value;
    const currentDate = document.querySelector('[name="date"]').value;
    modal.kind = modalKind.dataset.modalKind;
    render();
    document.getElementById('amount').value = currentAmount;
    document.getElementById('title').value = currentTitle;
    document.getElementById('transaction-note').value = currentNote;
    document.querySelector('[name="date"]').value = currentDate;
    document.querySelector('[data-date-label]').textContent = numericDate(currentDate);
    document.querySelector('[data-date-picker]').dataset.calendarMonth = currentDate.slice(0, 7);
    document.querySelector('.date-popover').innerHTML = calendarMarkup(currentDate.slice(0, 7), currentDate);
    return;
  }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  switch (action.dataset.action) {
    case 'breakdown-detail': modal = { type: 'breakdown', scope: action.dataset.breakdownScope }; render(); break;
    case 'toggle-theme':
      data.theme = data.theme === 'light' ? 'dark' : 'light'; saveData(); render(); break;
    case 'add-transaction': openTransaction(route === 'transactions' && filter === 'income' ? 'income' : 'expense'); break;
    case 'add-savings': openSavings('deposit'); break;
    case 'withdraw-savings': if (Object.values(savingsBalances()).some(function (amount) { return amount > 0; })) openSavings('withdrawal'); break;
    case 'move-savings-category': if (modal && modal.id) openTransaction(null, modal.id); break;
    case 'add-category': modal = { type: 'category', id: null }; render(); break;
    case 'merge-concepts': modal = { type: 'merge-concepts', categoryId: selectedCategoryId }; render(); break;
    case 'copy-invite':
      if (modal && modal.code && navigator.clipboard) navigator.clipboard.writeText(modal.code).then(function () { toast('Código copiado'); }).catch(function () { toast('Copia el código manualmente'); });
      break;
    case 'logout':
      if (LIVE && !DESKTOP) apiPost('/api/logout', {}).then(function () { window.location.replace('/'); }).catch(function (error) { toast(error.message); });
      break;
    case 'add-person': if (LIVE && DESKTOP) { modal = { type: 'person' }; render(); document.getElementById('person-name')?.focus(); } break;
    case 'show-qr':
      pairPerson = 'owner'; modal = { type: 'qr' }; pairingInfo = null; pairingStep = 'start'; render();
      if (LIVE && DESKTOP) refreshDesktopInfo(false).then(function () { startPairing(selectedNetwork); });
      break;
    case 'edit-opening-balance': modal = { type: 'balance' }; render(); break;
    case 'export-data': if (LIVE && DESKTOP) { window.location.href = '/api/export'; toast('Descargando tu copia de seguridad'); } break;
    case 'restore-data': if (LIVE && DESKTOP) document.getElementById('restore-file')?.click(); break;
    case 'reload-app': window.location.reload(); break;
    case 'open-pair': pairingStep = data.linked ? 'done' : 'start'; navigate('pair'); break;
    case 'close-modal': modal = null; render(); break;
    case 'edit-budget': modal = { type: 'budget' }; render(); document.getElementById('monthly-budget')?.focus(); break;
    case 'remove-budget': delete data.monthlyBudget; modal = null; saveData(); render(); toast('Presupuesto quitado'); break;
    case 'edit-goal': modal = { type: 'goal' }; render(); document.getElementById('goal-name')?.focus(); break;
    case 'remove-goal': delete data.savingsGoal; modal = null; saveData(); render(); toast('Meta quitada'); break;
    case 'manage-recurring': modal = { type: 'recurring' }; render(); document.getElementById('recurring-title')?.focus(); break;
    case 'toggle-filters': filtersOpen = !filtersOpen; render(); if (filtersOpen) document.getElementById('filter-from')?.focus(); break;
    case 'clear-filters': rangeFrom = ''; rangeTo = ''; amountMin = ''; amountMax = ''; render(); break;
    case 'view-receipt': if (modal && modal.receiptId) openReceiptViewer(modal.receiptId); break;
    case 'close-receipt-viewer': closeReceiptViewer(); break;
    case 'remove-document': if (modal && modal.type === 'transaction') { modal.documentId = null; modal.documentName = null; refreshDocumentField(); } break;
    case 'remove-receipt': if (modal && modal.type === 'transaction') { modal.receiptId = null; refreshReceiptField(); } break;
    case 'cancel-confirm': modal = modal && modal.returnTo ? modal.returnTo : null; render(); break;
    case 'simulate-request': pairingStep = 'desktop-pending'; render(); break;
    case 'approve-pair': data.linked = true; pairingStep = 'done'; modal = null; saveData(); render(); toast('iPhone vinculado en la demostración'); break;
    case 'deny-pair': pairingStep = 'start'; modal = null; render(); toast('Solicitud rechazada'); break;
    case 'simulate-approval': data.linked = true; pairingStep = 'done'; saveData(); render(); break;
    case 'reset-demo': modal = { type: 'confirmation', action: 'reset', returnTo: null }; render(); break;
    case 'delete-transaction': {
      const item = modal && data.transactions.find(function (entry) { return entry.id === modal.id; });
      if (item) { modal = { type: 'confirmation', action: 'delete-transaction', id: item.id, returnTo: modal }; render(); }
      break;
    }
    case 'delete-category': {
      const category = modal && categoryById(modal.id);
      if (!category) break;
      if (data.transactions.some(function (item) { return item.categoryId === category.id; })) {
        toast('Primero reasigna sus movimientos a otra categoría');
      } else { modal = { type: 'confirmation', action: 'delete-category', id: category.id, returnTo: modal }; render(); }
      break;
    }
    case 'confirm-action': {
      if (!modal || modal.type !== 'confirmation') break;
      if (modal.action === 'restore' && LIVE && restoreCandidate) {
        const candidate = restoreCandidate;
        modal = null; restoreCandidate = null; render();
        saveQueue.then(function () { return apiPost('/api/restore', candidate); }).then(function (result) { stateRevision = result.revision; data = result.data; render(); toast('Copia restaurada'); }).catch(function (error) { toast(error.message); });
      } else if (modal.action === 'remove-person' && LIVE && DESKTOP) {
        const id = modal.id;
        modal = null; render();
        apiPost('/api/people/remove', { id }).then(function () { return refreshDesktopInfo(false); }).then(function () { render(); toast('Persona eliminada'); }).catch(function (error) { toast(error.message); });
      } else if (modal.action === 'revoke-device' && LIVE && DESKTOP) {
        const id = modal.id;
        modal = null; render();
        apiPost('/api/devices/revoke', { id }).then(function () { return refreshDesktopInfo(false); }).then(function () { toast('Acceso revocado'); }).catch(function (error) { toast(error.message); });
      } else if (modal.action === 'reset') {
        data = freshData(); selectedMonth = SAMPLE_MONTH; annualYear = 2026; filter = 'all'; query = ''; categoryKind = 'expense'; route = 'home';
        modal = null; saveData(); render(); toast('Datos de ejemplo restaurados');
      } else if (modal.action === 'delete-transaction') {
        const remaining = data.transactions.filter(function (entry) { return entry.id !== modal.id; });
        if (!savingsBalancesValid(remaining)) {
          modal = modal.returnTo; render(); toast('No puedes eliminar este aporte mientras haya retiros que dependan de él'); break;
        }
        data.transactions = data.transactions.filter(function (entry) { return entry.id !== modal.id; });
        modal = null; saveData(); render(); toast('Movimiento eliminado');
      } else if (modal.action === 'delete-category') {
        data.categories = data.categories.filter(function (entry) { return entry.id !== modal.id; });
        modal = null; saveData(); render(); toast('Categoría eliminada');
      }
      break;
    }
  }
});

document.addEventListener('input', function (event) {
  if (event.target.matches('[data-amount-input]')) {
    reformatAmountInput(event.target);
    if (event.target.matches('[data-list-filter]')) applyListFilter(event.target);
    return;
  }
  if (event.target.id === 'title' && modal && modal.type === 'transaction') { updateDescriptionSuggestions(); return; }
  if (event.target.id === 'icon-search') {
    const needle = event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const picker = event.target.closest('.category-icon-picker');
    let visible = 0;
    picker.querySelectorAll('[data-icon-choice]').forEach(function (choice) {
      const words = choice.dataset.iconSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      choice.hidden = !words.includes(needle);
      if (!choice.hidden) visible++;
    });
    picker.querySelector('.icon-empty').hidden = visible > 0;
    return;
  }
  if (event.target.id === 'category-color' || event.target.id === 'category-color-hex') {
    const value = event.target.value.trim();
    const normalized = '#' + value.replace(/^#/, '').toUpperCase();
    if (isCustomTone(normalized)) {
      document.getElementById('custom-tone-radio').checked = true;
      document.querySelector('[data-custom-tone-panel]').hidden = false;
      const toggle = document.querySelector('[data-custom-tone-toggle]');
      toggle.classList.add('selected');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.querySelector('.custom-tone-dot').style.background = normalized;
      document.querySelector('.custom-color-swatch').style.background = normalized;
      document.getElementById('category-color').value = normalized;
      if (event.target.id === 'category-color') document.getElementById('category-color-hex').value = normalized;
    }
    return;
  }
  if (event.target.id !== 'transaction-search') return;
  query = event.target.value;
  const position = event.target.selectionStart;
  render();
  const replacement = document.getElementById('transaction-search');
  if (replacement) { replacement.focus(); replacement.setSelectionRange(position, position); }
});

document.addEventListener('change', async function (event) {
  if (event.target.matches('#category-form input[name="tone"]') && event.target.value !== 'custom') {
    document.querySelector('[data-custom-tone-panel]').hidden = true;
    const toggle = document.querySelector('[data-custom-tone-toggle]');
    toggle.classList.remove('selected');
    toggle.setAttribute('aria-expanded', 'false');
    return;
  }
  if (event.target.matches('input[type="date"][data-list-filter]')) { applyListFilter(event.target); return; }
  if (event.target.id === 'receipt-file') {
    const file = event.target.files && event.target.files[0];
    if (!file || !modal || modal.type !== 'transaction') return;
    const current = modal;
    current.receiptUploading = true;
    refreshReceiptField();
    try {
      const id = await storeReceipt(file);
      current.receiptId = id;
      toast('Boleta adjuntada');
    } catch (error) { toast(error.message); }
    current.receiptUploading = false;
    if (modal === current) refreshReceiptField();
    return;
  }
  if (event.target.id === 'document-file') {
    const file = event.target.files && event.target.files[0];
    if (!file || !modal || modal.type !== 'transaction') return;
    const current = modal;
    current.documentUploading = true;
    refreshDocumentField();
    try {
      const saved = await storeDocument(file);
      current.documentId = saved.id;
      current.documentName = saved.name;
      toast('Archivo adjuntado');
    } catch (error) { toast(error.message); }
    current.documentUploading = false;
    if (modal === current) refreshDocumentField();
    return;
  }
  if (event.target.id !== 'restore-file' || !LIVE || !DESKTOP) return;
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2000000) throw new Error('La copia es demasiado grande');
    const content = JSON.parse(await file.text());
    if (!['MiPlata', 'MisGastos'].includes(content.format) || ![1, 2].includes(content.version) || !content.state) throw new Error('No es una copia de MiPlata ni de MisGastos');
    restoreCandidate = content;
    modal = { type: 'confirmation', action: 'restore' };
    render();
  } catch (error) { toast(error.message); }
});

document.addEventListener('submit', function (event) {
  if (event.target.id === 'merge-concepts-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const source = String(form.get('source') || '');
    const target = String(form.get('target') || '');
    const groups = conceptGroups(modal.categoryId);
    const destination = groups.find(function (group) { return group.key === target; });
    if (!source || source === target || !groups.some(function (group) { return group.key === source; }) || !destination) {
      toast('Elige dos nombres distintos'); return;
    }
    data.transactions.forEach(function (item) {
      if (item.categoryId === modal.categoryId && conceptKey(item.title) === source) item.title = destination.title;
    });
    if (conceptFilter === source) conceptFilter = target;
    modal = null; saveData(); render(); toast('Nombres unidos');
  } else if (event.target.id === 'password-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const password = String(form.get('password') || '');
    if (password.length < 8) { toast('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== String(form.get('password2') || '')) { toast('Las contraseñas no coinciden'); return; }
    apiPost('/api/people/password', { personId: modal.personId, password: password }).then(function () { modal = null; render(); toast('Contraseña cambiada'); }).catch(function (error) { toast(error.message); });
  } else if (event.target.id === 'person-form') {
    event.preventDefault();
    const name = String(new FormData(event.target).get('name') || '').trim();
    if (!name) { toast('Escribe un nombre'); return; }
    apiPost('/api/people', { name: name }).then(function () { modal = null; return refreshDesktopInfo(false); }).then(function () { render(); toast('Persona agregada'); }).catch(function (error) { toast(error.message); });
  } else if (event.target.id === 'budget-form') {
    event.preventDefault();
    const budget = parseAmountText(new FormData(event.target).get('budget'));
    if (!Number.isSafeInteger(budget) || budget <= 0 || budget > 1e12) { toast('Ingresa un presupuesto válido en pesos'); return; }
    data.monthlyBudget = budget;
    modal = null; saveData(); render(); toast('Presupuesto guardado');
  } else if (event.target.id === 'goal-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const name = String(form.get('name') || '').trim();
    const target = parseAmountText(form.get('target'));
    if (!name || name.length > 32 || !Number.isSafeInteger(target) || target <= 0 || target > 1e12) { toast('Escribe un nombre y un monto válido'); return; }
    data.savingsGoal = { name: name, target: target };
    modal = null; saveData(); render(); toast('Meta guardada');
  } else if (event.target.id === 'recurring-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const title = String(form.get('title') || '').trim();
    const amount = parseAmountText(form.get('amount'));
    const day = Number(form.get('day'));
    const categoryId = String(form.get('category') || '');
    const category = categoryById(categoryId);
    if (!title || title.length > 80 || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isInteger(day) || day < 1 || day > 31 || !category || category.kind !== 'expense' || category.id === 'savings') { toast('Revisa el nombre, el monto y el día (1 a 31)'); return; }
    if ((data.recurring || []).length >= 50) { toast('Puedes tener hasta 50 pagos fijos'); return; }
    data.recurring = (data.recurring || []).concat({ id: 'p' + Date.now(), title: title, amount: amount, categoryId: categoryId, day: day });
    saveData(); render(); toast('Pago fijo agregado');
    document.getElementById('recurring-title')?.focus();
  } else if (event.target.id === 'balance-form') {
    event.preventDefault();
    const balance = parseAmountText(new FormData(event.target).get('balance'));
    if (!Number.isSafeInteger(balance) || Math.abs(balance) > 1e12) { toast('Ingresa un saldo válido en pesos'); return; }
    data.openingBalance = balance;
    modal = null; saveData(); render(); toast('Saldo inicial guardado');
  } else if (event.target.id === 'transaction-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const amount = parseAmountText(form.get('amount'));
    const title = String(form.get('title') || '').trim();
    const note = String(form.get('note') || '').trim();
    const date = String(form.get('date') || '');
    const categoryId = String(form.get('category') || '');
    if (!Number.isSafeInteger(amount) || amount <= 0 || !title || title.length > 80 || note.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || categoryById(categoryId)?.kind !== modal.kind) {
      toast('Revisa el monto, la descripción y la categoría'); return;
    }
    const previous = modal.id ? data.transactions.find(function (item) { return item.id === modal.id; }) : null;
    const entry = { id: modal.id || 't' + Date.now(), kind: modal.kind, amount: amount, title: title, date: date, categoryId: categoryId };
    if (previous?.createdAt || !previous) entry.createdAt = previous?.createdAt || new Date().toISOString();
    if (note) entry.note = note;
    if (modal.receiptUploading || modal.documentUploading) { toast('Espera a que termine de cargar el archivo'); return; }
    if (modal.receiptId) entry.receiptId = modal.receiptId;
    if (modal.documentId) { entry.documentId = modal.documentId; entry.documentName = modal.documentName; }
    if (isSavingsEntry(entry)) {
      entry.savingsCurrency = previous && isSavingsEntry(previous) ? savingsCurrency(previous) : 'CLP';
      entry.savingsAmount = previous && isSavingsEntry(previous) ? savingsUnits(previous) : amount;
    }
    const remaining = data.transactions.filter(function (item) { return item.id !== entry.id; });
    if (!savingsBalancesValid(remaining.concat(entry))) {
      toast('El retiro no puede superar lo que tienes ahorrado'); return;
    }
    if (modal.id) data.transactions = data.transactions.map(function (item) { return item.id === modal.id ? entry : item; });
    else data.transactions.push(entry);
    selectedMonth = date.slice(0, 7);
    modal = null; saveData(); render(); toast('Movimiento guardado');
  } else if (event.target.id === 'savings-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const currency = String(form.get('currency') || 'CLP');
    const units = parseAmountText(form.get('units'));
    const amount = currency === 'CLP' ? units : parseAmountText(form.get('arsAmount'));
    const title = String(form.get('title') || '').trim();
    const date = String(form.get('date') || '');
    const previous = modal.id ? data.transactions.find(function (entry) { return entry.id === modal.id; }) : null;
    const deposit = modal.action === 'deposit';
    const allowedCurrency = SAVINGS_CURRENCIES.some(function (entry) { return entry.code === currency; }) || currency === 'EUR' && (previous && savingsCurrency(previous) === 'EUR' || !deposit && savingsBalances().EUR > 0);
    if (!allowedCurrency || !Number.isFinite(units) || units <= 0 || !Number.isSafeInteger(Math.round(units * 100)) || Math.abs(units * 100 - Math.round(units * 100)) > 0.00001 || !Number.isSafeInteger(amount) || amount <= 0 || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast('Revisa la moneda, los montos y la descripción'); return;
    }
    const entry = { id: modal.id || 't' + Date.now(), kind: deposit ? 'expense' : 'income', amount: amount, title: title, date: date, categoryId: deposit ? 'savings' : 'savings-return', savingsCurrency: currency, savingsAmount: units };
    if (previous?.createdAt || !previous) entry.createdAt = previous?.createdAt || new Date().toISOString();
    if (previous && previous.note) entry.note = previous.note;
    if (previous && previous.receiptId) entry.receiptId = previous.receiptId;
    if (previous && previous.documentId) { entry.documentId = previous.documentId; entry.documentName = previous.documentName; }
    const remaining = data.transactions.filter(function (item) { return item.id !== entry.id; });
    if (!savingsBalancesValid(remaining.concat(entry))) {
      toast('El retiro no puede superar el ahorro en esa moneda'); return;
    }
    if (modal.id) data.transactions = data.transactions.map(function (item) { return item.id === modal.id ? entry : item; });
    else data.transactions.push(entry);
    selectedMonth = date.slice(0, 7);
    modal = null; saveData(); render(); toast(deposit ? 'Aporte guardado' : 'Retiro guardado');
  } else if (event.target.id === 'category-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const name = String(form.get('name') || '').trim();
    if (!name) { toast('Escribe un nombre para la categoría'); return; }
    const selectedIcon = String(form.get('icon'));
    const selectedTone = String(form.get('tone'));
    const customColor = '#' + String(form.get('customTone') || '').trim().replace(/^#/, '').toUpperCase();
    const tone = selectedTone === 'custom' ? customColor : selectedTone;
    if (!CATEGORY_ICON_CATALOG[selectedIcon] || !(PRESET_TONES.includes(tone) || isCustomTone(tone))) {
      toast('Elige un ícono y un color válido'); return;
    }
    const entry = { id: modal.id || 'c' + Date.now(), kind: modal.id ? categoryById(modal.id).kind : categoryKind, name: name, icon: selectedIcon, tone: tone };
    if (modal.id) data.categories = data.categories.map(function (category) { return category.id === modal.id ? entry : category; });
    else data.categories.push(entry);
    modal = null; saveData(); render(); toast('Categoría guardada');
  } else if (event.target.id === 'pair-form') {
    event.preventDefault();
    const code = String(new FormData(event.target).get('code') || '').replace(/\s/g, '').toUpperCase();
    if (code !== QR_CODE) { toast('Usa el código de muestra A7F3K9M2'); return; }
    pairingStep = 'pending';
    render();
  }
});

document.addEventListener('keydown', function (event) {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    if (!modal) openTransaction('expense');
    return;
  }
  if (event.target.id === 'title') {
    const list = document.getElementById('description-suggestions');
    if (list && !list.hidden) {
      const options = Array.from(list.querySelectorAll('[data-description-choice]'));
      const current = options.findIndex(function (option) { return option.id === event.target.getAttribute('aria-activedescendant'); });
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? (current + 1) % options.length : (current - 1 + options.length) % options.length;
        options.forEach(function (option, index) { option.classList.toggle('is-active', index === next); });
        event.target.setAttribute('aria-activedescendant', options[next].id);
        return;
      }
      if (event.key === 'Enter' && current >= 0) {
        event.preventDefault();
        event.target.value = options[current].dataset.descriptionChoice;
        hideDescriptionSuggestions();
        return;
      }
      if (event.key === 'Escape') { event.preventDefault(); hideDescriptionSuggestions(); return; }
    }
  }
  const dropdown = event.target.closest('[data-dropdown]');
  if (dropdown && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End')) {
    event.preventDefault();
    if (!dropdown.classList.contains('is-open')) { openDropdown(dropdown, true); return; }
    const options = Array.from(dropdown.querySelectorAll('[data-dropdown-option]'));
    if (!options.length) return;
    const current = options.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : event.key === 'ArrowDown' ? (current + 1) % options.length : (current - 1 + options.length) % options.length;
    options[next].focus();
    return;
  }
  if (event.key === 'Escape' && dropdown && dropdown.classList.contains('is-open')) {
    event.preventDefault();
    closeDropdowns();
    dropdown.querySelector('[data-dropdown-trigger]').focus();
    return;
  }
  const datePickerElement = event.target.closest('[data-date-picker]');
  if (event.key === 'Escape' && datePickerElement && datePickerElement.classList.contains('is-open')) {
    event.preventDefault();
    closeDatePickers();
    datePickerElement.querySelector('[data-date-trigger]').focus();
    return;
  }
  const periodPickerElement = event.target.closest('[data-period-picker]');
  if (event.key === 'Escape' && periodPickerElement && periodPickerElement.classList.contains('is-open')) {
    event.preventDefault();
    closePeriodPickers();
    periodPickerElement.querySelector('[data-period-trigger]').focus();
    return;
  }
  if (event.key === 'Escape' && closeReceiptViewer()) { event.preventDefault(); return; }
  if (event.key === 'Escape' && modal) { modal = modal.type === 'confirmation' && modal.returnTo ? modal.returnTo : null; render(); }
});

document.addEventListener('focusin', function (event) {
  document.querySelectorAll('.custom-select.is-open').forEach(function (dropdown) {
    if (!dropdown.contains(event.target)) closeDropdowns();
  });
  document.querySelectorAll('.date-picker.is-open').forEach(function (picker) {
    if (!picker.contains(event.target)) closeDatePickers();
  });
  document.querySelectorAll('.period-picker.is-open').forEach(function (picker) {
    if (!picker.contains(event.target)) closePeriodPickers();
  });
});

let draggedCategory = null;
document.addEventListener('dragstart', function (event) {
  const row = event.target.closest('[data-category-row]');
  if (!row) return;
  draggedCategory = row.dataset.categoryRow;
  event.dataTransfer.effectAllowed = 'move';
  row.classList.add('dragging');
});
document.addEventListener('dragover', function (event) {
  const row = event.target.closest('[data-category-row]');
  if (row && draggedCategory) event.preventDefault();
});
document.addEventListener('drop', function (event) {
  const row = event.target.closest('[data-category-row]');
  if (!row || !draggedCategory) return;
  event.preventDefault();
  const from = data.categories.findIndex(function (category) { return category.id === draggedCategory; });
  const to = data.categories.findIndex(function (category) { return category.id === row.dataset.categoryRow; });
  if (from >= 0 && to >= 0 && from !== to && data.categories[from].kind === data.categories[to].kind) {
    const moved = data.categories.splice(from, 1)[0];
    data.categories.splice(to, 0, moved);
    saveData();
    render();
  }
  draggedCategory = null;
});
document.addEventListener('dragend', function () {
  draggedCategory = null;
  document.querySelectorAll('.dragging').forEach(function (row) { row.classList.remove('dragging'); });
});

// Una boleta puede faltar si se restauró una copia en otro equipo.
document.addEventListener('error', function (event) {
  if (!event.target.matches || !event.target.matches('[data-receipt-image]')) return;
  const missing = document.createElement('span');
  missing.className = 'receipt-missing';
  missing.textContent = 'La imagen de la boleta no está en este equipo.';
  event.target.replaceWith(missing);
}, true);

window.addEventListener('storage', function (event) {
  if (LIVE) return;
  if (event.key === STORAGE_KEY) { data = loadData(); render(); }
});

async function apiPost(url, payload) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la acción');
  return result;
}

async function refreshDesktopInfo(openApproval) {
  if (!LIVE || !DESKTOP) return;
  try {
    const response = await fetch('/api/desktop-info', { cache: 'no-store' });
    if (!response.ok) return;
    const next = await response.json();
    const withoutBackup = function (info) { return JSON.stringify(Object.assign({}, info, { lastBackup: null })); };
    const changed = withoutBackup(next) !== withoutBackup(desktopInfo);
    desktopInfo = next;
    const status = document.querySelector('[data-side-status]');
    if (status) status.outerHTML = sideStatusMarkup();
    if (!selectedNetwork && next.networks.length) selectedNetwork = next.networks[0].address;
    if (openApproval && next.pending.length && !modal) modal = { type: 'qr' };
    if (changed && (route === 'settings' || modal?.type === 'qr' || openApproval)) render();
  } catch (error) { console.warn('No se pudo actualizar la vinculación', error); }
}

async function startPairing(address) {
  if (!LIVE || !DESKTOP) return;
  try {
    const result = await apiPost('/api/pair/start', { address: address || selectedNetwork, personId: pairPerson });
    selectedNetwork = result.address;
    pairingInfo = result;
    render();
  } catch (error) { toast(error.message); }
}

async function refreshLiveState() {
  if (!LIVE || savesPending) return;
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (response.status === 401) { window.location.replace('/'); return; }
    if (!response.ok) return;
    const next = await response.json();
    if (modal) return;
    if (next.revision > stateRevision) { stateRevision = next.revision; data = next.data; render(); toast('Datos actualizados desde otro dispositivo'); }
  } catch (error) { console.warn('Sin conexión con la PC', error); }
}

async function initializeLive() {
  document.getElementById('app').innerHTML = '<div class="startup-status">Abriendo MiPlata...</div>';
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo conectar con la PC');
    const saved = await response.json();
    stateRevision = saved.revision;
    data = saved.data;
    render();
    if (DESKTOP) await refreshDesktopInfo(false);
    setInterval(refreshLiveState, 10000);
    if (DESKTOP) setInterval(function () { refreshDesktopInfo(false); }, 2500);
    // La app queda abierta en la bandeja por días: al cambiar de mes, pasa al mes nuevo si no se estaba viendo otro.
    let followedMonth = selectedMonth;
    setInterval(function () {
      const current = todayDate().slice(0, 7);
      if (current === followedMonth || modal) return;
      if (selectedMonth === followedMonth) { selectedMonth = current; render(); }
      followedMonth = current;
    }, 60000);
  } catch (error) {
    document.getElementById('app').innerHTML = '<div class="startup-status"><strong>No se pudo abrir MiPlata</strong><p>' + escapeHtml(error.message) + '</p><button class="button button-primary" data-action="reload-app" type="button">Reintentar</button></div>';
  }
}

window.MISGASTOS_OPEN_QR = function () { if (!LIVE || !DESKTOP) return; pairPerson = 'owner'; modal = { type: 'qr' }; pairingInfo = null; render(); refreshDesktopInfo(false).then(function () { startPairing(selectedNetwork); }); };
window.MISGASTOS_PENDING = function () { refreshDesktopInfo(true); };
if (LIVE) initializeLive(); else render();
