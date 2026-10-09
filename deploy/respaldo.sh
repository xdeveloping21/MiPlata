#!/usr/bin/env bash
# Copia de seguridad diaria, cifrada, fuera del servidor (Google Drive, con rclone).
# Configurar (una vez):   sudo bash /opt/miplata/deploy/respaldo.sh configurar
# Copia ahora:            sudo bash /opt/miplata/deploy/respaldo.sh ahora
# Ver copias en Drive:    sudo bash /opt/miplata/deploy/respaldo.sh listar
# Restaurar una copia:    sudo bash /opt/miplata/deploy/respaldo.sh restaurar MiPlata-AAAA-MM-DD-HH-MM-SS.miplata
# Dejar de copiar:        sudo bash /opt/miplata/deploy/respaldo.sh quitar
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Ejecuta este script con sudo."; exit 1; fi

DATOS=/var/lib/miplata
SALIDA=/var/lib/miplata-respaldos
CLAVE=/etc/miplata/respaldo.clave
REMOTO=miplata-drive
CARPETA=MiPlata-respaldos
APP=/opt/miplata
GUARDAR_DIAS=60

estado() { node "$APP/desktop/respaldo.cjs" estado "$@" --datos "$DATOS" --destino "Google Drive" || true; }

copiar_ahora() {
  local archivo
  if ! archivo="$(node "$APP/desktop/respaldo.cjs" crear --datos "$DATOS" --salida "$SALIDA" --clave-archivo "$CLAVE")"; then
    estado error "No se pudo crear la copia cifrada"; return 1
  fi
  if ! rclone copy "$archivo" "$REMOTO:$CARPETA" --retries 3 2>/tmp/miplata-rclone.log; then
    estado error "No se pudo subir a Google Drive: $(tail -1 /tmp/miplata-rclone.log)"; return 1
  fi
  # En Drive quedan los últimos $GUARDAR_DIAS días; en el servidor, las últimas 3 copias.
  rclone delete "$REMOTO:$CARPETA" --min-age "${GUARDAR_DIAS}d" >/dev/null 2>&1 || true
  ls -1t "$SALIDA"/*.miplata 2>/dev/null | tail -n +4 | xargs -r rm -f
  estado ok --archivo "$(basename "$archivo")"
  echo "Copia subida a Google Drive, carpeta $CARPETA: $(basename "$archivo")"
}

case "${1:-}" in
  configurar)
    apt-get update -q
    if ! apt-get install -y -q rclone; then
      echo "No se pudo instalar rclone con apt. Revisa que el repositorio 'universe' esté activo (sudo add-apt-repository universe)."; exit 1
    fi
    mkdir -p /etc/miplata && chmod 700 /etc/miplata
    if [ ! -s "$CLAVE" ]; then
      echo
      echo "Elige una frase para cifrar las copias (mínimo 12 caracteres)."
      echo "Guárdala también fuera de esta VPS, por ejemplo en tu gestor de contraseñas:"
      echo "sin ella las copias no se pueden abrir, ni siquiera por ti."
      while true; do
        read -r -s -p "Frase: " uno; echo
        read -r -s -p "Repítela: " dos; echo
        if [ "${#uno}" -lt 12 ]; then echo "Debe tener al menos 12 caracteres."; continue; fi
        if [ "$uno" != "$dos" ]; then echo "No coinciden, inténtalo de nuevo."; continue; fi
        break
      done
      umask 077; printf '%s' "$uno" > "$CLAVE"; umask 022
      unset uno dos
    fi
    if ! rclone listremotes | grep -qx "$REMOTO:"; then
      echo
      echo "Ahora conecta tu Google Drive. MiPlata solo podrá ver los archivos que ella misma suba."
      echo "1. En Bitvise agrega otro túnel (C2S): escucha 127.0.0.1 puerto 53682, destino 127.0.0.1 puerto 53682."
      echo "2. Cuando aparezca un enlace http://127.0.0.1:53682/auth?..., ábrelo en el navegador de tu PC"
      echo "   y autoriza con tu cuenta de Google. Después vuelve aquí."
      echo
      rclone config create "$REMOTO" drive scope=drive.file
    fi
    rclone mkdir "$REMOTO:$CARPETA"
    cat > /etc/systemd/system/miplata-respaldo.service <<EOF
[Unit]
Description=Copia cifrada de MiPlata a Google Drive
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/bash $APP/deploy/respaldo.sh ahora
EOF
    cat > /etc/systemd/system/miplata-respaldo.timer <<EOF
[Unit]
Description=Copia diaria de MiPlata a Google Drive

[Timer]
OnCalendar=*-*-* 04:00
RandomizedDelaySec=30min
Persistent=true

[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable --now miplata-respaldo.timer >/dev/null
    copiar_ahora
    echo
    echo "Listo. Cada día, cerca de las 04:00, se sube una copia cifrada a Google Drive (carpeta $CARPETA)."
    ;;
  ahora)
    copiar_ahora
    ;;
  listar)
    rclone lsl "$REMOTO:$CARPETA" | sort -k2,3
    ;;
  restaurar)
    NOMBRE="${2:-}"
    if [ -z "$NOMBRE" ]; then echo "Indica el nombre de la copia. Para verlas: sudo bash $0 listar"; exit 1; fi
    mkdir -p "$SALIDA" && chmod 700 "$SALIDA"
    rclone copy "$REMOTO:$CARPETA/$NOMBRE" "$SALIDA"
    node "$APP/desktop/respaldo.cjs" probar "$SALIDA/$NOMBRE" --clave-archivo "$CLAVE"
    read -r -p "Se reemplazarán los datos actuales (quedan guardados aparte). ¿Continuar? (s/n) " respuesta
    [ "$respuesta" = "s" ] || { echo "Cancelado."; exit 0; }
    systemctl stop miplata
    node "$APP/desktop/respaldo.cjs" restaurar "$SALIDA/$NOMBRE" --datos "$DATOS" --reemplazar --clave-archivo "$CLAVE"
    chown -R miplata:miplata "$DATOS"
    systemctl start miplata
    echo "Listo. MiPlata volvió a iniciarse con los datos de la copia."
    ;;
  quitar)
    systemctl disable --now miplata-respaldo.timer >/dev/null 2>&1 || true
    rm -f /etc/systemd/system/miplata-respaldo.service /etc/systemd/system/miplata-respaldo.timer
    systemctl daemon-reload
    echo "Ya no se harán copias en Google Drive. Las copias que ya están allí no se borran."
    ;;
  *)
    sed -n '2,7p' "$0"
    exit 1
    ;;
esac
