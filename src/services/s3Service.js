/**
 * S3 Service
 * Handles all AWS S3 operations
 */

const {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

// Initialize S3 Client
const s3Client = new S3Client({
    region: config.s3.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
    },
});

/**
 * List all media files (with presigned URLs if bucket is private)
 * @param {string} prefix - Optional folder prefix to search within
 * @returns {Promise<Array>} Array of file URLs or presigned URLs
 */
async function listS3Media(prefix = '') {
    try {
        console.log(`[s3Service.listS3Media] Listing files with prefix: "${prefix}"`);

        const command = new ListObjectsV2Command({
            Bucket: config.s3.bucket,
            Prefix: prefix,
            Delimiter: '/',
        });

        const response = await s3Client.send(command);
        console.log(`[s3Service.listS3Media] Response:`, response);

        if (!response.Contents || response.Contents.length === 0) {
            console.log(`[s3Service.listS3Media] No files found`);
            return [];
        }

        // Filter for media files only
        const mediaFiles = response.Contents.filter(
            obj => !obj.Key.endsWith('/')
        ).map(obj => obj.Key);

        console.log(`[s3Service.listS3Media] Found ${mediaFiles.length} files`);

        // If bucket is public, return direct URLs
        if (config.s3.isPublic) {
            return mediaFiles.map(
                key =>
                    `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`
            );
        }

        // If bucket is private, generate presigned URLs
        console.log(`[s3Service.listS3Media] Generating presigned URLs...`);
        const presignedUrls = await Promise.all(
            mediaFiles.map(async key => {
                const signedUrl = await getSignedUrl(
                    s3Client,
                    new GetObjectCommand({
                        Bucket: config.s3.bucket,
                        Key: key,
                    }),
                    { expiresIn: config.s3.signedUrlExpires }
                );
                console.log(`[s3Service.listS3Media] Presigned URL for ${key}`);
                return signedUrl;
            })
        );

        console.log(`[s3Service.listS3Media] Generated ${presignedUrls.length} presigned URLs`);
        return presignedUrls;
    } catch (error) {
        console.error('[s3Service.listS3Media] Error:', error);
        throw error;
    }
}

/**
 * List all folders (common prefixes) at a given level
 * @param {string} prefix - Optional parent folder prefix
 * @returns {Promise<Array>} Array of folder names
 */
async function listS3Folders(prefix = '') {
    try {
        console.log(`[s3Service.listS3Folders] Listing folders with prefix: "${prefix}"`);

        const command = new ListObjectsV2Command({
            Bucket: config.s3.bucket,
            Prefix: prefix,
            Delimiter: '/',
        });

        const response = await s3Client.send(command);
        console.log(`[s3Service.listS3Folders] Response CommonPrefixes:`, response.CommonPrefixes);

        if (!response.CommonPrefixes || response.CommonPrefixes.length === 0) {
            console.log(`[s3Service.listS3Folders] No folders found`);
            return [];
        }

        // Extract folder names (remove the trailing slash and parent prefix)
        const folders = response.CommonPrefixes.map(cp => {
            const fullPath = cp.Prefix;
            const folderName = fullPath.substring(prefix.length).replace(/\/$/, '');
            return folderName;
        });

        console.log(`[s3Service.listS3Folders] Found ${folders.length} folders:`, folders);
        return folders;
    } catch (error) {
        console.error('[s3Service.listS3Folders] Error:', error);
        throw error;
    }
}

module.exports = {
    s3Client,
    listS3Media,
    listS3Folders,
    listFolderContents,
    deleteS3Object,
    deleteFolderRecursive,
};

/**
 * List all files in a folder (without subfolders)
 * @param {string} prefix - Folder prefix
 * @returns {Promise<Array>} Array of file objects {key, name, size, modified}
 */
async function listFolderContents(prefix = '') {
    try {
        console.log(`[s3Service.listFolderContents] Listing contents of prefix: "${prefix}"`);

        const command = new ListObjectsV2Command({
            Bucket: config.s3.bucket,
            Prefix: prefix,
            Delimiter: '/',
        });

        const response = await s3Client.send(command);

        if (!response.Contents || response.Contents.length === 0) {
            console.log(`[s3Service.listFolderContents] No files found`);
            return [];
        }

        // Filter out folder marker (empty object ending with /)
        const files = response.Contents
            .filter(obj => !obj.Key.endsWith('/'))
            .map(obj => ({
                key: obj.Key,
                name: obj.Key.split('/').pop(),
                size: obj.Size,
                modified: obj.LastModified,
                sizeKB: Math.round(obj.Size / 1024),
            }));

        console.log(`[s3Service.listFolderContents] Found ${files.length} files`);
        return files;
    } catch (error) {
        console.error('[s3Service.listFolderContents] Error:', error);
        throw error;
    }
}

/**
 * Delete a single object from S3
 * @param {string} key - Object key to delete
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteS3Object(key) {
    try {
        console.log(`[s3Service.deleteS3Object] Deleting: ${key}`);

        const command = new DeleteObjectCommand({
            Bucket: config.s3.bucket,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`[s3Service.deleteS3Object] Deleted: ${key}`);
        return true;
    } catch (error) {
        console.error('[s3Service.deleteS3Object] Error:', error);
        throw error;
    }
}

/**
 * Delete a folder and all its contents recursively
 * @param {string} prefix - Folder prefix to delete
 * @returns {Promise<number>} Number of objects deleted
 */
async function deleteFolderRecursive(prefix = '') {
    try {
        console.log(`[s3Service.deleteFolderRecursive] Deleting folder: "${prefix}"`);

        // Ensure prefix ends with /
        const folderPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

        // List all objects in folder
        const command = new ListObjectsV2Command({
            Bucket: config.s3.bucket,
            Prefix: folderPrefix,
        });

        const response = await s3Client.send(command);

        if (!response.Contents || response.Contents.length === 0) {
            console.log(`[s3Service.deleteFolderRecursive] Folder is empty`);
            return 0;
        }

        // Delete all objects
        const deletePromises = response.Contents.map(obj =>
            deleteS3Object(obj.Key)
        );

        await Promise.all(deletePromises);

        const count = response.Contents.length;
        console.log(`[s3Service.deleteFolderRecursive] Deleted ${count} objects`);
        return count;
    } catch (error) {
        console.error('[s3Service.deleteFolderRecursive] Error:', error);
        throw error;
    }
}
