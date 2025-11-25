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

async function listS3Media() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || process.env.AWS_REGION;
    const prefix = process.env.S3_PREFIX || '';
    const makePublic = (process.env.S3_PUBLIC || 'false').toLowerCase() === 'true';

    if (!bucket) throw new Error('S3_BUCKET no está configurado');

    if (!S3Client) {
        throw new Error('AWS SDK no está instalado. Ejecuta `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`');
    }

    const clientOptions = {};
    if (region) clientOptions.region = region;

    // If AWS credentials are provided in env, the SDK will use them automatically; otherwise it will use default credentials provider
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
                    const publicRegion = region ? `${region}.` : '';
                    // Note: In some regions or configurations the URL shape may vary. This works in most cases.
                    const url = `https://${bucket}.s3.${region || 'amazonaws.com'}/${encodeURIComponent(key)}`;
                    objects.push(url);
                } else {
                    // Generate a presigned URL (requires AWS credentials to be available)
                    if (!getSignedUrl) throw new Error('s3 presigner no disponible. Instala `@aws-sdk/s3-request-presigner`.');
                    const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
                    // default expiry 1 hour; can be configured via S3_SIGNED_EXPIRES
                    const expires = parseInt(process.env.S3_SIGNED_EXPIRES || '3600', 10);
                    const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: expires });
                    objects.push(signedUrl);
                }
            }
        }
        ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (ContinuationToken);

    return objects;
}

// Endpoint para obtener la lista de archivos multimedia
app.get('/api/media-files', async (req, res) => {
    try {
        if (process.env.S3_BUCKET) {
            const list = await listS3Media();
            return res.json(list);
        }

        const mediaFiles = await listLocalMedia();
        // For local files, return relative paths (the frontend will prepend /media/)
        return res.json(mediaFiles);
    } catch (error) {
        console.error('Error getting media files:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});