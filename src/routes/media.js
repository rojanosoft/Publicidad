/**
 * Media API Routes
 * Endpoints for fetching media files and folder listings
 */

console.log('=== MEDIA ROUTES LOADING ===');

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

console.log('[media.js] Loading config...');
let config;
try {
    config = require('../config');
    console.log('[media.js] ✅ Config loaded');
} catch (error) {
    console.error('[media.js] ❌ FAILED to load config:', error.message);
    throw error;
}

console.log('[media.js] Loading s3Service...');
let listS3Media, listS3Folders, s3Client;
try {
    ({ listS3Media, listS3Folders, s3Client } = require('../services/s3Service'));
    console.log('[media.js] ✅ S3Service functions loaded');
} catch (error) {
    console.error('[media.js] ❌ FAILED to load s3Service:', error.message);
    console.error('[media.js] Error details:', error);
    throw error;
}

console.log('[media.js] ✅ All dependencies loaded successfully');

/**
 * GET /api/media/media-files
 * List all media files in a folder (local or S3)
 * Query param: prefix (optional) - folder prefix for S3
 */
router.get('/media-files', async (req, res) => {
    try {
        const prefix = req.query.prefix || '';

        // Try S3 first if prefix is specified
        if (prefix) {
            try {
                const mediaUrls = await listS3Media(prefix);
                return res.json(mediaUrls);
            } catch (s3Error) {
                console.error('[/api/media/media-files] S3 Error:', s3Error.message);
                return res.status(500).json({ 
                    error: 'S3 Error',
                    message: s3Error.message
                });
            }
        }

        // Fallback to local media files
        const mediaPath = config.media.localMediaPath;

        if (!fs.existsSync(mediaPath)) {
            return res.json([]);
        }

        const files = fs.readdirSync(mediaPath);
        const allowedExtensions = [
            ...config.media.imageExtensions,
            ...config.media.videoExtensions,
        ];

        const mediaFiles = files.filter(file => {
            const ext = path.extname(file).slice(1).toLowerCase();
            return allowedExtensions.includes(ext);
        });

        res.json(mediaFiles);
    } catch (error) {
        console.error('[/api/media/media-files] Error:', error.message);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

/**
 * GET /api/media/s3-folders
 * List all folders in S3 at a given prefix level
 * Query param: prefix (optional) - parent folder prefix
 */
router.get('/s3-folders', async (req, res) => {
    try {
        const prefix = req.query.prefix || '';
        const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

        const normalizedPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;

        const command = new ListObjectsV2Command({
            Bucket: config.s3.bucket,
            Prefix: normalizedPrefix,
            Delimiter: '/',
        });

        const response = await s3Client.send(command);

        const folders = response.CommonPrefixes
            ? response.CommonPrefixes.map(cp => {
                const fullPath = cp.Prefix.replace(/\/$/, '');
                const folderName = fullPath.substring(normalizedPrefix.length).replace(/\/$/, '');
                return {
                    name: folderName,
                    fullPath: fullPath
                };
            })
            : [];

        res.json(folders);
    } catch (error) {
        console.error('[/api/media/s3-folders] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
