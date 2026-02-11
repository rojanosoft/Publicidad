# BASE_PATH Fix - Solución de Rutas Relativas

## Problema Original
Cuando se accedía a la aplicación desde un subdirectorio (ejemplo: `https://palmisoft.com.co/publicidad`), los estilos y archivos JavaScript no se cargaban correctamente porque las rutas relativas no consideraban el `BASE_PATH` configurado en el servidor.

## Causa Raíz
1. El archivo `index.html` tenía un `<base>` tag hardcodeado a `/`
2. Los archivos CSS y JS se referenciaban con rutas relativas
3. `window.BASE_PATH` en el cliente no estaba siendo inyectado dinámicamente desde el servidor
4. `admin.html` no tenía un `<base>` tag en absoluto

## Solución Implementada

### 1. Servidor - Inyección Dinámica de HTML (`src/app.js`)

Se agregó una función `serveHtmlWithBasePath()` que:
- Lee los archivos HTML (`index.html`, `admin.html`) del disco
- Reemplaza dinámicamente el `<base href="...">` con el valor correcto del servidor
- Inyecta `window.BASE_PATH` directamente en el HTML

**Rutas dinámicas registradas:**
```javascript
// Para acceso en raíz (/)
app.get('/', serveHtmlWithBasePath('index.html', config.basePath));
app.get('/index.html', serveHtmlWithBasePath('index.html', config.basePath));
app.get('/admin', serveHtmlWithBasePath('admin.html', config.basePath));
app.get('/admin.html', serveHtmlWithBasePath('admin.html', config.basePath));

// Para acceso en subdirectorio (ej: /publicidad/)
app.get(`${config.basePath}/`, serveHtmlWithBasePath('index.html', config.basePath));
app.get(`${config.basePath}/index.html`, serveHtmlWithBasePath('index.html', config.basePath));
app.get(`${config.basePath}/admin`, serveHtmlWithBasePath('admin.html', config.basePath));
app.get(`${config.basePath}/admin.html`, serveHtmlWithBasePath('admin.html', config.basePath));
```

### 2. Frontend - index.html

**Cambios:**
```html
<!-- Antes (problema): -->
<base id="basePathTag" href="/">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
    ...
    <script>
        window.BASE_PATH = document.querySelector('base')?.getAttribute('href') || '/';
    </script>

<!-- Después (solución): -->
<base id="basePathTag" href="/">
<script>window.BASE_PATH = window.BASE_PATH || '/';</script>
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
    ...
    <script>
        if (typeof window.BASE_PATH === 'undefined') {
            window.BASE_PATH = document.querySelector('base')?.getAttribute('href') || '/';
        }
        if (!window.BASE_PATH.endsWith('/')) {
            window.BASE_PATH += '/';
        }
    </script>
```

### 3. Frontend - admin.html

**Cambios:**
```html
<!-- Agregado en <head>: -->
<base id="basePathTag" href="/">
<script>window.BASE_PATH = window.BASE_PATH || '/';</script>

<!-- Actualizado script de configuración: -->
<script>
    if (typeof window.BASE_PATH === 'undefined') {
        window.BASE_PATH = document.querySelector('base')?.getAttribute('href') || '/';
        if (!window.BASE_PATH.endsWith('/')) {
            window.BASE_PATH += '/';
        }
    }
    
    const API_BASE = window.BASE_PATH === '/' ? '/api' : `${window.BASE_PATH}api`;
    // ... resto del código ...
</script>
```

## Cómo Funciona

### Flujo de Carga

1. **Cliente solicita `/`**
   - Servidor ejecuta: `serveHtmlWithBasePath('index.html', '')`
   - HTML resultante:
     ```html
     <base href="/">
     <script>window.BASE_PATH = "/";</script>
     ```
   - CSS cargado desde: `/css/styles.css` ✅
   - API: `window.BASE_PATH === '/'` → `API_BASE = '/api'` ✅

2. **Cliente solicita `/publicidad/`**
   - Servidor ejecuta: `serveHtmlWithBasePath('index.html', '/publicidad')`
   - HTML resultante:
     ```html
     <base href="/publicidad/">
     <script>window.BASE_PATH = "/publicidad/";</script>
     ```
   - CSS cargado desde: `/publicidad/css/styles.css` (via base tag) ✅
   - API: `API_BASE = "/publicidad/api"` ✅

### Arquitectura de Archivos Static

El servidor sirve archivos estáticos con `express.static()`:
- **Sin BASE_PATH**: `app.use(express.static('public'))`
- **Con BASE_PATH**: `app.use('/publicidad', express.static('public'))`

Esto permite que:
- `/css/styles.css` → `public/css/styles.css`
- `/publicidad/css/styles.css` → `public/css/styles.css` (vía express.static en `/publicidad`)

## Validación

### Prueba Local (root deployment)
```bash
npm start
curl http://localhost:3001/
# Verifica que incluye:
# <base href="/">
# <script>window.BASE_PATH = "/";</script>
```

### Prueba en Subdirectorio (ej: /publicidad/)
Configurar en `.env`:
```
BASE_PATH=/publicidad
```

Luego:
```bash
npm start
curl http://localhost:3001/publicidad/
# Verifica que incluye:
# <base href="/publicidad/">
# <script>window.BASE_PATH = "/publicidad/";</script>
```

## Consideraciones

### ✅ Ventajas de esta Solución
- **Dinámico**: El `BASE_PATH` se determina en el servidor
- **Consistente**: Funciona para `index.html` y `admin.html`
- **Escalable**: No requiere cambios en archivos estáticos (CSS/JS)
- **Compatible**: Mantiene backward compatibility (fallback a base tag)

### ⚠️ Limitaciones
- Las rutas se sirven dinámicamente, no desde caché
- Requiere que el servidor esté ejecutándose (no funciona en build estático)

## Variables de Entorno Requeridas

### .env (Desarrollo)
```env
PORT=3001
BASE_PATH=             # Dejar vacío para root, o /publicidad para subdirectorio
S3_BUCKET=restaurante-joaos
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_SECRET=secret_key
```

### Vercel/Serverless
Configurar en panel:
```
BASE_PATH = /publicidad  (si es necesario subdirectorio)
```

## Debugging

### Ver qué BASE_PATH está usando el servidor
```bash
npm start
# Busca en la salida:
# [app.js] Dynamic routes registered for BASE_PATH: /publicidad
# O: [app.js] No BASE_PATH - serving from root
```

### Verificar en el navegador
```javascript
// En console del navegador
console.log('BASE_PATH:', window.BASE_PATH);
console.log('API_BASE:', window.API_BASE || '/api');
```

### Verificar HTML servido
```bash
curl http://localhost:3001/ | grep -E "<base|window.BASE_PATH"
```

## Próximos Pasos (Opcional)

Para mejorar aún más:
1. Cachear la lectura de archivos HTML en producción
2. Usar template engines (EJS, Pug) para mayor flexibilidad
3. Agregar versionado de assets para invalidación de caché

---

**Última actualización:** Febrero 11, 2026
**Estado:** ✅ Implementado y Probado
