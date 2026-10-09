#!/usr/bin/env bash
# Instala o actualiza MiPlata en modo servidor en Ubuntu (recomendado 24.04). Ejecutar con sudo.
# Primera vez:  sudo git clone https://github.com/xdeveloping21/MiPlata.git /opt/miplata && sudo bash /opt/miplata/deploy/instalar.sh
# Actualizar:   sudo bash /opt/miplata/deploy/instalar.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Ejecuta este script con sudo."; exit 1; fi

apt-get update -q
apt-get install -y -q git ufw curl ca-certificates

# MiPlata necesita Node.js 18 o más nuevo. Ubuntu 24.04 lo trae; en versiones
# anteriores (por ejemplo 20.04, que trae Node 10) se instala Node 22 desde NodeSource.
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_major)" -lt 18 ]; then
  if apt-cache policy nodejs | grep -qE 'Candidate: (1[89]|[2-9][0-9])\.'; then
    apt-get install -y -q nodejs npm
  else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -q nodejs
  fi
fi
echo "Node.js $(node -v)"

id miplata >/dev/null 2>&1 || useradd --system --home-dir /var/lib/miplata --shell /usr/sbin/nologin miplata

if [ -d /opt/miplata/.git ]; then
  git -C /opt/miplata pull --ff-only
else
  git clone https://github.com/xdeveloping21/MiPlata.git /opt/miplata
fi
cd /opt/miplata
npm ci --omit=dev --no-audit --no-fund

install -m 644 deploy/miplata.service /etc/systemd/system/miplata.service
systemctl daemon-reload
systemctl enable miplata >/dev/null
systemctl restart miplata

# Cortafuegos: SSH abierto y MiPlata (puerto 4174) solo por Tailscale.
ufw allow OpenSSH >/dev/null
ufw allow in on tailscale0 to any port 4174 proto tcp >/dev/null
ufw --force enable >/dev/null

sleep 2
systemctl --no-pager --lines=5 status miplata || true
echo
echo "Listo. MiPlata queda activa y se inicia sola con la VPS."
command -v tailscale >/dev/null && echo "Dirección Tailscale de esta VPS: http://$(tailscale ip -4 | head -1):4174"
