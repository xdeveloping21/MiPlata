#!/usr/bin/env bash
# Publica MiPlata en internet con HTTPS, con un certificado gratuito de Let's Encrypt (vía Caddy).
# Antes: crea en tu DNS un registro A que apunte el dominio a la IP pública de esta VPS.
# Uso:     sudo bash /opt/miplata/deploy/publicar.sh miplata.tudominio.cl
# Quitar:  sudo bash /opt/miplata/deploy/publicar.sh --quitar
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Ejecuta este script con sudo."; exit 1; fi

DROPIN=/etc/systemd/system/miplata.service.d/publico.conf

if [ "${1:-}" = "--quitar" ]; then
  rm -f "$DROPIN" /etc/caddy/Caddyfile
  systemctl stop caddy 2>/dev/null || true
  systemctl disable caddy >/dev/null 2>&1 || true
  ufw delete allow 80/tcp >/dev/null 2>&1 || true
  ufw delete allow 443/tcp >/dev/null 2>&1 || true
  systemctl daemon-reload
  systemctl restart miplata
  echo "MiPlata ya no está publicada en internet. Sigue disponible por Tailscale."
  exit 0
fi

DOMINIO="$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')"
if ! [[ "$DOMINIO" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]]; then
  echo "Escribe el dominio, por ejemplo: sudo bash $0 miplata.tudominio.cl"
  exit 1
fi

# El certificado solo se emite si el dominio ya apunta a esta VPS.
IP_DOMINIO="$(getent ahostsv4 "$DOMINIO" | awk 'NR==1 {print $1}')"
IPS_LOCALES="$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1)"
if [ -z "$IP_DOMINIO" ]; then
  echo "El dominio $DOMINIO todavía no apunta a ninguna IP. Crea el registro A en tu DNS y espera unos minutos."
  exit 1
fi
if ! grep -qx "$IP_DOMINIO" <<<"$IPS_LOCALES"; then
  echo "El dominio $DOMINIO apunta a $IP_DOMINIO, pero esta VPS tiene: $(echo $IPS_LOCALES)."
  echo "Corrige el registro A (si usas Cloudflare, deja la nube en gris: Solo DNS) y vuelve a intentarlo."
  exit 1
fi

apt-get update -q
apt-get install -y -q caddy

# Caddy marca cada visita con X-MiPlata-Proxy: así MiPlata nunca trata a alguien de internet como la PC dueña.
cat > /etc/caddy/Caddyfile <<CADDY
$DOMINIO {
	encode gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		Referrer-Policy "same-origin"
		-Server
	}
	reverse_proxy 127.0.0.1:4174 {
		header_up X-MiPlata-Proxy 1
		header_up X-MiPlata-Client {remote_host}
	}
}
CADDY

mkdir -p "$(dirname "$DROPIN")"
printf '[Service]\nEnvironment=MIPLATA_DOMINIO=%s\n' "$DOMINIO" > "$DROPIN"
systemctl daemon-reload
systemctl restart miplata

ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
systemctl enable caddy >/dev/null
systemctl restart caddy

echo "Obteniendo el certificado HTTPS..."
for _ in $(seq 1 30); do
  CODIGO="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMINIO/" || true)"
  if [ "$CODIGO" = "401" ] || [ "$CODIGO" = "200" ]; then
    echo
    echo "Listo. MiPlata está publicada en https://$DOMINIO"
    echo "Crea las invitaciones en Ajustes → Personas y cuentas (desde el túnel SSH, en http://localhost:4174)."
    exit 0
  fi
  sleep 3
done
echo "Caddy todavía no obtiene el certificado. Revisa con: journalctl -u caddy -n 30"
exit 1
