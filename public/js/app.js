// Configuration
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
const videoExtensions = ['mp4', 'webm'];

// Get base path from global variable (set in HTML)
const BASE_PATH = window.BASE_PATH || '/';
const API_BASE = BASE_PATH === '/' ? '/api' : `${BASE_PATH}api`;

console.log('[app.js] BASE_PATH:', BASE_PATH);
console.log('[app.js] API_BASE:', API_BASE);

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
        console.log('=== [loadMediaFiles] START ===');
        console.log('Input prefix:', JSON.stringify(prefix));
        
        // Ensure prefix ends with / for S3
        const s3Prefix = prefix && !prefix.endsWith('/') ? prefix + '/' : prefix;
        console.log('S3 Prefix (after formatting):', JSON.stringify(s3Prefix));
        
        const url = `${API_BASE}/media/media-files?prefix=${encodeURIComponent(s3Prefix)}`;
        console.log('Full URL:', url);
        console.log('Fetching from URL...');
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            console.error('Response NOT ok. Status:', response.status);
            const text = await response.text();
            console.error('Response body:', text);
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        
        mediaFiles = await response.json();
        console.log('Successfully parsed JSON. Got', mediaFiles.length, 'files');
        console.log('Media files:', mediaFiles);
        
        if (mediaFiles.length > 0) {
            currentIndex = 0;
            console.log('Files found. Calling showNext()');
            showNext();
        } else {
            console.log('No files found. Showing empty message');
            container.innerHTML = '<div style="color:#fff">No hay archivos en esta carpeta</div>';
        }
        console.log('=== [loadMediaFiles] END ===');
    } catch (error) {
        console.error('=== [loadMediaFiles] ERROR ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        container.innerHTML = '<div style="color:#f88">Error cargando archivos: ' + error.message + '</div>';
    }
}

/**
 * Load list of folders from API
 * @returns {Promise<Array>} Promise that resolves to array of folders
 */
async function loadFolders() {
    console.log('=== [loadFolders] START ===');
    
    const el = document.getElementById('folders');
    console.log('Folders element exists:', !!el);
    
    // Si no existe el elemento folders, solo cargar las carpetas sin mostrar
    if (!el) {
        console.log('No folders element found. Loading folders silently...');
        try {
            const url = `${API_BASE}/media/s3-folders?prefix=`;
            console.log('Fetching folders from:', url);
            const resp = await fetch(url);
            console.log('Folders response status:', resp.status);
            if (!resp.ok) throw new Error('No se pudo listar carpetas');
            const folders = await resp.json();
            console.log('Got folders:', folders);
            return folders || [];
        } catch (err) {
            console.error('[loadFolders] Error:', err);
            return [];
        }
    }
    
    el.innerHTML = 'Cargando...';
    try {
        console.log('Fetching top-level folders...');
        const url = `${API_BASE}/media/s3-folders?prefix=`;
        console.log('URL:', url);
        const resp = await fetch(url);
        console.log('Response status:', resp.status);
        console.log('Response ok:', resp.ok);
        
        if (!resp.ok) throw new Error('No se pudo listar carpetas');
        const folders = await resp.json();
        console.log('Got folders:', folders);
        
        if (!folders || folders.length === 0) {
            console.log('No folders found');
            el.innerHTML = '<div style="color:#888">No hay carpetas</div>';
            return [];
        }
        
        console.log('Rendering', folders.length, 'folder buttons');
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
        console.log('=== [loadFolders] END (success) ===');
        return folders;
    } catch (err) {
        console.error('[loadFolders] Error:', err);
        console.error('Error message:', err.message);
        el.innerHTML = '<div style="color:#f88">Error cargando carpetas</div>';
        return [];
    }
}/**
 * Display the next media file (image or video)
 */
function showNext() {
    console.log('=== [showNext] START ===');
    console.log('Total media files:', mediaFiles.length);
    console.log('Current index:', currentIndex);
    
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
        
        img.onerror = () => {
            console.error('[img.onerror] Error loading image, src was:', src);
        };
        
        img.onload = () => {
            console.log('[img.onload] Image loaded successfully');
        };
        
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
    console.log('=== [showNext] END ===');
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
    console.log('=== [init] STARTING APPLICATION ===');
    console.log('Current folder:', currentFolder);
    
    // Check if server is responding and routes are available
    console.log('[init] Checking server health...');
    fetch('/health')
        .then(r => r.json())
        .then(data => console.log('[init] ✅ Health check OK:', data))
        .catch(e => console.error('[init] ❌ Health check FAILED:', e));
    
    // Check if debug routes endpoint exists
    console.log('[init] Checking available routes...');
    fetch('/debug/routes')
        .then(r => r.json())
        .then(data => {
            console.log('[init] Available routes:', data);
            console.table(data.routes);
        })
        .catch(e => console.error('[init] ❌ Routes debug endpoint failed:', e));
    
    // Update current folder display (solo si el elemento existe - para index.html)
    const currentFolderName = document.getElementById('currentFolderName');
    if (currentFolderName) {
        console.log('Setting currentFolderName display');
        currentFolderName.textContent = currentFolder;
    } else {
        console.log('currentFolderName element not found (this is normal for index.html)');
    }
    
    console.log('Loading folders...');
    // Load folders first
    loadFolders().then((folders) => {
        console.log('[init] Folders loaded:', folders);
        console.log('[init] Now loading media from folder:', currentFolder);
        // Load media from current folder
        loadMediaFiles('publicidad/');
    }).catch(err => {
        console.error('[init] Error loading folders:', err);
    });

    // Setup event listeners
    const refreshFoldersBtn = document.getElementById('refreshFolders');
    if (refreshFoldersBtn) {
        console.log('Setting up refresh button listener');
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

    console.log('=== [init] INITIALIZATION COMPLETE ===');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
