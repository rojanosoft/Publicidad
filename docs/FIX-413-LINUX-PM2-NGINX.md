# Solución Error 413 en Servidor Propio (Linux + PM2 + Nginx)

## 🔴 Problema Identificado

Tienes archivos actualizados localmente pero **PM2 en tu servidor NO tiene las variables de entorno configuradas**.

---

## ✅ SOLUCIÓN RÁPIDA (Opción A - Automática)

### 1. Sube los archivos actualizados al servidor

```bash
# En tu máquina local (Windows)
# Sube estos 3 archivos al servidor:
scp ecosystem.config.js usuario@tu-servidor:/ruta/proyecto/
scp nginx-subdirectory.conf usuario@tu-servidor:/ruta/proyecto/
scp fix-413-production.sh usuario@tu-servidor:/ruta/proyecto/
```

### 2. Ejecuta el script de corrección

```bash
# Conéctate al servidor
ssh usuario@tu-servidor

# Ve al directorio del proyecto
cd /ruta/proyecto

# Da permisos de ejecución al script
chmod +x fix-413-production.sh

# Ejecuta el script
bash fix-413-production.sh
```

El script hace todo automáticamente:
- ✅ Verifica que `.env` tenga las variables de upload
- ✅ Reinicia PM2 con las nuevas variables
- ✅ Verifica/actualiza configuración de Nginx
- ✅ Recarga Nginx si es necesario

---

## ✅ SOLUCIÓN MANUAL (Opción B - Paso a Paso)

### PASO 1: Verificar/Actualizar .env en el servidor

```bash
# En el servidor Linux
cd /ruta/proyecto
nano .env
```

**Asegúrate que contenga:**
```bash
UPLOAD_LIMIT=1gb
BODY_PARSER_LIMIT=1gb
RAW_BODY_LIMIT=1gb
```

💡 Para archivos >500MB, usa `2gb` o `5gb`

Guarda con `Ctrl+O`, sal con `Ctrl+X`

---

### PASO 2: Actualizar ecosystem.config.js

```bash
# Edita el archivo
nano ecosystem.config.js
```

Ya fue actualizado con los cambios. Solo asegúrate que se haya sincronizado del repositorio.

---

### PASO 3: Reiniciar PM2

```bash
# Reinicia la aplicación con las nuevas variables
pm2 restart ecosystem.config.js --update-env

# O si ya está corriendo bajo el nombre 'publicidad'
pm2 restart publicidad --update-env

# Verifica que esté corriendo
pm2 status

# Ver logs en tiempo real
pm2 logs publicidad
```

---

### PASO 4: Actualizar Nginx

```bash
# Edita tu configuración de Nginx
sudo nano /etc/nginx/sites-available/palmisoft.com.co
```

**Debe tener estas líneas EN AMBOS BLOQUES server (HTTP y HTTPS):**

```nginx
server {
    # ... otras configuraciones ...
    
    # CRÍTICO: Permitir archivos grandes
    client_max_body_size 5G;
    
    # Timeouts para uploads largos
    client_body_timeout 600s;
    client_header_timeout 600s;
    
    location /publicidad {
        # ... configuraciones de proxy ...
        
        # Timeouts para proxy
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_connect_timeout 600s;
    }
}
```

---

### PASO 5: Verificar y recargar Nginx

```bash
# Verificar sintaxis (IMPORTANTE antes de recargar)
sudo nginx -t

# Si dice "syntax is ok", recarga
sudo systemctl reload nginx

# Verifica status
sudo systemctl status nginx
```

---

### PASO 6: Verificar configuración

**En el navegador, abre:**
```
https://palmisoft.com.co/publicidad/api/debug/upload-config
```

**Deberías ver:**
```json
{
  "uploadLimit": {
    "configured": "1gb",
    "mb": 1024
  },
  "environment": {
    "UPLOAD_LIMIT": "1gb"  ← NO debe decir "NOT SET"
  }
}
```

---

## 🧪 PASO 7: Probar Upload

1. Ve a `https://palmisoft.com.co/publicidad/admin.html`
2. Login
3. Sube archivo >100MB
4. Debería funcionar con barra de progreso

---

## 🔍 Diagnóstico de Problemas

### Si aún falla con 413:

#### 1️⃣ Verifica logs de PM2
```bash
pm2 logs publicidad --lines 50
```

Busca: `[app.js] Middleware limits`

#### 2️⃣ Verifica logs de Nginx
```bash
sudo tail -f /var/log/nginx/error.log
```

Si ves: `client intended to send too large body`
→ Nginx no tiene `client_max_body_size` configurado

#### 3️⃣ Verifica que PM2 esté usando el .env correcto
```bash
pm2 env 0  # Muestra variables de entorno del proceso 0
```

Busca: `UPLOAD_LIMIT`

#### 4️⃣ Reinicio completo
```bash
# Para PM2
pm2 delete publicidad
pm2 start ecosystem.config.js

# Para Nginx
sudo systemctl restart nginx
```

---

## 📋 Checklist Final

- [ ] ✅ `.env` tiene UPLOAD_LIMIT, BODY_PARSER_LIMIT, RAW_BODY_LIMIT
- [ ] ✅ `ecosystem.config.js` incluye esas variables en `env`
- [ ] ✅ PM2 reiniciado con `--update-env`
- [ ] ✅ Nginx tiene `client_max_body_size 5G;` en ambos bloques server
- [ ] ✅ Nginx tiene timeouts de 600s en location
- [ ] ✅ Nginx recargado exitosamente (`nginx -t` sin errores)
- [ ] ✅ `/api/debug/upload-config` muestra valores correctos
- [ ] ✅ Upload de archivo >100MB funciona

---

## 🚨 Último Recurso

Si después de todo esto sigue fallando:

```bash
# Ver todo el flujo de una petición
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log &
pm2 logs publicidad

# En otra terminal, intenta el upload
# Observa los logs en ambas ventanas
```

Esto te dirá exactamente DÓNDE está fallando (Nginx vs Node.js)

---

## 💡 Cambios Realizados

He actualizado estos archivos:

1. ✅ **ecosystem.config.js** - Agregadas variables UPLOAD_LIMIT, BODY_PARSER_LIMIT, RAW_BODY_LIMIT
2. ✅ **nginx-subdirectory.conf** - Aumentados timeouts a 600s, agregados client_body_timeout
3. ✅ **fix-413-production.sh** - Script bash para automatizar la corrección

**Súbelos al servidor y ejecuta el script o sigue los pasos manuales.**
