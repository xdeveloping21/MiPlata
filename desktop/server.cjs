const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const QRCode = require('qrcode');

const PORT = 4174;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json; charset=utf-8' };

function localRequest(req) {
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function isTailscaleAddress(address) {
  const parts = String(address || '').replace(/^::ffff:/, '').split('.').map(Number);
  return parts.length === 4 && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

function networkOptions() {
  const found = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      const tail = entry.address.split('.').map(Number);
      const tailscale = tail[0] === 100 && tail[1] >= 64 && tail[1] <= 127;
      found.push({ address: entry.address, label: (tailscale || /tailscale/i.test(name) ? 'Tailscale' : 'Wi-Fi / red local') + ' - ' + entry.address });
    }
  }
  return found.sort((a, b) => Number(a.label.startsWith('Tailscale')) - Number(b.label.startsWith('Tailscale')));
}

function json(res, status, body, headers = {}) {
  const content = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': content.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(content);
}

function html(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

function pairPage(token, expires) {
  const safeToken = JSON.stringify(token).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta charset="utf-8"><title>Vincular MiPlata</title><style>
  :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#13221b;background:#f7faf8}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px}.card{width:min(100%,420px);padding:28px;border:1px solid #e2ece6;border-radius:22px;background:#ffffff;box-shadow:0 18px 60px #10302212}.logo{width:46px;height:46px;object-fit:contain}h1{font-size:26px;margin:22px 0 10px;letter-spacing:-.04em}p{color:#5c6d64;line-height:1.5}.status{margin-top:24px;padding:16px;border-radius:13px;background:#e1f6ec;color:#138a5e;font-weight:700}.small{font-size:13px}button{background:#1fa774;color:white;border:0;border-radius:10px;padding:13px 16px;font-weight:700;cursor:pointer;margin-top:12px;width:100%}
  </style></head><body><main class="card"><img class="logo" src="/assets/miplata-logo.png" alt=""><h1>Vincular con MiPlata</h1><p>Enviamos una solicitud a tu PC. Apruébala allí para usar tus gastos desde este iPhone.</p><div class="status" id="status">Conectando con la PC...</div><p class="small">El código vence en unos minutos. La PC debe estar encendida y MiPlata abierto en segundo plano.</p><button id="retry" hidden>Volver a intentar</button></main><script>
  const token=${safeToken}; const expiry=${Number(expires)}; const statusNode=document.getElementById('status'); let requestId=null;
  async function requestPair(){try{if(Date.now()>expiry)throw new Error('El QR venció. Generá uno nuevo en la PC.');const response=await fetch('/api/pair/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,name:/iPhone/i.test(navigator.userAgent)?'iPhone':'Celular'})});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo conectar');requestId=result.requestId;statusNode.textContent='Esperando aprobación en la PC...';poll();}catch(error){statusNode.textContent=error.message;document.getElementById('retry').hidden=false}}
  async function poll(){if(!requestId)return;try{const response=await fetch('/api/pair/status?requestId='+encodeURIComponent(requestId),{cache:'no-store'});const result=await response.json();if(result.status==='approved'){statusNode.textContent='¡Conectado! Abriendo tus gastos...';location.replace('/');return}if(result.status==='denied'||result.status==='expired'){statusNode.textContent=result.status==='denied'?'La PC rechazó la solicitud.':'La solicitud venció. Genera un nuevo QR.';return}}catch(error){statusNode.textContent='Esperando conexión con la PC...'}setTimeout(poll,2000)}
  document.getElementById('retry').onclick=()=>{document.getElementById('retry').hidden=true;requestPair()};requestPair();
  </script></body></html>`;
}

function unauthorizedPage() {
  return '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>MiPlata</title><body style="font-family:system-ui;background:#f7faf8;color:#13221b;padding:32px"><h1>Vincula este celular</h1><p>En la PC abre MiPlata, toca Conectar iPhone y escanea el QR nuevo.</p></body></html>';
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('Archivo demasiado grande');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function readRaw(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('La imagen es demasiado grande');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// options.onlyTailscale (modo servidor en una VPS): solo responde a la propia máquina y a la red de Tailscale.
function startServer(store, root, onPending, options = {}) {
  const networks = () => networkOptions().filter((item) => !options.onlyTailscale || isTailscaleAddress(item.address));
  const pending = new Map();
  let pairToken = null;
  let pairExpires = 0;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;
      const requestHost = String(req.headers.host || '').split(':')[0].toLowerCase();
      if (options.onlyTailscale && !localRequest(req) && !isTailscaleAddress(req.socket.remoteAddress)) { req.socket.destroy(); return; }
      const allowedHosts = new Set(['127.0.0.1', 'localhost', ...networks().map((item) => item.address)]);
      if (!allowedHosts.has(requestHost)) return json(res, 403, { error: 'Dirección no permitida' });
      const isLocal = localRequest(req);
      const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith('mg_session='));
      const device = cookie ? store.deviceForToken(cookie.slice('mg_session='.length)) : null;
      const authorized = isLocal || Boolean(device);
      const origin = req.headers.origin;
      if (req.method === 'POST' && origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'Origen no permitido' });

      if (pathname === '/pair' && req.method === 'GET') {
        if (device) return res.writeHead(302, { Location: '/' }).end();
        const token = url.searchParams.get('token') || '';
        if (!pairToken || Date.now() > pairExpires || token !== pairToken) return html(res, 410, '<h1>El QR venció</h1><p>Genera uno nuevo en la PC.</p>');
        return html(res, 200, pairPage(token, pairExpires));
      }

      if (pathname === '/api/pair/request' && req.method === 'POST') {
        const body = await readBody(req);
        if (!pairToken || Date.now() > pairExpires || body.token !== pairToken) return json(res, 410, { error: 'El QR venció. Genera otro en la PC.' });
        const requestId = crypto.randomBytes(24).toString('base64url');
        pending.set(requestId, { name: String(body.name || 'Celular').slice(0, 80), createdAt: Date.now(), status: 'pending' });
        onPending();
        return json(res, 200, { requestId });
      }

      if (pathname === '/api/pair/status' && req.method === 'GET') {
        const requestId = url.searchParams.get('requestId') || '';
        const item = pending.get(requestId);
        if (!item || Date.now() - item.createdAt > 300000) { pending.delete(requestId); return json(res, 200, { status: 'expired' }); }
        if (item.status === 'approved') {
          pending.delete(requestId);
          return json(res, 200, { status: 'approved' }, { 'Set-Cookie': 'mg_session=' + item.token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000' });
        }
        if (item.status === 'denied') pending.delete(requestId);
        return json(res, 200, { status: item.status });
      }

      if (pathname.startsWith('/api/') && !authorized) return json(res, 401, { error: 'Vincula este dispositivo desde la PC' });
      if (pathname === '/api/state' && req.method === 'GET') return json(res, 200, store.getState());
      if (pathname === '/api/state' && req.method === 'POST') {
        const body = await readBody(req);
        const result = store.saveState(body.revision, body.data);
        return json(res, result.conflict ? 409 : 200, result);
      }
      if (pathname === '/api/receipts' && req.method === 'POST') {
        if (!/^image\/(jpeg|png|webp)$/.test(String(req.headers['content-type'] || ''))) return json(res, 415, { error: 'Solo se aceptan imágenes JPG, PNG o WebP' });
        const bytes = await readRaw(req, 6_000_000);
        try { return json(res, 200, store.saveReceipt(bytes)); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname === '/api/documents' && req.method === 'POST') {
        const bytes = await readRaw(req, 15_000_000);
        try { return json(res, 200, store.saveDocument(bytes, url.searchParams.get('name'))); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname.startsWith('/api/documents/') && req.method === 'GET') {
        const document = store.readDocument(pathname.slice('/api/documents/'.length));
        if (!document) return json(res, 404, { error: 'Documento no encontrado' });
        // Siempre como descarga: el archivo nunca se muestra dentro de la app.
        const name = (url.searchParams.get('name') || '').replace(/[^\p{L}\p{N} ._()-]/gu, '').trim().slice(0, 120).replace(/\.[^.]*$/, '') || 'documento';
        const filename = name + '.' + document.extension;
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': document.bytes.length, 'Content-Disposition': 'attachment; filename="' + filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '') + '"; filename*=UTF-8\'\'' + encodeURIComponent(filename).replace(/[()]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase()), 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff' });
        return res.end(document.bytes);
      }
      if (pathname.startsWith('/api/receipts/') && req.method === 'GET') {
        const receipt = store.readReceipt(pathname.slice('/api/receipts/'.length));
        if (!receipt) return json(res, 404, { error: 'Boleta no encontrada' });
        res.writeHead(200, { 'Content-Type': receipt.type, 'Content-Length': receipt.bytes.length, 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' });
        return res.end(receipt.bytes);
      }

      if (pathname.startsWith('/api/') && !isLocal) return json(res, 403, { error: 'Esta acción se hace en la PC' });
      if (pathname === '/api/desktop-info' && req.method === 'GET') return json(res, 200, { networks: networks(), devices: store.listDevices(), pending: [...pending.entries()].filter(([, item]) => item.status === 'pending' && Date.now() - item.createdAt < 300000).map(([id, item]) => ({ id, name: item.name })), backupDir: store.backupDir, lastBackup: store.lastBackupAt() });
      if (pathname === '/api/pair/start' && req.method === 'POST') {
        const body = await readBody(req);
        const addresses = networks();
        const host = addresses.some((item) => item.address === body.address) ? body.address : addresses[0]?.address;
        if (!host) return json(res, 503, { error: 'No hay una red Wi-Fi o Tailscale activa' });
        pairToken = crypto.randomBytes(24).toString('base64url');
        pairExpires = Date.now() + 300000;
        const pairUrl = 'http://' + host + ':' + PORT + '/pair?token=' + pairToken;
        const qr = await QRCode.toDataURL(pairUrl, { width: 250, margin: 2, color: { dark: '#262536', light: '#fdfbf7' } });
        return json(res, 200, { address: host, url: pairUrl, qr, expires: pairExpires });
      }
      if (pathname === '/api/pair/decision' && req.method === 'POST') {
        const body = await readBody(req);
        const item = pending.get(body.id);
        if (!item || item.status !== 'pending') return json(res, 404, { error: 'Solicitud vencida' });
        if (body.approve === true) {
          item.token = crypto.randomBytes(32).toString('base64url');
          store.addDevice(item.name, item.token);
          item.status = 'approved';
          pairToken = null;
        } else item.status = 'denied';
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/devices/revoke' && req.method === 'POST') {
        const body = await readBody(req);
        store.revokeDevice(String(body.id || ''));
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/export' && req.method === 'GET') {
        const state = store.getState();
        const bytes = Buffer.from(JSON.stringify({ format: 'MiPlata', version: 2, exportedAt: new Date().toISOString(), state: state.data, merchantRules: store.merchantRules() }, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="MiPlata-copia.json"', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
        return res.end(bytes);
      }
      if (pathname === '/api/restore' && req.method === 'POST') {
        const body = await readBody(req);
        if (!['MiPlata', 'MisGastos'].includes(body.format) || ![1, 2].includes(body.version)) return json(res, 400, { error: 'No es una copia de MiPlata ni de MisGastos' });
        const restored = store.restoreState(body.state, body.version === 2 ? body.merchantRules || [] : []);
        return json(res, 200, restored);
      }

      if (pathname === '/runtime.js') return res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' }).end('window.MISGASTOS_LIVE=true;window.MISGASTOS_DESKTOP=' + JSON.stringify(isLocal) + ';');
      if (pathname === '/assets/miplata-logo.png') {
        const bytes = fs.readFileSync(path.join(root, 'assets', 'miplata-logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
        return res.end(bytes);
      }
      if (pathname === '/apple-touch-icon.png' || pathname === '/manifest.webmanifest') {
        const file = pathname === '/apple-touch-icon.png' ? 'apple-touch-icon.png' : 'manifest.webmanifest';
        const bytes = fs.readFileSync(path.join(root, file));
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(bytes);
      }
      if (!authorized) return html(res, 401, unauthorizedPage());
      const files = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/category-icons.js': 'category-icons.js', '/styles.css': 'styles.css', '/assets/miplata-logo.png': 'assets/miplata-logo.png', '/assets/miplata-logo-v2.png': 'assets/miplata-logo-v2.png' };
      const file = files[pathname];
      if (!file) return json(res, 404, { error: 'No encontrado' });
      const bytes = fs.readFileSync(path.join(root, file));
      const staticHeaders = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
      if (file === 'index.html') staticHeaders['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'";
      res.writeHead(200, staticHeaders);
      res.end(bytes);
    } catch (error) {
      console.error('HTTP error:', error);
      json(res, error instanceof SyntaxError ? 400 : 500, { error: error.message || 'Error inesperado' });
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '0.0.0.0', () => { server.off('error', reject); resolve({ server, port: PORT }); });
  });
}

module.exports = { startServer, networkOptions, PORT };
