/**
 * Admin API Routes
 * Endpoints for admin operations: login, create folders, upload files
 */

const express = require('express');
const { PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const router = express.Router();
const config = require('../config');
const { s3Client, listFolderContents, deleteS3Object, deleteFolderRecursive } = require('../services/s3Service');
const authService = require('../services/authService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/admin/login
 * Authenticate admin user
 * Body: { username, password }
 */
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`[/api/admin/login] Login attempt for user: ${username}`);

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        if (!authService.verifyCredentials(username, password)) {
            console.log('[/api/admin/login] Invalid credentials');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = authService.generateToken(username);
        console.log('[/api/admin/login] Login successful, token generated');
        res.json({ token, message: 'Login successful' });
    } catch (error) {
        console.error('[/api/admin/login] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/create-folder
 * Create a new folder in S3 (supports subfolder creation)
 * Body: { folderName, parentPath }
 * Header: x-admin-token
 */
router.post('/create-folder', authMiddleware, async (req, res) => {
    try {
        const { folderName, parentPath } = req.body;
        console.log(`[/api/admin/create-folder] Creating folder: ${folderName} in parent: ${parentPath || 'root'}`);

        if (!folderName) {
            return res.status(400).json({ error: 'Folder name required' });
        }

        // Sanitize folder name
        const sanitized = folderName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
        
        // Build full path
        let folderKey;
        if (parentPath && parentPath.trim() !== '') {
            const normalizedParent = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;
            folderKey = `${normalizedParent}${sanitized}/`;
        } else {
            folderKey = `${sanitized}/`;
        }

        // Create empty marker object
        const command = new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: folderKey,
            Body: '',
        });

        await s3Client.send(command);
        console.log(`[/api/admin/create-folder] Folder created: ${folderKey}`);

        res.json({ message: 'Folder created successfully', folderName: sanitized, fullPath: folderKey });
    } catch (error) {
        console.error('[/api/admin/create-folder] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/upload
 * Upload a file to S3
 * Form data: file, folder
 * Header: x-admin-token
 */
router.post('/upload', authMiddleware, async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'File required' });
        }

        const file = req.files.file;
        const folder = req.body.folder || 'uploads';
        const fileExt = file.name.split('.').pop().toLowerCase();

        console.log(`[/api/admin/upload] Uploading file: ${file.name} to folder: ${folder}`);

        // Validate file type
        const allowedExtensions = [
            ...config.media.imageExtensions,
            ...config.media.videoExtensions,
        ];

        if (!allowedExtensions.includes(fileExt)) {
            return res.status(400).json({
                error: `File type not allowed. Allowed: ${allowedExtensions.join(', ')}`,
            });
        }

        // Check file size
        if (file.size > config.media.maxFileSize) {
            return res.status(400).json({
                error: `File too large. Max size: 5GB`,
            });
        }

        // Generate unique filename
        const uniqueFilename = `${Date.now()}_${file.name}`;
        const s3Key = `${folder}/${uniqueFilename}`;

        // Upload to S3 - use Buffer to avoid stream warnings
        const uploadCommand = new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: s3Key,
            Body: Buffer.from(file.data),  // Convert to Buffer to avoid AWS SDK warning
            ContentType: file.mimetype,
            ContentLength: file.size,  // Explicitly set content length
        });

        await s3Client.send(uploadCommand);
        console.log(`[/api/admin/upload] File uploaded: ${s3Key}`);

        res.json({
            message: 'File uploaded successfully',
            fileName: file.name,
            s3Key: s3Key,
        });
    } catch (error) {
        console.error('[/api/admin/upload] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/folders
 * List all folders in S3 at a specific path level
 * Query param: prefix (optional) - parent folder path
 * Header: x-admin-token
 */
router.get('/folders', authMiddleware, async (req, res) => {
    try {
        const prefix = req.query.prefix || '';
        console.log(`[/api/admin/folders] Listing folders at path: "${prefix}"`);

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

        console.log(`[/api/admin/folders] Found ${folders.length} folders`);
        res.json(folders);
    } catch (error) {
        console.error('[/api/admin/folders] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/folder-contents
 * List all files in a folder (now returns both files AND subfolders)
 * Query param: prefix (required) - folder prefix
 * Header: x-admin-token
 */
router.get('/folder-contents', authMiddleware, async (req, res) => {
    try {
        const prefix = req.query.prefix;
        console.log(`[/api/admin/folder-contents] Listing contents of: ${prefix}`);

        if (!prefix) {
            return res.status(400).json({ error: 'Prefix parameter required' });
        }

        const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

        const command = new ListObjectsV2Command({
            Bucket: config.s3.bucket,
            Prefix: normalizedPrefix,
            Delimiter: '/',
        });

        const response = await s3Client.send(command);

        // Get subfolders
        const subfolders = response.CommonPrefixes
            ? response.CommonPrefixes.map(cp => {
                const fullPath = cp.Prefix.replace(/\/$/, '');
                const folderName = fullPath.substring(normalizedPrefix.length);
                return {
                    type: 'folder',
                    name: folderName,
                    fullPath: fullPath
                };
            })
            : [];

        // Get files with presigned URLs if needed
        let files = [];
        if (response.Contents) {
            files = await Promise.all(
                response.Contents
                    .filter(obj => !obj.Key.endsWith('/'))
                    .map(async obj => {
                        let url = '';
                        
                        // Generate presigned URL if bucket is private
                        if (!config.s3.isPublic) {
                            const getCommand = new GetObjectCommand({
                                Bucket: config.s3.bucket,
                                Key: obj.Key,
                            });
                            url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // 1 hour
                        } else {
                            // Direct URL for public buckets
                            url = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${obj.Key}`;
                        }

                        return {
                            type: 'file',
                            key: obj.Key,
                            name: obj.Key.split('/').pop(),
                            size: obj.Size,
                            modified: obj.LastModified,
                            url: url
                        };
                    })
            );
        }

        const result = {
            subfolders,
            files,
            total: subfolders.length + files.length
        };

        console.log(`[/api/admin/folder-contents] Found ${subfolders.length} subfolders and ${files.length} files`);
        res.json(result);
    } catch (error) {
        console.error('[/api/admin/folder-contents] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/admin/file
 * Delete a single file from S3
 * Query param: key (required) - file key to delete
 * Header: x-admin-token
 */
router.delete('/file', authMiddleware, async (req, res) => {
    try {
        const fileKey = req.query.key;
        console.log(`[/api/admin/file] Deleting file: ${fileKey}`);

        if (!fileKey) {
            return res.status(400).json({ error: 'File key parameter required' });
        }

        await deleteS3Object(fileKey);
        console.log(`[/api/admin/file] File deleted successfully`);
        res.json({ message: 'File deleted successfully', key: fileKey });
    } catch (error) {
        console.error('[/api/admin/file] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/admin/folder
 * Delete a folder and all its contents
 * Query param: prefix (required) - folder prefix to delete
 * Header: x-admin-token
 */
router.delete('/folder', authMiddleware, async (req, res) => {
    try {
        const folderPrefix = req.query.prefix;
        console.log(`[/api/admin/folder] Deleting folder: ${folderPrefix}`);

        if (!folderPrefix) {
            return res.status(400).json({ error: 'Folder prefix parameter required' });
        }

        const count = await deleteFolderRecursive(folderPrefix);
        console.log(`[/api/admin/folder] Folder deleted successfully (${count} files)`);
        res.json({ message: 'Folder deleted successfully', filesDeleted: count });
    } catch (error) {
        console.error('[/api/admin/folder] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
