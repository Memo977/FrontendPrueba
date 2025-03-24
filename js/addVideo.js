/**
 * addVideo.js - Maneja la adición de videos a playlists
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let playlistData = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    checkAuth();
    
    // Inicializar eventos
    initEvents();
    
    // Obtener ID de la playlist de la URL
    const playlistId = getPlaylistIdFromUrl();
    
    if (playlistId) {
        // Cargar datos de la playlist
        loadPlaylistData(playlistId);
        
        // Establecer el ID de la playlist en el formulario
        document.getElementById('playlistId').value = playlistId;
    } else {
        // Redireccionar al dashboard si no hay ID
        window.location.href = 'dashboard.html';
    }
});

/**
 * Verifica si el usuario está autenticado
 */
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        redirectToLogin('login_required');
        return;
    }
    
    try {
        // Llamada al API para validar el token
        const response = await fetch(`${API_URL}/admin/playlists`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Token inválido o expirado
            throw new Error('Token inválido');
        }
        
        // Cargar datos del usuario
        await loadUserData();
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        redirectToLogin('session_expired');
    }
}

/**
 * Obtiene el ID de la playlist de la URL
 * @returns {string|null} - ID de la playlist o null si no existe
 */
function getPlaylistIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('playlistId');
}

/**
 * Carga los datos del usuario actual
 */
async function loadUserData() {
    const token = localStorage.getItem('token');
    const adminId = localStorage.getItem('adminId');
    
    if (!token || !adminId) {
        redirectToLogin('login_required');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users?id=${adminId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar datos del usuario');
        }
        
        const userData = await response.json();
        updateUserInfo(userData);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar tus datos. Intenta recargar la página.');
    }
}

/**
 * Actualiza la interfaz con la información del usuario
 * @param {Object} user - Datos del usuario
 */
function updateUserInfo(user) {
    // Actualizar nombre en la barra de navegación
    const userDisplayName = document.getElementById('userDisplayName');
    if (userDisplayName) {
        userDisplayName.textContent = user.name || 'Usuario';
    }
}

/**
 * Carga los datos de la playlist
 * @param {string} playlistId - ID de la playlist
 */
async function loadPlaylistData(playlistId) {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/playlists?id=${playlistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar datos de la playlist');
        }
        
        playlistData = await response.json();
        
        // Actualizar interfaz con el nombre de la playlist
        updatePlaylistInfo(playlistData);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar datos de la playlist. Intenta recargar la página.');
    }
}

/**
 * Actualiza la interfaz con la información de la playlist
 * @param {Object} playlist - Datos de la playlist
 */
function updatePlaylistInfo(playlist) {
    const playlistNameBadge = document.getElementById('playlistNameBadge');
    if (playlistNameBadge && playlist) {
        playlistNameBadge.textContent = playlist.name || 'Playlist';
    }
}

/**
 * Inicializa los eventos de la página
 */
function initEvents() {
    // Evento para el botón de cerrar sesión
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Evento para el botón de editar perfil
    const editProfileButtons = document.querySelectorAll('.editProfileButton');
    editProfileButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    });
    
    // Evento para el formulario de añadir video
    const addVideoForm = document.getElementById('addVideoForm');
    if (addVideoForm) {
        addVideoForm.addEventListener('submit', handleVideoSubmit);
    }
    
    // Evento para el botón de vista previa
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', showVideoPreview);
    }
    
    // Evento para el botón de cancelar
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Volver a la pantalla de edición de playlist
            const playlistId = document.getElementById('playlistId').value;
            window.location.href = `editPlaylist.html?id=${playlistId}`;
        });
    }
    
    // Evento para cambios en la URL de YouTube
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    if (youtubeUrlInput) {
        youtubeUrlInput.addEventListener('input', function() {
            // Si el campo está vacío, ocultar la vista previa
            if (!this.value) {
                document.getElementById('videoPreviewContainer').style.display = 'none';
            }
        });
    }
}

/**
 * Muestra una vista previa del video
 */
function showVideoPreview() {
    const youtubeUrl = document.getElementById('youtubeUrl').value;
    
    if (!youtubeUrl) {
        showNotification('error', 'Por favor, introduce una URL de YouTube válida.');
        return;
    }
    
    // Obtener ID del video
    const videoId = getYouTubeVideoId(youtubeUrl);
    
    if (!videoId) {
        showNotification('error', 'No se pudo extraer el ID del video de la URL proporcionada.');
        return;
    }
    
    console.log("Video ID extraído:", videoId);
    
    // Crear iframe para la vista previa usando template string con el formato actualizado
    const videoPreview = document.getElementById('videoPreview');
    videoPreview.innerHTML = `<iframe 
        width="100%" 
        height="100%" 
        src="https://www.youtube.com/embed/${videoId}" 
        title="YouTube video player" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        referrerpolicy="strict-origin-when-cross-origin" 
        allowfullscreen></iframe>`;
    
    // Mostrar el contenedor de vista previa
    document.getElementById('videoPreviewContainer').style.display = 'block';
    
    // Informar al usuario
    showNotification('success', 'Vista previa cargada correctamente.');
}

/**
 * Obtiene el ID de un video de YouTube a partir de su URL
 * @param {string} url - URL del video de YouTube
 * @returns {string|null} - ID del video o null si no se pudo extraer
 */
function getYouTubeVideoId(url) {
    if (!url) return null;
    
    // Intentar extraer ID usando URL API para un análisis más confiable
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // youtube.com/watch?v=ID
        if (urlObj.searchParams.has('v')) {
            const id = urlObj.searchParams.get('v');
            if (id && id.length === 11) return id;
        }
        
        // youtu.be/ID
        if (urlObj.hostname === 'youtu.be' && pathname.length > 1) {
            const id = pathname.substring(1);
            if (id && id.length === 11) return id;
        }
        
        // youtube.com/embed/ID
        if (pathname.includes('/embed/')) {
            const id = pathname.split('/embed/')[1].split('?')[0];
            if (id && id.length === 11) return id;
        }
    } catch (e) {
        console.log("Error al parsear URL, usando método de respaldo con regex");
    }
    
    // Método de respaldo con expresiones regulares
    // Formato estándar: youtube.com/watch?v=ID
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/e\/|youtube\/watch\?v=|youtube\.com\/watch\?feature=player_embedded&v=)([^#\&\?]*)/);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }
    
    // Formato corto: youtu.be/ID
    match = url.match(/youtu\.be\/([^#\&\?]*)/);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }
    
    // Formato de embed: youtube.com/embed/ID
    match = url.match(/youtube\.com\/embed\/([^#\&\?]*)/);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }
    
    // Si todos los patrones fallan, intentar el patrón general
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    match = url.match(regExp);
    
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

/**
 * Maneja el envío del formulario de añadir video
 * @param {Event} e - Evento de submit
 */
async function handleVideoSubmit(e) {
    e.preventDefault();
    
    // Obtener datos del formulario
    const playlistId = document.getElementById('playlistId').value;
    const videoName = document.getElementById('videoName').value;
    const youtubeUrl = document.getElementById('youtubeUrl').value;
    const videoDescription = document.getElementById('videoDescription').value;
    
    // Validar datos
    if (!videoName || !youtubeUrl) {
        showNotification('error', 'Por favor, completa todos los campos obligatorios.');
        return;
    }
    
    // Validar URL de YouTube
    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) {
        showNotification('error', 'Por favor, introduce una URL de YouTube válida.');
        return;
    }
    
    // Preparar datos para la API
    const videoData = {
        name: videoName,
        youtubeUrl: youtubeUrl,
        description: videoDescription,
        playlistId: playlistId
    };
    
    // Mostrar indicador de carga
    toggleLoading(true, e.target);
    
    try {
        // Añadir video
        const video = await addVideo(videoData);
        
        // Mostrar notificación de éxito
        showNotification('success', 'Video añadido correctamente.');
        
        // Redireccionar a la página de edición de playlist después de 2 segundos
        setTimeout(() => {
            window.location.href = `editPlaylist.html?id=${playlistId}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al añadir el video.');
        toggleLoading(false, e.target);
    }
}

/**
 * Añade un nuevo video a una playlist
 * @param {Object} videoData - Datos del video a añadir
 * @returns {Promise<Object>} - Video añadido
 */
async function addVideo(videoData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    
    const response = await fetch(`${API_URL}/admin/videos`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(videoData)
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al añadir el video.');
    }
    
    return await response.json();
}

/**
 * Cierra la sesión del usuario
 */
async function logout() {
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            // Llamada a la API para invalidar el token
            await fetch(`${API_URL}/session`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }
    
    // Eliminar datos de sesión del almacenamiento local
    localStorage.removeItem('token');
    
    // Redirigir a la página de selección de perfiles
    window.location.href = 'profileSelection.html';
}

/**
 * Redirige al usuario a la página de login
 * @param {string} reason - Razón del redireccionamiento
 */
function redirectToLogin(reason) {
    // Guardar la URL actual para redirigir después del login
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    
    // Redirigir a login con parámetro de razón
    window.location.href = `login.html?reason=${reason}`;
}

/**
 * Muestra una notificación en la interfaz
 * @param {string} type - Tipo de notificación (success, error, info)
 * @param {string} message - Mensaje a mostrar
 */
function showNotification(type, message) {
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Configurar apariencia según el tipo
    if (type === 'success') {
        notification.classList.remove('bg-danger', 'bg-info');
        notification.classList.add('bg-success', 'text-white');
        notificationTitle.textContent = 'Éxito';
    } else if (type === 'error') {
        notification.classList.remove('bg-success', 'bg-info');
        notification.classList.add('bg-danger', 'text-white');
        notificationTitle.textContent = 'Error';
    } else if (type === 'info') {
        notification.classList.remove('bg-success', 'bg-danger');
        notification.classList.add('bg-info', 'text-white');
        notificationTitle.textContent = 'Información';
    }
    
    // Establecer mensaje
    notificationMessage.textContent = message;
    
    // Mostrar notificación
    const toast = new bootstrap.Toast(notification);
    toast.show();
}

/**
 * Activa o desactiva el estado de carga en un formulario
 * @param {boolean} isLoading - Si está cargando o no
 * @param {HTMLElement} form - Formulario a modificar
 */
function toggleLoading(isLoading, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Añadiendo...';
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-plus-circle"></i> Añadir Video';
    }
}