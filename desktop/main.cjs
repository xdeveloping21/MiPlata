const { app, BrowserWindow, Menu, Tray, nativeImage, dialog, shell, safeStorage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { openStore } = require('./store.cjs');
const { startServer, PORT } = require('./server.cjs');
const { createDiscordConfig } = require('./discord-config.cjs');
const { createDiscordBot } = require('./discord-bot.cjs');
const { createDiagnosticLog } = require('./diagnostic-log.cjs');

app.setName('MiPlata');
app.setAppUserModelId('cl.miplata.app');
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let mainWindow = null;
let tray = null;
let server = null;
let store = null;
let discordBot = null;
let quitting = false;
let shutdownReason = 'app_quit';
let diagnosticLog = null;
const root = path.resolve(__dirname, '..');

function captureErrors(log) {
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    originalError(...args);
    const message = args.map((arg) => arg instanceof Error ? (arg.stack || arg.message) : String(arg)).join(' ').slice(0, 5000);
    log.write('error', 'console_error', { message });
  };
  process.on('uncaughtExceptionMonitor', (error, origin) => log.write('error', 'uncaught_exception', { origin, name: error.name, message: error.message, stack: String(error.stack || '').slice(0, 4000) }));
  process.on('unhandledRejection', (reason) => log.error('unhandled_rejection', reason));
}

function showWindow(openQr = false) {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.restore();
  mainWindow.focus();
  if (openQr) mainWindow.webContents.executeJavaScript('window.MISGASTOS_OPEN_QR && window.MISGASTOS_OPEN_QR()').catch(() => {});
}

function loginSettings(enabled) {
  if (!app.isPackaged || process.platform !== 'win32') return;
  app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: ['--hidden'] });
}

function setupLogin() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  const configured = path.join(app.getPath('userData'), 'autostart-configured');
  if (!fs.existsSync(configured)) {
    loginSettings(true);
    fs.writeFileSync(configured, '1');
  }
}

function trayMenu() {
  const auto = app.isPackaged && process.platform === 'win32' && app.getLoginItemSettings({ path: process.execPath, args: ['--hidden'] }).openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir MiPlata', click: () => showWindow() },
    { label: 'Conectar iPhone', click: () => showWindow(true) },
    { type: 'separator' },
    { label: 'Iniciar con Windows', type: 'checkbox', checked: Boolean(auto), enabled: app.isPackaged && process.platform === 'win32', click: (item) => { loginSettings(item.checked); trayMenu(); } },
    { label: 'Abrir registros', click: () => { if (diagnosticLog) shell.openPath(diagnosticLog.directory).catch((error) => console.error('No se pudieron abrir los registros:', error)); } },
    { type: 'separator' },
    { label: 'Salir', click: () => { shutdownReason = 'tray_exit'; quitting = true; app.quit(); } }
  ]));
}

function createWindow() {
  const icon = path.join(root, 'assets', 'miplata-logo.png');
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 720,
    minHeight: 560,
    title: 'MiPlata',
    icon,
    show: false,
    backgroundColor: '#f7faf8',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  mainWindow.loadURL('http://127.0.0.1:' + PORT + '/');
  mainWindow.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) mainWindow.show(); });
  mainWindow.on('close', (event) => { if (!quitting) { event.preventDefault(); mainWindow.hide(); diagnosticLog?.write('info', 'window_hidden_to_tray'); } });
  mainWindow.webContents.on('render-process-gone', (_event, details) => diagnosticLog?.write('error', 'renderer_process_gone', { reason: details.reason, exitCode: details.exitCode }));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
}

app.on('second-instance', () => showWindow());
app.on('window-all-closed', () => {});
app.on('child-process-gone', (_event, details) => {
  if (details.reason !== 'clean-exit') diagnosticLog?.write('error', 'child_process_gone', { type: details.type, reason: details.reason, exitCode: details.exitCode });
});

// En el primer inicio, trae los datos de MisGastos si estaba instalado (no borra ni cambia el original).
function importMisGastosData(userData) {
  const previous = path.join(app.getPath('appData'), 'MisGastos');
  const files = [['misgastos.sqlite', 'miplata.sqlite'], ['discord-config.json', 'discord-config.json']];
  if (fs.existsSync(path.join(userData, 'miplata.sqlite')) || !fs.existsSync(path.join(previous, 'misgastos.sqlite'))) return false;
  fs.mkdirSync(userData, { recursive: true });
  for (const [from, to] of files) {
    const source = path.join(previous, from);
    const target = path.join(userData, to);
    if (fs.existsSync(source) && !fs.existsSync(target)) fs.copyFileSync(source, target);
  }
  return true;
}

if (singleInstance) app.whenReady().then(async () => {
  try {
    const userData = app.getPath('userData');
    diagnosticLog = createDiagnosticLog(userData);
    diagnosticLog.start(app.getVersion());
    captureErrors(diagnosticLog);
    if (importMisGastosData(userData)) diagnosticLog.write('info', 'misgastos_data_imported', {});
    store = await openStore(userData, path.join(root, 'initial-state.json'));
    const discordConfig = createDiscordConfig(userData, safeStorage);
    discordBot = createDiscordBot(store, discordConfig, (status, detail) => {
      diagnosticLog.write(status === 'error' ? 'error' : 'info', 'discord_status', { status, detail });
    });
    const started = await startServer(store, root, () => {
      showWindow();
      if (mainWindow) mainWindow.webContents.executeJavaScript('window.MISGASTOS_PENDING && window.MISGASTOS_PENDING()').catch(() => {});
    }, discordBot, discordConfig);
    server = started.server;
    server.on('error', (error) => diagnosticLog.error('http_server_error', error));
    createWindow();
    const icon = nativeImage.createFromPath(path.join(root, 'assets', 'miplata-logo.png')).resize({ width: 20, height: 20 });
    tray = new Tray(icon);
    tray.setToolTip('MiPlata');
    tray.on('click', () => showWindow());
    trayMenu();
    discordBot.start().catch((error) => console.error('No se pudo iniciar Discord:', error));
    setupLogin();
    trayMenu();
    diagnosticLog.write('info', 'app_ready', { port: PORT });
  } catch (error) {
    shutdownReason = 'startup_error';
    console.error('No se pudo iniciar MiPlata:', error);
    dialog.showErrorBox('MiPlata no pudo iniciarse', error.message + '\n\nSi el puerto 4174 está ocupado, cierra la otra instancia.');
    app.quit();
  }
});

app.on('before-quit', () => {
  quitting = true;
  try {
    if (discordBot) discordBot.stop();
    if (server) server.close();
    if (store) store.close();
  } finally {
    diagnosticLog?.stop(shutdownReason);
  }
});
