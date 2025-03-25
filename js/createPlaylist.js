document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const createPlaylistForm = document.getElementById('createPlaylistForm');
    const playlistNameInput = document.getElementById('playlistName');
    const profilesContainer = document.getElementById('profilesContainer');
    const profileCheckboxes = document.getElementById('profileCheckboxes');
    const noProfilesMessage = document.getElementById('noProfilesMessage');
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Referencias para el nombre del usuario en la navbar
    const userDisplayName = document.getElementById('userDisplayName');
    
    // Variables para almacenar datos
    let profiles = [];
    
    // Inicialización
    init();
    
    /**
     * Inicializa la página
     */
    function init() {
        // Mostrar el nombre de usuario en la navbar
        displayUserName();
        
        // Cargar perfiles disponibles
        loadProfiles();
        
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
        createPlaylistForm.addEventListener('submit', handleFormSubmit);
        
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
     * Carga los perfiles infantiles disponibles para asignar a la playlist
     */
    async function loadProfiles() {
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
                renderProfiles(profiles);
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
     */
    function renderProfiles(profiles) {
        profileCheckboxes.innerHTML = '';
        
        profiles.forEach(profile => {
            const profileItem = document.createElement('div');
            profileItem.className = 'profile-item d-flex align-items-center';
            
            profileItem.innerHTML = `
                <div class="form-check profile-checkbox">
                    <input class="form-check-input" type="checkbox" id="profile-${profile._id}" value="${profile._id}">
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
        const playlistName = playlistNameInput.value.trim();
        
        // Obtener los IDs de los perfiles seleccionados
        const selectedProfiles = [];
        document.querySelectorAll('#profileCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedProfiles.push(checkbox.value);
        });
        
        try {
            // Crear la playlist
            const playlistData = await createPlaylist(playlistName, selectedProfiles);
            
            if (playlistData && playlistData._id) {
                showNotification('Éxito', 'Playlist creada correctamente', 'success');
                
                // Redireccionar al dashboard después de 1.5 segundos
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'No se pudo crear la playlist', 'error');
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
     * Crea una playlist en el servidor
     * @param {string} name - Nombre de la playlist
     * @param {Array} associatedProfiles - IDs de los perfiles asociados
     * @returns {Promise<Object>} - Datos de la playlist creada
     */
    async function createPlaylist(name, associatedProfiles) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No se ha iniciado sesión');
        }
        
        const response = await fetch('http://localhost:3000/api/admin/playlists', {
            method: 'POST',
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
            throw new Error(errorData.error || 'Error al crear la playlist');
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