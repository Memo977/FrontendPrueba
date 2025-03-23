/**
 * createPlaylist.js - Maneja la creación de playlists
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let profiles = [];

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    checkAuth();
    
    // Inicializar eventos
    initEvents();
    
    // Cargar perfiles disponibles
    loadProfiles();
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
        renderProfiles(profiles);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar perfiles. Intenta recargar la página.');
    }
}

/**
 * Renderiza los perfiles disponibles en la interfaz
 * @param {Array} profiles - Lista de perfiles
 */
function renderProfiles(profiles) {
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
        
        profileItem.innerHTML = `
            <div class="form-check profile-checkbox">
                <input class="form-check-input" type="checkbox" value="${profile._id}" id="profile${profile._id}">
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
    
    // Evento para el formulario de creación de playlist
    const createPlaylistForm = document.getElementById('createPlaylistForm');
    if (createPlaylistForm) {
        createPlaylistForm.addEventListener('submit', handlePlaylistSubmit);
    }
}

/**
 * Maneja el envío del formulario de creación de playlist
 * @param {Event} e - Evento de submit
 */
async function handlePlaylistSubmit(e) {
    e.preventDefault();
    
    // Obtener datos del formulario
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
    const playlistData = {
        name: playlistName,
        associatedProfiles: selectedProfiles
    };
    
    // Mostrar indicador de carga
    toggleLoading(true, e.target);
    
    try {
        // Crear playlist
        const playlist = await createPlaylist(playlistData);
        
        // Mostrar notificación de éxito
        showNotification('success', 'Playlist creada correctamente.');
        
        // Redireccionar a la página de edición de playlist para añadir videos
        setTimeout(() => {
            window.location.href = `editPlaylist.html?id=${playlist._id}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al crear la playlist.');
        toggleLoading(false, e.target);
    }
}

/**
 * Crea una nueva playlist
 * @param {Object} playlistData - Datos de la playlist a crear
 * @returns {Promise<Object>} - Playlist creada
 */
async function createPlaylist(playlistData) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No hay sesión activa.');
    }
    
    const response = await fetch(`${API_URL}/admin/playlists`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(playlistData)
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear la playlist.');
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
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creando...';
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-check-circle"></i> Crear Playlist';
    }
}