/**
 * profile.js - Maneja la edición del perfil de administrador
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    checkAuth();
    
    // Inicializar formulario
    initProfileForm();
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
        const response = await fetch(`${API_URL}/users`, {
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
        loadUserProfile();
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        redirectToLogin('session_expired');
    }
}

/**
 * Carga el perfil del usuario actual
 */
async function loadUserProfile() {
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
        fillProfileForm(userData);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar tus datos. Intenta recargar la página.');
    }
}

/**
 * Rellena el formulario con los datos del usuario
 * @param {Object} user - Datos del usuario
 */
function fillProfileForm(user) {
    // Rellenar campos del formulario
    if (user) {
        document.getElementById('name').value = user.name || '';
        document.getElementById('lastName').value = user.last_name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone_number || '';
        document.getElementById('country').value = user.country || '';
        
        // Formatear fecha para el campo date
        if (user.birthdate) {
            const birthdate = new Date(user.birthdate);
            if (!isNaN(birthdate.getTime())) {
                const year = birthdate.getFullYear();
                const month = String(birthdate.getMonth() + 1).padStart(2, '0');
                const day = String(birthdate.getDate()).padStart(2, '0');
                document.getElementById('birthdate').value = `${year}-${month}-${day}`;
            }
        }
    }
}

/**
 * Inicializa el formulario de edición de perfil
 */
function initProfileForm() {
    const updateProfileForm = document.getElementById('updateProfileForm');
    
    if (!updateProfileForm) return;
    
    updateProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Mostrar indicador de carga
        toggleLoading(true, updateProfileForm);
        
        // Obtener datos del formulario
        const formData = {
            name: document.getElementById('name').value,
            last_name: document.getElementById('lastName').value,
            phone_number: document.getElementById('phone').value,
            country: document.getElementById('country').value,
            birthdate: document.getElementById('birthdate').value
        };
        
        // Verificar si se está cambiando la contraseña
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const repeatNewPassword = document.getElementById('repeatNewPassword').value;
        
        if (currentPassword || newPassword || repeatNewPassword) {
            // Validar cambio de contraseña
            if (!currentPassword || !newPassword || !repeatNewPassword) {
                showNotification('error', 'Para cambiar la contraseña, todos los campos deben estar completos');
                toggleLoading(false, updateProfileForm);
                return;
            }
            
            if (newPassword !== repeatNewPassword) {
                showNotification('error', 'Las nuevas contraseñas no coinciden');
                toggleLoading(false, updateProfileForm);
                return;
            }
            
            if (newPassword.length < 6) {
                showNotification('error', 'La nueva contraseña debe tener al menos 6 caracteres');
                toggleLoading(false, updateProfileForm);
                return;
            }
            
            // Añadir contraseñas a los datos
            formData.password = newPassword;
            formData.repeat_password = repeatNewPassword;
            formData.current_password = currentPassword;
        }
        
        // Actualizar perfil
        await updateProfile(formData);
        
        // Desactivar indicador de carga
        toggleLoading(false, updateProfileForm);
    });
}

/**
 * Actualiza el perfil del usuario
 * @param {Object} userData - Datos actualizados del usuario
 */
async function updateProfile(userData) {
    const token = localStorage.getItem('token');
    const adminId = localStorage.getItem('adminId');
    
    if (!token || !adminId) {
        redirectToLogin('login_required');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users?id=${adminId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar el perfil');
        }
        
        // Actualización exitosa
        showNotification('success', 'Perfil actualizado correctamente');
        
        // Redirigir al dashboard después de 2 segundos
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', error.message || 'Error al actualizar el perfil');
    }
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
    // Crear elemento de notificación si no existe
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'alert alert-dismissible fade show';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        
        // Botón para cerrar
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        
        notification.appendChild(closeButton);
        document.body.appendChild(notification);
    }
    
    // Configurar apariencia según el tipo
    notification.className = 'alert alert-dismissible fade show';
    
    if (type === 'success') {
        notification.classList.add('alert-success');
    } else if (type === 'error') {
        notification.classList.add('alert-danger');
    } else if (type === 'info') {
        notification.classList.add('alert-info');
    }
    
    // Establecer mensaje
    notification.innerHTML = message;
    notification.appendChild(document.querySelector('#notification button.btn-close'));
    
    // Mostrar notificación
    notification.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
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
        submitButton.innerHTML = 'Guardar cambios';
    }
}