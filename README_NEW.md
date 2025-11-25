# Sistema de Publicidad - Advertising Display System

Professional advertising carousel system for displaying images and videos from AWS S3 or local storage.

## Features

✨ **Core Functionality**
- Infinite carousel loop: Images (10s), Videos (full duration)
- Folder navigation with sidebar
- Native fullscreen mode (immersive, no UI distractions)
- Responsive design (desktop, tablet, mobile)
- Real-time media refresh every 5 minutes

🔧 **Technical Features**
- AWS S3 integration with private bucket support
- Presigned URLs for secure media access (1-hour expiry)
- Local media fallback for development
- Modular backend architecture (config, services, routes)
- Clean separation of concerns (frontend/backend)
- Comprehensive logging and error handling

📦 **Supported Media**
- Images: JPG, JPEG, PNG, GIF
- Videos: MP4, WebM

## Quick Start

### Prerequisites
- Node.js 14+ installed
- AWS S3 bucket (optional, can use local media)
- AWS IAM credentials (if using S3)

### Installation

1. **Clone and install:**
```bash
git clone https://github.com/tu-usuario/publicidad-display.git
cd publicidad-display
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your S3 credentials
```

3. **Run locally:**
```bash
npm start
# App opens at http://localhost:3000
```

## Configuration

### Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=3000

# AWS S3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_PUBLIC=false              # Set true for public buckets
S3_SIGNED_EXPIRES=3600       # URL validity in seconds

# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...

# Logging
DEBUG=false
```

### Local Development (No S3 Required)

1. Place media files in `public/media/`
2. Start the app with `npm start`
3. Files are served from local storage

## Usage

### Via Browser

1. Open `http://localhost:3000`
2. Click folders in sidebar to select media
3. Click "⛶ Fullscreen" for immersive display
4. Press ESC to exit fullscreen
5. Media auto-cycles: images 10s each, videos play completely

### Folder Structure

Organize media in S3 like:
```
s3://bucket/
├── publicidad/
│   ├── fotos/
│   │   ├── image1.jpg
│   │   ├── image2.png
│   │   └── video1.mp4
│   └── videos/
│       └── campaign.mp4
└── promociones/
    └── special-offer.jpg
```

## Project Structure

```
src/                          # Backend
├── app.js                    # Express application
├── config.js                 # Configuration management
├── routes/
│   └── media.js              # API routes
└── services/
    └── s3Service.js          # S3 operations

public/                       # Frontend
├── index.html                # HTML structure only
├── css/styles.css            # Responsive styling
├── js/app.js                 # Carousel logic, fullscreen
└── media/                    # Local media (optional)

docs/                         # Documentation
├── API.md                    # API endpoints
├── ARCHITECTURE.md           # System design
└── DEPLOYMENT.md             # Render.com setup

.env                          # Environment (NOT in git)
.env.example                  # Configuration template
package.json                  # Dependencies
```

## API Endpoints

### GET /api/media/media-files
Returns array of media file URLs

Query: `?prefix=publicidad/fotos/`

Response:
```json
[
  "https://...(presigned_url_1)...",
  "https://...(presigned_url_2)..."
]
```

### GET /api/media/s3-folders
Returns list of folders at given prefix

Query: `?prefix=publicidad/`

Response:
```json
["fotos", "videos"]
```

See `docs/API.md` for full documentation.

## AWS S3 Setup

### Create IAM User for Secure Access

```bash
# Create policy (save as policy.json)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::your-bucket-name"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}

# Create IAM user
aws iam create-user --user-name publicidad-display

# Attach policy
aws iam put-user-policy --user-name publicidad-display \
  --policy-name s3-access --policy-document file://policy.json

# Create access key
aws iam create-access-key --user-name publicidad-display
```

### Create S3 Bucket

```bash
aws s3 mb s3://your-bucket-name --region us-east-1

# Upload media
aws s3 cp ./public/media s3://your-bucket-name/publicidad/ --recursive
```

## Deployment

### Deploy to Render.com

1. **Push to GitHub:**
```bash
git add .
git commit -m "feat: Production-ready setup"
git push origin main
```

2. **Create Render Service:**
   - Go to https://dashboard.render.com/
   - New Web Service → Connect GitHub repo
   - Build: `npm install`
   - Start: `npm start`

3. **Add Environment Variables in Render Dashboard:**
   - NODE_ENV=production
   - AWS_ACCESS_KEY_ID=...
   - AWS_SECRET_ACCESS_KEY=...
   - S3_BUCKET=...
   - etc.

4. **Deploy and enjoy!**

For detailed instructions, see `docs/DEPLOYMENT.md`

## Troubleshooting

### Media not loading
- Check AWS credentials in .env
- Verify S3 bucket name and region
- Ensure IAM user has `s3:ListBucket` and `s3:GetObject` permissions

### Folders show but no media
- Verify files have supported extensions (.jpg, .mp4, etc)
- Check S3 bucket path/prefix
- Look at browser console (F12) for errors

### Fullscreen not working
- Fullscreen requires user click (security feature)
- Some browsers need HTTPS (but localhost:3000 works)
- Check console for browser compatibility issues

## Documentation

- 📚 [API Documentation](docs/API.md) - Complete API reference
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Render.com setup

## Security Notes

⚠️ **IMPORTANT**
- **Never commit .env** - Contains AWS credentials
- .env is in .gitignore by default
- Use presigned URLs (default) for private buckets
- Rotate credentials if accidentally exposed
- IAM user should have minimal permissions (only ListBucket + GetObject)

## Development

### Available Scripts

```bash
npm start         # Start server (production)
npm dev          # Start server (development)
```

### Adding Media Locally

1. Place files in `public/media/` folder
2. Restart server (if needed)
3. Refresh browser

### Updating Frontend

- Edit `public/index.html` (structure only)
- Edit `public/css/styles.css` (styling)
- Edit `public/js/app.js` (carousel logic)

### Updating Backend

- Edit `src/app.js` (main server)
- Edit `src/config.js` (settings)
- Edit `src/routes/media.js` (API endpoints)
- Edit `src/services/s3Service.js` (S3 logic)

## Technologies

**Backend:** Node.js, Express.js, AWS SDK for S3
**Frontend:** HTML5, CSS3, Vanilla JavaScript
**Infrastructure:** AWS S3, Render.com
**Configuration:** dotenv, environment variables

## Performance

- **Startup:** < 1 second
- **Media load:** 100-500ms (depends on S3 latency)
- **Presigned URL validity:** 1 hour (configurable)
- **Memory usage:** ~20-50MB
- **Scales:** From 100s to 1000s of media files
- **Deployment:** Git push → live in 2-3 minutes

## License

MIT

## Support

For issues or questions:
1. Check `docs/DEPLOYMENT.md` for setup help
2. Review `docs/API.md` for endpoint details
3. See `docs/ARCHITECTURE.md` for system overview
4. Check browser console (F12) for errors

## Changelog

### v1.0.0 (2024)
- ✅ Professional project structure
- ✅ Modular backend (config, services, routes)
- ✅ Extracted CSS and JavaScript
- ✅ Presigned URLs for S3 private buckets
- ✅ Full API documentation
- ✅ Deployment guide for Render.com
- ✅ Architecture documentation

---

Built with ❤️ for advertising displays

Last updated: 2024
