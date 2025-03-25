/**
 * addVideo.js
 * Script para añadir videos a playlists en KidsTube
 */

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const addVideoForm = document.getElementById('addVideoForm');
    const videoNameInput = document.getElementById('videoName');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const videoDescriptionInput = document.getElementById('videoDescription');
    const playlistIdInput = document.getElementById('playlistId');
    const playlistNameBadge = document.getElementById('playlistNameBadge');
    const videoPreviewContainer = document.getElementById('videoPreviewContainer');
    const videoPreview = document.getElementById('videoPreview');
    const previewBtn = document.getElementById('previewBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Referencias para el nombre del usuario en la navbar
    const userDisplayName = document.getElementById('userDisplayName');
    
    // Variables globales
    let currentPlaylistName = '';
    
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
        const playlistId = urlParams.get('playlistId');
        
        if (!playlistId) {
            showNotification('Error', 'No se especificó una playlist', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }
        
        // Establecer el ID de la playlist en el formulario
        playlistIdInput.value = playlistId;
        
        // Cargar información de la playlist
        loadPlaylistInfo(playlistId);
        
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
        // Vista previa del video
        previewBtn.addEventListener('click', handlePreview);
        
        // Cancelar y volver al dashboard o a la edición de playlist
        cancelBtn.addEventListener('click', function() {
            const urlParams = new URLSearchParams(window.location.search);
            const playlistId = urlParams.get('playlistId');
            
            if (playlistId) {
                window.location.href = `editPlaylist.html?id=${playlistId}`;
            } else {
                window.location.href = 'dashboard.html';
            }
        });
        
        // Envío del formulario
        addVideoForm.addEventListener('submit', handleFormSubmit);
        
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
        
        // Evento para actualizar la vista previa cuando cambia la URL
        youtubeUrlInput.addEventListener('input', function() {
            // Ocultar la vista previa cuando se está editando la URL
            videoPreviewContainer.style.display = 'none';
        });
    }
    
    /**
     * Carga la información de la playlist
     * @param {string} playlistId - ID de la playlist
     */
    async function loadPlaylistInfo(playlistId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Error', 'No se ha iniciado sesión', 'error');
                return;
            }
            
            const response = await fetch(`http://localhost:3000/api/admin/playlists?id=${playlistId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar la información de la playlist');
            }
            
            const playlistData = await response.json();
            currentPlaylistName = playlistData.name;
            
            // Mostrar el nombre de la playlist en la insignia
            playlistNameBadge.textContent = currentPlaylistName;
            
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo cargar la información de la playlist', 'error');
        }
    }
    
    /**
     * Maneja la vista previa del video
     */
    function handlePreview() {
        const youtubeUrl = youtubeUrlInput.value.trim();
        
        if (!youtubeUrl) {
            showNotification('Error', 'Ingresa una URL de YouTube', 'error');
            return;
        }
        
        // Obtener el ID del video de YouTube desde la URL
        const videoId = extractYouTubeId(youtubeUrl);
        
        if (!videoId) {
            showNotification('Error', 'URL de YouTube inválida', 'error');
            return;
        }
        
        // Construir iframe para la vista previa
        videoPreview.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${videoId}" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
        
        // Mostrar el contenedor de vista previa
        videoPreviewContainer.style.display = 'block';
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
        const videoName = videoNameInput.value.trim();
        const youtubeUrl = youtubeUrlInput.value.trim();
        const description = videoDescriptionInput.value.trim();
        const playlistId = playlistIdInput.value;
        
        try {
            // Crear el video
            const videoData = await addVideoToPlaylist(videoName, youtubeUrl, description, playlistId);
            
            if (videoData && videoData._id) {
                showNotification('Éxito', 'Video añadido correctamente', 'success');
                
                // Redireccionar a la página de edición de playlist después de 1.5 segundos
                setTimeout(() => {
                    window.location.href = `editPlaylist.html?id=${playlistId}`;
                }, 1500);
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo añadir el video', 'error');
        }
    }
    
    /**
     * Valida el formulario antes de enviarlo
     * @returns {boolean} - True si el formulario es válido, false en caso contrario
     */
    function validateForm() {
        // Validar nombre del video
        if (videoNameInput.value.trim() === '') {
            showNotification('Error', 'El nombre del video es obligatorio', 'error');
            videoNameInput.focus();
            return false;
        }
        
        // Validar URL de YouTube
        const youtubeUrl = youtubeUrlInput.value.trim();
        if (!youtubeUrl) {
            showNotification('Error', 'La URL de YouTube es obligatoria', 'error');
            youtubeUrlInput.focus();
            return false;
        }
        
        const videoId = extractYouTubeId(youtubeUrl);
        if (!videoId) {
            showNotification('Error', 'URL de YouTube inválida', 'error');
            youtubeUrlInput.focus();
            return false;
        }
        
        return true;
    }
    
    /**
     * Añade un video a una playlist en el servidor
     * @param {string} name - Nombre del video
     * @param {string} youtubeUrl - URL de YouTube
     * @param {string} description - Descripción del video
     * @param {string} playlistId - ID de la playlist
     * @returns {Promise<Object>} - Datos del video creado
     */
    async function addVideoToPlaylist(name, youtubeUrl, description, playlistId) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No se ha iniciado sesión');
        }
        
        const response = await fetch('http://localhost:3000/api/admin/videos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                youtubeUrl: youtubeUrl,
                description: description,
                playlistId: playlistId
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al añadir el video');
        }
        
        return await response.json();
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