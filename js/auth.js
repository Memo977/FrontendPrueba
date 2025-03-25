// Configuración global para peticiones API
const API_URL = 'http://localhost:3000/api';

// Función para mostrar notificaciones
function showNotification(title, message, isError = false) {
    const notificationEl = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notificationEl && notificationTitle && notificationMessage) {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        
        // Cambiar clase según sea error o éxito
        notificationEl.classList.remove('bg-danger', 'bg-success', 'text-white');
        if (isError) {
            notificationEl.classList.add('bg-danger', 'text-white');
        } else {
            notificationEl.classList.add('bg-success', 'text-white');
        }
        
        const toast = new bootstrap.Toast(notificationEl);
        toast.show();
    } else {
        // Fallback si los elementos no existen
        alert(`${title}: ${message}`);
    }
}

// Guardar datos del usuario en localStorage - Versión mejorada
function saveAuthData(payload, token, adminPin) {
    localStorage.setItem('token', token);
    localStorage.setItem('adminId', payload.id);
    
    // Guardamos el nombre para mostrar en la UI
    if (payload.name) {
        localStorage.setItem('userName', payload.name);
    } else if (payload.email) {
        localStorage.setItem('userName', payload.email);
    }
    
    // Guardamos el PIN del administrador para verificación futura
    if (adminPin) {
        localStorage.setItem('adminPin', adminPin);
    }
}

// Obtener token desde localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Obtener ID del administrador
function getAdminId() {
    return localStorage.getItem('adminId');
}

// Verificar si el usuario está logueado
function isAuthenticated() {
    return !!getToken();
}

// Función para cerrar sesión
async function logout() {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('No hay sesión activa');
        }

        const response = await fetch(`${API_URL}/session`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cerrar sesión');
        }

        // Limpiar localStorage y redirigir
        localStorage.removeItem('token');
        localStorage.removeItem('adminId');
        localStorage.removeItem('userName');
        localStorage.removeItem('profilePin');
        localStorage.removeItem('adminPin'); // También eliminamos el adminPin
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error en logout:', error);
        // Si hay error de red o el servidor no responde, limpiamos igualmente
        localStorage.removeItem('token');
        localStorage.removeItem('adminId');
        localStorage.removeItem('userName');
        localStorage.removeItem('profilePin');
        localStorage.removeItem('adminPin');
        window.location.href = 'login.html';
    }
}

// Verificar si el usuario tiene permisos para acceder a una página
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Función para actualizar el nombre del usuario en la UI
function updateUserUI() {
    const userDisplayName = document.getElementById('userDisplayName');
    if (userDisplayName) {
        const userName = localStorage.getItem('userName');
        userDisplayName.textContent = userName || 'Usuario';
    }
}

// Evento para formulario de registro
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando auth.js...');
    
    // Actualizar UI con datos del usuario si está en una página que lo requiere
    if (document.getElementById('userDisplayName')) {
        updateUserUI();
    }
    
    // Enlazar eventos de logout
    const logoutButtons = document.querySelectorAll('#logoutButton');
    logoutButtons.forEach(button => {
        button.addEventListener('click', logout);
    });
    
    // Formulario de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validar que las contraseñas coincidan
            if (document.getElementById('password').value !== document.getElementById('repeatPassword').value) {
                showNotification('Error', 'Las contraseñas no coinciden', true);
                return;
            }
            
            try {
                const formData = {
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value,
                    repeat_password: document.getElementById('repeatPassword').value,
                    phone_number: document.getElementById('phone').value,
                    pin: document.getElementById('pin').value,
                    name: document.getElementById('name').value,
                    last_name: document.getElementById('lastName').value,
                    country: document.getElementById('country').value,
                    birthdate: document.getElementById('birthdate').value
                };
                
                const response = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Error en el registro');
                }
                
                showNotification('Éxito', 'Registro exitoso. Por favor, revisa tu correo para confirmar tu cuenta.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } catch (error) {
                console.error('Error en registro:', error);
                showNotification('Error', error.message, true);
            }
        });
    }
    
    // Formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const username = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                const formData = {
                    username: username,
                    password: password
                };
                
                const response = await fetch(`${API_URL}/session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Error en el inicio de sesión');
                }
                
                // Obtener información del usuario decodificando el token (solo front-end)
                const token = data.token;
                const payload = JSON.parse(atob(token.split('.')[1]));
                
                // Obtener el PIN del usuario y guardarlo en localStorage para verificación futura
                // Hacemos una petición adicional para obtener el PIN del usuario
                try {
                    const userResponse = await fetch(`${API_URL}/users?id=${payload.id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        if (userData && userData.pin) {
                            // Guardar el PIN del administrador
                            localStorage.setItem('adminPin', userData.pin);
                        } else {
                            // Si no podemos obtener el PIN del usuario desde el servidor,
                            // usamos el PIN introducido en el registro como respaldo
                            localStorage.setItem('adminPin', '123456'); // PIN por defecto
                            console.warn('No se pudo obtener el PIN del administrador, usando PIN por defecto');
                        }
                    }
                } catch (pinError) {
                    console.error('Error al obtener el PIN del administrador:', pinError);
                    // Como no pudimos obtener el PIN del usuario, usamos el PIN por defecto
                    localStorage.setItem('adminPin', '123456');
                }
                
                // Guardar datos simplificados
                saveAuthData(payload, token);
                
                showNotification('Éxito', 'Inicio de sesión exitoso');
                setTimeout(() => {
                    window.location.href = 'profileSelection.html';
                }, 1000);
            } catch (error) {
                console.error('Error en login:', error);
                showNotification('Error', error.message, true);
            }
        });
    }

    // Botones de editar perfil de usuario
    const editProfileButtons = document.querySelectorAll('.editProfileButton');
    editProfileButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = 'profile.html';
        });
    });
});