/**
 * editPlaylist.js - Maneja la edición de playlists
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let profiles = [];
let videos = [];
let playlistData = null;
let currentVideoToDeleteId = null;

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
        
        // Cargar perfiles disponibles
        loadProfiles();
        
        // Cargar videos de la playlist
        loadVideos(playlistId);
        
        // Actualizar botón de añadir video
        const addVideoBtn = document.getElementById('addVideoBtn');
        if (addVideoBtn) {
            addVideoBtn.href = `addVideo.html?playlistId=${playlistId}`;
        }
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
 * Carga los datos de la playlist a editar
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
        
        // Mostrar el formulario y ocultar el indicador de carga
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('editPlaylistForm').style.display = 'block';
        
        // Llenar el formulario con los datos de la playlist
        fillPlaylistForm(playlistData);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar datos de la playlist. Intenta recargar la página.');
    }
}

/**
 * Llena el formulario con los datos de la playlist
 * @param {Object} playlist - Datos de la playlist
 */
function fillPlaylistForm(playlist) {
    document.getElementById('playlistId').value = playlist._id;
    document.getElementById('playlistName').value = playlist.name || '';
}

/**
 * Carga los perfiles infantiles disponibles
 */
async function loadProfiles() {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/restricted_users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar perfiles');
        }
        
        profiles = await response.json();
        
        // Una vez cargados los perfiles y la playlist, renderizar los perfiles
        if (playlistData) {
            renderProfiles(profiles, playlistData.associatedProfiles || []);
        } else {
            // Si aún no se ha cargado la playlist, esperar un momento y volver a intentar
            setTimeout(() => {
                if (playlistData) {
                    renderProfiles(profiles, playlistData.associatedProfiles || []);
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar perfiles. Intenta recargar la página.');
    }
}

/**
 * Renderiza los perfiles disponibles en la interfaz
 * @param {Array} profiles - Lista de perfiles
 * @param {Array} associatedProfileIds - IDs de los perfiles asociados a la playlist
 */
function renderProfiles(profiles, associatedProfileIds) {
    const profilesContainer = document.getElementById('profileCheckboxes');
    const noProfilesMessage = document.getElementById('noProfilesMessage');
    
    if (profiles.length === 0) {
        noProfilesMessage.style.display = 'block';
        return;
    }
    
    noProfilesMessage.style.display = 'none';
    profilesContainer.innerHTML = '';
    
    profiles.forEach(profile => {
        const profileItem = document.createElement('div');
        profileItem.className = 'profile-item';
        
        // Verificar si este perfil está asociado a la playlist
        const isAssociated = associatedProfileIds.includes(profile._id);
        
        profileItem.innerHTML = `
            <div class="form-check profile-checkbox">
                <input class="form-check-input" type="checkbox" value="${profile._id}" 
                       id="profile${profile._id}" ${isAssociated ? 'checked' : ''}>
                <div class="profile-avatar">
                    <img src="${profile.avatar || 'https://loodibee.com/wp-content/uploads/Netflix-avatar-2.png'}" alt="${profile.full_name}">
                </div>
                <label class="form-check-label" for="profile${profile._id}">
                    ${profile.full_name}
                </label>
            </div>
        `;
        
        profilesContainer.appendChild(profileItem);
    });
}

/**
 * Carga los videos de la playlist
 * @param {string} playlistId - ID de la playlist
 */
async function loadVideos(playlistId) {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/videos?playlistId=${playlistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar videos');
        }
        
        videos = await response.json();
        renderVideos(videos);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar videos. Intenta recargar la página.');
    }
}

/**
 * Renderiza los videos de la playlist en la interfaz
 * @param {Array} videos - Lista de videos
 */
function renderVideos(videos) {
    const videosContainer = document.getElementById('videosList');
    const noVideosMessage = document.getElementById('noVideosMessage');
    
    if (videos.length === 0) {
        noVideosMessage.style.display = 'block';
        return;
    }
    
    noVideosMessage.style.display = 'none';
    videosContainer.innerHTML = '';
    
    videos.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item d-flex justify-content-between align-items-center';
        
        // Obtener ID del video de YouTube para la miniatura
        const videoId = getYouTubeVideoId(video.youtubeUrl);
        const thumbnailUrl = videoId ? 
            `https://img.youtube.com/vi/${videoId}/default.jpg` : 
            'https://via.placeholder.com/120x90.png?text=Video';
        
        videoItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${thumbnailUrl}" alt="${video.name}" 
                     style="width: 120px; height: 70px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
                <div>
                    <h6 class="mb-0">${video.name}</h6>
                    <small class="text-muted">${truncateText(video.description || '', 50)}</small>
                </div>
            </div>
            <div class="video-actions">
                <a href="editVideo.html?id=${video._id}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-pencil"></i>
                </a>
                <button class="btn btn-sm btn-outline-danger delete-video-btn" data-video-id="${video._id}" data-video-name="${video.name}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        videosContainer.appendChild(videoItem);
    });
    
    // Añadir eventos a los botones de eliminar video
    attachDeleteVideoEvents();
}

/**
 * Añade eventos a los botones de eliminar video
 */
function attachDeleteVideoEvents() {
    const deleteButtons = document.querySelectorAll('.delete-video-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video-id');
            const videoName = this.getAttribute('data-video-name');
            
            // Guardar ID del video a eliminar
            currentVideoToDeleteId = videoId;
            
            // Mostrar nombre del video en el modal
            document.getElementById('videoToDeleteName').textContent = videoName;
            
            // Mostrar modal de confirmación
            const deleteVideoModal = new bootstrap.Modal(document.getElementById('deleteVideoModal'));
            deleteVideoModal.show();
        });
    });
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
 * Trunca un texto si supera cierta longitud
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
    
    // Evento para el formulario de edición de playlist
    const editPlaylistForm = document.getElementById('editPlaylistForm');
    if (editPlaylistForm) {
        editPlaylistForm.addEventListener('submit', handlePlaylistSubmit);
    }
    
    // Evento para el botón de eliminar playlist
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger me-auto';
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Eliminar Playlist';
    deleteBtn.addEventListener('click', showDeleteConfirmation);
    
    // Añadir botón de eliminar al formulario
    const formActions = editPlaylistForm.querySelector('.d-grid, .d-md-flex');
    formActions.prepend(deleteBtn);
    
    // Evento para confirmar eliminación de playlist
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeletePlaylist);
    }
    
    // Evento para confirmar eliminación de video
    const confirmDeleteVideoBtn = document.getElementById('confirmDeleteVideoBtn');
    if (confirmDeleteVideoBtn) {
        confirmDeleteVideoBtn.addEventListener('click', handleDeleteVideo);
    }
}

/**
 * Muestra el modal de confirmación para eliminar playlist
 */
function showDeleteConfirmation() {
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    modal.show();
}

/**
 * Maneja la eliminación de la playlist
 */
async function handleDeletePlaylist() {
    const playlistId = document.getElementById('playlistId').value;
    
    if (!playlistId) return;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No hay sesión activa.');
        }
        
        const response = await fetch(`${API_URL}/admin/playlists?id=${playlistId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al eliminar la playlist.');
        }
        
        // Ocultar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal'));
        modal.hide();
        
        // Mostrar notificación de éxito
        showNotification('success', 'Playlist eliminada correctamente.');
        
        // Redireccionar al dashboard después de 2 segundos
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al eliminar la playlist.');
    }
}

/**
 * Maneja la eliminación de un video
 */
async function handleDeleteVideo() {
    if (!currentVideoToDeleteId) return;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No hay sesión activa.');
        }
        
        const response = await fetch(`${API_URL}/admin/videos?id=${currentVideoToDeleteId}`, {
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
        
        // Recargar la lista de videos
        const playlistId = document.getElementById('playlistId').value;
        loadVideos(playlistId);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al eliminar el video.');
    } finally {
        // Limpiar el ID actual
        currentVideoToDeleteId = null;
    }
}

/**
 * Maneja el envío del formulario de edición de playlist
 * @param {Event} e - Evento de submit
 */
async function handlePlaylistSubmit(e) {
    e.preventDefault();
    
    // Obtener datos del formulario
    const playlistId = document.getElementById('playlistId').value;
    const playlistName = document.getElementById('playlistName').value;
    
    // Validar datos
    if (!playlistName) {
        showNotification('error', 'Por favor, introduce un nombre para la playlist.');
        return;
    }
    
    // Obtener perfiles seleccionados
    const selectedProfiles = [];
    document.querySelectorAll('#profileCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
        selectedProfiles.push(checkbox.value);
    });
    
    // Preparar datos para la API
    const updatedPlaylistData = {
        name: playlistName,
        associatedProfiles: selectedProfiles
    };
    
    // Mostrar indicador de carga
    toggleLoading(true, e.target);
    
    try {
        // Actualizar playlist
        await updatePlaylist(playlistId, updatedPlaylistData);
        
        // Mostrar notificación de éxito
        showNotification('success', 'Playlist actualizada correctamente.');
        
        // Recargar los datos de la playlist
        loadPlaylistData(playlistId);
        
        // Desactivar indicador de carga
        toggleLoading(false, e.target);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al actualizar la playlist.');
        toggleLoading(false, e.target);
    }
}

/**
 * Actualiza los datos de una playlist
 * @param {string} playlistId - ID de la playlist
 * @param {Object} playlistData - Nuevos datos de la playlist
 * @returns {Promise<Object>} - Playlist actualizada
 */
async function updatePlaylist(playlistId, playlistData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    
    const response = await fetch(`${API_URL}/admin/playlists?id=${playlistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(playlistData)
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar la playlist.');
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