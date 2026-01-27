# Configuración para Subdirectorios (BASE_PATH)

## 🎯 Problema Resuelto
Ahora puedes montar la aplicación en subdirectorios como `dominio.com/publicidad` y todos los recursos (CSS, JS, API) se cargarán correctamente.

---

## ⚙️ Configuración

### 1. **Para dominio.com/publicidad**

Edita tu `.env`:
```env
PORT=3001
BASE_PATH=/publicidad
```

### 2. **Para dominio.com (raíz)**

Edita tu `.env`:
```env
PORT=3001
BASE_PATH=
# O simplemente no incluyas la línea BASE_PATH
```

### 3. **Para otros subdirectorios**

```env
BASE_PATH=/carpeta
BASE_PATH=/mi-app/publicidad
BASE_PATH=/cualquier/ruta
```

---

## 🔧 Cambios Implementados

### 1. **HTML con `<base>` tag**
```html
<!-- Automáticamente inyectado desde config -->
<base id="basePathTag" href="/publicidad/">
```

### 2. **Rutas Relativas en HTML**
```html
<!-- ✅ AHORA -->
<link rel="stylesheet" href="css/styles.css">
<script src="js/app.js"></script>

<!-- ❌ ANTES -->
<link rel="stylesheet" href="/css/styles.css">
<script src="/js/app.js"></script>
```

### 3. **JavaScript con BASE_PATH dinámico**
```javascript
// Lee del <base> tag
const BASE_PATH = window.BASE_PATH || '/';
const API_BASE = BASE_PATH === '/' ? '/api' : `${BASE_PATH}api`;

// Usa API_BASE en todas las llamadas
fetch(`${API_BASE}/media/media-files?prefix=...`)
```

### 4. **Express con BASE_PATH**
```javascript
// Archivos estáticos
if (config.basePath) {
    app.use(config.basePath, express.static('public'));
}

// Rutas API
const apiPrefix = config.basePath ? `${config.basePath}/api` : '/api';
app.use(`${apiPrefix}/media`, mediaRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
```

---

## 🌐 Configuración del Servidor Web (Nginx/Apache)

### Nginx

Si usas Nginx como reverse proxy:

```nginx
server {
    server_name dominio.com;

    # Otros servicios en la raíz
    location / {
        proxy_pass http://localhost:3000;
    }

    # Publicidad en /publicidad
    location /publicidad {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API específica
    location /publicidad/api {
        proxy_pass http://localhost:3001/publicidad/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Apache

Si usas Apache como reverse proxy:

```apache
<VirtualHost *:80>
    ServerName dominio.com

    # Otros servicios
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Publicidad en /publicidad
    ProxyPass /publicidad http://localhost:3001/publicidad
    ProxyPassReverse /publicidad http://localhost:3001/publicidad
    
    # Headers
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "http"
</VirtualHost>
```

---

## ✅ Pruebas

### 1. **Local**
```bash
# Configurar .env
echo "BASE_PATH=/publicidad" >> .env

# Reiniciar
npm run kill-port
npm run start:safe

# Probar
curl http://localhost:3001/publicidad/health
# Abrir: http://localhost:3001/publicidad
```

### 2. **Con PM2**
```bash
# Asegúrate que .env tiene BASE_PATH
cat .env | grep BASE_PATH

# Reiniciar PM2
./pm2-restart.sh  # Linux/Mac
pm2-restart.bat   # Windows

# Verificar logs
pm2 logs publicidad
```

### 3. **Producción**
```bash
# Verificar que el proxy está configurado
curl https://dominio.com/publicidad/health

# Abrir en navegador
https://dominio.com/publicidad
```

---

## 🐛 Troubleshooting

### Problema: "404 Not Found en archivos CSS/JS"

**Síntoma:**
```
GET https://dominio.com/css/styles.css → 404
GET https://dominio.com/js/app.js → 404
```

**Solución:**
- Verifica que `BASE_PATH` está en `.env`
- Reinicia el servidor: `pm2 restart publicidad`
- Limpia caché del navegador: Ctrl+Shift+R

### Problema: "API calls returning 404"

**Síntoma:**
```
GET https://dominio.com/api/media/media-files → 404
```

**Solución:**
```bash
# Debe ser:
curl https://dominio.com/publicidad/api/media/media-files

# Verifica BASE_PATH
node -e "require('dotenv').config(); console.log(process.env.BASE_PATH)"
```

### Problema: "Redirige a dominio.com en lugar de dominio.com/publicidad"

**Solución:**
Asegúrate que tu proxy NO elimina el path. En Nginx:
```nginx
# ✅ CORRECTO
location /publicidad {
    proxy_pass http://localhost:3001;  # Sin trailing slash
}

# ❌ INCORRECTO
location /publicidad {
    proxy_pass http://localhost:3001/;  # ← Elimina /publicidad
}
```

---

## 📋 Checklist de Migración

Para actualizar tu deployment existente:

- [ ] Actualizar archivos del servidor
- [ ] Agregar `BASE_PATH=/publicidad` al `.env`
- [ ] Configurar Nginx/Apache con proxy para `/publicidad`
- [ ] Reiniciar PM2: `./pm2-restart.sh`
- [ ] Probar health: `curl dominio.com/publicidad/health`
- [ ] Probar en navegador: `https://dominio.com/publicidad`
- [ ] Verificar que CSS/JS cargan correctamente (F12 → Network)
- [ ] Verificar que API funciona (F12 → Console)

---

## 🎨 Ejemplos de Configuración

### Ejemplo 1: Raíz del Dominio
```env
# .env
PORT=80
BASE_PATH=
```
URL: `https://dominio.com`

### Ejemplo 2: Subdirectorio Simple
```env
# .env
PORT=3001
BASE_PATH=/publicidad
```
URL: `https://dominio.com/publicidad`

### Ejemplo 3: Subdirectorio Anidado
```env
# .env
PORT=3001
BASE_PATH=/apps/publicidad
```
URL: `https://dominio.com/apps/publicidad`

### Ejemplo 4: Múltiples Instancias
```env
# .env.prod1
PORT=3001
BASE_PATH=/tienda1

# .env.prod2
PORT=3002
BASE_PATH=/tienda2
```
URLs:
- `https://dominio.com/tienda1`
- `https://dominio.com/tienda2`

---

## 📞 Soporte

Si tienes problemas:
1. Verifica logs: `pm2 logs publicidad`
2. Verifica config: `cat .env | grep BASE_PATH`
3. Verifica proxy: `curl -I dominio.com/publicidad/health`
4. Limpia caché del navegador
