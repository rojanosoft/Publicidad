# Publicidad Display System - AI Coding Guidelines

## Project Overview
Media carousel system (images/videos) with AWS S3 storage backend and responsive fullscreen web interface. Built for restaurant digital signage with admin upload capabilities.

## Architecture Patterns

### Backend Structure (src/)
- **app.js**: Main Express server with route delegation pattern. Health check (`/health`) MUST be registered FIRST before any middleware
  - MODULE LOADING: Explicit try/catch blocks log success/failure (e.g., `console.log('✅ Config loaded')`)
  - ROUTE MOUNTING: Dynamic API prefix based on `BASE_PATH` config (e.g., `/publicidad/api` or `/api`)
  - ERROR HANDLERS: 404 handler MUST be second-to-last middleware, global error handler LAST
  - GRACEFUL SHUTDOWN: Handlers for SIGTERM/SIGINT with 10s timeout before force-exit
- **config.js**: Centralized environment config. Loads dotenv ONLY in non-production (Render uses env vars directly)
  - Validates PORT exists or exits with error code 1
  - Logs ALL env vars with ✅/❌ indicators at module load
- **routes/**: Express routers exported and mounted with `/api/*` prefix
  - Each route file logs `=== ROUTE_NAME LOADING ===` pattern
  - Module exports use explicit try/catch with detailed error logging
- **services/s3Service.js**: AWS SDK v3 client operations (ListObjectsV2, presigned URLs)
- **middleware/authMiddleware.js**: Token validation checks both `x-admin-token` header and `adminToken` cookie
- **server.js** (root): Legacy entry point that delegates to `src/app.js` for backwards compatibility
- **check-server.js**: Diagnostic script to verify environment variables and file structure before deployment
- **start-safe.js**: Production script that auto-kills port conflicts before starting (use `npm run start:safe`)

### Frontend Architecture (public/)
- **index.html**: Single-page structure with fullscreen carousel and hierarchical folder navigation
  - Breadcrumb navigation: Shows current path with clickable segments (🏠 Inicio › folder1 › folder2)
  - Back button: Navigate up one folder level
  - Folder sidebar: Dynamic S3 prefix list with click/double-click handling
- **admin.html**: Admin dashboard with media card grid and folder management
  - Media card grid: CSS Grid layout (180px min-width, auto-fill, gap 10px) with hover shadow effects
  - Media cards display: Images as thumbnails, video play icons, file names, delete buttons
  - Folder browser: Hierarchical navigation with create-folder, breadcrumb, and back button
  - Admin state: currentPath tracks navigation position, currentFolder tracks selected folder
- **js/app.js**: Vanilla JS carousel and folder navigation logic
  - **Event Handling**: Single vs double-click detection using 250ms timeout (prevents event conflict)
    - Single click: `clickTimeout = setTimeout(() => loadMediaFiles(folder), 250)` loads folder media
    - Double click: `ondblclick` clears timeout then `navigateToFolder()` enters subfolder
    - Rationale: Separate single-click (load media) from double-click (enter subfolder)
  - **State Management**: 
    - `currentPath`: String tracking navigation position (e.g., "folder1/folder2")
    - `currentFolder`: Selected folder object with {name, fullPath} properties
    - `mediaFiles`: Array of current media URLs for carousel rotation
  - **Folder Navigation**:
    - `loadFolders()`: Fetches {name, fullPath} objects from API, renders clickable buttons
    - `navigateToFolder(path)`: Sets currentPath, loads subfolders, clears media
    - `navigateToPath(path)`: Jump to any path level from breadcrumb
    - `navigateBack()`: Pops last segment from currentPath, reloads folders
  - **Carousel Logic**:
    - Images: `setTimeout(showNext, 10000)` - 10 second display time
    - Videos: `video.onended = showNext` - auto-advance after playback completes
    - Fullscreen: Uses Fullscreen API (`requestFullscreen()` on spacebar/click)
- **css/styles.css**: Responsive styling with fullscreen support
  - Media grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`
  - Media cards: `box-shadow: 0 2px 8px rgba(0,0,0,0.2)` on hover for depth

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
- **PORT is REQUIRED**: No fallback - must be set in `.env` file (e.g., `PORT=3001`). App will exit if not set.
- **BASE_PATH (optional)**: For subdirectory deployment (e.g., `BASE_PATH=/publicidad` for dominio.com/publicidad). Leave empty for root deployment.

### S3 Service Patterns
- Presigned URL generation required when `S3_PUBLIC=false` (default for security)
- Use `ListObjectsV2Command` with `Delimiter: '/'` for folder-like structure
- File filtering: Only `.jpg|.jpeg|.png|.gif|.mp4|.webm` (defined in [config.js](src/config.js#L58-L59))
- Prefix handling: Always ensure trailing `/` for S3 folder prefixes

### Debugging & Logging
- **Logging Strategy**: Minimal logging in production - only error logs for debugging purposes
- **Error-only logging**: Recent cleanup removed verbose console.log calls, keeping only `console.error()` for issues
- Format for errors: `console.error('[module.function] message')` for grep-ability (e.g., `console.error('[s3Service.listS3Media] Error:', error.message)`)
- Module load logging: Module initialization logs only on errors (not ✅ indicators anymore)
- Debug route: `GET /debug/routes` available but no longer logs all requests to terminal
- Use [check-server.js](check-server.js) before deployment to verify environment setup  
- CRITICAL ERROR HANDLING: Process-level handlers for `uncaughtException` and `unhandledRejection` log but don't exit (prevents crashes)

### Middleware Ordering (MUST follow this sequence)
1. Health check route (`/health`) - registered FIRST, no middleware
2. Debug routes (`/debug/routes`) - no auth required
3. `express.json()` and `express.urlencoded()` body parsers
4. `express-fileupload` middleware
5. Static file serving (with `BASE_PATH` support if configured)
6. Request logging middleware (logs all incoming requests)
7. API route mounts (`/api/media`, `/api/admin`)
8. 404 handler - SECOND TO LAST (logs unmatched routes)
9. Error handler - MUST BE LAST (4 params: err, req, res, _next)

### Admin Authentication
- **NOT true JWT** - uses base64-encoded token: `username:timestamp:secret` with 24hr expiry (see [authService.js](src/services/authService.js#L26-L29))
- Token validation in `authMiddleware` checks `x-admin-token` header or `adminToken` cookie
- Admin routes under `/api/admin/*` (login, upload, create-folder, delete)
- Credentials: `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SECRET` from env
- TODO: Migrate to proper JWT library (jsonwebtoken) in production

### Subfolder Management (Admin Panel)
- **Hierarchical Navigation**: Admin panel supports unlimited subfolder depth in S3
- **Breadcrumb Navigation**: Shows current path with clickable segments (🏠 Inicio › folder1 › folder2)
- **Backend Pattern**:
  - `/api/admin/folders?prefix=path/to/parent` - Lists subfolders at specific level, returns `[{name, fullPath}, ...]`
  - `/api/admin/create-folder` accepts `parentPath` parameter for subfolder creation
  - `/api/admin/folder-contents` returns both `{subfolders: [], files: [...]}` with presigned URLs for private S3
- **Frontend State**: `currentPath` tracks navigation position, reset to `''` on logout
- **Navigation Functions**:
  - `navigateToFolder(path)` - Navigate into subfolder
  - `navigateToPath(path)` - Jump to specific path from breadcrumb
  - `navigateBack()` - Go up one level
  - `updateBreadcrumb()` - Refresh breadcrumb display
- **Media Card Preview System**:
  - Admin panel displays media thumbnails in grid layout (180px cards, auto-fill, hover shadow)
  - Images: Direct thumbnail display using presigned URLs (`<img src="presigned-url">`)
  - Videos: Thumbnail extracted from first frame using video metadata
  - Presigned URL generation: `/api/admin/folder-contents` generates URLs with 3600s (1 hour) expiry
  - URL Strategy: 
    - If `S3_PUBLIC=true`: Uses direct S3 bucket URL
    - If `S3_PUBLIC=false` (default): Generates presigned URL via `getSignedUrl(s3Client, GetObjectCommand, {expiresIn: 3600})`
  - **File Operations**: Upload and delete work at any folder depth using full S3 key path
  - Example response from `/api/admin/folder-contents`:
    ```json
    {
      "subfolders": [{"name": "subfolder1", "fullPath": "parent/subfolder1"}, ...],
      "files": [
        {"name": "image.jpg", "key": "parent/image.jpg", "url": "https://s3.../presigned-url"},
        {"name": "video.mp4", "key": "parent/video.mp4", "url": "https://s3.../presigned-url"},
        ...
      ]
    }
    ```

## Data Formatting Standards

### Folder Response Format
All folder-related API endpoints return objects with consistent structure:
```json
{
  "name": "folder_name_only",
  "fullPath": "parent/folder_name_only"
}
```
- `name`: Display name (leaf folder only), used for breadcrumb and sidebar buttons
- `fullPath`: Full S3 path from root, used for API navigation parameters and state tracking
- **Examples**:
  - Root subfolder: `{name: "marketing", fullPath: "marketing"}`
  - Nested subfolder: `{name: "november", fullPath: "marketing/november"}`
  - Three levels deep: `{name: "2024", fullPath: "marketing/november/2024"}`

### Media File Response Format
Media file objects returned from URLs (images/videos):
```json
{
  "name": "file_name.ext",
  "key": "full/s3/path/file_name.ext",
  "url": "https://s3.../file_or_presigned-url",
  "type": "image|video"
}
```
- `name`: Display filename with extension (shown in admin card)
- `key`: Full S3 key path (used for delete operations)
- `url`: Direct S3 URL or presigned URL (depends on S3_PUBLIC setting)
- `type`: MIME type hint for frontend rendering logic

## Event Handling Patterns

### Single vs Double-Click Detection (250ms Timeout)
Problem: DOM click fires twice during double-click sequence, causing single-click handler to run unintentionally
Solution: Stagger single-click with timeout to check for double-click:

```javascript
// In folder list event handler:
let clickTimeout;
fold.addEventListener('click', (e) => {
    if (e.detail === 1 || !clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
            loadMediaFiles(folder);  // Single-click: load media files
        }, 250);
    }
});

fold.ondblclick = (e) => {
    e.stopPropagation();
    clearTimeout(clickTimeout);  // Cancel pending single-click
    navigateToFolder(folder.fullPath);  // Double-click: navigate into folder
};
```

**Key Points**:
- Timeout duration: 250ms is sufficient for human double-click (typical ~300ms)
- Order matters: ondblclick handler runs AFTER click events, so it cancels the planned single-click
- clearTimeout must happen in both branches to prevent both handlers from running
- Used in [public/js/app.js](public/js/app.js#L129-L145) for folder navigation

## Common Pitfalls & Solutions

### Presigned URL Expiration
**Problem**: URLs generated in admin panel expire after 1 hour (3600s), but admin might keep dashboard open longer
**Solution**: Regenerate presigned URLs when user navigates to new folder (new folder-contents request)
- URLs shown in thumbnails are short-lived (1 hour default)
- If implementing persistent preview caching, use S3 signed cookie instead

### S3 Prefix Normalization
**Problem**: S3 ListObjectsV2 with Delimiter='/' requires trailing slash consistency
**Solution**: Always normalize prefix with trailing slash:
```javascript
const normalizedPrefix = prefix && !prefix.endsWith('/') ? prefix + '/' : prefix;
```
- Used in [src/routes/media.js](src/routes/media.js#L60-L70)
- Applied to both navigation routes and data flows

### Click Event Conflict in Nested Elements
**Problem**: Parent and child folder buttons both respond to click, triggering unexpected navigation
**Solution**: Use e.stopPropagation() in ondblclick and nested button handlers:
```javascript
fold.ondblclick = (e) => {
    e.stopPropagation();  // Prevents bubble to parent folder
    navigateToFolder(folder.fullPath);
};
```

### Media File Type Detection
**Problem**: Need to differentiate images vs videos for display in carousel
**Solution**: Check file extension against allowed arrays:
```javascript
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
const videoExtensions = ['mp4', 'webm'];
const isVideo = videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
```
- Configuration in [config.js](src/config.js#L58-L59) for allowed file types

## Project Architecture Highlights

### Recent Improvements (Current Development Phase)
- **Hierarchical Subfolder Support**: Both admin and public interfaces now support unlimited folder nesting via S3 prefixes
  - Backend: `/api/admin/folders` and `/api/media/s3-folders` return consistent `{name, fullPath}` format
  - Frontend: `currentPath` state tracks position; breadcrumb shows full navigation path
- **Media Preview System**: Admin panel displays media thumbnails with proper URL handling
  - Short-lived presigned URLs (1 hour) for private buckets
  - Direct URLs for public buckets (config-driven)
  - Images render instantly, videos show play icon overlay
- **Event Handling Improvements**: Single vs double-click detection with 250ms timeout
  - Eliminates conflict between single-click (load media) and double-click (enter subfolder)
  - Uses `clickTimeout` variable with `setTimeout()` and `clearTimeout()` coordination
- **Logging Optimization**: Converted from verbose logging to error-only pattern
  - Reduced console noise while maintaining debuggability
  - Format: `console.error('[module.function] message')` for grep-ability

### API Response Consistency
- All folder endpoints return: `{name: string, fullPath: string}`
- All media endpoints return: Array of URLs, or `{name, key, url, type}` objects
- Enables predictable frontend data handling and component reusability

## Common Tasks

### Adding New Media Route
1. Add router method in [src/routes/media.js](src/routes/media.js)
2. Use s3Service functions: `listS3Media()`, `listS3Folders()`, or create new
3. Always wrap in try/catch and log errors with module name: `console.error('[media.js] Error message')`
4. Normalize prefix with trailing slash before passing to S3 API
5. Return consistent data format: For files return URL; for folders return `{name, fullPath}`

### Implementing Folder Navigation
1. **Frontend**: Use `currentPath` state variable to track position in hierarchy
2. **Click handlers**: Implement 250ms timeout to distinguish single vs double-click
   - Single-click: `setTimeout(() => loadMediaFiles(folder), 250)`
   - Double-click: `ondblclick` with `clearTimeout()` to prevent single-click from firing
3. **Breadcrumb**: Split `currentPath` by `/` and render as clickable segments
4. **Back button**: Pop last segment from `currentPath` before reloading folders

### Modifying S3 Operations
- Edit [src/services/s3Service.js](src/services/s3Service.js)
- Use AWS SDK v3 command pattern: `new Command({...})` then `s3Client.send(command)`
- For presigned URLs: `getSignedUrl(s3Client, command, { expiresIn })` with appropriate expiry (3600s = 1 hour)
- Always handle `S3_PUBLIC` config flag - if false, generate presigned; if true, use direct bucket URL

### Adding Media Preview Feature
1. In `/api/admin/folder-contents` endpoint, generate presigned URLs for each file
2. Use `GetObjectCommand` for the file object, then `getSignedUrl()` to get temporary access
3. Return file data with `url` property containing presigned URL or direct S3 URL
4. Frontend can display thumbnail by setting `<img src="url">` (no CORS issues with presigned URLs)
5. Remember: URLs expire (default 1 hour), so regenerate when user navigates to new folder

### Frontend Carousel Logic
- Modify [public/js/app.js](public/js/app.js)
- Image timing: `setTimeout(showNext, 10000)` (10 second display time)
- Video timing: `video.onended = showNext` (auto-advance after playback completes)
- Fullscreen: Uses native Fullscreen API (`requestFullscreen()` on spacebar/click)
- Type detection: Check file extension against `imageExtensions` and `videoExtensions` arrays

### Running Locally
```powershell
node check-server.js  # Optional: verify env vars and file structure
npm run kill-port     # Kill any process on PORT if EADDRINUSE error
npm run start:safe    # Recommended: Auto-kills port conflicts and starts
npm start             # Standard: Runs node src/app.js on PORT=3001 (default)
```
Open `http://localhost:3001` - carousel auto-starts on page load

**Note**: [package.json](package.json) defines `start` as `node src/app.js` (preferred) but `server.js` at root also works (legacy)

**EADDRINUSE Fix**: If port is already in use, use `npm run kill-port [port]` or `npm run start:safe` which auto-resolves conflicts
- [start-safe.js](start-safe.js) checks port availability, kills conflicting process, then spawns server
- Server error handler in [app.js](src/app.js#L195-L205) provides helpful resolution steps

### Deployment
- **Render.com**: Config in [render.yaml](render.yaml) (if file exists), set env vars in dashboard
- **Serverless/Vercel**: [api/index.js](api/index.js) exports Express app for serverless functions
- Start command: `npm start` (runs [src/app.js](src/app.js))
- Environment variables MUST be set in hosting platform (never in code)
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment guide
- **Module export pattern**: [app.js](src/app.js) only calls `app.listen()` if `require.main === module` (allows Vercel import)

## File Size & Media Limits
- Max upload: 5GB per file (`config.media.maxFileSize`)
- Presigned URL expiry: Default 3600s (1 hour), configurable via `S3_SIGNED_EXPIRES`

## Security Notes
- S3 bucket is private by default (`S3_PUBLIC=false`)
- Admin password stored in plain env var (TODO: migrate to database with bcrypt)
- Token secret in `ADMIN_SECRET` env var - rotate in production (NOTE: current auth is NOT true JWT)
- **IMPORTANT**: If AWS credentials leaked to repo, immediately revoke via IAM console
- Database config exists in [.env.example](.env.example) (PostgreSQL) but is NOT currently used in app

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
