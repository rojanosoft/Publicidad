# Solución para Error 413 (Payload Too Large) en Carga de Videos

## 🔴 Problema Identificado

**Error**: `513 Payload Too Large` en producción al cargar archivos de video
- ✅ Funciona en desarrollo (pruebas locales)
- ❌ Falla en producción (dominio con HTTPS)
- ✅ La carga de imágenes funciona correctamente
- 📹 Afecta principalmente a videos grandes (> 20MB)

## 🎯 Causas Raíz

### 1. **Límites predeterminados en Express (20MB)**
Express-fileupload tiene un límite de 20MB por defecto que es insuficiente para videos.

### 2. **Límites en los body parsers (100KB)**
Express.json() y express.urlencoded() tienen límites de 100KB que pueden bloquear requests POST con multipart/form-data.

### 3. **Configuración diferente entre desarrollo y producción**
- Desarrollo: Express no valida tan estrictamente
- Producción (Render): Proxy puede tener límites adicionales

## ✅ Soluciones Implementadas

### 1. **Configuración en `src/config.js`**
Añadidas dos nuevas variables de configuración:
```javascript
media: {
    uploadLimitSize: process.env.UPLOAD_LIMIT || '5gb',  // Límite para fileUpload
    bodyParserLimit: process.env.BODY_PARSER_LIMIT || '50mb',  // Límite para parsers
}
```

### 2. **Middleware in `src/app.js`**
Configurados los límites en los middlewares:
```javascript
app.use(express.json({ limit: config.media.bodyParserLimit }));
app.use(express.urlencoded({ extended: true, limit: config.media.bodyParserLimit }));
app.use(fileUpload({
    limits: { fileSize: uploadLimitBytes },  // 5GB default
    abortOnLimit: true,
    responseOnLimit: 'File size exceeds maximum allowed',
}));
```

### 3. **Manejo de errores mejorado en `src/routes/admin.js`**
- Mejor logging del tamaño de archivo
- Detección específica del error 413
- Mensaje de error claro indicando límites

### 4. **Frontend mejorado en `public/admin.html`**
- Detección del error 413 en el cliente
- Mensaje amigable al usuario en caso de exceso de tamaño
- Logged del tamaño del archivo siendo cargado

## 🚀 Cómo Usar

### Localmente (desarrollo)
El sistema usa los valores por defecto (5GB para upload, 50MB para parsers):
```bash
npm start
```

### En Producción (Render.com)
**Opción 1**: Usar valores por defecto (recomendado para la mayoría de casos)
- No necesita cambios
- Soporta archivos hasta 5GB

**Opción 2**: Personalizar límites
Añade variables de entorno en el dashboard de Render:
```
UPLOAD_LIMIT=10gb    # Para permitir videos más grandes
BODY_PARSER_LIMIT=100mb  # Si necesitas payloads POST más grandes
```

## 📋 Variables de Entorno Soportadas

```env
# Límite para el middleware fileUpload (default: 5gb)
UPLOAD_LIMIT=5gb|10gb|100mb|etc

# Límite para body parsers JSON/form (default: 50mb)
BODY_PARSER_LIMIT=50mb|100mb|200mb|etc

# Otros (existentes)
PORT=3001
S3_BUCKET=tu-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
```

## 🧪 Testeo

### Verificar que funciona localmente
```bash
# Terminal 1: Inicia el servidor
npm start

# Terminal 2: Prueba con un archivo de 100MB
curl -X POST http://localhost:3001/api/admin/upload \
  -H "x-admin-token: your-token" \
  -F "file=@video-grande.mp4" \
  -F "folder=uploads"
```

### En Producción
1. Login en el panel admin: `https://tudominio.com/admin`
2. Intenta subir un video de prueba
3. Verifica los logs: `npm run logs` (en Render)

## 📊 Diagnóstico

Si aún recibes error 413:

### Paso 1: Verifica el tamaño del archivo
```javascript
console.log(file.size);  // En bytes
console.log(file.size / (1024*1024));  // En MB
console.log(file.size / (1024*1024*1024));  // En GB
```

### Paso 2: Revisa los logs del servidor
En Render console, busca logs con `[/api/admin/upload]`:
```
[/api/admin/upload] Uploading file: video.mp4 (524.25MB) to folder: uploads
```

### Paso 3: Verifica la configuración en el servidor
```bash
# En terminal con acceso al servidor:
echo $UPLOAD_LIMIT  # Debe mostrar el valor o vacio (default)
echo $BODY_PARSER_LIMIT
```

## 🔍 Cambios Realizados en los Archivos

### src/config.js
- Añadidas `uploadLimitSize` y `bodyParserLimit` con valores por defecto

### src/app.js
- Añadida función helper `parseSize()` para convertir strings a bytes
- Configurados límites en express.json(), express.urlencoded()
- Configurados límites y opciones en fileUpload middleware
- Mejorado logging de configuración

### src/routes/admin.js
- Mejorado logging del tamaño del archivo en MB/GB
- Añadida detección específica del error 413
- Mejorado mensaje de error retornado al cliente

### public/admin.html
- Añadido logging del tamaño del archivo
- Detección específica del status 413
- Mensaje de error amigable con información del límite

## ⚡ Próximos Pasos Opcionales

1. **Base de datos de eventos**: Registrar intentos de carga fallidos
2. **Chunked upload**: Permitir que los usuarios suban archivos grandes en partes
3. **WebSocket Progress**: Mostrar barra de progreso en tiempo real
4. **Compresión de video**: Ofrecer autocompresión para videos grandes

## 📞 Soporte

Si el error persiste después de estos cambios:
1. Verifica que el `.env` en producción tenga las variables correctas
2. Reinicia la aplicación en Render
3. Limpia caché del navegador (Ctrl+Shift+Delete)
4. Intenta desde otro navegador/dispositivo

---

**Última actualización**: 12 Feb 2026
**Versión**: 1.0
