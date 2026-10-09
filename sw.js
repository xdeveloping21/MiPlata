// Modo sin conexión: guarda la app y tus últimos datos en el celular para abrir MiPlata sin señal.
// Siempre intenta primero la red; solo si no hay conexión usa lo guardado. Los gastos que anotes sin
// señal los guarda la app (app.js) y los envía al servidor cuando vuelve la conexión.
const CACHE = 'miplata-v1';
const SHELL = ['/', '/app.js', '/styles.css', '/category-icons.js', '/runtime.js', '/assets/miplata-logo.png', '/apple-touch-icon.png', '/manifest.webmanifest'];
// Datos que conviene tener sin conexión; el resto de la API necesita red.
const OFFLINE_API = ['/api/state', '/api/profile'];
// Sube cada vez que se borra lo guardado, para que una respuesta que venía en camino no lo vuelva a llenar.
let generation = 0;
const clearAll = () => { generation++; return caches.delete(CACHE); };

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  // Al cerrar sesión se borra todo lo guardado en este dispositivo.
  if (event.data === 'clear') event.waitUntil(clearAll());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isShell = request.mode === 'navigate' || SHELL.includes(url.pathname);
  const isData = OFFLINE_API.includes(url.pathname);
  if (!isShell && !isData) return;
  const key = request.mode === 'navigate' ? '/' : url.pathname;
  const started = generation;
  event.respondWith(fetch(request).then((response) => {
    // Solo se guarda la app y los datos de una sesión iniciada, nunca la pantalla de inicio de sesión.
    if (response.ok && started === generation) { const copy = response.clone(); caches.open(CACHE).then((cache) => started === generation ? cache.put(key, copy) : null); }
    if (response.status === 401) clearAll();
    return response;
  }).catch(() => caches.match(key).then((cached) => cached || Response.error())));
});
