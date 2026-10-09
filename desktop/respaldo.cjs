// Copia completa y cifrada de los datos de MiPlata, para guardarla fuera del servidor (deploy/respaldo.sh la sube a Google Drive).
// Incluye la base de datos, boletas, documentos, fotos de perfil y el registro de actividad.
// Cifrado: AES-256-GCM con una clave derivada de tu frase con scrypt. Sin la frase, el archivo no se puede abrir.
//
//   node desktop/respaldo.cjs crear --datos DIR --salida DIR [--clave-archivo ARCHIVO]
//   node desktop/respaldo.cjs probar ARCHIVO [--clave-archivo ARCHIVO]
//   node desktop/respaldo.cjs restaurar ARCHIVO --datos DIR [--reemplazar] [--clave-archivo ARCHIVO]
//   node desktop/respaldo.cjs estado ok|error [MENSAJE] --datos DIR [--destino NOMBRE] [--archivo NOMBRE]
// La frase también puede venir en la variable MIPLATA_CLAVE_RESPALDO; si no hay ninguna, se pregunta.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const MAGIC = Buffer.from('MIPLATA-RESPALDO\n');
const VERSION = 1;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
// Lo que no hace falta respaldar: copias locales, la base de países (se vuelve a descargar) y archivos temporales.
const SKIP = new Set(['backups', 'geo']);

function listFiles(root) {
  const found = [];
  const walk = (folder, prefix) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (!prefix && SKIP.has(entry.name)) continue;
      if (entry.name.endsWith('.tmp')) continue;
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(full, relative);
      else if (entry.isFile()) found.push(relative);
    }
  };
  walk(root, '');
  return found.sort();
}

function deriveKey(passphrase, salt) {
  if (!passphrase || passphrase.length < 12) throw new Error('La frase de cifrado debe tener al menos 12 caracteres');
  return crypto.scryptSync(passphrase, salt, 32, SCRYPT);
}

function pack(root, passphrase) {
  const files = listFiles(root);
  if (!files.includes('miplata.sqlite')) throw new Error('No se encontró miplata.sqlite en ' + root);
  const contents = files.map((file) => fs.readFileSync(path.join(root, file)));
  const header = Buffer.from(JSON.stringify({ createdAt: new Date().toISOString(), files: files.map((file, index) => ({ path: file, size: contents[index].length })) }));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(header.length);
  const plain = zlib.gzipSync(Buffer.concat([length, header, ...contents]));
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  cipher.setAAD(Buffer.concat([MAGIC, Buffer.from([VERSION])]));
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { bytes: Buffer.concat([MAGIC, Buffer.from([VERSION]), salt, iv, encrypted, cipher.getAuthTag()]), files: files.length };
}

function unpack(bytes, passphrase) {
  if (!bytes.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('No es una copia de MiPlata');
  if (bytes[MAGIC.length] !== VERSION) throw new Error('Versión de copia desconocida');
  let offset = MAGIC.length + 1;
  const salt = bytes.subarray(offset, offset += 16);
  const iv = bytes.subarray(offset, offset += 12);
  const encrypted = bytes.subarray(offset, bytes.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  decipher.setAAD(Buffer.concat([MAGIC, Buffer.from([VERSION])]));
  decipher.setAuthTag(bytes.subarray(bytes.length - 16));
  let plain;
  try { plain = zlib.gunzipSync(Buffer.concat([decipher.update(encrypted), decipher.final()])); } catch (error) { throw new Error('La frase no es correcta o el archivo está dañado'); }
  const headerLength = plain.readUInt32BE(0);
  const header = JSON.parse(plain.subarray(4, 4 + headerLength).toString('utf8'));
  let position = 4 + headerLength;
  const files = header.files.map((file) => {
    // Nunca escribir fuera de la carpeta de datos, aunque el archivo diga otra cosa.
    if (file.path.split('/').some((part) => part === '..' || part === '') || path.isAbsolute(file.path)) throw new Error('Ruta no válida en la copia: ' + file.path);
    const data = plain.subarray(position, position + file.size);
    position += file.size;
    return { path: file.path, data };
  });
  return { createdAt: header.createdAt, files };
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function askHidden(question) {
  if (!process.stdin.isTTY) throw new Error('Falta la frase de cifrado (usa --clave-archivo o MIPLATA_CLAVE_RESPALDO)');
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData); process.stdout.write('\n'); resolve(value); return; }
        if (char === '\u0003') process.exit(130);
        if (char === '\u007f') value = value.slice(0, -1); else value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function passphrase(args) {
  const file = option(args, '--clave-archivo');
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf8').replace(/\r?\n$/, '');
  if (process.env.MIPLATA_CLAVE_RESPALDO) return process.env.MIPLATA_CLAVE_RESPALDO;
  return askHidden('Frase de cifrado de las copias: ');
}

async function main(args) {
  const command = args[0];
  if (command === 'crear') {
    const root = option(args, '--datos');
    const output = option(args, '--salida');
    if (!root || !output) throw new Error('Uso: crear --datos DIR --salida DIR');
    const { bytes, files } = pack(root, await passphrase(args));
    fs.mkdirSync(output, { recursive: true, mode: 0o700 });
    const target = path.join(output, 'MiPlata-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.miplata');
    fs.writeFileSync(target + '.tmp', bytes, { mode: 0o600 });
    fs.renameSync(target + '.tmp', target);
    console.error('Copia cifrada con ' + files + ' archivos (' + Math.round(bytes.length / 1024) + ' KB)');
    console.log(target);
    return;
  }
  if (command === 'probar') {
    const backup = unpack(fs.readFileSync(args[1]), await passphrase(args));
    const total = backup.files.reduce((sum, file) => sum + file.data.length, 0);
    console.log('Copia del ' + backup.createdAt + ': ' + backup.files.length + ' archivos, ' + Math.round(total / 1024) + ' KB. La frase es correcta.');
    return;
  }
  if (command === 'restaurar') {
    const root = option(args, '--datos');
    if (!args[1] || !root) throw new Error('Uso: restaurar ARCHIVO --datos DIR');
    const backup = unpack(fs.readFileSync(args[1]), await passphrase(args));
    if (fs.existsSync(path.join(root, 'miplata.sqlite'))) {
      if (!args.includes('--reemplazar')) throw new Error('Ya hay datos en ' + root + '. Agrega --reemplazar para guardarlos aparte y restaurar la copia.');
      const aside = root.replace(/\/+$/, '') + '.antes-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      fs.renameSync(root, aside);
      console.log('Los datos que había quedaron en ' + aside);
    }
    for (const file of backup.files) {
      const target = path.join(root, ...file.path.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.data);
    }
    console.log('Restaurados ' + backup.files.length + ' archivos de la copia del ' + backup.createdAt + ' en ' + root);
    return;
  }
  if (command === 'estado') {
    const root = option(args, '--datos');
    const ok = args[1] === 'ok';
    const status = { at: new Date().toISOString(), ok, destino: option(args, '--destino') || null, archivo: option(args, '--archivo') || null, error: ok ? null : String(args[2] || 'Error desconocido').slice(0, 300) };
    fs.writeFileSync(path.join(root, 'respaldo-externo.json'), JSON.stringify(status), { mode: 0o644 });
    return;
  }
  throw new Error('Comandos: crear, probar, restaurar, estado');
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => { console.error('Error: ' + error.message); process.exit(1); });
}

module.exports = { pack, unpack, listFiles };
