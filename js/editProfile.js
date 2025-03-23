/**
 * editProfile.js - Maneja la edición de perfiles infantiles
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let playlists = [];
let selectedAvatar = "";
let profileData = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    checkAuth();
    
    // Inicializar eventos
    initEvents();
    
    // Obtener ID del perfil de la URL
    const profileId = getProfileIdFromUrl();
    
    if (profileId) {
        // Cargar datos del perfil y playlists
        loadProfileData(profileId);
        loadPlaylists();
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
        const response = await fetch(`${API_URL}/admin/restricted_users`, {
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
 * Obtiene el ID del perfil de la URL
 * @returns {string|null} - ID del perfil o null si no existe
 */
function getProfileIdFromUrl() {
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
 * Carga los datos del perfil a editar
 * @param {string} profileId - ID del perfil
 */
async function loadProfileData(profileId) {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/restricted_users?id=${profileId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar datos del perfil');
        }
        
        profileData = await response.json();
        
        // Mostrar el formulario y ocultar el indicador de carga
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('editProfileForm').style.display = 'block';
        
        // Llenar el formulario con los datos del perfil
        fillProfileForm(profileData);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar datos del perfil. Intenta recargar la página.');
    }
}

/**
 * Llena el formulario con los datos del perfil
 * @param {Object} profile - Datos del perfil
 */
function fillProfileForm(profile) {
    document.getElementById('profileId').value = profile._id;
    document.getElementById('fullName').value = profile.full_name || '';
    document.getElementById('pin').value = profile.pin || '';
    
    // Establecer avatar seleccionado
    selectedAvatar = profile.avatar || "https://loodibee.com/wp-content/uploads/Netflix-avatar-2.png";
    document.getElementById('selectedAvatar').src = selectedAvatar;
    
    // Marcar el avatar seleccionado en la lista de opciones
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        if (option.getAttribute('data-avatar') === selectedAvatar) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

/**
 * Carga las playlists disponibles y marca las asociadas al perfil
 */
async function loadPlaylists() {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/playlists`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar playlists');
        }
        
        playlists = await response.json();
        
        // Una vez cargadas las playlists y el perfil, renderizar las playlists
        if (profileData) {
            renderPlaylists(playlists, profileData._id);
        } else {
            // Si aún no se ha cargado el perfil, esperar un momento y volver a intentar
            setTimeout(() => {
                if (profileData) {
                    renderPlaylists(playlists, profileData._id);
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar playlists. Intenta recargar la página.');
    }
}

/**
 * Renderiza las playlists disponibles en la interfaz
 * @param {Array} playlists - Lista de playlists
 * @param {string} profileId - ID del perfil para marcar playlists asociadas
 */
function renderPlaylists(playlists, profileId) {
    const playlistsContainer = document.getElementById('playlistCheckboxes');
    const noPlaylistsMessage = document.getElementById('noPlaylistsMessage');
    
    if (playlists.length === 0) {
        noPlaylistsMessage.style.display = 'block';
        return;
    }
    
    noPlaylistsMessage.style.display = 'none';
    playlistsContainer.innerHTML = '';
    
    playlists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        
        // Verificar si esta playlist está asociada al perfil
        const isAssociated = Array.isArray(playlist.associatedProfiles) && 
                            playlist.associatedProfiles.includes(profileId);
        
        playlistItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${playlist._id}" 
                       id="playlist${playlist._id}" ${isAssociated ? 'checked' : ''}>
                <label class="form-check-label" for="playlist${playlist._id}">
                    ${playlist.name} 
                    <span class="text-muted">(${playlist.videoCount || 0} videos)</span>
                </label>
            </div>
        `;
        
        playlistsContainer.appendChild(playlistItem);
    });
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
    
    // Evento para el botón de editar perfil (del usuario admin)
    const editProfileButtons = document.querySelectorAll('.editProfileButton');
    editProfileButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    });
    
    // Eventos para las opciones de avatar
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remover clase 'selected' de todas las opciones
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Añadir clase 'selected' a la opción clickeada
            this.classList.add('selected');
            
            // Actualizar avatar seleccionado
            selectedAvatar = this.getAttribute('data-avatar');
            document.getElementById('selectedAvatar').src = selectedAvatar;
        });
    });
    
    // Evento para el formulario de edición de perfil
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Evento para el botón de eliminar perfil
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger me-auto';
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Eliminar Perfil';
    deleteBtn.addEventListener('click', showDeleteConfirmation);
    
    // Añadir botón de eliminar al formulario
    const formActions = editProfileForm.querySelector('.d-grid, .d-md-flex');
    formActions.prepend(deleteBtn);
    
    // Evento para confirmar eliminación
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteProfile);
    }
}

/**
 * Muestra el modal de confirmación para eliminar perfil
 */
function showDeleteConfirmation() {
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    modal.show();
}

/**
 * Maneja la eliminación del perfil
 */
async function handleDeleteProfile() {
    const profileId = document.getElementById('profileId').value;
    
    if (!profileId) return;
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No hay sesión activa.');
        }
        
        const response = await fetch(`${API_URL}/admin/restricted_users?id=${profileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al eliminar el perfil.');
        }
        
        // Ocultar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal'));
        modal.hide();
        
        // Mostrar notificación de éxito
        showNotification('success', 'Perfil eliminado correctamente.');
        
        // Redireccionar al dashboard después de 2 segundos
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al eliminar el perfil.');
    }
}

/**
 * Maneja el envío del formulario de edición de perfil
 * @param {Event} e - Evento de submit
 */
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    // Obtener datos del formulario
    const profileId = document.getElementById('profileId').value;
    const fullName = document.getElementById('fullName').value;
    const pin = document.getElementById('pin').value;
    
    // Validar datos
    if (!fullName || !pin) {
        showNotification('error', 'Por favor, completa todos los campos obligatorios.');
        return;
    }
    
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
        showNotification('error', 'El PIN debe tener exactamente 6 dígitos numéricos.');
        return;
    }
    
    // Obtener playlists seleccionadas
    const selectedPlaylists = [];
    document.querySelectorAll('#playlistCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
        selectedPlaylists.push(checkbox.value);
    });
    
    // Preparar datos para la API
    const updatedProfileData = {
        full_name: fullName,
        pin: pin,
        avatar: selectedAvatar
    };
    
    // Mostrar indicador de carga
    toggleLoading(true, e.target);
    
    try {
        // Actualizar perfil
        await updateProfile(profileId, updatedProfileData);
        
        // Actualizar asociaciones de playlists
        await updatePlaylistAssociations(profileId, selectedPlaylists);
        
        // Mostrar notificación de éxito
        showNotification('success', 'Perfil actualizado correctamente.');
        
        // Redireccionar al dashboard después de 2 segundos
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al actualizar el perfil.');
        toggleLoading(false, e.target);
    }
}

/**
 * Actualiza los datos de un perfil infantil
 * @param {string} profileId - ID del perfil
 * @param {Object} profileData - Nuevos datos del perfil
 * @returns {Promise<Object>} - Perfil actualizado
 */
async function updateProfile(profileId, profileData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    
    const response = await fetch(`${API_URL}/admin/restricted_users?id=${profileId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el perfil.');
    }
    
    return await response.json();
}

/**
 * Actualiza las asociaciones de playlists para un perfil
 * @param {string} profileId - ID del perfil
 * @param {Array} selectedPlaylistIds - IDs de las playlists seleccionadas
 */
async function updatePlaylistAssociations(profileId, selectedPlaylistIds) {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    // Para cada playlist, actualizar su lista de perfiles asociados
    for (const playlist of playlists) {
        const isSelected = selectedPlaylistIds.includes(playlist._id);
        const isCurrentlyAssociated = Array.isArray(playlist.associatedProfiles) && 
                                     playlist.associatedProfiles.includes(profileId);
        
        // Solo actualizar si hay cambio en la asociación
        if (isSelected !== isCurrentlyAssociated) {
            let updatedAssociatedProfiles;
            
            if (isSelected) {
                // Añadir el perfil a la lista
                updatedAssociatedProfiles = Array.isArray(playlist.associatedProfiles) 
                    ? [...playlist.associatedProfiles, profileId]
                    : [profileId];
            } else {
                // Quitar el perfil de la lista
                updatedAssociatedProfiles = Array.isArray(playlist.associatedProfiles) 
                    ? playlist.associatedProfiles.filter(id => id !== profileId)
                    : [];
            }
            
            // Actualizar la playlist
            await fetch(`${API_URL}/admin/playlists?id=${playlist._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    associatedProfiles: updatedAssociatedProfiles
                })
            });
        }
    }
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