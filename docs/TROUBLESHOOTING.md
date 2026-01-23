# Troubleshooting Guide - Publicidad Display System

## EADDRINUSE: Address Already in Use

### Síntomas
```
Error: listen EADDRINUSE: address already in use :::3000
  code: 'EADDRINUSE',
  errno: -98,
  syscall: 'listen',
```

### Causa
La aplicación se reinició pero el proceso anterior no terminó correctamente, dejando el puerto ocupado.

### Solución Rápida

#### Opción 1: Usar script automático (Recomendado)
```bash
npm run start:safe
```
Este script automáticamente:
- Verifica si el puerto está en uso
- Mata el proceso que lo está usando
- Inicia el servidor correctamente

#### Opción 2: Matar el puerto manualmente
```bash
npm run kill-port        # Usa PORT del .env (default: 3001)
npm run kill-port 3000   # Para un puerto específico
```

#### Opción 3: Comandos del sistema

**Linux/Mac:**
```bash
# Encontrar proceso
lsof -ti:3001

# Matar proceso
lsof -ti:3001 | xargs kill -9

# O en una línea
pkill -f "node.*app.js"
```

**Windows:**
```powershell
# Encontrar proceso
netstat -ano | findstr :3001

# Matar proceso (reemplaza PID con el número de la columna final)
taskkill /F /PID <PID>

# O matar todos los node.exe
taskkill /F /IM node.exe
```

### Prevención

El código ya incluye:
1. **Manejo de errores de servidor** - Detecta EADDRINUSE y muestra soluciones
2. **Graceful shutdown** - Handlers para SIGTERM y SIGINT
3. **Error handlers globales** - Captura uncaughtException y unhandledRejection
4. **Verificación de require.main** - Solo inicia servidor si no es importado

### Para Producción con PM2

Si usas PM2, asegúrate de:

```bash
# Ver procesos
pm2 list

# Reiniciar correctamente
pm2 restart publicidad

# Detener antes de iniciar
pm2 stop publicidad
pm2 delete publicidad
pm2 start src/app.js --name publicidad
```

**pm2 ecosystem.config.js** (recomendado):
```javascript
module.exports = {
  apps: [{
    name: 'publicidad',
    script: './src/app.js',
    instances: 1,  // NO usar cluster mode si tienes EADDRINUSE
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    kill_timeout: 5000,  // Tiempo para graceful shutdown
    wait_ready: true,
    listen_timeout: 10000
  }]
}
```

## AWS SDK Stream Warning

### Síntoma
```
Are you using a Stream of unknown length as the Body of a PutObject request?
Consider using Upload instead from @aws-sdk/lib-storage.
```

### Causa
Express-fileupload puede pasar streams sin content-length definido.

### Solución
Ya corregido en [src/routes/admin.js](src/routes/admin.js):
```javascript
// ✅ CORRECTO - Usa Buffer explícito
Body: Buffer.from(file.data),
ContentLength: file.size,

// ❌ ANTES - Causaba warning
Body: file.data,
```

## Servidor se Cierra Inesperadamente

### Checklist de Diagnóstico

1. **Revisar logs para uncaught errors:**
```bash
pm2 logs publicidad --lines 100
# O si corres directo:
node src/app.js 2>&1 | tee server.log
```

2. **Verificar memoria:**
```bash
# Ver uso de memoria del proceso
ps aux | grep node
# O con pm2
pm2 monit
```

3. **Revisar credenciales AWS:**
```bash
node check-server.js
```
Verifica que `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` estén configurados.

4. **Probar S3 connection:**
Añadir test rápido en `check-server.js`:
```javascript
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
s3.send(new ListBucketsCommand({}))
    .then(() => console.log('✅ S3 connection OK'))
    .catch(err => console.error('❌ S3 error:', err.message));
```

## Múltiples Instancias Corriendo

### Verificar
```bash
# Linux/Mac
ps aux | grep "node.*app.js"

# Windows
tasklist | findstr node.exe
```

### Solución
```bash
# Matar TODAS las instancias de Node
pkill -9 node         # Linux/Mac
taskkill /F /IM node.exe   # Windows

# Luego iniciar UNA vez
npm run start:safe
```

## Process Manager Recommendations

### PM2 (Recomendado para Linux)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Configurar inicio automático
```

### Systemd Service (Linux)
```ini
# /etc/systemd/system/publicidad.service
[Unit]
Description=Publicidad Display System
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/apps/Publicidad
Environment="NODE_ENV=production"
Environment="PORT=3001"
EnvironmentFile=/home/ec2-user/apps/Publicidad/.env
ExecStart=/usr/bin/node /home/ec2-user/apps/Publicidad/src/app.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=publicidad

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable publicidad
sudo systemctl start publicidad
sudo systemctl status publicidad
```

## Debugging Tips

1. **Aumentar logging temporalmente:**
```bash
DEBUG=true npm start
```

2. **Ver todas las rutas registradas:**
```bash
curl http://localhost:3001/debug/routes
```

3. **Test de health check:**
```bash
curl http://localhost:3001/health
```

4. **Monitorear archivos de log:**
```bash
tail -f /var/log/publicidad.log  # Si usas systemd
pm2 logs publicidad --lines 50   # Si usas PM2
```

## Contact/Support

Si el problema persiste:
1. Ejecuta: `node check-server.js > diagnostics.txt`
2. Ejecuta: `npm run kill-port`
3. Captura el error completo con stack trace
4. Revisa los logs de PM2/systemd
