// Configuration
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
const videoExtensions = ['mp4', 'webm'];

// State
let mediaFiles = [];
let currentIndex = 0;
let isFullscreen = false;
let currentFolder = 'publicidad'; // Track current folder

// DOM Elements
const container = document.getElementById('mediaContainer');
const sidebar = document.getElementById('sidebar');
const fullscreenBtn = document.getElementById('fullscreenBtn');

/**
 * Load media files from API
 * @param {string} prefix - Optional folder prefix to load from
 */
async function loadMediaFiles(prefix = '') {
    try {
        // Ensure prefix ends with / for S3
        const s3Prefix = prefix && !prefix.endsWith('/') ? prefix + '/' : prefix;
        
        const url = `/api/media/media-files?prefix=${encodeURIComponent(s3Prefix)}`;
        console.log('[loadMediaFiles] Fetching:', url);
        const response = await fetch(url);
        mediaFiles = await response.json();
        console.log('[loadMediaFiles] Got', mediaFiles.length, 'files');
        if (mediaFiles.length > 0) {
            currentIndex = 0;
            showNext();
        } else {
            container.innerHTML = '<div style="color:#fff">No hay archivos en esta carpeta</div>';
        }
    } catch (error) {
        console.error('[loadMediaFiles] Error:', error);
        container.innerHTML = '<div style="color:#f88">Error cargando archivos</div>';
    }
}

/**
 * Load list of folders from API
 * @returns {Promise<Array>} Promise that resolves to array of folders
 */
async function loadFolders() {
    const el = document.getElementById('folders');
    
    // Si no existe el elemento folders, solo cargar las carpetas sin mostrar
    if (!el) {
        try {
            const resp = await fetch(`/api/media/s3-folders?prefix=`);
            if (!resp.ok) throw new Error('No se pudo listar carpetas');
            const folders = await resp.json();
            return folders || [];
        } catch (err) {
            console.error('[loadFolders] Error:', err);
            return [];
        }
    }
    
    el.innerHTML = 'Cargando...';
    try {
        // Load top-level folders
        const resp = await fetch(`/api/media/s3-folders?prefix=`);
        if (!resp.ok) throw new Error('No se pudo listar carpetas');
        const folders = await resp.json();
        if (!folders || folders.length === 0) {
            el.innerHTML = '<div style="color:#888">No hay carpetas</div>';
            return [];
        }
        el.innerHTML = '';
        folders.forEach(f => {
            const btn = document.createElement('button');
            btn.textContent = f;
            btn.className = currentFolder === f ? 'active' : '';
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.padding = '10px';
            btn.style.marginBottom = '5px';
            btn.style.backgroundColor = currentFolder === f ? '#667eea' : '#333';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.3s';
            btn.onmouseover = () => {
                if (currentFolder !== f) btn.style.backgroundColor = '#444';
            };
            btn.onmouseout = () => {
                if (currentFolder !== f) btn.style.backgroundColor = '#333';
            };
            btn.onclick = () => {
                console.log('[loadFolders] Selected folder:', f);
                currentFolder = f;
                loadFolders(); // Refresh folder list to show active state
                loadMediaFiles(f + '/');
            };
            el.appendChild(btn);
        });
        return folders;
    } catch (err) {
        console.error('[loadFolders] Error:', err);
        el.innerHTML = '<div style="color:#f88">Error cargando carpetas</div>';
        return [];
    }
}/**
 * Display the next media file (image or video)
 */
function showNext() {
    if (mediaFiles.length === 0) {
        console.log('[showNext] No media files');
        return;
    }

    const file = mediaFiles[currentIndex];
    console.log('[showNext] Showing file', currentIndex, ':', file);
    
    // Extract extension from URL or filename
    const lastPart = file.split('?')[0]; // Remove query params
    const extension = lastPart.split('.').pop().toLowerCase();
    console.log('[showNext] Extension:', extension);

    // Clear container
    container.innerHTML = '';

    // Use absolute URL or prepend /media/ for local files
    const src = /^https?:\/\//i.test(file) ? file : `/media/${file}`;
    console.log('[showNext] Source URL:', src);

    if (videoExtensions.includes(extension)) {
        // Create video element
        console.log('[showNext] Creating video element');
        const video = document.createElement('video');
        video.id = 'currentMedia';
        video.src = src;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.controls = false;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';
        video.style.objectFit = 'contain';

        video.onended = () => {
            console.log('[video.onended] Video finished');
            currentIndex = (currentIndex + 1) % mediaFiles.length;
            showNext();
        };

        video.onerror = (err) => {
            console.error('[video.onerror] Error loading video:', err);
        };

        container.appendChild(video);
        console.log('[showNext] Video element added to container');
    } else if (imageExtensions.includes(extension)) {
        // Create image element
        console.log('[showNext] Creating image element');
        const img = document.createElement('img');
        img.id = 'currentMedia';
        img.src = src;
        img.alt = 'Media content';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        container.appendChild(img);
        console.log('[showNext] Image element added to container');

        // Change after 10 seconds
        setTimeout(() => {
            console.log('[showNext] Image timeout - moving to next');
            currentIndex = (currentIndex + 1) % mediaFiles.length;
            showNext();
        }, 10000);
    } else {
        console.warn('[showNext] Unknown file type:', extension);
        container.innerHTML = '<div style="color:#fff">Tipo de archivo no soportado: ' + extension + '</div>';
    }
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    if (!isFullscreen) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

/**
 * Update fullscreen button state
 */
function updateFullscreenButton() {
    if (isFullscreen) {
        container.classList.add('fullscreen');
        sidebar.classList.add('hidden');
        fullscreenBtn.classList.add('hidden');
    } else {
        container.classList.remove('fullscreen');
        sidebar.classList.remove('hidden');
        fullscreenBtn.classList.remove('hidden');
    }
}

/**
 * Initialize fullscreen event listeners
 */
function initFullscreenListeners() {
    // Detect fullscreen changes
    document.addEventListener('fullscreenchange', () => {
        isFullscreen = !!document.fullscreenElement;
        updateFullscreenButton();
    });

    document.addEventListener('webkitfullscreenchange', () => {
        isFullscreen = !!document.webkitFullscreenElement;
        updateFullscreenButton();
    });

    document.addEventListener('msfullscreenchange', () => {
        isFullscreen = !!document.msFullscreenElement;
        updateFullscreenButton();
    });

    // Button click
    fullscreenBtn.addEventListener('click', toggleFullscreen);
}

/**
 * Initialize the application
 */
function init() {
    console.log('[init] Initializing application');
    
    // Update current folder display (solo si el elemento existe - para index.html)
    const currentFolderName = document.getElementById('currentFolderName');
    if (currentFolderName) {
        currentFolderName.textContent = currentFolder;
    }
    
    // Load folders first
    loadFolders().then(() => {
        console.log('[init] Folders loaded, loading first folder media');
        // Load media from current folder
        loadMediaFiles('publicidad/');
    });

    // Setup event listeners
    const refreshFoldersBtn = document.getElementById('refreshFolders');
    if (refreshFoldersBtn) {
        refreshFoldersBtn.addEventListener('click', () => {
            console.log('[refresh] Refreshing folders');
            loadFolders();
        });
    }

    initFullscreenListeners();

    // Reload media list every 5 minutes to detect new files
    setInterval(() => {
        console.log('[interval] Refreshing media list');
        loadMediaFiles('publicidad/');
        loadFolders();
    }, 300000);

    console.log('[init] Initialization complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
