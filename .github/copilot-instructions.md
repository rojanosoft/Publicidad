# Publicidad Display System - AI Coding Guidelines

## Project Overview
Media carousel system (images/videos) with AWS S3 storage backend and responsive fullscreen web interface. Built for restaurant digital signage with admin upload capabilities.

## Architecture Patterns

### Backend Structure (src/)
- **app.js**: Main Express server with route delegation pattern. Health check (`/health`) MUST be registered FIRST before any middleware
- **config.js**: Centralized environment config. Loads dotenv ONLY in non-production (Render uses env vars directly)
- **routes/**: Express routers exported and mounted with `/api/*` prefix
- **services/s3Service.js**: AWS SDK v3 client operations (ListObjectsV2, presigned URLs)

### Frontend Architecture (public/)
- **index.html**: Single-page structure with fullscreen container
- **js/app.js**: Vanilla JS carousel logic - images show 10s, videos play full duration then auto-advance
- **Folder Navigation**: Sidebar loads S3 prefixes dynamically, clicking reloads media with new prefix

### Key Data Flow
```
Browser → GET /api/media/media-files?prefix=folder/ → s3Service.listS3Media() →
  If S3_PUBLIC=false: Generate presigned URLs (expires in S3_SIGNED_EXPIRES) →
  Return URLs → Frontend carousel rotation
```

## Critical Development Rules

### Environment Configuration
- **Local**: `.env` file loaded via dotenv (see [.env](.env) for structure)
- **Production**: Environment variables set in Render dashboard (see [render.yaml](render.yaml))
- **Config Access**: Always import from `require('./config')`, never read `process.env` directly in business logic
- **AWS Credentials**: NEVER commit to git. Use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` env vars

### S3 Service Patterns
- Presigned URL generation required when `S3_PUBLIC=false` (default for security)
- Use `ListObjectsV2Command` with `Delimiter: '/'` for folder-like structure
- File filtering: Only `.jpg|.jpeg|.png|.gif|.mp4|.webm` (defined in [config.js](src/config.js#L58-L59))
- Prefix handling: Always ensure trailing `/` for S3 folder prefixes

### Debugging & Logging
- Extensive console.log statements are intentional - this is a deployment-heavy project
- Format: `console.log('[module.function] message')` for grep-ability
- Debug route: `GET /debug/routes` lists all registered Express routes
- Route registration logs stack length at each mount point for troubleshooting

### Admin Authentication
- JWT-based with `authMiddleware` (see [authMiddleware.js](src/middleware/authMiddleware.js))
- Token passed via `x-admin-token` header
- Admin routes under `/api/admin/*` (login, upload, create-folder, delete)
- Credentials: `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SECRET` from env

## Common Tasks

### Adding New Media Route
1. Add router method in [src/routes/media.js](src/routes/media.js)
2. Use s3Service functions: `listS3Media()`, `listS3Folders()`, or create new
3. Always wrap in try/catch and log request with prefix/params

### Modifying S3 Operations
- Edit [src/services/s3Service.js](src/services/s3Service.js)
- Use AWS SDK v3 command pattern: `new Command({...})` then `s3Client.send(command)`
- For presigned URLs: `getSignedUrl(s3Client, command, { expiresIn })`

### Frontend Carousel Logic
- Modify [public/js/app.js](public/js/app.js)
- Image timing: `setTimeout(showNext, 10000)` (line ~180)
- Video timing: `video.onended = showNext` (auto-advance after playback)
- Fullscreen: Uses native Fullscreen API (`requestFullscreen()`)

### Running Locally
```powershell
npm install
npm start  # Runs node src/app.js on PORT=3001
```
Open `http://localhost:3001` - carousel auto-starts on page load

### Deployment (Render.com)
- Config: [render.yaml](render.yaml) defines service and env vars
- Set all env vars in Render dashboard (S3_BUCKET, AWS keys, ADMIN credentials)
- Start command: `npm start` (runs [src/app.js](src/app.js))
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment guide

## File Size & Media Limits
- Max upload: 5GB per file (`config.media.maxFileSize`)
- Presigned URL expiry: Default 3600s (1 hour), configurable via `S3_SIGNED_EXPIRES`

## Security Notes
- S3 bucket is private by default (`S3_PUBLIC=false`)
- Admin password stored in plain env var (TODO: migrate to database with bcrypt)
- JWT secret in `ADMIN_SECRET` env var - rotate in production
- **IMPORTANT**: If AWS credentials leaked to repo, immediately revoke via IAM console

## Documentation Structure
- [README.md](README.md): User-facing setup, S3 bucket creation commands
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): System diagrams, data flows, folder structure
- [docs/API.md](docs/API.md): API endpoint reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Render.com deployment steps

## Testing Strategy
Currently no automated tests. To verify changes:
1. Test health endpoint: `curl http://localhost:3001/health`
2. Load frontend and check browser console for JS errors
3. Test folder navigation in sidebar
4. Verify media rotation (images 10s, videos full duration)
