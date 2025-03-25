/**
 * editPlaylist.js
 * Script para la edición de playlists en KidsTube
 */

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const editPlaylistForm = document.getElementById('editPlaylistForm');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const playlistNameInput = document.getElementById('playlistName');
    const playlistIdInput = document.getElementById('playlistId');
    const profilesContainer = document.getElementById('profilesContainer');
    const profileCheckboxes = document.getElementById('profileCheckboxes');
    const noProfilesMessage = document.getElementById('noProfilesMessage');
    const videosContainer = document.getElementById('videosContainer');
    const videosList = document.getElementById('videosList');
    const noVideosMessage = document.getElementById('noVideosMessage');
    const addVideoBtn = document.getElementById('addVideoBtn');
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Modales
    const deleteConfirmationModal = document.getElementById('deleteConfirmationModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteVideoModal = document.getElementById('deleteVideoModal');
    const videoToDeleteName = document.getElementById('videoToDeleteName');
    const confirmDeleteVideoBtn = document.getElementById('confirmDeleteVideoBtn');
    
    // Referencias para el nombre del usuario en la navbar
    const userDisplayName = document.getElementById('userDisplayName');
    
    // Variables para almacenar datos
    let profiles = [];
    let videos = [];
    let playlistData = null;
    let currentVideoToDelete = null;
    
    // Inicialización
    init();
    
    /**
     * Inicializa la página
     */
    function init() {
        // Mostrar el nombre de usuario en la navbar
        displayUserName();
        
        // Obtener el ID de la playlist de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('id');
        
        if (!playlistId) {
            showNotification('Error', 'No se especificó una playlist', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }
        
        // Establecer el ID de la playlist en el formulario
        playlistIdInput.value = playlistId;
        
        // Actualizar botón de añadir video
        addVideoBtn.href = `addVideo.html?playlistId=${playlistId}`;
        
        // Cargar datos de la playlist, perfiles y videos
        loadPlaylistData(playlistId);
        
        // Configurar event listeners
        setupEventListeners();
    }
    
    /**
     * Muestra el nombre del usuario en la navbar
     */
    function displayUserName() {
        const userName = localStorage.getItem('userName');
        if (userName) {
            userDisplayName.textContent = userName;
        }
    }
    
    /**
     * Configura los event listeners
     */
    function setupEventListeners() {
        // Envío del formulario
        editPlaylistForm.addEventListener('submit', handleFormSubmit);
        
        // Configurar botón de eliminar playlist
        const deletePlaylistBtn = document.createElement('button');
        deletePlaylistBtn.type = 'button';
        deletePlaylistBtn.className = 'btn btn-danger';
        deletePlaylistBtn.innerHTML = '<i class="bi bi-trash"></i> Eliminar Playlist';
        deletePlaylistBtn.addEventListener('click', function() {
            // Mostrar modal de confirmación
            const modal = new bootstrap.Modal(deleteConfirmationModal);
            modal.show();
        });
        
        // Añadir botón de eliminar al formulario
        const actionButtons = document.querySelector('.d-grid.gap-2.d-md-flex.justify-content-md-end');
        if (actionButtons) {
            actionButtons.prepend(deletePlaylistBtn);
        }
        
        // Configurar botón de confirmar eliminación de playlist
        confirmDeleteBtn.addEventListener('click', handleDeletePlaylist);
        
        // Configurar botón de confirmar eliminación de video
        confirmDeleteVideoBtn.addEventListener('click', handleDeleteVideo);
        
        // Event listener para el botón de logout
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }
        
        // Event listener para el botón de editar perfil de usuario
        const editProfileButton = document.querySelector('.editProfileButton');
        if (editProfileButton) {
            editProfileButton.addEventListener('click', function() {
                window.location.href = 'profile.html';
            });
        }
    }
    
    /**
     * Carga los datos de la playlist
     * @param {string} playlistId - ID de la playlist a editar
     */
    async function loadPlaylistData(playlistId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Error', 'No se ha iniciado sesión', 'error');
                return;
            }
            
            // Obtener datos de la playlist
            const playlistResponse = await fetch(`http://localhost:3000/api/admin/playlists?id=${playlistId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!playlistResponse.ok) {
                throw new Error('Error al cargar los datos de la playlist');
            }
            
            playlistData = await playlistResponse.json();
            
            // Mostrar datos de la playlist
            displayPlaylistData(playlistData);
            
            // Cargar perfiles disponibles
            await loadProfiles(playlistData.associatedProfiles || []);
            
            // Cargar videos de la playlist
            await loadVideos(playlistId);
            
            // Mostrar el formulario y ocultar el indicador de carga
            loadingIndicator.style.display = 'none';
            editPlaylistForm.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudieron cargar los datos de la playlist', 'error');
            
            // Ocultar indicador de carga y mostrar mensaje de error
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * Muestra los datos de la playlist en el formulario
     * @param {Object} playlist - Datos de la playlist
     */
    function displayPlaylistData(playlist) {
        playlistNameInput.value = playlist.name;
    }
    
    /**
     * Carga los perfiles disponibles y marca los asignados a la playlist
     * @param {Array} assignedProfiles - IDs de perfiles asignados a la playlist
     */
    async function loadProfiles(assignedProfiles) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Error', 'No se ha iniciado sesión', 'error');
                return;
            }
            
            const response = await fetch('http://localhost:3000/api/admin/restricted_users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar los perfiles');
            }
            
            profiles = await response.json();
            
            // Mostrar los perfiles en la interfaz
            if (profiles.length > 0) {
                noProfilesMessage.style.display = 'none';
                renderProfiles(profiles, assignedProfiles);
            } else {
                noProfilesMessage.style.display = 'block';
                profileCheckboxes.innerHTML = '';
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudieron cargar los perfiles infantiles', 'error');
        }
    }
    
    /**
     * Renderiza los perfiles en el formulario
     * @param {Array} profiles - Lista de perfiles infantiles
     * @param {Array} selectedProfiles - IDs de perfiles seleccionados
     */
    function renderProfiles(profiles, selectedProfiles) {
        profileCheckboxes.innerHTML = '';
        
        profiles.forEach(profile => {
            const profileItem = document.createElement('div');
            profileItem.className = 'profile-item d-flex align-items-center';
            
            const isChecked = selectedProfiles.includes(profile._id) ? 'checked' : '';
            
            profileItem.innerHTML = `
                <div class="form-check profile-checkbox">
                    <input class="form-check-input" type="checkbox" id="profile-${profile._id}" value="${profile._id}" ${isChecked}>
                    <div class="profile-avatar">
                        <img src="${profile.avatar}" alt="${profile.full_name}">
                    </div>
                    <label class="form-check-label" for="profile-${profile._id}">
                        ${profile.full_name}
                    </label>
                </div>
            `;
            
            profileCheckboxes.appendChild(profileItem);
        });
    }
    
    /**
     * Carga los videos de la playlist
     * @param {string} playlistId - ID de la playlist
     */
    async function loadVideos(playlistId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Error', 'No se ha iniciado sesión', 'error');
                return;
            }
            
            const response = await fetch(`http://localhost:3000/api/admin/videos?playlistId=${playlistId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar los videos');
            }
            
            videos = await response.json();
            
            // Mostrar los videos en la interfaz
            if (videos.length > 0) {
                noVideosMessage.style.display = 'none';
                renderVideos(videos);
            } else {
                noVideosMessage.style.display = 'block';
                videosList.innerHTML = '';
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudieron cargar los videos', 'error');
        }
    }
    
    /**
     * Renderiza los videos en el formulario
     * @param {Array} videos - Lista de videos
     */
    function renderVideos(videos) {
        videosList.innerHTML = '';
        
        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'border-bottom p-3';
            
            // Extraer el ID de YouTube para la miniatura
            const youtubeId = extractYouTubeId(video.youtubeUrl);
            const thumbnailUrl = youtubeId ? 
                `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : 
                'path/to/default-thumbnail.jpg';
            
            videoItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3" style="width: 100px; height: 60px; overflow: hidden; border-radius: 4px;">
                        <img src="${thumbnailUrl}" alt="${video.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-0">${video.name}</h6>
                        <small class="text-muted">${video.description || 'Sin descripción'}</small>
                    </div>
                    <div>
                        <a href="editVideo.html?id=${video._id}" class="btn btn-sm btn-outline-primary me-2">
                            <i class="bi bi-pencil"></i> Editar
                        </a>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-video-btn" data-video-id="${video._id}" data-video-name="${video.name}">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
            
            videosList.appendChild(videoItem);
            
            // Añadir evento para el botón de eliminar video
            const deleteVideoBtn = videoItem.querySelector('.delete-video-btn');
            if (deleteVideoBtn) {
                deleteVideoBtn.addEventListener('click', function() {
                    const videoId = this.getAttribute('data-video-id');
                    const videoName = this.getAttribute('data-video-name');
                    
                    // Guardar referencia al video a eliminar
                    currentVideoToDelete = videoId;
                    
                    // Mostrar nombre del video en el modal
                    videoToDeleteName.textContent = videoName;
                    
                    // Mostrar modal de confirmación
                    const modal = new bootstrap.Modal(deleteVideoModal);
                    modal.show();
                });
            }
        });
    }
    
    /**
     * Extrae el ID de video de una URL de YouTube
     * @param {string} url - URL del video
     * @returns {string|null} - ID del video o null si no es válida
     */
    function extractYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        
        return (match && match[2].length === 11) ? match[2] : null;
    }
    
    /**
     * Maneja el envío del formulario
     * @param {Event} e - Evento de submit
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validar el formulario
        if (!validateForm()) {
            return;
        }
        
        // Obtener los valores del formulario
        const playlistId = playlistIdInput.value;
        const playlistName = playlistNameInput.value.trim();
        
        // Obtener los IDs de los perfiles seleccionados
        const selectedProfiles = [];
        document.querySelectorAll('#profileCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedProfiles.push(checkbox.value);
        });
        
        try {
            // Actualizar la playlist
            await updatePlaylist(playlistId, playlistName, selectedProfiles);
            
            showNotification('Éxito', 'Playlist actualizada correctamente', 'success');
            
            // Redireccionar al dashboard después de 1.5 segundos
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo actualizar la playlist', 'error');
        }
    }
    
    /**
     * Valida el formulario antes de enviarlo
     * @returns {boolean} - True si el formulario es válido, false en caso contrario
     */
    function validateForm() {
        // Validar nombre de la playlist
        if (playlistNameInput.value.trim() === '') {
            showNotification('Error', 'El nombre de la playlist es obligatorio', 'error');
            playlistNameInput.focus();
            return false;
        }
        
        return true;
    }
    
    /**
     * Actualiza una playlist en el servidor
     * @param {string} playlistId - ID de la playlist
     * @param {string} name - Nombre de la playlist
     * @param {Array} associatedProfiles - IDs de los perfiles asociados
     */
    async function updatePlaylist(playlistId, name, associatedProfiles) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No se ha iniciado sesión');
        }
        
        const response = await fetch(`http://localhost:3000/api/admin/playlists?id=${playlistId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                associatedProfiles: associatedProfiles
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar la playlist');
        }
        
        return await response.json();
    }
    
    /**
     * Maneja la eliminación de un video
     */
    async function handleDeleteVideo() {
        try {
            if (!currentVideoToDelete) {
                throw new Error('No se especificó un video para eliminar');
            }
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No se ha iniciado sesión');
            }
            
            const response = await fetch(`http://localhost:3000/api/admin/videos?id=${currentVideoToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('No se pudo eliminar el video');
            }
            
            // Cerrar el modal
            const modalEl = document.getElementById('deleteVideoModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            showNotification('Éxito', 'Video eliminado correctamente', 'success');
            
            // Recargar los videos de la playlist
            await loadVideos(playlistIdInput.value);
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo eliminar el video', 'error');
            
            // Cerrar el modal
            const modalEl = document.getElementById('deleteVideoModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        } finally {
            // Limpiar referencia al video a eliminar
            currentVideoToDelete = null;
        }
    }
    
    /**
     * Maneja la eliminación de una playlist
     */
    async function handleDeletePlaylist() {
        try {
            const playlistId = playlistIdInput.value;
            const token = localStorage.getItem('token');
            
            if (!token || !playlistId) {
                throw new Error('No se puede eliminar la playlist');
            }
            
            const response = await fetch(`http://localhost:3000/api/admin/playlists?id=${playlistId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('No se pudo eliminar la playlist');
            }
            
            // Cerrar el modal
            const modalEl = document.getElementById('deleteConfirmationModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            showNotification('Éxito', 'Playlist eliminada correctamente', 'success');
            
            // Redireccionar al dashboard después de 1.5 segundos
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo eliminar la playlist', 'error');
            
            // Cerrar el modal
            const modalEl = document.getElementById('deleteConfirmationModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        }
    }
    
    /**
     * Muestra una notificación al usuario
     * @param {string} title - Título de la notificación
     * @param {string} message - Mensaje de la notificación
     * @param {string} type - Tipo de notificación (success, error, info)
     */
    function showNotification(title, message, type = 'info') {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        
        // Aplicar clases según el tipo de notificación
        notification.classList.remove('bg-success', 'bg-danger', 'bg-info');
        notification.classList.add(type === 'success' ? 'bg-success' : 
                                  type === 'error' ? 'bg-danger' : 
                                  'bg-info');
        
        // Mostrar la notificación
        const toast = new bootstrap.Toast(notification);
        toast.show();
    }
    
    /**
     * Maneja el cierre de sesión
     */
    async function handleLogout() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            
            const response = await fetch('http://localhost:3000/api/session', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                // Limpiar localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('adminId');
                localStorage.removeItem('userName');
                
                // Redireccionar a la página de login
                window.location.href = 'login.html';
            } else {
                showNotification('Error', 'No se pudo cerrar sesión', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo cerrar sesión', 'error');
        }
    }
});