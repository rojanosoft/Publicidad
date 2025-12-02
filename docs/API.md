# API Documentation - Sistema de Publicidad

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://publicidad-display.onrender.com`

## Media Endpoints

### 1. Get Media Files

Obtiene lista de archivos media (con URLs) en una carpeta.

**Request**
```
GET /api/media/media-files
Query Parameters:
  - prefix (optional, string): Prefijo de carpeta en S3
    Ejemplo: "publicidad/fotos/"
```

**Response - Success (200 OK)**
```json
[
  "https://restaurante-joaos.s3.us-east-1.amazonaws.com/publicidad/fotos/imagen1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "https://restaurante-joaos.s3.us-east-1.amazonaws.com/publicidad/fotos/video1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  ...
]
```

**Response - No Files Found (200 OK)**
```json
[]
```

**Response - Error (500 Internal Server Error)**
```json
{
  "error": "Access Denied: Check AWS credentials"
}
```

**Examples**

Local media (sin prefijo):
```bash
curl "http://localhost:3000/api/media/media-files"
```

S3 media en carpeta específica:
```bash
curl "http://localhost:3000/api/media/media-files?prefix=publicidad%2Ffotos%2F"
```

JavaScript (Frontend):
```javascript
const files = await fetch('/api/media/media-files?prefix=publicidad/fotos/')
  .then(r => r.json());
console.log(files); // Array de URLs
```

**Notes**
- Si el bucket es privado, devuelve presigned URLs (válidas 1 hora)
- Si el bucket es público, devuelve URLs directas
- Las URLs presignadas se regeneran con cada request
- Extensiones soportadas: jpg, jpeg, png, gif, mp4, webm

---

### 2. Get S3 Folders

Obtiene lista de subcarpetas en una ubicación del S3.

**Request**
```
GET /api/media/s3-folders
Query Parameters:
  - prefix (optional, string): Prefijo de carpeta parent
    Ejemplo: "publicidad/"
```

**Response - Success (200 OK)**
```json
[
  "fotos",
  "videos",
  "campanas"
]
```

**Response - No Folders Found (200 OK)**
```json
[]
```

**Response - Error (500 Internal Server Error)**
```json
{
  "error": "Access Denied: Check AWS credentials"
}
```

**Examples**

Carpetas top-level:
```bash
curl "http://localhost:3000/api/media/s3-folders"
```

Subcarpetas dentro de "publicidad":
```bash
curl "http://localhost:3000/api/media/s3-folders?prefix=publicidad%2F"
```

JavaScript (Frontend):
```javascript
const folders = await fetch('/api/media/s3-folders?prefix=publicidad/')
  .then(r => r.json());
console.log(folders); // ['fotos', 'videos', ...]
```

**Notes**
- Las carpetas se identifican por CommonPrefixes en S3
- Requiere permisos `s3:ListBucket` en el bucket
- Retorna solo nombres de carpetas, no paths completos
- Las carpetas vacías no aparecen (S3 no crea carpetas realmente)

---

## Admin Endpoints

### 1. Login

Autentica un usuario admin y devuelve un token.

**Request**
```
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response - Success (200 OK)**
```json
{
  "token": "YWRtaW46MTczMzAwMzQ1NjEyMzpzZWNyZXRfa2V5",
  "message": "Login successful"
}
```

**Response - Invalid Credentials (401 Unauthorized)**
```json
{
  "error": "Invalid credentials"
}
```

**Response - Missing Fields (400 Bad Request)**
```json
{
  "error": "Username and password required"
}
```

**Examples**

```bash
curl -X POST "http://localhost:3000/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Notes**
- El token es válido por 24 horas
- Guardar el token en localStorage del navegador
- Usar el token en future requests con header `x-admin-token`

---

### 2. Create Folder

Crea una nueva carpeta en S3.

**Request**
```
POST /api/admin/create-folder
Content-Type: application/json
x-admin-token: {token}

{
  "folderName": "nuevacarpeta"
}
```

**Response - Success (200 OK)**
```json
{
  "message": "Folder created successfully",
  "folderName": "nuevacarpeta"
}
```

**Response - Missing Token (401 Unauthorized)**
```json
{
  "error": "Unauthorized: Missing token"
}
```

**Response - Invalid Token (401 Unauthorized)**
```json
{
  "error": "Unauthorized: Invalid token"
}
```

**Response - Missing Field (400 Bad Request)**
```json
{
  "error": "Folder name required"
}
```

**Examples**

```bash
curl -X POST "http://localhost:3000/api/admin/create-folder" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YWRtaW46MTczMzAwMzQ1NjEyMzpzZWNyZXRfa2V5" \
  -d '{
    "folderName": "promociones"
  }'
```

**Notes**
- Nombres se sanitizan automáticamente (solo caracteres válidos)
- Se convierten a lowercase
- La carpeta se crea como un prefijo en S3

---

### 3. Upload File

Sube un archivo a una carpeta en S3.

**Request**
```
POST /api/admin/upload
Content-Type: multipart/form-data
x-admin-token: {token}

file: {binary file content}
folder: publicidad/fotos
```

**Response - Success (200 OK)**
```json
{
  "message": "File uploaded successfully",
  "fileName": "imagen.jpg",
  "s3Key": "publicidad/fotos/1733003456123_imagen.jpg"
}
```

**Response - Missing Token (401 Unauthorized)**
```json
{
  "error": "Unauthorized: Missing token"
}
```

**Response - Missing File (400 Bad Request)**
```json
{
  "error": "File required"
}
```

**Response - Invalid File Type (400 Bad Request)**
```json
{
  "error": "File type not allowed. Allowed: jpg, jpeg, png, gif, mp4, webm"
}
```

**Response - File Too Large (400 Bad Request)**
```json
{
  "error": "File too large. Max size: 5GB"
}
```

**Examples**

```bash
curl -X POST "http://localhost:3000/api/admin/upload" \
  -H "x-admin-token: YWRtaW46MTczMzAwMzQ1NjEyMzpzZWNyZXRfa2V5" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=publicidad/fotos"
```

JavaScript (FormData):
```javascript
const formData = new FormData();
formData.append('file', fileElement.files[0]);
formData.append('folder', 'publicidad/fotos');

const response = await fetch('/api/admin/upload', {
  method: 'POST',
  headers: { 'x-admin-token': token },
  body: formData
});
```

**Notes**
- Extensiones soportadas: jpg, jpeg, png, gif, mp4, webm
- Tamaño máximo: 5GB
- El nombre del archivo se genera con timestamp
- Se preserva la extensión original

---

### 4. List Folders

Obtiene lista de todas las carpetas en S3.

**Request**
```
GET /api/admin/folders
x-admin-token: {token}
```

**Response - Success (200 OK)**
```json
[
  "publicidad",
  "promociones",
  "eventos"
]
```

**Response - Missing Token (401 Unauthorized)**
```json
{
  "error": "Unauthorized: Missing token"
}
```

**Examples**

```bash
curl "http://localhost:3000/api/admin/folders" \
  -H "x-admin-token: YWRtaW46MTczMzAwMzQ1NjEyMzpzZWNyZXRfa2V5"
```

**Notes**
- Solo retorna carpetas top-level
- Requiere autenticación

---

## Health Check

Verifica que el servidor está activo.

**Request**
```
GET /health
```

**Response - Success (200 OK)**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Examples**

```bash
curl "http://localhost:3000/health"
```

---

## Error Handling

### Common Errors

**AWS Credentials Error**
```
Status: 500
Body: { "error": "InvalidIdentity.IDPCommunicationError" }
```
**Solution**: Verifica AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY en .env

**Bucket Not Found**
```
Status: 500
Body: { "error": "NoSuchBucket" }
```
**Solution**: Verifica S3_BUCKET en .env, asegurate que existe

**Prefix Not Found**
```
Status: 200
Body: []
```
**Note**: No es un error, simplemente la carpeta está vacía

**CORS Error (Frontend)**
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution**: Este error no debería ocurrir (mismo origen), verifica que la URL es correcta

---

## Authentication

Los endpoints de admin requieren autenticación con token. El flujo es:

1. **Login**: `POST /api/admin/login` con username y password
2. **Obtener token**: Respuesta contiene `token`
3. **Usar token**: Incluir en header `x-admin-token` en future requests
4. **Token válido**: Por 24 horas

**Token Storage**
```javascript
// Guardar después de login
localStorage.setItem('adminToken', token);

// Recuperar para usar
const token = localStorage.getItem('adminToken');

// Usar en requests
fetch('/api/admin/folders', {
  headers: { 'x-admin-token': token }
});
```

---

## Rate Limiting

Actualmente **no hay** rate limiting implementado. Para production:

**Recomendaciones:**
- Implementar middleware de rate limiting
- Limitar requests por IP: 100 req/min
- Limitar URLs presignadas generadas: 50 por minuto

**Futura implementación:**
```bash
npm install express-rate-limit
```

---

## Presigned URLs

### Qué son?

Las presigned URLs son URLs firmadas que permiten acceso temporal a objetos privados en S3.

### Características

- **Duración**: 1 hora (configurable en .env con S3_SIGNED_EXPIRES)
- **Seguridad**: Contienen firma criptográfica, válidas solo por tiempo limitado
- **No exponen credenciales**: El cliente nunca ve AWS keys
- **Regeneradas**: Se generan nuevas en cada request

### Lifecycle

1. **Generación**: Backend llama `getSignedUrl()` con 1 hora expiry
2. **Transmisión**: Backend envía URL al frontend
3. **Uso**: Frontend hace `<img src="url">` o `<video src="url">`
4. **Expiración**: Después de 1 hora, URL ya no es válida
5. **Siguiente Request**: Frontend pide nueva lista, backend genera URLs nuevas

---

## Testing

### Local Testing

```bash
# Probar health check
curl http://localhost:3000/health

# Login
curl -X POST "http://localhost:3000/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Crear carpeta (usar token del login)
curl -X POST "http://localhost:3000/api/admin/create-folder" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: {token}" \
  -d '{"folderName":"test"}'

# Listar carpetas
curl "http://localhost:3000/api/admin/folders" \
  -H "x-admin-token: {token}"
```

### Debugging

Habilita DEBUG en `.env`:
```
DEBUG=true
```

Esto mostrará logs detallados en la consola del servidor.

---

## Changelog

### v2.0.0 (2024)
- ✅ Admin login con token authentication
- ✅ Create folder endpoint
- ✅ File upload endpoint
- ✅ Multipart form data support
- ✅ Token validation middleware
- ✅ Admin panel UI (public/admin.html)

### v1.0.0 (2024)
- ✅ API endpoints de media files y folders
- ✅ Presigned URLs para S3 privado
- ✅ Local media fallback
- ✅ Error handling completo
- ✅ Logging detallado

---

Última actualización: 2024

**Request**
```
GET /api/media/media-files
Query Parameters:
  - prefix (optional, string): Prefijo de carpeta en S3
    Ejemplo: "publicidad/fotos/"
```

**Response - Success (200 OK)**
```json
[
  "https://restaurante-joaos.s3.us-east-1.amazonaws.com/publicidad/fotos/imagen1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  "https://restaurante-joaos.s3.us-east-1.amazonaws.com/publicidad/fotos/video1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  ...
]
```

**Response - No Files Found (200 OK)**
```json
[]
```

**Response - Error (500 Internal Server Error)**
```json
{
  "error": "Access Denied: Check AWS credentials"
}
```

**Examples**

Local media (sin prefijo):
```bash
curl "http://localhost:3000/api/media/media-files"
```

S3 media en carpeta específica:
```bash
curl "http://localhost:3000/api/media/media-files?prefix=publicidad%2Ffotos%2F"
```

JavaScript (Frontend):
```javascript
const files = await fetch('/api/media/media-files?prefix=publicidad/fotos/')
  .then(r => r.json());
console.log(files); // Array de URLs
```

**Notes**
- Si el bucket es privado, devuelve presigned URLs (válidas 1 hora)
- Si el bucket es público, devuelve URLs directas
- Las URLs presignadas se regeneran con cada request
- Extensiones soportadas: jpg, jpeg, png, gif, mp4, webm

---

### 2. Get S3 Folders

Obtiene lista de subcarpetas en una ubicación del S3.

**Request**
```
GET /api/media/s3-folders
Query Parameters:
  - prefix (optional, string): Prefijo de carpeta parent
    Ejemplo: "publicidad/"
```

**Response - Success (200 OK)**
```json
[
  "fotos",
  "videos",
  "campanas"
]
```

**Response - No Folders Found (200 OK)**
```json
[]
```

**Response - Error (500 Internal Server Error)**
```json
{
  "error": "Access Denied: Check AWS credentials"
}
```

**Examples**

Carpetas top-level:
```bash
curl "http://localhost:3000/api/media/s3-folders"
```

Subcarpetas dentro de "publicidad":
```bash
curl "http://localhost:3000/api/media/s3-folders?prefix=publicidad%2F"
```

JavaScript (Frontend):
```javascript
const folders = await fetch('/api/media/s3-folders?prefix=publicidad/')
  .then(r => r.json());
console.log(folders); // ['fotos', 'videos', ...]
```

**Notes**
- Las carpetas se identifican por CommonPrefixes en S3
- Requiere permisos `s3:ListBucket` en el bucket
- Retorna solo nombres de carpetas, no paths completos
- Las carpetas vacías no aparecen (S3 no crea carpetas realmente)

---

### 3. Health Check

Verifica que el servidor está activo.

**Request**
```
GET /health
```

**Response - Success (200 OK)**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Examples**

```bash
curl "http://localhost:3000/health"
```

---

## Error Handling

### Common Errors

**AWS Credentials Error**
```
Status: 500
Body: { "error": "InvalidIdentity.IDPCommunicationError" }
```
**Solution**: Verifica AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY en .env

**Bucket Not Found**
```
Status: 500
Body: { "error": "NoSuchBucket" }
```
**Solution**: Verifica S3_BUCKET en .env, asegurate que existe

**Prefix Not Found**
```
Status: 200
Body: []
```
**Note**: No es un error, simplemente la carpeta está vacía

**CORS Error (Frontend)**
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution**: Este error no debería ocurrir (mismo origen), verifica que la URL es correcta

---

## Request/Response Examples

### Example 1: Load Root Media Files

```bash
# Request
GET /api/media/media-files HTTP/1.1
Host: localhost:3000

# Response
HTTP/1.1 200 OK
Content-Type: application/json

[
  "https://...(video1.mp4)...",
  "https://...(foto1.jpg)..."
]
```

### Example 2: Load Folder Structure

```bash
# Request - Get top-level folders
GET /api/media/s3-folders HTTP/1.1
Host: localhost:3000

# Response
HTTP/1.1 200 OK
Content-Type: application/json

["publicidad", "promociones", "eventos"]

# Request - Get subfolders
GET /api/media/s3-folders?prefix=publicidad/ HTTP/1.1
Host: localhost:3000

# Response
HTTP/1.1 200 OK
Content-Type: application/json

["fotos", "videos", "campanas"]

# Request - Get media in specific folder
GET /api/media/media-files?prefix=publicidad/fotos/ HTTP/1.1
Host: localhost:3000

# Response
HTTP/1.1 200 OK
Content-Type: application/json

[
  "https://...(presigned_url_1)...",
  "https://...(presigned_url_2)...",
  "https://...(presigned_url_3)..."
]
```

---

## Rate Limiting

Actualmente **no hay** rate limiting implementado. Para production:

**Recomendaciones:**
- Implementar middleware de rate limiting
- Limitar requests por IP: 100 req/min
- Limitar URLs presignadas generadas: 50 por minuto

**Futura implementación:**
```bash
npm install express-rate-limit
```

---

## Presigned URLs

### Qué son?

Las presigned URLs son URLs firmadas que permiten acceso temporal a objetos privados en S3.

### Características

- **Duración**: 1 hora (configurable en .env con S3_SIGNED_EXPIRES)
- **Seguridad**: Contienen firma criptográfica, válidas solo por tiempo limitado
- **No exponen credenciales**: El cliente nunca ve AWS keys
- **Regeneradas**: Se generan nuevas en cada request

### Estructura

```
https://bucket-name.s3.region.amazonaws.com/object-key
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIA.../20240115/us-east-1/s3/aws4_request
  &X-Amz-Date=20240115T103045Z
  &X-Amz-Expires=3600
  &X-Amz-SignedHeaders=host
  &X-Amz-Signature=abc123...
```

### Lifecycle

1. **Generación**: Backend llama `getSignedUrl()` con 1 hora expiry
2. **Transmisión**: Backend envía URL al frontend
3. **Uso**: Frontend hace `<img src="url">` o `<video src="url">`
4. **Expiración**: Después de 1 hora, URL ya no es válida
5. **Siguiente Request**: Frontend pide nueva lista, backend genera URLs nuevas

---

## Frontend Integration

### Usando los Endpoints

```javascript
// Cargar carpetas
async function loadFolders(prefix = '') {
    const response = await fetch(`/api/media/s3-folders?prefix=${encodeURIComponent(prefix)}`);
    const folders = await response.json();
    return folders;
}

// Cargar archivos media
async function loadMediaFiles(prefix = '') {
    const response = await fetch(`/api/media/media-files?prefix=${encodeURIComponent(prefix)}`);
    const mediaUrls = await response.json();
    return mediaUrls;
}

// Usar URLs para reproducción
async function displayMedia() {
    const urls = await loadMediaFiles('publicidad/fotos/');
    const img = document.createElement('img');
    img.src = urls[0]; // Use presigned URL directly
    document.body.appendChild(img);
}
```

---

## Deployment Notes

### Variables de Entorno Necesarias

En `.env` (no en git):
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
S3_BUCKET=tu-bucket
S3_REGION=us-east-1
S3_PUBLIC=false
S3_SIGNED_EXPIRES=3600
```

### En Render.com

1. Configurar en dashboard → Environment
2. Reiniciar aplicación
3. Verificar en logs que inicia correctamente

---

## Testing

### Local Testing

```bash
# Probar health check
curl http://localhost:3000/health

# Probar media files (local)
curl http://localhost:3000/api/media/media-files

# Probar media files (S3)
curl "http://localhost:3000/api/media/media-files?prefix=publicidad%2F"

# Probar folders
curl "http://localhost:3000/api/media/s3-folders"

# Probar subfolders
curl "http://localhost:3000/api/media/s3-folders?prefix=publicidad%2F"
```

### Debugging

Habilita DEBUG en `.env`:
```
DEBUG=true
```

Esto mostrará logs detallados en la consola del servidor.

---

## Changelog

### v1.0.0 (2024)
- ✅ API endpoints de media files y folders
- ✅ Presigned URLs para S3 privado
- ✅ Local media fallback
- ✅ Error handling completo
- ✅ Logging detallado

---

Última actualización: 2024
