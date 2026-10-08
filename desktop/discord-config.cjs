const fs = require('node:fs');
const path = require('node:path');

function createDiscordConfig(userDataPath, safeStorage) {
  const configPath = path.join(userDataPath, 'discord-config.json');
  let saved = {};
  if (fs.existsSync(configPath)) {
    try { saved = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
    catch { saved = {}; }
  }

  function secret(key) {
    if (!saved[key]) return '';
    try { return safeStorage.decryptString(Buffer.from(saved[key], 'base64')); }
    catch { return ''; }
  }

  function publicSettings(status = 'desconectado', detail = '') {
    return {
      enabled: saved.enabled === true,
      channelId: saved.channelId || '',
      hasBotToken: Boolean(secret('botToken')),
      status,
      detail
    };
  }

  function credentials() {
    return { enabled: saved.enabled === true, channelId: saved.channelId || '', botToken: secret('botToken') };
  }

  function update(input) {
    if (!input || typeof input !== 'object') throw new Error('Configuración inválida');
    const channelId = String(input.channelId || '').trim();
    if (channelId && !/^\d{17,22}$/.test(channelId)) throw new Error('El ID del canal no es válido');
    if (typeof input.enabled !== 'boolean') throw new Error('Elige si quieres activar el bot');
    const botToken = String(input.botToken || '').trim();
    if (botToken.length > 300) throw new Error('Token demasiado largo');
    if (input.enabled && (!channelId || !(botToken || secret('botToken')))) {
      throw new Error('Faltan el canal o el token para activar el bot');
    }
    if (botToken && !safeStorage.isEncryptionAvailable()) throw new Error('Windows no puede proteger el token en este momento');
    const next = { ...saved, enabled: input.enabled, channelId };
    if (botToken) next.botToken = safeStorage.encryptString(botToken).toString('base64');
    delete next.apiKey;
    const temporary = configPath + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(temporary, configPath);
    saved = next;
    return publicSettings();
  }

  return { credentials, publicSettings, update };
}

module.exports = { createDiscordConfig };
