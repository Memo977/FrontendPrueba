/**
 * editVideo.js - Maneja la edición de videos
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let videoData = null;
let playlistData = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    checkAuth();
    
    // Inicializar eventos
    initEvents();
    
    // Obtener ID del video de la URL
    const videoId = getVideoIdFromUrl();
    
    if (videoId) {
        // Cargar datos del video
        loadVideoData(videoId);
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
        const response = await fetch(`${API_URL}/admin/videos`, {
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
 * Obtiene el ID del video de la URL
 * @returns {string|null} - ID del video o null si no existe
 */
function getVideoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
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
 * Carga los datos del video a editar
 * @param {string} videoId - ID del video
 */
async function loadVideoData(videoId) {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/videos?id=${videoId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar datos del video');
        }
        
        videoData = await response.json();
        
        // Cargar datos de la playlist
        await loadPlaylistData(videoData.playlistId);
        
        // Mostrar el formulario y ocultar el indicador de carga
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('editVideoForm').style.display = 'block';
        
        // Llenar el formulario con los datos del video
        fillVideoForm(videoData);
        
        // Mostrar vista previa del video
        updateVideoPreview(videoData.youtubeUrl);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar datos del video. Intenta recargar la página.');
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
        // No mostrar notificación de error para no interrumpir el flujo principal
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
 * Llena el formulario con los datos del video
 * @param {Object} video - Datos del video
 */
function fillVideoForm(video) {
    document.getElementById('videoId').value = video._id;
    document.getElementById('playlistId').value = video.playlistId;
    document.getElementById('videoName').value = video.name || '';
    document.getElementById('youtubeUrl').value = video.youtubeUrl || '';
    document.getElementById('videoDescription').value = video.description || '';
}

/**
 * Actualiza la vista previa del video
 * @param {string} youtubeUrl - URL de YouTube del video
 */
function updateVideoPreview(youtubeUrl) {
    // Obtener ID del video
    const videoId = getYouTubeVideoId(youtubeUrl);
    
    if (!videoId) {
        document.getElementById('videoPreview').innerHTML = `
            <div class="text-center py-5 bg-light">
                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                <p class="mt-3">No se pudo cargar la vista previa. URL de YouTube no válida.</p>
            </div>
        `;
        return;
    }
    
    console.log("Video ID extraído:", videoId);
    
    // Crear iframe para la vista previa
    const videoPreview = document.getElementById('videoPreview');
    videoPreview.innerHTML = '';  // Limpiar contenido previo
    
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.title = "YouTube video player";
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '100%');
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    
    videoPreview.appendChild(iframe);
    
    // Informar al usuario sobre carga exitosa
    showNotification('info', 'Vista previa actualizada');
}

/**
 * Obtiene el ID de un video de YouTube a partir de su URL
 * @param {string} url - URL del video de YouTube
 * @returns {string|null} - ID del video o null si no se pudo extraer
 */
function getYouTubeVideoId(url) {
    if (!url) return null;
    
    // Intentar varios patrones para diferentes formatos de URL de YouTube
    
    // Formato estándar: youtube.com/watch?v=ID
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/e\/|youtube\/watch\?v=|youtube\.com\/watch\?feature=player_embedded&v=)([^#\&\?]*)/);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }
    
    // Formato alternativo: youtube.com/v/ID
    match = url.match(/youtube\.com\/v\/([^#\&\?]*)/);
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
    
    // Si todos los patrones fallan, intentar el patrón general como último recurso
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    match = url.match(regExp);
    
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
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
    
    // Evento para el botón de editar perfil (admin)
    const editProfileButtons = document.querySelectorAll('.editProfileButton');
    editProfileButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    });
    
    // Evento para el formulario de edición de video
    const editVideoForm = document.getElementById('editVideoForm');
    if (editVideoForm) {
        editVideoForm.addEventListener('submit', handleVideoSubmit);
    }
    
    // Evento para el botón de vista previa
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const youtubeUrl = document.getElementById('youtubeUrl').value;
            updateVideoPreview(youtubeUrl);
        });
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
    
    // Evento para el botón de eliminar video
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger me-auto';
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Eliminar Video';
    deleteBtn.addEventListener('click', showDeleteConfirmation);
    
    // Añadir botón de eliminar al formulario
    const formActions = editVideoForm.querySelector('.d-grid, .d-md-flex');
    formActions.prepend(deleteBtn);
    
    // Evento para confirmar eliminación
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteVideo);
    }
}

/**
 * Muestra el modal de confirmación para eliminar video
 */
function showDeleteConfirmation() {
    // Mostrar nombre del video en el modal
    document.getElementById('videoToDeleteName').textContent = videoData.name || 'Video';
    
    // Mostrar modal de confirmación
    const deleteVideoModal = new bootstrap.Modal(document.getElementById('deleteVideoModal'));
    deleteVideoModal.show();
}

/**
 * Maneja la eliminación del video
 */
async function handleDeleteVideo() {
    const videoId = document.getElementById('videoId').value;
    
    if (!videoId) return;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No hay sesión activa.');
        }
        
        const response = await fetch(`${API_URL}/admin/videos?id=${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al eliminar el video.');
        }
        
        // Ocultar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteVideoModal'));
        modal.hide();
        
        // Mostrar notificación de éxito
        showNotification('success', 'Video eliminado correctamente.');
        
        // Redireccionar a la página de edición de playlist después de 2 segundos
        setTimeout(() => {
            const playlistId = document.getElementById('playlistId').value;
            window.location.href = `editPlaylist.html?id=${playlistId}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al eliminar el video.');
    }
}

/**
 * Maneja el envío del formulario de edición de video
 * @param {Event} e - Evento de submit
 */
async function handleVideoSubmit(e) {
    e.preventDefault();
    
    // Obtener datos del formulario
    const videoId = document.getElementById('videoId').value;
    const videoName = document.getElementById('videoName').value;
    const youtubeUrl = document.getElementById('youtubeUrl').value;
    const videoDescription = document.getElementById('videoDescription').value;
    
    // Validar datos
    if (!videoName || !youtubeUrl) {
        showNotification('error', 'Por favor, completa todos los campos obligatorios.');
        return;
    }
    
    // Validar URL de YouTube
    const videoYoutubeId = getYouTubeVideoId(youtubeUrl);
    if (!videoYoutubeId) {
        showNotification('error', 'Por favor, introduce una URL de YouTube válida.');
        return;
    }
    
    // Preparar datos para la API
    const updatedVideoData = {
        name: videoName,
        youtubeUrl: youtubeUrl,
        description: videoDescription
    };
    
    // Mostrar indicador de carga
    toggleLoading(true, e.target);
    
    try {
        // Actualizar video
        await updateVideo(videoId, updatedVideoData);
        
        // Mostrar notificación de éxito
        showNotification('success', 'Video actualizado correctamente.');
        
        // Actualizar datos del video y vista previa
        videoData = { ...videoData, ...updatedVideoData };
        updateVideoPreview(youtubeUrl);
        
        // Desactivar indicador de carga
        toggleLoading(false, e.target);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al actualizar el video.');
        toggleLoading(false, e.target);
    }
}

/**
 * Actualiza los datos de un video
 * @param {string} videoId - ID del video
 * @param {Object} videoData - Nuevos datos del video
 * @returns {Promise<Object>} - Video actualizado
 */
async function updateVideo(videoId, videoData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    
    const response = await fetch(`${API_URL}/admin/videos?id=${videoId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(videoData)
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el video.');
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
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-check-circle"></i> Guardar Cambios';
    }
}