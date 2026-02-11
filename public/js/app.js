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
let currentFolder = ''; // Track current folder for displaying media
let currentPath = ''; // Track current path for subfolder navigation

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
        const url = `${API_BASE}/media/media-files?prefix=${encodeURIComponent(s3Prefix)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        mediaFiles = await response.json();
        
        if (mediaFiles.length > 0) {
            currentIndex = 0;
            showNext();
        } else {
            container.innerHTML = '<div style="color:#fff">No hay archivos en esta carpeta</div>';
        }
    } catch (error) {
        console.error('[loadMediaFiles] Error:', error.message);
        container.innerHTML = '<div style="color:#f88">Error cargando archivos: ' + error.message + '</div>';
    }
}

/**
 * Load list of folders from API (supports hierarchical navigation)
 * @returns {Promise<Array>} Promise that resolves to array of folders
 */
async function loadFolders() {
    const el = document.getElementById('folders');
    
    // Si no existe el elemento folders, solo cargar las carpetas sin mostrar
    if (!el) {
        try {
            const prefix = currentPath ? `${currentPath}/` : '';
            const url = `${API_BASE}/media/s3-folders?prefix=${encodeURIComponent(prefix)}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('No se pudo listar carpetas');
            const folders = await resp.json();
            return folders || [];
        } catch (err) {
            console.error('[loadFolders] Error:', err.message);
            return [];
        }
    }
    
    // Update breadcrumb and back button
    updateBreadcrumb();
    
    el.innerHTML = 'Cargando...';
    try {
        const prefix = currentPath ? `${currentPath}/` : '';
        const url = `${API_BASE}/media/s3-folders?prefix=${encodeURIComponent(prefix)}`;
        
        const resp = await fetch(url);
        
        if (!resp.ok) {
            const errText = await resp.text();
            console.error('[loadFolders] HTTP Error:', errText);
            throw new Error('No se pudo listar carpetas');
        }
        
        const folders = await resp.json();
        
        if (!folders || folders.length === 0) {
            el.innerHTML = '<div style="color:#888">No hay carpetas en este nivel</div>';
            return [];
        }
        
        el.innerHTML = '';
        folders.forEach(f => {
            // f is now an object with {name, fullPath}
            const folderName = f.name || f; // Fallback for backward compatibility
            const fullPath = f.fullPath || f;
            
            const btn = document.createElement('button');
            btn.textContent = '📁 ' + folderName;
            btn.title = 'Clic: Ver contenido | Doble clic: Entrar a carpeta';
            btn.className = currentFolder === fullPath ? 'active' : '';
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.padding = '10px';
            btn.style.marginBottom = '5px';
            btn.style.backgroundColor = currentFolder === fullPath ? '#667eea' : '#333';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.3s';
            btn.style.textAlign = 'left';
            btn.style.fontSize = '14px';
            btn.onmouseover = () => {
                if (currentFolder !== fullPath) btn.style.backgroundColor = '#444';
            };
            btn.onmouseout = () => {
                if (currentFolder !== fullPath) btn.style.backgroundColor = '#333';
            };
            
            // Use a timeout to detect double-click and prevent single-click from firing
            let clickTimeout;
            btn.onclick = () => {
                clearTimeout(clickTimeout);
                clickTimeout = setTimeout(() => {
                    navigateToFolder(fullPath);
                }, 250); // Wait 250ms to see if it's a double-click
            };
            
            // Add double-click to enter subfolder
            btn.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearTimeout(clickTimeout); // Cancel pending single-click
                
                currentPath = fullPath;
                currentFolder = fullPath;
                
                // Update current folder display
                const currentFolderName = document.getElementById('currentFolderName');
                if (currentFolderName) {
                    currentFolderName.textContent = fullPath || 'Ninguna';
                }
                
                // Clear media display
                container.innerHTML = '<div style="color:#fff; font-size: 18px; text-align: center;">📁 Navegando a subcarpetas...</div>';
                
                // Reload folders to show subfolders of this path
                loadFolders();
            };
            
            el.appendChild(btn);
        });
        return folders;
    } catch (err) {
        console.error('[loadFolders] Error:', err.message);
        el.innerHTML = '<div style="color:#f88">Error cargando carpetas</div>';
        return [];
    }
}

/**
 * Navigate to a specific folder and load its media (single click behavior)
 * @param {string} folderPath - Full path to folder
 */
function navigateToFolder(folderPath) {
    currentFolder = folderPath;
    
    // Update current folder display
    const currentFolderName = document.getElementById('currentFolderName');
    if (currentFolderName) {
        currentFolderName.textContent = folderPath || 'Ninguna';
    }
    
    // Load media from this folder
    const prefix = folderPath ? folderPath + '/' : '';
    loadMediaFiles(prefix);
    
    // Don't change currentPath - we're just viewing media, not navigating into the folder
    // Refresh folder list to show active state (at current path level)
    loadFolders();
}

/**
 * Navigate to a specific path (used by breadcrumb and back button)
 * @param {string} path - Path to navigate to
 */
function navigateToPath(path) {
    currentPath = path;
    currentFolder = ''; // Clear selected folder when navigating
    
    // Update current folder display
    const currentFolderName = document.getElementById('currentFolderName');
    if (currentFolderName) {
        currentFolderName.textContent = path || 'Ninguna';
    }
    
    // Load folders at this path level
    loadFolders();
    
    // Clear media display and show message
    container.innerHTML = '<div style="color:#fff; font-size: 18px; text-align: center;">📁 Selecciona una carpeta para ver el contenido</div>';
}

/**
 * Navigate back one level
 */
function navigateBack() {
    if (!currentPath) {
        return;
    }
    
    const pathParts = currentPath.split('/').filter(p => p);
    pathParts.pop(); // Remove last part
    currentPath = pathParts.join('/');
    currentFolder = ''; // Clear selected folder
    
    // Update current folder display
    const currentFolderName = document.getElementById('currentFolderName');
    if (currentFolderName) {
        currentFolderName.textContent = currentPath || 'Ninguna';
    }
    
    // Load folders at new level
    loadFolders();
    
    // Clear media display and show message
    container.innerHTML = '<div style="color:#fff; font-size: 18px; text-align: center;">📁 Selecciona una carpeta para ver el contenido</div>';
}

/**
 * Update breadcrumb navigation display
 */
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    const backButton = document.getElementById('backButton');
    
    if (!breadcrumb || !backButton) return;
    
    if (!currentPath) {
        breadcrumb.style.display = 'none';
        backButton.style.display = 'none';
        return;
    }

    breadcrumb.style.display = 'block';
    backButton.style.display = 'block';

    const parts = currentPath.split('/').filter(p => p);
    let html = '<span style="color: #667eea; cursor: pointer;" onclick="navigateToPath(\'\')" title="Ir a inicio">🏠 Inicio</span>';
    
    let accumulatedPath = '';
    parts.forEach((part, index) => {
        accumulatedPath += (accumulatedPath ? '/' : '') + part;
        const path = accumulatedPath;
        html += ' <span style="color: #999;">›</span> ';
        if (index === parts.length - 1) {
            html += `<span style="color: #fff; font-weight: 600;" title="${path}">${part}</span>`;
        } else {
            html += `<span style="color: #667eea; cursor: pointer;" onclick="navigateToPath('${path}')" title="Ir a ${path}">${part}</span>`;
        }
    });

    breadcrumb.innerHTML = html;
}/**
 * Display the next media file (image or video)
 */
function showNext() {
    if (mediaFiles.length === 0) {
        return;
    }

    const file = mediaFiles[currentIndex];
    
    // Extract extension from URL or filename
    const lastPart = file.split('?')[0]; // Remove query params
    const extension = lastPart.split('.').pop().toLowerCase();

    // Clear container
    container.innerHTML = '';

    // Use absolute URL or prepend /media/ for local files
    const src = /^https?:\/\//i.test(file) ? file : `/media/${file}`;

    if (videoExtensions.includes(extension)) {
        // Create video element
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
            currentIndex = (currentIndex + 1) % mediaFiles.length;
            showNext();
        };

        video.onerror = (err) => {
            console.error('[showNext] Video error:', err);
        };

        container.appendChild(video);
    } else if (imageExtensions.includes(extension)) {
        // Create image element
        const img = document.createElement('img');
        img.id = 'currentMedia';
        img.src = src;
        img.alt = 'Media content';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        
        img.onerror = () => {
            console.error('[showNext] Image error, src:', src);
        };
        
        container.appendChild(img);

        // Change after 10 seconds
        setTimeout(() => {
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
    // Update current folder display
    const currentFolderName = document.getElementById('currentFolderName');
    if (currentFolderName) {
        currentFolderName.textContent = currentFolder || 'Ninguna';
    }
    
    // Load folders first (from root)
    loadFolders().then((folders) => {
        // Show message to select a folder
        container.innerHTML = '<div style="color:#fff; font-size: 18px; text-align: center;">📁 Selecciona una carpeta para ver el contenido</div>';
    }).catch(err => {
        console.error('[init] Error loading folders:', err.message);
        container.innerHTML = '<div style="color:#f88">Error cargando carpetas</div>';
    });

    // Setup event listeners
    const refreshFoldersBtn = document.getElementById('refreshFolders');
    if (refreshFoldersBtn) {
        refreshFoldersBtn.addEventListener('click', () => {
            loadFolders();
            if (currentFolder) {
                loadMediaFiles(currentFolder + '/');
            }
        });
    }

    initFullscreenListeners();

    // Reload media list every 5 minutes to detect new files
    setInterval(() => {
        console.log('[interval] Refreshing media list');
        if (currentFolder) {
            loadMediaFiles(currentFolder + '/');
        }
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
