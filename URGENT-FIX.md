# 🔥 SOLUCIÓN URGENTE - Error EADDRINUSE

## El Problema
Tu aplicación está crasheando y reiniciando constantemente porque:
1. El puerto 3000 (o 3001) está ocupado por otra instancia
2. Un process manager está reiniciando la app automáticamente
3. El proceso anterior no termina correctamente

## ✅ SOLUCIÓN INMEDIATA (En tu servidor EC2)

### Paso 1: Detener TODAS las instancias
```bash
# Conéctate a tu servidor EC2
ssh ec2-user@tu-servidor

# Ir al directorio de la app
cd /home/ec2-user/apps/Publicidad

# Matar TODOS los procesos de Node
pkill -9 node

# O si usas PM2:
pm2 stop all
pm2 delete all

# Verificar que no hay procesos
ps aux | grep node
# Debe estar vacío (solo mostrará el grep)
```

### Paso 2: Actualizar el código
```bash
# Hacer backup
cp src/app.js src/app.js.backup

# Pull los cambios (si usas git)
git pull

# O subir manualmente los archivos actualizados:
# - src/app.js (con handlers de errores)
# - src/routes/admin.js (con Buffer fix)
# - kill-port.js (nuevo)
# - start-safe.js (nuevo)
# - package.json (con nuevos scripts)
```

### Paso 3: Iniciar con el script seguro
```bash
# Verificar variables de entorno
node check-server.js

# Opción A: Inicio directo con seguridad
npm run start:safe

# Opción B: Con PM2 (recomendado para producción)
pm2 start src/app.js --name publicidad
pm2 save
pm2 startup
```

## 🛡️ Cambios Implementados

### 1. src/app.js - Manejo de Errores Mejorado
```javascript
// ✅ NUEVO: Captura errores no manejados
process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] Uncaught Exception:', error);
    // Ya no crashea la app
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Promise Rejection:', reason);
    // Solo logea, no termina el proceso
});

// ✅ NUEVO: Solo inicia servidor si es main module
if (require.main === module) {
    const server = app.listen(port, () => {
        // ...
    });

    // ✅ NUEVO: Maneja error EADDRINUSE específicamente
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error('Port already in use!');
            // Muestra comandos de solución
            process.exit(1);
        }
    });

    // ✅ NUEVO: Graceful shutdown
    const gracefulShutdown = () => {
        server.close(() => {
            process.exit(0);
        });
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}
```

### 2. src/routes/admin.js - Fix AWS SDK Warning
```javascript
// ✅ CORREGIDO: Upload a S3
const uploadCommand = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
    Body: Buffer.from(file.data),  // Ahora usa Buffer explícito
    ContentType: file.mimetype,
    ContentLength: file.size,       // Longitud explícita
});
```

### 3. Nuevos Scripts de Utilidad

**kill-port.js** - Mata procesos en puertos específicos
```bash
node kill-port.js 3001
```

**start-safe.js** - Inicio seguro con auto-cleanup
```bash
node start-safe.js
# O:
npm run start:safe
```

## 📋 Verificación Post-Deploy

```bash
# 1. Verificar que el servidor está corriendo
curl http://localhost:3001/health

# 2. Ver logs (si usas PM2)
pm2 logs publicidad --lines 50

# 3. Monitorear procesos
pm2 monit
# O:
ps aux | grep node

# 4. Verificar puerto
lsof -ti:3001
# Debe mostrar solo UN proceso
```

## 🔧 Configuración PM2 Recomendada

Crea `ecosystem.config.js` en el root:

```javascript
module.exports = {
  apps: [{
    name: 'publicidad',
    script: './src/app.js',
    instances: 1,           // UNA sola instancia
    exec_mode: 'fork',      // NO cluster
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    kill_timeout: 5000,     // 5 segundos para shutdown graceful
    wait_ready: true,
    listen_timeout: 10000
  }]
}
```

Luego:
```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
```

## 🚨 Si el Problema Persiste

1. **Ver qué está usando el puerto:**
```bash
lsof -ti:3001 | xargs ps -f
```

2. **Revisar si hay cron jobs o systemd services:**
```bash
systemctl list-units | grep publicidad
crontab -l
```

3. **Verificar múltiples usuarios ejecutando Node:**
```bash
sudo ps aux | grep node
```

4. **Logs del sistema:**
```bash
journalctl -u publicidad -n 100 --no-pager
```

5. **Reinicio completo:**
```bash
# Matar TODO
sudo killall -9 node
pm2 kill

# Limpiar PM2
rm -rf ~/.pm2

# Reiniciar PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📞 Después de Aplicar los Cambios

**Reporta si funcionó:**
- ✅ Servidor inicia correctamente
- ✅ No hay errores EADDRINUSE
- ✅ No se reinicia automáticamente
- ✅ `/health` responde correctamente
- ✅ Upload funciona sin warnings de AWS SDK

**Monitoreo continuo:**
```bash
# Ver logs en tiempo real
pm2 logs publicidad

# Ver status cada 5 segundos
watch -n 5 'pm2 status && lsof -ti:3001'
```
