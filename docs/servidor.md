# MiPlata en una VPS (modo servidor)

Con el modo servidor, MiPlata queda encendida todo el día en una VPS con Linux y la usas desde tu PC y tu iPhone sin depender de que la PC esté prendida.

Para que tus datos no queden expuestos en internet, MiPlata solo responde dentro de tu red privada de **Tailscale** (gratis para uso personal). Nadie fuera de esa red puede abrirla.

## Lo que necesitas

- Una VPS con **Ubuntu 24.04 LTS**, con 1 GB de RAM o más y la zona horaria **America/Santiago**.
- Una cuenta de [Tailscale](https://tailscale.com), y la app de Tailscale instalada en tu PC y en tu iPhone con esa misma cuenta.
- En la PC, la terminal de Windows (PowerShell). Ya trae `ssh` y `scp`.

En los comandos, reemplaza `IP_DE_LA_VPS` por la IP pública que te dio el proveedor.

## 1. Entrar a la VPS

En PowerShell:

```powershell
ssh root@IP_DE_LA_VPS
```

La primera vez te preguntará si confías en el servidor: escribe `yes`.

## 2. Unir la VPS a Tailscale

Dentro de la VPS:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
```

`tailscale up` muestra un enlace: ábrelo en tu navegador e inicia sesión con tu cuenta de Tailscale. La VPS aparecerá junto a tu PC y tu iPhone en el panel de Tailscale.

## 3. Instalar MiPlata

Dentro de la VPS:

```bash
git clone https://github.com/xdeveloping21/MiPlata.git /opt/miplata
bash /opt/miplata/deploy/instalar.sh
```

El script instala Node.js, deja MiPlata como un servicio que se inicia solo con la VPS (y se reinicia si falla) y activa el cortafuegos: solo quedan abiertos SSH y MiPlata por Tailscale. Al final muestra la dirección de MiPlata en Tailscale, por ejemplo `http://100.101.102.103:4174`.

## 4. Pasar tus datos desde la PC

Si ya usabas MiPlata en Windows, cierra la app en la PC (clic derecho en el ícono junto al reloj y salir). Luego:

En la VPS, detén MiPlata:

```bash
systemctl stop miplata
```

En PowerShell, en la PC (otra ventana, sin entrar a la VPS):

```powershell
scp "$env:APPDATA\MiPlata\miplata.sqlite" root@IP_DE_LA_VPS:/var/lib/miplata/
scp -r "$env:APPDATA\MiPlata\receipts" "$env:APPDATA\MiPlata\documents" root@IP_DE_LA_VPS:/var/lib/miplata/
```

Si no tenías boletas ni documentos, el segundo comando puede avisar que no encuentra esas carpetas; no pasa nada.

De vuelta en la VPS:

```bash
chown -R miplata:miplata /var/lib/miplata
systemctl start miplata
```

## 5. Abrir MiPlata como administrador desde la PC

Las funciones de la PC (vincular celulares, exportar y restaurar copias) se usan a través de una conexión segura por SSH. En PowerShell:

```powershell
ssh -L 4174:127.0.0.1:4174 root@IP_DE_LA_VPS
```

Deja esa ventana abierta y entra a <http://localhost:4174> en el navegador. MiPlata te reconoce como la PC dueña.

La app de escritorio usa el mismo puerto, así que debe estar cerrada mientras haces esto. Cuando todo funcione en la VPS, puedes desinstalarla de la PC.

## 6. Vincular el iPhone

1. Abre Tailscale en el iPhone y verifica que esté conectado.
2. En la PC, en <http://localhost:4174>, ve a **Ajustes → Conectar iPhone** y elige la red **Tailscale**.
3. Escanea el QR con la cámara del iPhone y aprueba la solicitud en la PC.
4. En Safari, usa **Compartir → Agregar a inicio** para tener MiPlata como una app.

## 7. Uso diario en la PC

Tienes dos formas:

- **Con el túnel SSH** del paso 5 y <http://localhost:4174>. Tienes todas las funciones.
- **Por Tailscale, como el iPhone.** En la ventana de vincular del paso 6 aparece el enlace del QR debajo de la imagen. Ábrelo en el navegador de la PC, aprueba la solicitud y luego entra siempre a la dirección de Tailscale (`http://100.x.x.x:4174`). Así no necesitas el túnel para registrar gastos.

## Actualizar MiPlata

Cuando haya una versión nueva, entra a la VPS y ejecuta:

```bash
bash /opt/miplata/deploy/instalar.sh
```

Tus datos no se tocan: están en `/var/lib/miplata`.

## Copias de seguridad

MiPlata guarda copias automáticas en `/var/lib/miplata/backups`. Para tener una copia en tu PC, abre MiPlata con el túnel del paso 5 y usa **Ajustes → Exportar mis datos**, o descarga todo con:

```powershell
scp -r root@IP_DE_LA_VPS:/var/lib/miplata "$env:USERPROFILE\Documents\MiPlata-copia"
```

## Si algo falla

- Ver si MiPlata está activa: `systemctl status miplata`
- Ver los mensajes recientes: `journalctl -u miplata -n 50`
- Si el iPhone no abre la app, revisa que Tailscale esté conectado en el iPhone y en la VPS (`tailscale status`).
