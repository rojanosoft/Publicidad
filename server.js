require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;

// AWS SDK (optional, only used if S3_BUCKET is configured)
let S3Client, ListObjectsV2Command, GetObjectCommand, getSignedUrl;
try {
    // require lazily so app can run without AWS deps if not needed
    ({ S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3'));
    ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
} catch (e) {
    // ignore if not installed; we'll handle it at runtime
}

const app = express();
const port = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'];

async function listLocalMedia() {
    const files = await fs.readdir(path.join(__dirname, 'public', 'media'));
    return files.filter(f => ALLOWED_EXT.includes(path.extname(f).toLowerCase()));
}

async function listS3Media(prefixArg) {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || process.env.AWS_REGION;
    const prefix = prefixArg || process.env.S3_PREFIX || '';
    const makePublic = (process.env.S3_PUBLIC || 'false').toLowerCase() === 'true';

    if (!bucket) throw new Error('S3_BUCKET no está configurado');

    if (!S3Client) {
        throw new Error('AWS SDK no está instalado. Ejecuta `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`');
    }

    const clientOptions = {};
    if (region) clientOptions.region = region;

    const s3 = new S3Client(clientOptions);

    const objects = [];
    let ContinuationToken = undefined;
    do {
        const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken });
        const resp = await s3.send(cmd);
        const contents = resp.Contents || [];
        for (const item of contents) {
            const key = item.Key;
            if (!key) continue;
            const ext = path.extname(key).toLowerCase();
            if (ALLOWED_EXT.includes(ext)) {
                if (makePublic) {
                    // Public URL (virtual-hosted-style)
                    // Don't encode the key, S3 will handle it correctly with the key as-is
                    const url = region
                        ? `https://${bucket}.s3.${region}.amazonaws.com/${key}`
                        : `https://${bucket}.s3.amazonaws.com/${key}`;
                    objects.push(url);
                } else {
                    // Generate a presigned URL (requires AWS credentials to be available)
                    if (!getSignedUrl) throw new Error('s3 presigner no disponible. Instala `@aws-sdk/s3-request-presigner`.');
                    const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
                    const expires = parseInt(process.env.S3_SIGNED_EXPIRES || '3600', 10);
                    const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: expires });
                    console.log(`[presigned] Generated URL for ${key} (expires in ${expires}s)`);
                    objects.push(signedUrl);
                }
            }
        }
        ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (ContinuationToken);

    return objects;
}

// List 'folders' (common prefixes) at a given prefix level
async function listS3Folders(prefixArg) {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || process.env.AWS_REGION;
    const prefix = prefixArg || '';

    if (!bucket) throw new Error('S3_BUCKET no está configurado');
    if (!S3Client) throw new Error('AWS SDK no está instalado. Ejecuta `npm install @aws-sdk/client-s3`.');

    const clientOptions = {};
    if (region) clientOptions.region = region;
    const s3 = new S3Client(clientOptions);

    const folders = [];
    let ContinuationToken = undefined;
    do {
        const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: '/', ContinuationToken });
        const resp = await s3.send(cmd);
        const common = resp.CommonPrefixes || [];
        for (const p of common) {
            if (p.Prefix) folders.push(p.Prefix);
        }
        ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (ContinuationToken);

    return folders;
}

// descargar y parsear un manifest público (JSON array de keys o URLs)
const https = require('https');
async function listManifestMedia(manifestUrl) {
    return new Promise((resolve, reject) => {
        try {
            https.get(manifestUrl, (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    return reject(new Error(`Failed to fetch manifest, status ${res.statusCode}`));
                }
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (!Array.isArray(parsed)) return reject(new Error('Manifest must be a JSON array of keys or URLs'));
                        const base = process.env.S3_BASE_URL ? process.env.S3_BASE_URL.replace(/\/$/, '') + '/' : null;
                        const out = parsed.map(item => {
                            if (/^https?:\/\//i.test(item)) return item;
                            if (base) return base + item.replace(/^\//, '');
                            // if no base provided, and item looks like full s3 key, try to use S3_BUCKET + region
                            if (process.env.S3_BUCKET) {
                                const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
                                return `https://${process.env.S3_BUCKET}.s3.${region}.amazonaws.com/${encodeURIComponent(item)}`;
                            }
                            return item;
                        });
                        resolve(out);
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (err) => reject(err));
        } catch (err) {
            reject(err);
        }
    });
}

// Endpoint para obtener la lista de archivos multimedia
app.get('/api/media-files', async (req, res) => {
    try {
        // 1) If a public manifest URL is provided, use it (no credentials required)
        if (process.env.S3_MANIFEST_URL) {
            try {
                const list = await listManifestMedia(process.env.S3_MANIFEST_URL);
                return res.json(list);
            } catch (err) {
                console.error('Error loading manifest:', err.message);
                // fall through to next method
            }
        }

        // 2) If bucket configured, attempt to list via S3 (requires credentials or public listing)
        if (process.env.S3_BUCKET) {
            const prefix = req.query.prefix || '';
            console.log(`[media-files] Listing with prefix: "${prefix}"`);
            const list = await listS3Media(prefix);
            console.log(`[media-files] Found ${list.length} items`, list);
            return res.json(list);
        }

        // 3) Fallback to local media folder
        const mediaFiles = await listLocalMedia();
        // For local files, return relative paths (the frontend will prepend /media/)
        return res.json(mediaFiles);
    } catch (error) {
        console.error('Error getting media files:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to list folders (common prefixes) in S3
app.get('/api/s3-folders', async (req, res) => {
    try {
        if (!process.env.S3_BUCKET) return res.status(400).json({ error: 'S3_BUCKET no configurado' });
        const prefix = req.query.prefix || '';
        const folders = await listS3Folders(prefix);
        // Return cleaner folder names (relative)
        const cleaned = folders.map(f => f.replace(/^\//, ''));
        res.json(cleaned);
    } catch (err) {
        console.error('Error listing s3 folders:', err);
        res.status(500).json({ error: err.message });
    }
});

// Debug endpoint to test media-files with prefix
app.get('/api/debug/media-files', async (req, res) => {
    try {
        const prefix = req.query.prefix || '';
        console.log(`[DEBUG] Requesting media-files with prefix: "${prefix}"`);
        const result = await listS3Media(prefix);
        console.log(`[DEBUG] Found ${result.length} files`);
        res.json({ prefix, count: result.length, files: result.slice(0, 5) });
    } catch (err) {
        console.error('[DEBUG] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});