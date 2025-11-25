# Architecture - Sistema de Publicidad

## Visión General

Sistema de carrusel de media (imágenes y videos) con soporte para almacenamiento local y AWS S3. Interfaz web responsive con fullscreen nativo.

```
┌──────────────────────────────────────────────────────────┐
│                    Cliente Browser                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  public/index.html + public/js/app.js               │ │
│  │  - Carrusel infinito de media                        │ │
│  │  - Navegación de carpetas (sidebar)                 │ │
│  │  - Fullscreen nativo (Fullscreen API)               │ │
│  │  - Display time: imágenes 10s, videos full duration │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                          ↓ HTTP Requests
┌──────────────────────────────────────────────────────────┐
│              Express.js Server (src/app.js)              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Routes: /api/media/*                                 │ │
│  │ - GET /api/media/media-files?prefix=...             │ │
│  │ - GET /api/media/s3-folders?prefix=...              │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Services: src/services/s3Service.js                  │ │
│  │ - listS3Media(prefix)                               │ │
│  │ - listS3Folders(prefix)                             │ │
│  │ - Genera URLs presignadas si bucket es privado      │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Config: src/config.js                               │ │
│  │ - Lee variables de entorno (.env)                   │ │
│  │ - Expone configuración centralizada                 │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                          ↓ AWS SDK
┌──────────────────────────────────────────────────────────┐
│                   AWS S3 Storage                          │
│  - Bucket: restaurante-joaos (privado)                   │
│  - Región: us-east-1                                     │
│  - Archivos soportados: jpg, png, gif, mp4, webm        │
└──────────────────────────────────────────────────────────┘
```

## Estructura de Carpetas

```
publicidad-display/
├── src/                              # Backend logic
│   ├── app.js                        # Main Express application
│   ├── config.js                     # Configuration from environment
│   ├── routes/
│   │   └── media.js                  # API routes for media and folders
│   └── services/
│       └── s3Service.js              # AWS S3 operations
│
├── public/                           # Frontend assets
│   ├── index.html                    # Main HTML structure
│   ├── css/
│   │   └── styles.css                # All CSS (responsive, fullscreen)
│   ├── js/
│   │   └── app.js                    # Frontend logic (carousel, fullscreen)
│   └── media/                        # Local media fallback (optional)
│       ├── image1.jpg
│       ├── video1.mp4
│       └── ...
│
├── docs/                             # Documentation
│   ├── DEPLOYMENT.md                 # Deployment guide (Render.com)
│   ├── ARCHITECTURE.md               # This file
│   └── API.md                        # API documentation
│
├── .env                              # Environment variables (NOT in git)
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore patterns
├── package.json                      # Dependencies & scripts
├── README.md                         # Project overview
└── render.yaml                       # Render.com deployment config
```

## Flujo de Datos

### 1. Inicio de la Aplicación

```
1. Browser carga index.html
2. HTML carga public/css/styles.css (estilos)
3. HTML carga public/js/app.js (lógica)
4. App.js se inicializa:
   - Llama loadFolders()  → GET /api/media/s3-folders
   - Llama loadMediaFiles() → GET /api/media/media-files
5. Server responde con lista de archivos/URLs
6. Frontend renderiza carpetas en sidebar
7. Comienza carrusel de media
```

### 2. Navegación de Carpetas

```
Usuario hace click en carpeta del sidebar
        ↓
event listener en JavaScript
        ↓
loadMediaFiles(folderName) con prefix
        ↓
GET /api/media/media-files?prefix=publicidad/carpeta
        ↓
Backend lista archivos en esa carpeta
        ↓
Si bucket es privado: genera URLs presignadas
        ↓
Responde con array de URLs
        ↓
Frontend reinicia carrusel con nuevos archivos
```

### 3. Reproducción de Media

```
showNext()
  ├─ Obtiene file[currentIndex]
  ├─ Detecta extensión
  ├─ Si es video (.mp4, .webm):
  │   ├─ Crea <video> element
  │   ├─ Establece src (URL presignada o local)
  │   ├─ Autoplay = true, muted = true
  │   ├─ onended → incrementa index y showNext()
  │   └─ Reproduces hasta fin
  └─ Si es imagen (.jpg, .png, .gif):
      ├─ Crea <img> element
      ├─ Establece src
      ├─ SetTimeout 10 segundos
      └─ showNext() → siguiente archivo

Infinito loop hasta que se detenga manualmente
```

### 4. Fullscreen Mode

```
Usuario hace click en botón "⛶ Fullscreen"
        ↓
toggleFullscreen() llamado
        ↓
document.documentElement.requestFullscreen()
        ↓
Browser entra fullscreen (pide permiso usuario)
        ↓
fullscreenchange event dispara updateFullscreenButton()
        ↓
CSS: mediaContainer expande a 100vw
CSS: sidebar hidden (display: none)
CSS: fullscreenBtn hidden (opacity: 0)
        ↓
Carrusel sigue playando sin distracciones
        ↓
Usuario presiona ESC
        ↓
document.exitFullscreen()
        ↓
fullscreenchange event dispara updateFullscreenButton()
        ↓
Vuelve a estado normal
```

## Tecnologías

### Backend
- **Node.js**: Runtime JavaScript server-side
- **Express.js**: Web framework minimalista
- **@aws-sdk/client-s3**: AWS S3 client
- **@aws-sdk/s3-request-presigner**: Generar URLs presignadas
- **dotenv**: Cargar variables de entorno

### Frontend
- **HTML5**: Estructura semantic
- **CSS3**: Estilos responsive, transiciones suaves
- **Vanilla JavaScript (ES6+)**: Sin frameworks, peso mínimo

### Infraestructura
- **AWS S3**: Almacenamiento de media
- **AWS IAM**: Autenticación y autorización
- **Render.com**: Hosting y deployment automático

## Seguridad

### Credenciales AWS
- **Almacenadas en**: `.env` (nunca en git)
- **Acceso**: Solo desde servidor backend
- **Frontend**: Nunca ve credenciales directamente
- **URLs Presignadas**: Temporales (1 hora default), se regeneran per-request

### S3 Bucket
- **Tipo**: Privado (no public access)
- **Acceso**: Solo mediante IAM user + presigned URLs
- **Permisos**: Mínimos necesarios (ListBucket, GetObject)

### Validación
- Frontend valida extensiones antes de renderizar
- Backend filtra extensiones permitidas
- S3 responde 403 a requests no autorizados

## Performance

### Optimizaciones
1. **Lazy Loading**: Carga media bajo demanda (per carpeta)
2. **Presigned URLs**: Caché por sesión (1 hora valid)
3. **Static Assets**: CSS/JS minificados servidos desde public/
4. **No Database**: Acceso directo a S3 (stateless)

### Escalabilidad
- **Serverless-ready**: Funciona en Render.com free tier
- **S3 as DB**: Unlimited media storage
- **Stateless**: Múltiples instancias sin problema
- **Auto-deploy**: Git push → deploy automático

## Variables de Entorno

```javascript
// .env file (example)
NODE_ENV=production
PORT=3000
S3_BUCKET=restaurante-joaos
S3_REGION=us-east-1
S3_PUBLIC=false
S3_SIGNED_EXPIRES=3600
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
DEBUG=false
```

## Flujo de Requests API

### GET /api/media/media-files

```
Query Params:
  prefix (optional): Carpeta en S3 (ej: "publicidad/fotos/")

Response:
  200 OK
  Content-Type: application/json
  Body: [
    "https://...(presigned URL 1)...",
    "https://...(presigned URL 2)...",
    ...
  ]

Error:
  500 Internal Server Error
  Body: { error: "mensaje" }
```

### GET /api/media/s3-folders

```
Query Params:
  prefix (optional): Carpeta parent en S3

Response:
  200 OK
  Content-Type: application/json
  Body: [
    "subcarpeta1",
    "subcarpeta2",
    ...
  ]

Error:
  500 Internal Server Error
  Body: { error: "mensaje" }
```

## Ciclo de Desarrollo

### Local Development
```bash
1. npm install
2. cp .env.example .env
3. Llenar variables en .env
4. npm start
5. http://localhost:3000
```

### Deployment
```bash
1. git add .
2. git commit -m "mensaje"
3. git push origin main
4. Render.com auto-deploys
```

## Monitoreo y Logs

### Frontend Console Logs
```
[loadMediaFiles] Fetching: /api/media-files?prefix=...
[loadMediaFiles] Got 5 files
[loadFolders] Selected folder: carpeta1
[showNext] Showing file 0: ...
[showNext] Extension: mp4
[video.onended] Video finished
```

### Backend Console Logs
```
[/api/media/media-files] prefix="carpeta1"
[s3Service.listS3Media] Listing files with prefix: "carpeta1"
[s3Service.listS3Media] Found 5 files
[s3Service.listS3Media] Generating presigned URLs...
[s3Service.listS3Media] Generated 5 presigned URLs
```

## Debugging

### Problema: Media no carga
1. Abre DevTools (F12) → Console
2. Busca errores rojos
3. Chequea Network tab → requests a /api/media/*
4. Verifica AWS credenciales en .env

### Problema: Carpetas vacías
1. S3 bucket exis y está accesible
2. IAM user tiene permisos ListBucket
3. Archivos tienen extensiones soportadas

### Problema: Fullscreen no funciona
1. Fullscreen requiere user gesture (click)
2. Algunos navegadores requieren HTTPS
3. Chequea console por warnings

## Futuras Mejoras

- [ ] Admin panel para cargar media
- [ ] Scheduling de media (fecha/hora específica)
- [ ] Soporte para más formatos (SVG, WebP)
- [ ] Analytics (tracking de qué media se reproduce)
- [ ] Multi-screen support (sincronización entre displays)
- [ ] Caché inteligente de URLs presignadas

---

Última actualización: 2024
