/**
 * createProfile.js
 * Script para la creación de perfiles infantiles en KidsTube
 */

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const createProfileForm = document.getElementById('createProfileForm');
    const fullNameInput = document.getElementById('fullName');
    const pinInput = document.getElementById('pin');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const selectedAvatar = document.getElementById('selectedAvatar');
    const playlistsContainer = document.getElementById('playlistsContainer');
    const playlistCheckboxes = document.getElementById('playlistCheckboxes');
    const noPlaylistsMessage = document.getElementById('noPlaylistsMessage');
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Referencias para el nombre del usuario en la navbar
    const userDisplayName = document.getElementById('userDisplayName');
    
    // Variables para almacenar datos
    let selectedAvatarUrl = selectedAvatar.src; // Avatar predeterminado
    let playlists = [];
    
    // Inicialización
    init();
    
    /**
     * Inicializa la página
     */
    function init() {
        // Mostrar el nombre de usuario en la navbar
        displayUserName();
        
        // Cargar playlists disponibles
        loadPlaylists();
        
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
        // Selección de avatar
        avatarOptions.forEach(option => {
            option.addEventListener('click', function() {
                const avatarUrl = this.getAttribute('data-avatar');
                selectedAvatarUrl = avatarUrl;
                selectedAvatar.src = avatarUrl;
                
                // Remover la clase 'selected' de todos los avatares
                avatarOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Añadir la clase 'selected' al avatar seleccionado
                this.classList.add('selected');
            });
        });
        
        // Validación de PIN (solo números y 6 dígitos)
        pinInput.addEventListener('input', function(e) {
            // Reemplazar cualquier carácter que no sea número
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Limitar a 6 dígitos
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
            }
        });
        
        // Envío del formulario
        createProfileForm.addEventListener('submit', handleFormSubmit);
        
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
     * Carga las playlists disponibles para asignar al perfil
     */
    async function loadPlaylists() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Error', 'No se ha iniciado sesión', 'error');
                return;
            }
            
            const response = await fetch('http://localhost:3000/api/admin/playlists', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar las playlists');
            }
            
            playlists = await response.json();
            
            // Mostrar las playlists en la interfaz
            if (playlists.length > 0) {
                noPlaylistsMessage.style.display = 'none';
                renderPlaylists(playlists);
            } else {
                noPlaylistsMessage.style.display = 'block';
                playlistCheckboxes.innerHTML = '';
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudieron cargar las playlists', 'error');
        }
    }
    
    /**
     * Renderiza las playlists en el formulario
     * @param {Array} playlists - Lista de playlists
     */
    function renderPlaylists(playlists) {
        playlistCheckboxes.innerHTML = '';
        
        playlists.forEach(playlist => {
            const playlistItem = document.createElement('div');
            playlistItem.className = 'playlist-item';
            
            playlistItem.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="playlist-${playlist._id}" value="${playlist._id}">
                    <label class="form-check-label" for="playlist-${playlist._id}">
                        <i class="bi bi-collection-play"></i> ${playlist.name}
                        <span class="badge bg-secondary rounded-pill ms-2">${playlist.videoCount || 0} videos</span>
                    </label>
                </div>
            `;
            
            playlistCheckboxes.appendChild(playlistItem);
        });
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
        const fullName = fullNameInput.value.trim();
        const pin = pinInput.value;
        const avatar = selectedAvatarUrl;
        
        // Obtener los IDs de las playlists seleccionadas
        const selectedPlaylists = [];
        document.querySelectorAll('#playlistCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedPlaylists.push(checkbox.value);
        });
        
        try {
            // Crear el perfil
            const profileData = await createProfile(fullName, pin, avatar);
            
            if (profileData && profileData._id) {
                // Si hay playlists seleccionadas, actualizar cada playlist
                if (selectedPlaylists.length > 0) {
                    await updatePlaylistsWithProfile(profileData._id, selectedPlaylists);
                }
                
                showNotification('Éxito', 'Perfil creado correctamente', 'success');
                
                // Redireccionar al dashboard después de 1.5 segundos
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo crear el perfil', 'error');
        }
    }
    
    /**
     * Valida el formulario antes de enviarlo
     * @returns {boolean} - True si el formulario es válido, false en caso contrario
     */
    function validateForm() {
        // Validar nombre completo
        if (fullNameInput.value.trim() === '') {
            showNotification('Error', 'El nombre completo es obligatorio', 'error');
            fullNameInput.focus();
            return false;
        }
        
        // Validar PIN
        if (pinInput.value.length !== 6) {
            showNotification('Error', 'El PIN debe tener 6 dígitos', 'error');
            pinInput.focus();
            return false;
        }
        
        return true;
    }
    
    /**
     * Crea un perfil infantil en el servidor
     * @param {string} fullName - Nombre completo del perfil
     * @param {string} pin - PIN de 6 dígitos
     * @param {string} avatar - URL del avatar seleccionado
     * @returns {Promise<Object>} - Datos del perfil creado
     */
    async function createProfile(fullName, pin, avatar) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No se ha iniciado sesión');
        }
        
        const response = await fetch('http://localhost:3000/api/admin/restricted_users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name: fullName,
                pin: pin,
                avatar: avatar
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear el perfil');
        }
        
        return await response.json();
    }
    
    /**
     * Actualiza las playlists asignando el nuevo perfil
     * @param {string} profileId - ID del perfil creado
     * @param {Array} playlistIds - IDs de las playlists seleccionadas
     */
    async function updatePlaylistsWithProfile(profileId, playlistIds) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No se ha iniciado sesión');
        }
        
        // Para cada playlist seleccionada
        for (const playlistId of playlistIds) {
            // Primero obtenemos los datos actuales de la playlist
            const getResponse = await fetch(`http://localhost:3000/api/admin/playlists?id=${playlistId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!getResponse.ok) {
                console.error(`No se pudo obtener la playlist ${playlistId}`);
                continue;
            }
            
            const playlist = await getResponse.json();
            
            // Añadir el perfil a la lista de perfiles asociados
            const associatedProfiles = Array.isArray(playlist.associatedProfiles) 
                ? [...playlist.associatedProfiles, profileId]
                : [profileId];
            
            // Actualizar la playlist con el nuevo perfil
            const updateResponse = await fetch(`http://localhost:3000/api/admin/playlists?id=${playlistId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: playlist.name,
                    associatedProfiles: associatedProfiles
                })
            });
            
            if (!updateResponse.ok) {
                console.error(`No se pudo actualizar la playlist ${playlistId}`);
            }
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