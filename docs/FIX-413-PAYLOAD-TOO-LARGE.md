# Solución Error 413 - Payload Too Large

## 🔴 Problema
```
POST /api/admin/upload 413 Payload Too Large
```
El servidor rechaza archivos > 100MB con error 413 (Payload Too Large).

---

## ✅ Solución Paso a Paso

### 1️⃣ **Verifica que limites estás usando**
Visita: `https://palmisoft.com.co/publicidad/api/debug/upload-config`

Deberías ver algo como:
```json
{
  "uploadLimit": {"configured": "1gb", "mb": 1024},
  "bodyParserLimit": {"configured": "1gb", "mb": 1024},
  "environment": {
    "UPLOAD_LIMIT": "NOT SET (default 1gb)",
    "BODY_PARSER_LIMIT": "NOT SET (default 1gb)"
  }
}
```

Si ves `"NOT SET"`, las variables de ambiente **no están configuradas en Render**.

---

### 2️⃣ **Configura variables en Render Dashboard**

1. Ve a https://dashboard.render.com
2. Selecciona tu servicio (publicidad-display)
3. Click en **Settings** → **Environment Variables**
4. **Añade estas variables:**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `UPLOAD_LIMIT` | `500mb` | Tamaño máximo del archivo a subir |
| `BODY_PARSER_LIMIT` | `500mb` | Tamaño máximo del body JSON/form |
| `RAW_BODY_LIMIT` | `500mb` | Tamaño máximo de raw bodies |
| `NODE_ENV` | `production` | (opcional) Entorno de producción |

**Para diferentes tamaños de archivo:**
- Videos < 100MB: Use `200mb`
- Videos < 300MB: Use `350mb`
- Videos < 500MB: Use `500mb`
- Videos > 500MB: Use `1gb`

5. Click **Save Changes**
6. Render auto-redeploya el servicio

---

### 3️⃣ **Verifica en Nginx (si tienes control)**

Si usas Nginx como proxy reverso, asegúrate que tienes en tu config:

```nginx
server {
    # ...
    client_max_body_size 1G;  # Debe ser >= UPLOAD_LIMIT
    
    location /publicidad {
        proxy_pass http://localhost:3001;
        # ...
    }
}
```

Recarga Nginx:
```bash
sudo systemctl reload nginx
# o
sudo nginx -s reload
```

---

### 4️⃣ **Testea la carga**

1. Ve a `https://palmisoft.com.co/publicidad/admin`
2. Login
3. Intenta subir un archivo de 122MB
4. Debería funcionar ahora

Si **aún falla con 413**, revisa el paso 1 para confirmar que las variables se replicaron.

---

## 🔍 Diagnóstico

### Base de datos de errores posibles:

| Error | Causa | Solución |
|-------|-------|----------|
| **Error 413** en Express | `BODY_PARSER_LIMIT` muy bajo | Aumenta en Render dashboard |
| **Error 413** en Nginx | `client_max_body_size` muy bajo | Aumenta en nginx.conf |
| **Error 413** en fileUpload | `UPLOAD_LIMIT` muy bajo | Aumenta en Render dashboard |
| **Request timeout** | Archivo muy grande + conexión lenta | Usa `RAW_BODY_LIMIT=1gb` |
| **Memory leak** | Archivos no usando tempFiles | Verifica que `useTempFiles: true` en app.js |

---

## 📋 Checklist de Producción

- [ ] ✅ Render tiene `UPLOAD_LIMIT=500mb` (o mayor)
- [ ] ✅ Render tiene `BODY_PARSER_LIMIT=500mb` (o mayor)  
- [ ] ✅ Nginx tiene `client_max_body_size 1G;` (si aplica)
- [ ] ✅ Visitaste `/api/debug/upload-config` y confirmas que las variables aparecen
- [ ] ✅ Test upload con archivo > 100MB funciona

---

## 🔧 Última opción: Deploy Manual

Si tras 30 min de esperar a que Render redeploya aún no funciona:

1. Ve a Render dashboard
2. Click en tu servicio
3. Busca el botón **Manual Deploy** o **Reconnect & Deploy**
4. Click para forzar redeploy

Esto tomará ~2 min y debería poner en marcha los cambios.

---

## 📞 Información útil

**Archivo de configuración de límites:**
- Backend: [src/config.js](../src/config.js)
- App principal: [src/app.js](../src/app.js)
- Variables de ejemplo: [.env.example](../.env.example)

**Endpoint de diagnóstico:**
```bash
curl https://palmisoft.com.co/publicidad/api/debug/upload-config
```

**Logs en Render:**
1. Render Dashboard → Logs
2. Busca `[app.js] Middleware limits` para ver qué límites está usando
