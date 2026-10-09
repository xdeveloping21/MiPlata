// Registro de actividad (inicios de sesión, cambios de cuenta, acciones del administrador) y avisos de
// dispositivo nuevo. Se guarda aparte de la base de datos, una línea por evento, y conserva los últimos 2000.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const KEEP = 2000;
const ALERT_DAYS = 30;

function openActivity(folder) {
  const logPath = path.join(folder, 'activity.jsonl');
  const dismissedPath = path.join(folder, 'alerts-dismissed.json');
  let events = [];
  try {
    events = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => { try { return JSON.parse(line); } catch (error) { return null; } }).filter(Boolean);
  } catch (error) { events = []; }
  let dismissed = {};
  try { dismissed = JSON.parse(fs.readFileSync(dismissedPath, 'utf8')) || {}; } catch (error) { dismissed = {}; }

  function rewrite() {
    events = events.slice(-KEEP);
    const temporary = logPath + '.tmp';
    fs.writeFileSync(temporary, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
    fs.renameSync(temporary, logPath);
  }
  if (events.length > KEEP) rewrite();

  function saveDismissed() {
    const temporary = dismissedPath + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(dismissed));
    fs.renameSync(temporary, dismissedPath);
  }

  return {
    // kind: login, login-failed, code-failed, register, logout, device-revoked, password-changed, password-reset,
    // twofa-on, twofa-off, account-deleted, person-added, person-removed, invite, admin-unlock, admin-unlock-failed, pair
    log(kind, fields = {}) {
      const event = { id: crypto.randomBytes(9).toString('base64url'), at: new Date().toISOString(), kind, ...fields };
      for (const key of Object.keys(event)) if (event[key] === undefined || event[key] === null || event[key] === '') delete event[key];
      events.push(event);
      fs.appendFileSync(logPath, JSON.stringify(event) + '\n');
      if (events.length > KEEP * 1.5) rewrite();
      return event;
    },
    list(limit = 100, personId = null) {
      const source = personId ? events.filter((event) => event.personId === personId) : events;
      return source.slice(-Math.min(Math.max(Number(limit) || 100, 1), KEEP)).reverse();
    },
    // Avisos para una persona: entradas desde un dispositivo nuevo que no sea el que está mirando.
    alertsFor(personId, currentDeviceId) {
      const since = Date.now() - ALERT_DAYS * 24 * 60 * 60 * 1000;
      const seen = new Set(dismissed[personId] || []);
      return events.filter((event) => event.alert && event.personId === personId && event.deviceId !== currentDeviceId && !seen.has(event.id) && Date.parse(event.at) > since).reverse();
    },
    alertById(personId, id) {
      return events.find((event) => event.alert && event.personId === personId && event.id === id) || null;
    },
    dismiss(personId, id) {
      const list = new Set(dismissed[personId] || []);
      list.add(String(id));
      // Solo hace falta recordar los avisos que todavía se mostrarían.
      const recent = new Set(events.filter((event) => event.alert && event.personId === personId).map((event) => event.id));
      dismissed[personId] = [...list].filter((item) => recent.has(item));
      saveDismissed();
    },
  };
}

module.exports = { openActivity };
