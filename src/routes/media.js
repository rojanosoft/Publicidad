/**
 * Media API Routes
 * Endpoints for fetching media files and folder listings
 */

console.log('=== MEDIA ROUTES LOADING ===');

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const config = require('../config');
const { listS3Media, listS3Folders } = require('../services/s3Service');

console.log('Media routes dependencies loaded');

/**
 * GET /api/media/media-files
 * List all media files in a folder (local or S3)
 * Query param: prefix (optional) - folder prefix for S3
 */
router.get('/media-files', async (req, res) => {
    try {
        const prefix = req.query.prefix || '';
        console.log(`[/api/media/media-files] REQUEST RECEIVED`);
        console.log(`[/api/media/media-files] prefix="${prefix}"`);

        // Try S3 first if prefix is specified
        if (prefix) {
            console.log('[/api/media/media-files] 📁 Using S3 to fetch media');
            console.log(`[/api/media/media-files] S3 Config - Bucket: ${config.s3.bucket}, Region: ${config.s3.region}`);
            try {
                const mediaUrls = await listS3Media(prefix);
                console.log(`[/api/media/media-files] ✅ Got ${mediaUrls.length} files from S3`);
                return res.json(mediaUrls);
            } catch (s3Error) {
                console.error('[/api/media/media-files] ❌ S3 Error:', s3Error.message);
                console.error('[/api/media/media-files] Error details:', s3Error);
                return res.status(500).json({ 
                    error: 'S3 Error',
                    message: s3Error.message,
                    details: s3Error.toString()
                });
            }
        }

        // Fallback to local media files
        console.log('[/api/media/media-files] 📂 Fallback to local media');
        const mediaPath = config.media.localMediaPath;

        if (!fs.existsSync(mediaPath)) {
            console.log('[/api/media/media-files] Local media path does not exist');
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

        console.log(`[/api/media/media-files] Found ${mediaFiles.length} local files`);
        res.json(mediaFiles);
    } catch (error) {
        console.error('[/api/media/media-files] ❌ Unexpected Error:', error.message);
        console.error('[/api/media/media-files] Stack:', error.stack);
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
        console.log(`[/api/media/s3-folders] prefix="${prefix}"`);

        const folders = await listS3Folders(prefix);
        res.json(folders);
    } catch (error) {
        console.error('[/api/media/s3-folders] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
