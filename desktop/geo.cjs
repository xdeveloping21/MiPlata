// País aproximado de una dirección IP con la base gratuita DB-IP Lite (CC BY 4.0, https://db-ip.com).
// La base se descarga una vez al mes y se consulta en el propio servidor: las IP no se envían a nadie.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const readline = require('node:readline');

const MAX_AGE_MS = 32 * 24 * 60 * 60 * 1000;

function parseIPv4(text) {
  const parts = String(text).split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    value = value * 256 + Number(part);
  }
  return value;
}

// Solo usamos los primeros 64 bits de una IPv6: los países se asignan en bloques mucho más grandes.
function parseIPv6High(text) {
  const clean = String(text).split('%')[0];
  if (!clean.includes(':')) return null;
  const [head, tail = null, extra] = clean.split('::');
  if (extra !== undefined) return null;
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = tail === null ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return groups.slice(0, 4).reduce((value, group) => (value << 16n) | BigInt(parseInt(group, 16)), 0n);
}

function packCountry(code) { return code.charCodeAt(0) * 256 + code.charCodeAt(1); }
function unpackCountry(value) { return String.fromCharCode(value >> 8, value & 255); }

function search(starts, ends, countries, value) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (starts[middle] <= value) low = middle + 1;
    else high = middle - 1;
  }
  if (high < 0 || ends[high] < value) return null;
  const code = unpackCountry(countries[high]);
  return code === 'ZZ' ? null : code;
}

async function loadTable(file) {
  const v4 = { starts: [], ends: [], countries: [] };
  const v6 = { starts: [], ends: [], countries: [] };
  const lines = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) {
    const [start, end, country] = line.split(',');
    if (!country || country.length !== 2) continue;
    const isV6 = start.includes(':');
    const from = isV6 ? parseIPv6High(start) : parseIPv4(start);
    const to = isV6 ? parseIPv6High(end) : parseIPv4(end);
    if (from === null || to === null) continue;
    const table = isV6 ? v6 : v4;
    table.starts.push(from); table.ends.push(to); table.countries.push(packCountry(country));
  }
  if (!v4.starts.length) throw new Error('La base de países está vacía');
  return {
    v4: { starts: Uint32Array.from(v4.starts), ends: Uint32Array.from(v4.ends), countries: Uint16Array.from(v4.countries) },
    v6: { starts: BigUint64Array.from(v6.starts), ends: BigUint64Array.from(v6.ends), countries: Uint16Array.from(v6.countries) },
  };
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 60000 }, (response) => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error('HTTP ' + response.statusCode)); return; }
      const temporary = target + '.tmp';
      const output = fs.createWriteStream(temporary);
      response.pipe(output);
      output.on('finish', () => output.close(() => { fs.renameSync(temporary, target); resolve(); }));
      output.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Tiempo de espera agotado')));
    request.on('error', reject);
  });
}

function monthStamp(offset) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - offset);
  return date.toISOString().slice(0, 7);
}

function openGeo(folder, options = {}) {
  const file = path.join(folder, 'dbip-country-lite.csv.gz');
  let table = null;

  async function reload() {
    if (!fs.existsSync(file)) return;
    try { table = await loadTable(file); } catch (error) { console.warn('No se pudo leer la base de países:', error.message); }
  }

  async function refresh() {
    const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < MAX_AGE_MS;
    if (fresh || options.download === false) return;
    fs.mkdirSync(folder, { recursive: true });
    // La base del mes se publica en los primeros días: si aún no está, sirve la del mes anterior.
    for (const offset of [0, 1]) {
      try {
        await download('https://download.db-ip.com/free/dbip-country-lite-' + monthStamp(offset) + '.csv.gz', file);
        await reload();
        return;
      } catch (error) {
        if (offset === 1) console.warn('No se pudo descargar la base de países:', error.message);
      }
    }
  }

  const ready = reload().then(refresh);
  const timer = setInterval(() => refresh().catch(() => {}), 24 * 60 * 60 * 1000);
  timer.unref();

  return {
    ready,
    lookup(ip) {
      if (!table || !ip) return null;
      const address = String(ip).replace(/^::ffff:/i, '');
      const v4 = parseIPv4(address);
      if (v4 !== null) return search(table.v4.starts, table.v4.ends, table.v4.countries, v4);
      const v6 = parseIPv6High(address);
      return v6 === null ? null : search(table.v6.starts, table.v6.ends, table.v6.countries, v6);
    },
    close() { clearInterval(timer); },
  };
}

module.exports = { openGeo, parseIPv4, parseIPv6High };
