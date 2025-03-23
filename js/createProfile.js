/**
 * createProfile.js - Maneja la creación de perfiles infantiles
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let playlists = [];
let selectedAvatar = "https://loodibee.com/wp-content/uploads/Netflix-avatar-2.png";

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    checkAuth();
    
    // Inicializar eventos
    initEvents();
    
    // Cargar playlists disponibles
    loadPlaylists();
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
 * Carga las playlists disponibles del usuario
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
        renderPlaylists(playlists);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar playlists. Intenta recargar la página.');
    }
}

/**
 * Renderiza las playlists disponibles en la interfaz
 * @param {Array} playlists - Lista de playlists
 */
function renderPlaylists(playlists) {
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
        
        playlistItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${playlist._id}" id="playlist${playlist._id}">
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
    
    // Evento para el botón de editar perfil
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
    
    // Evento para el formulario de creación de perfil
    const createProfileForm = document.getElementById('createProfileForm');
    if (createProfileForm) {
        createProfileForm.addEventListener('submit', handleProfileSubmit);
    }
}

/**
 * Maneja el envío del formulario de creación de perfil
 * @param {Event} e - Evento de submit
 */
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    // Obtener datos del formulario
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
    const profileData = {
        full_name: fullName,
        pin: pin,
        avatar: selectedAvatar
    };
    
    // Mostrar indicador de carga
    toggleLoading(true, e.target);
    
    try {
        // Crear perfil
        const profile = await createProfile(profileData);
        
        // Si hay playlists seleccionadas, asociarlas al perfil
        if (selectedPlaylists.length > 0 && profile) {
            await associatePlaylistsToProfile(profile._id, selectedPlaylists);
        }
        
        // Mostrar notificación de éxito
        showNotification('success', 'Perfil creado correctamente.');
        
        // Redireccionar al dashboard después de 2 segundos
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al crear el perfil.');
        toggleLoading(false, e.target);
    }
}

/**
 * Crea un nuevo perfil infantil
 * @param {Object} profileData - Datos del perfil a crear
 * @returns {Promise<Object>} - Perfil creado
 */
async function createProfile(profileData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    
    const response = await fetch(`${API_URL}/admin/restricted_users`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear el perfil.');
    }
    
    return await response.json();
}

/**
 * Asocia playlists seleccionadas a un perfil
 * @param {string} profileId - ID del perfil
 * @param {Array} playlistIds - IDs de las playlists a asociar
 */
async function associatePlaylistsToProfile(profileId, playlistIds) {
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    // Para cada playlist seleccionada, actualizar su lista de perfiles asociados
    for (const playlistId of playlistIds) {
        // Primero obtener la playlist actual
        const playlistResponse = await fetch(`${API_URL}/admin/playlists?id=${playlistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!playlistResponse.ok) continue;
        
        const playlist = await playlistResponse.json();
        
        // Añadir el nuevo perfil a la lista de perfiles asociados
        const associatedProfiles = Array.isArray(playlist.associatedProfiles) 
            ? [...playlist.associatedProfiles, profileId]
            : [profileId];
        
        // Actualizar la playlist
        await fetch(`${API_URL}/admin/playlists?id=${playlistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                associatedProfiles: associatedProfiles
            })
        });
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
    // Mantener adminId para que los perfiles infantiles sigan siendo accesibles
    
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
        submitButton.innerHTML = '<i class="bi bi-check-circle"></i> Guardar Perfil';
    }
}