// MiPlata en modo servidor: sin ventana, para dejarla siempre activa en una VPS con Linux.
// Uso: MIPLATA_DATA=/var/lib/miplata node desktop/headless.cjs   (guía en docs/servidor.md)
const os = require('node:os');
const path = require('node:path');
const { openStore } = require('./store.cjs');
const { startServer, PORT } = require('./server.cjs');

const root = path.resolve(__dirname, '..');
const dataDir = path.resolve(process.env.MIPLATA_DATA || process.argv[2] || path.join(os.homedir(), '.miplata'));
// Por seguridad solo atiende a la red de Tailscale; MIPLATA_SOLO_TAILSCALE=0 lo desactiva.
const onlyTailscale = process.env.MIPLATA_SOLO_TAILSCALE !== '0';

(async () => {
  const store = await openStore(dataDir, path.join(root, 'initial-state.json'));
  const { server } = await startServer(store, root, () => console.log('Hay una solicitud para vincular un dispositivo. Apruébala desde MiPlata abierto en tu PC.'), { onlyTailscale });
  console.log('MiPlata en modo servidor, puerto ' + PORT + ', datos en ' + dataDir + (onlyTailscale ? ', solo red Tailscale' : ''));
  const stop = () => {
    server.close(() => { store.close(); process.exit(0); });
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
})().catch((error) => {
  console.error('No se pudo iniciar MiPlata:', error);
  process.exit(1);
});
