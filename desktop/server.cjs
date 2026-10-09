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
  async function requestPair(){try{if(Date.now()>expiry)throw new Error('El QR venció. Genera uno nuevo en la PC.');const response=await fetch('/api/pair/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,name:/iPhone/i.test(navigator.userAgent)?'iPhone':'Celular'})});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo conectar');requestId=result.requestId;statusNode.textContent='Esperando aprobación en la PC...';poll();}catch(error){statusNode.textContent=error.message;document.getElementById('retry').hidden=false}}
  async function poll(){if(!requestId)return;try{const response=await fetch('/api/pair/status?requestId='+encodeURIComponent(requestId),{cache:'no-store'});const result=await response.json();if(result.status==='approved'){statusNode.textContent='¡Conectado! Abriendo tus gastos...';location.replace('/');return}if(result.status==='denied'||result.status==='expired'){statusNode.textContent=result.status==='denied'?'La PC rechazó la solicitud.':'La solicitud venció. Genera un nuevo QR.';return}}catch(error){statusNode.textContent='Esperando conexión con la PC...'}setTimeout(poll,2000)}
  document.getElementById('retry').onclick=()=>{document.getElementById('retry').hidden=true;requestPair()};requestPair();
  </script></body></html>`;
}

// Pantalla para entrar con usuario y contraseña, o crear la cuenta con un código de invitación.
function loginPage() {
  return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta charset="utf-8"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="MiPlata"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest"><title>MiPlata</title><style>
  :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#13221b;background:#f7faf8}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px}.card{width:min(100%,400px);padding:28px;border:1px solid #e2ece6;border-radius:22px;background:#fff;box-shadow:0 18px 60px #10302212}.brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:22px;letter-spacing:-.03em}.brand img{width:44px;height:44px}h1{font-size:24px;margin:24px 0 6px;letter-spacing:-.03em}p{color:#5c6d64;line-height:1.5;margin:0 0 18px;font-size:15px}label{display:block;font-size:13px;font-weight:700;margin:14px 0 6px}input{width:100%;font:inherit;font-size:16px;padding:12px 13px;border:1px solid #d5e3db;border-radius:11px;background:#fff;color:inherit}input:focus{outline:2px solid #1fa77455;border-color:#1fa774}.code{text-transform:uppercase;letter-spacing:.12em}button{width:100%;margin-top:20px;background:#1fa774;color:#fff;border:0;border-radius:11px;padding:14px;font:inherit;font-weight:800;cursor:pointer}button:disabled{opacity:.6}.switch{display:block;margin-top:16px;background:none;color:#138a5e;padding:6px;font-weight:700;width:100%;border:0;font:inherit;font-size:14px;cursor:pointer}.error{margin-top:14px;padding:11px 13px;border-radius:10px;background:#fdecec;color:#b42318;font-size:14px}.note{margin-top:14px;font-size:12px;color:#7a8a81}.hint{display:block;margin-top:6px;font-size:12px;color:#7a8a81}.pw{position:relative}.pw input{padding-right:50px}.pw button{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:42px;height:42px;margin:0;padding:0;display:grid;place-items:center;background:none;color:#5c6f65;border-radius:9px}.install{width:min(100%,400px);margin-top:14px;display:flex;gap:12px;align-items:flex-start;padding:14px 10px 14px 14px;border:1px solid #e2ece6;border-radius:18px;background:#fff;font-size:12px;line-height:1.5;color:#5c6f65}.install[hidden]{display:none}.install img{width:40px;height:40px;border-radius:10px;flex:none}.install strong{display:block;font-size:14px;color:#13221b}.install ol{margin:4px 0 0;padding-left:18px}.install b{color:#13221b}.install svg{vertical-align:-3px;color:#16865c}.install .x{flex:none;width:30px;height:30px;margin:-4px 0 0;padding:0;border-radius:9px;background:none;color:inherit;font-size:20px;line-height:1}.credit{margin:18px 0 0;padding-top:14px;border-top:1px solid #e2ece6;text-align:center;font-size:11px;color:#8a9a91}[hidden]{display:none!important}
  @media (prefers-color-scheme:dark){:root{background:#0f1814;color:#e8f2ec}.card{background:#14211b;border-color:#22352c}p,.note,.hint{color:#9db3a7}.pw button{background:none;color:#9db3a7}.credit{color:#7f968a;border-color:#22352c}.install{background:#14211b;border-color:#22352c}.install b,.install strong{color:#e8f2ec}.install svg{color:#4fe0a6}input{background:#0f1814;border-color:#2a4136}.switch{color:#4fe0a6}button{color:#0c1512;background:#4fe0a6}.error{background:#3a1717;color:#ffb4ab}}
  </style></head><body><main class="card"><div class="brand"><img src="/assets/miplata-logo.png" alt="">MiPlata</div>
  <form id="login" novalidate><h1>Iniciar sesión</h1><p>Entra una vez y este dispositivo quedará guardado como de confianza.</p>
  <label for="l-user">Usuario</label><input id="l-user" autocomplete="username" autocapitalize="none" spellcheck="false" required>
  <label for="l-pass">Contraseña</label><input id="l-pass" type="password" autocomplete="current-password" required>
  <div class="error" hidden></div><button type="submit">Entrar</button><button class="switch" type="button" data-show="register">¿Tienes un código de invitación? Crea tu cuenta</button></form>
  <form id="register" novalidate hidden><h1>Crear cuenta</h1><p>Usa el código de invitación que te dieron. Lo haces una sola vez.</p>
  <label for="r-code">Código de invitación</label><input id="r-code" class="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="ABCD-1234" required>
  <label for="r-user">Elige un usuario</label><input id="r-user" autocomplete="username" autocapitalize="none" spellcheck="false" required><small class="hint">De 3 a 30 letras o números, sin espacios. Ejemplo: raul.s</small>
  <label for="r-pass">Contraseña (mínimo 8 caracteres)</label><input id="r-pass" type="password" autocomplete="new-password" required>
  <label for="r-pass2">Repite la contraseña</label><input id="r-pass2" type="password" autocomplete="new-password" required>
  <div class="error" hidden></div><button type="submit">Crear cuenta y entrar</button><button class="switch" type="button" data-show="login">Ya tengo cuenta</button></form>
  <p class="note">¿Olvidaste tu contraseña? Pídele al dueño de MiPlata que la cambie.</p><p class="credit">Creado por: Raúl Sanhueza</p></main>
  <aside class="install" hidden><img src="/apple-touch-icon.png" alt=""><div><strong>Agrega MiPlata a tu inicio</strong>Así la abres como una app, a pantalla completa.<ol><li>Toca <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M8 11H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/></svg> <b>Compartir</b> (si no lo ves, toca primero <b>•••</b>).</li><li>Elige <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg> <b>Agregar a pantalla de inicio</b>.</li><li>Toca <b>Agregar</b>.</li></ol></div><button class="x" type="button" aria-label="Cerrar aviso">×</button></aside><script>
  (function(){const key='miplata-install-hint-closed';const box=document.querySelector('.install');const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);const app=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;let closed=false;try{closed=localStorage.getItem(key)==='1'}catch(e){}box.hidden=!ios||app||closed;box.querySelector('.x').onclick=()=>{box.hidden=true;try{localStorage.setItem(key,'1')}catch(e){}}})();
  const forms={login:document.getElementById('login'),register:document.getElementById('register')};
  document.querySelectorAll('[data-show]').forEach((button)=>button.onclick=()=>{for(const [name,form] of Object.entries(forms))form.hidden=name!==button.dataset.show;forms[button.dataset.show].querySelector('input').focus()});
  async function send(form,url,body){const error=form.querySelector('.error');const submit=form.querySelector('button[type=submit]');error.hidden=true;submit.disabled=true;try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign(body,{device:/iPhone/i.test(navigator.userAgent)?'iPhone':/iPad/i.test(navigator.userAgent)?'iPad':/Android/i.test(navigator.userAgent)?'Android':/Mac/i.test(navigator.userAgent)?'Mac':/Windows/i.test(navigator.userAgent)?'PC con Windows':'Navegador'}))});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'No se pudo completar');location.replace('/')}catch(problem){error.textContent=problem.message;error.hidden=false;submit.disabled=false}}
  forms.login.onsubmit=(event)=>{event.preventDefault();send(forms.login,'/api/login',{username:document.getElementById('l-user').value,password:document.getElementById('l-pass').value})};
  forms.register.onsubmit=(event)=>{event.preventDefault();const pass=document.getElementById('r-pass').value;const user=document.getElementById('r-user').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();const problem=!/^[a-z0-9._-]{3,30}$/.test(user)?'El usuario debe tener entre 3 y 30 letras o números, sin espacios. También puedes usar punto, guion o guion bajo.':pass.length<8?'La contraseña debe tener al menos 8 caracteres.':pass!==document.getElementById('r-pass2').value?'Las contraseñas no coinciden.':'';if(problem){const error=forms.register.querySelector('.error');error.textContent=problem;error.hidden=false;return}send(forms.register,'/api/register',{code:document.getElementById('r-code').value,username:document.getElementById('r-user').value,password:pass})};
  // Botón con forma de ojo para ver lo que se escribe en cada contraseña.
  const eye='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOff='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.16 3.19M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  document.querySelectorAll('input[type=password]').forEach((input)=>{const box=document.createElement('span');box.className='pw';input.replaceWith(box);box.append(input);const toggle=document.createElement('button');toggle.type='button';toggle.innerHTML=eye;toggle.setAttribute('aria-label','Mostrar contraseña');toggle.onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';toggle.innerHTML=show?eyeOff:eye;toggle.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');input.focus()};box.append(toggle)});
  document.getElementById('l-user').focus();
  </script></body></html>`;
}

// Bloquea por 15 minutos después de 5 intentos fallidos, por dirección y por usuario.
function attemptLimiter() {
  const failures = new Map();
  // 5 intentos fallidos por usuario; por dirección se permiten más, porque una familia comparte la misma IP de su casa.
  const limitFor = (key) => key.startsWith('ip:') ? 20 : 5;
  const LOCK_MS = 15 * 60 * 1000;
  const waitMs = (keys) => Math.max(0, ...keys.map((key) => { const entry = failures.get(key); return entry && entry.count >= limitFor(key) ? entry.until - Date.now() : 0; }));
  return {
    locked: (keys) => waitMs(keys) > 0,
    message: (keys) => { const minutes = Math.max(1, Math.ceil(waitMs(keys) / 60000)); return 'Demasiados intentos. Espera ' + minutes + (minutes === 1 ? ' minuto' : ' minutos') + ' y vuelve a intentarlo.'; },
    fail(keys) {
      for (const key of keys) {
        const entry = failures.get(key);
        const fresh = !entry || Date.now() > entry.until;
        failures.set(key, { count: fresh ? 1 : entry.count + 1, until: Date.now() + LOCK_MS });
      }
    },
    clear(keys) { keys.forEach((key) => failures.delete(key)); },
  };
}

const DEVICE_NAMES = ['iPhone', 'iPad', 'Android', 'Mac', 'PC con Windows', 'Navegador'];

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
// options.publicHost: dominio publicado en internet con HTTPS a través de Caddy (deploy/publicar.sh).
function startServer(store, root, onPending, options = {}) {
  const publicHost = options.publicHost ? String(options.publicHost).toLowerCase() : null;
  const networks = () => {
    const found = networkOptions().filter((item) => !options.onlyTailscale || isTailscaleAddress(item.address)).map((item) => ({ ...item, url: 'http://' + item.address + ':' + PORT }));
    // Con dominio propio, los celulares entran solo por internet; no ofrecemos las direcciones internas.
    return publicHost ? [{ address: publicHost, label: 'Internet - ' + publicHost, url: 'https://' + publicHost }] : found;
  };
  const pending = new Map();
  let pairToken = null;
  let pairExpires = 0;
  let pairPerson = 'owner';
  const limiter = attemptLimiter();
  // Administrar desde fuera de la PC exige repetir la contraseña; queda desbloqueado unos minutos en ese dispositivo.
  const adminUnlocked = new Map();
  const ADMIN_UNLOCK_MS = 10 * 60 * 1000;

  // Dónde se conectó cada dispositivo por última vez: país (si hay base de países), Tailscale o red local.
  function describeDevice(item) {
    const address = String(item.lastIp || '').replace(/^::ffff:/i, '');
    const local = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i.test(address);
    return { ...item, network: !address ? null : isTailscaleAddress(address) ? 'tailscale' : local ? 'local' : 'internet', country: address && options.geo ? options.geo.lookup(address) : null };
  }

  function startSession(res, personId, deviceName, secure) {
    const token = crypto.randomBytes(32).toString('base64url');
    store.addDevice(DEVICE_NAMES.includes(deviceName) ? deviceName : 'Navegador', token, personId);
    // Dispositivo de confianza: la sesión dura un año o hasta que se revoque desde la PC.
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'mg_session=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000' + secure });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;
      const requestHost = String(req.headers.host || '').split(':')[0].toLowerCase();
      if (options.onlyTailscale && !localRequest(req) && !isTailscaleAddress(req.socket.remoteAddress)) { req.socket.destroy(); return; }
      const allowedHosts = new Set(['127.0.0.1', 'localhost', ...networks().map((item) => item.address)]);
      if (!allowedHosts.has(requestHost)) return json(res, 403, { error: 'Dirección no permitida' });
      // Lo que llega por Caddy viene desde internet aunque la conexión sea local: nunca es la PC dueña.
      const proxied = Boolean(req.headers['x-miplata-proxy'] || req.headers['x-forwarded-for']);
      const isLocal = localRequest(req) && !proxied;
      const secure = proxied && publicHost !== null ? '; Secure' : '';
      if (proxied && requestHost !== publicHost) return json(res, 403, { error: 'Dirección no permitida' });
      const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith('mg_session='));
      const device = cookie ? store.deviceForToken(cookie.slice('mg_session='.length)) : null;
      // Por Caddy, la IP real del visitante llega en X-MiPlata-Client (Caddy reemplaza lo que mande el navegador).
      const clientAddress = proxied ? String(req.headers['x-miplata-client'] || '') : String(req.socket.remoteAddress || '');
      if (device) store.touchDevice(device.id, clientAddress);
      const authorized = isLocal || Boolean(device);
      // La PC (o el túnel SSH) usa los datos del dueño; cada dispositivo, los de la persona a la que se vinculó.
      const personId = isLocal ? 'owner' : device?.person_id || 'owner';
      // El dueño también administra desde su celular si entró con su usuario y contraseña.
      const remoteAdmin = !isLocal && Boolean(device) && personId === 'owner' && Boolean(store.accountFor('owner'));
      const admin = isLocal || remoteAdmin;
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
        pending.set(requestId, { name: String(body.name || 'Celular').slice(0, 80), personId: pairPerson, createdAt: Date.now(), status: 'pending' });
        onPending();
        return json(res, 200, { requestId });
      }

      if (pathname === '/api/pair/status' && req.method === 'GET') {
        const requestId = url.searchParams.get('requestId') || '';
        const item = pending.get(requestId);
        if (!item || Date.now() - item.createdAt > 300000) { pending.delete(requestId); return json(res, 200, { status: 'expired' }); }
        if (item.status === 'approved') {
          pending.delete(requestId);
          return json(res, 200, { status: 'approved' }, { 'Set-Cookie': 'mg_session=' + item.token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000' + secure });
        }
        if (item.status === 'denied') pending.delete(requestId);
        return json(res, 200, { status: item.status });
      }

      if ((pathname === '/api/login' || pathname === '/api/register') && req.method === 'POST') {
        const body = await readBody(req);
        const address = proxied ? String(req.headers['x-miplata-client'] || 'internet') : String(req.socket.remoteAddress || '');
        const keys = ['ip:' + address, 'user:' + String(body.username || '').trim().toLowerCase()];
        if (limiter.locked(keys)) return json(res, 429, { error: limiter.message(keys) });
        if (pathname === '/api/login') {
          const personId = store.verifyLogin(body.username, body.password);
          if (!personId) { limiter.fail(keys); return json(res, 401, { error: 'Usuario o contraseña incorrectos' }); }
          limiter.clear(keys);
          return startSession(res, personId, body.device, secure);
        }
        let personId;
        // Solo cuenta como intento fallido un código equivocado; un usuario o contraseña que no cumple las reglas no bloquea.
        try { personId = store.registerAccount(body.code, body.username, body.password); } catch (error) { if (error.badInvite) limiter.fail(keys.slice(0, 1)); return json(res, 400, { error: error.message }); }
        limiter.clear(keys);
        return startSession(res, personId, body.device, secure);
      }

      if (pathname.startsWith('/api/') && !authorized) return json(res, 401, { error: 'Inicia sesión para continuar' });
      if (pathname === '/api/logout' && req.method === 'POST') {
        if (device) store.revokeDevice(device.id);
        return json(res, 200, { ok: true }, { 'Set-Cookie': 'mg_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + secure });
      }
      const own = authorized ? store.forPerson(personId) : null;
      if (pathname === '/api/state' && req.method === 'GET') return json(res, 200, own.getState());
      if (pathname === '/api/state' && req.method === 'POST') {
        const body = await readBody(req);
        const result = own.saveState(body.revision, body.data);
        return json(res, result.conflict ? 409 : 200, result);
      }
      if (pathname === '/api/receipts' && req.method === 'POST') {
        if (!/^image\/(jpeg|png|webp)$/.test(String(req.headers['content-type'] || ''))) return json(res, 415, { error: 'Solo se aceptan imágenes JPG, PNG o WebP' });
        const bytes = await readRaw(req, 6_000_000);
        try { return json(res, 200, own.saveReceipt(bytes)); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname === '/api/documents' && req.method === 'POST') {
        const bytes = await readRaw(req, 15_000_000);
        try { return json(res, 200, own.saveDocument(bytes, url.searchParams.get('name'))); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname.startsWith('/api/documents/') && req.method === 'GET') {
        const document = own.readDocument(pathname.slice('/api/documents/'.length));
        if (!document) return json(res, 404, { error: 'Documento no encontrado' });
        // Siempre como descarga: el archivo nunca se muestra dentro de la app.
        const name = (url.searchParams.get('name') || '').replace(/[^\p{L}\p{N} ._()-]/gu, '').trim().slice(0, 120).replace(/\.[^.]*$/, '') || 'documento';
        const filename = name + '.' + document.extension;
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': document.bytes.length, 'Content-Disposition': 'attachment; filename="' + filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '') + '"; filename*=UTF-8\'\'' + encodeURIComponent(filename).replace(/[()]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase()), 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff' });
        return res.end(document.bytes);
      }
      if (pathname.startsWith('/api/receipts/') && req.method === 'GET') {
        const receipt = own.readReceipt(pathname.slice('/api/receipts/'.length));
        if (!receipt) return json(res, 404, { error: 'Boleta no encontrada' });
        res.writeHead(200, { 'Content-Type': receipt.type, 'Content-Length': receipt.bytes.length, 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' });
        return res.end(receipt.bytes);
      }

      if (pathname === '/api/profile' && req.method === 'GET') return json(res, 200, { ...own.getProfile(), admin });
      if (pathname === '/api/profile' && req.method === 'POST') {
        const body = await readBody(req);
        try { return json(res, 200, { ...own.setName(body.name), admin }); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname === '/api/profile/avatar' && req.method === 'POST') {
        if (!/^image\/(jpeg|png|webp)$/.test(String(req.headers['content-type'] || ''))) return json(res, 415, { error: 'La foto debe ser JPG, PNG o WebP' });
        const bytes = await readRaw(req, 1_500_000);
        try { return json(res, 200, { ...own.saveAvatar(bytes), admin }); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname === '/api/profile/avatar/remove' && req.method === 'POST') return json(res, 200, { ...own.removeAvatar(), admin });
      if (pathname === '/api/profile/avatar' && req.method === 'GET') {
        const avatar = own.readAvatar();
        if (!avatar) return json(res, 404, { error: 'Sin foto' });
        res.writeHead(200, { 'Content-Type': avatar.type, 'Content-Length': avatar.bytes.length, 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' });
        return res.end(avatar.bytes);
      }
      if (pathname === '/api/profile/password' && req.method === 'POST') {
        const body = await readBody(req);
        const keys = ['ip:' + (proxied ? String(req.headers['x-miplata-client'] || 'internet') : String(req.socket.remoteAddress || '')), 'person:' + personId];
        if (limiter.locked(keys)) return json(res, 429, { error: limiter.message(keys) });
        let changed;
        try { changed = own.changePassword(body.current, body.password); } catch (error) { return json(res, 400, { error: error.message }); }
        if (!changed) { limiter.fail(keys); return json(res, 400, { error: 'La contraseña actual no es correcta' }); }
        limiter.clear(keys);
        return json(res, 200, { ok: true });
      }

      if (pathname === '/api/admin/unlock' && req.method === 'POST') {
        if (!remoteAdmin) return json(res, 403, { error: 'Esta acción se hace en la PC' });
        const body = await readBody(req);
        const keys = ['ip:' + (proxied ? String(req.headers['x-miplata-client'] || 'internet') : String(req.socket.remoteAddress || '')), 'person:owner'];
        if (limiter.locked(keys)) return json(res, 429, { error: limiter.message(keys) });
        if (store.verifyLogin(store.accountFor('owner').username, body.password) !== 'owner') { limiter.fail(keys); return json(res, 400, { error: 'La contraseña no es correcta' }); }
        limiter.clear(keys);
        adminUnlocked.set(device.id, Date.now() + ADMIN_UNLOCK_MS);
        return json(res, 200, { ok: true });
      }
      if (pathname.startsWith('/api/') && !isLocal) {
        // Las copias de seguridad siguen siendo solo de la PC.
        if (!remoteAdmin || pathname === '/api/restore' || pathname === '/api/export') return json(res, 403, { error: 'Esta acción se hace en la PC' });
        if (req.method === 'POST' && !((adminUnlocked.get(device.id) || 0) > Date.now())) return json(res, 403, { error: 'Confirma tu contraseña para continuar', reauth: true });
      }
      if (pathname === '/api/people/edit' && req.method === 'POST') {
        const body = await readBody(req);
        try {
          const target = store.forPerson(String(body.personId || ''));
          if (body.name !== undefined && String(body.name).trim()) target.setName(body.name);
          if (body.username !== undefined && store.accountFor(target.personId)) store.setUsername(target.personId, body.username);
          return json(res, 200, target.getProfile());
        } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname === '/api/accounts/remove' && req.method === 'POST') {
        const body = await readBody(req);
        try { store.deleteAccount(String(body.personId || '')); } catch (error) { return json(res, 404, { error: error.message }); }
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/desktop-info' && req.method === 'GET') return json(res, 200, { networks: networks(), devices: store.listDevices().map(describeDevice), people: store.listPeople(), ownerAccount: store.accountFor('owner')?.username || null, pending: [...pending.entries()].filter(([, item]) => item.status === 'pending' && Date.now() - item.createdAt < 300000).map(([id, item]) => ({ id, name: item.name, personId: item.personId, personName: store.personName(item.personId) })), backupDir: store.backupDir, lastBackup: store.lastBackupAt() });
      if (pathname === '/api/invites' && req.method === 'POST') {
        const body = await readBody(req);
        try { return json(res, 200, store.createInvite(String(body.personId || ''))); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname === '/api/people/password' && req.method === 'POST') {
        const body = await readBody(req);
        try { store.setPassword(String(body.personId || ''), body.password); } catch (error) { return json(res, 400, { error: error.message }); }
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/people' && req.method === 'POST') {
        const body = await readBody(req);
        try { return json(res, 200, store.addPerson(body.name)); } catch (error) { return json(res, 400, { error: error.message }); }
      }
      if (pathname === '/api/people/remove' && req.method === 'POST') {
        const body = await readBody(req);
        try { store.removePerson(String(body.id || '')); } catch (error) { return json(res, 404, { error: error.message }); }
        for (const [id, item] of pending) if (item.personId === body.id) pending.delete(id);
        if (pairPerson === body.id) pairToken = null;
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/pair/start' && req.method === 'POST') {
        const body = await readBody(req);
        const addresses = networks();
        const chosen = addresses.find((item) => item.address === body.address) || addresses[0];
        if (!chosen) return json(res, 503, { error: 'No hay una red Wi-Fi o Tailscale activa' });
        const host = chosen.address;
        const person = body.personId || 'owner';
        if (person !== 'owner' && !store.listPeople().some((item) => item.id === person)) return json(res, 404, { error: 'Persona no encontrada' });
        pairPerson = person;
        pairToken = crypto.randomBytes(24).toString('base64url');
        pairExpires = Date.now() + 300000;
        const pairUrl = chosen.url + '/pair?token=' + pairToken;
        const qr = await QRCode.toDataURL(pairUrl, { width: 250, margin: 2, color: { dark: '#262536', light: '#fdfbf7' } });
        return json(res, 200, { address: host, url: pairUrl, qr, expires: pairExpires, personId: pairPerson });
      }
      if (pathname === '/api/pair/decision' && req.method === 'POST') {
        const body = await readBody(req);
        const item = pending.get(body.id);
        if (!item || item.status !== 'pending') return json(res, 404, { error: 'Solicitud vencida' });
        if (body.approve === true) {
          item.token = crypto.randomBytes(32).toString('base64url');
          try { store.addDevice(item.name, item.token, item.personId); } catch (error) { pending.delete(body.id); return json(res, 404, { error: error.message }); }
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

      if (pathname === '/runtime.js') return res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' }).end('window.MISGASTOS_LIVE=true;window.MISGASTOS_DESKTOP=' + JSON.stringify(isLocal) + ';window.MIPLATA_ADMIN=' + JSON.stringify(admin) + ';window.MIPLATA_PERSON=' + JSON.stringify(authorized ? store.personName(personId) : null).replace(/</g, '\\u003c') + ';');
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
      if (!authorized) return html(res, 401, loginPage());
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
