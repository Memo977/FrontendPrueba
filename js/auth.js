/**
 * auth.js - Maneja la autenticación (registro e inicio de sesión)
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Detectar en qué página estamos
    const currentPage = window.location.pathname;
    
    // Inicializar los formularios según la página
    if (currentPage.includes('index.html') || currentPage === '/' || currentPage.includes('register')) {
        initRegisterForm();
    } else if (currentPage.includes('login.html')) {
        initLoginForm();
        checkLoginRedirect();
    }
});

/**
 * Inicializa el formulario de registro
 */
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Mostrar indicador de carga
        toggleLoading(true, registerForm);
        
        // Obtener datos del formulario
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            repeat_password: document.getElementById('repeatPassword').value,
            phone_number: parseInt(document.getElementById('phone').value),
            pin: document.getElementById('pin').value,
            name: document.getElementById('name').value,
            last_name: document.getElementById('lastName').value,
            country: document.getElementById('country').value,
            birthdate: document.getElementById('birthdate').value,
            state: false
        };
        
        // Validar datos
        const validationError = validateRegisterData(formData);
        if (validationError) {
            showMessage('error', validationError);
            toggleLoading(false, registerForm);
            return;
        }
        
        try {
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
            
            // Registro exitoso
            showMessage('success', 'Registro exitoso. Por favor, revisa tu correo para confirmar tu cuenta.');
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error de registro:', error);
            showMessage('error', error.message);
            toggleLoading(false, registerForm);
        }
    });
}

/**
 * Inicializa el formulario de login
 */
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Mostrar indicador de carga
        toggleLoading(true, loginForm);
        
        // Obtener datos del formulario
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validación básica
        if (!email || !password) {
            showMessage('error', 'Por favor, completa todos los campos');
            toggleLoading(false, loginForm);
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error en el inicio de sesión');
            }
            
            // Login exitoso
            const token = data.token;
            
            // Guardar token en localStorage
            localStorage.setItem('token', token);
            
            // Decodificar el token para obtener el ID del administrador
            const tokenData = decodeToken(token);
            if (tokenData && tokenData.id) {
                localStorage.setItem('adminId', tokenData.id);
            }
            
            // Verificar si hay una URL de redireccionamiento guardada
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Redirigir al dashboard o a la URL guardada
            window.location.href = redirectUrl || 'dashboard.html';
            
        } catch (error) {
            console.error('Error de inicio de sesión:', error);
            showMessage('error', error.message);
            toggleLoading(false, loginForm);
        }
    });
}

/**
 * Verifica si el usuario fue redirigido al login y muestra un mensaje
 */
function checkLoginRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');
    
    if (reason === 'session_expired') {
        showMessage('info', 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
    } else if (reason === 'login_required') {
        showMessage('info', 'Debes iniciar sesión para acceder a esta página.');
    }
}

/**
 * Valida los datos del formulario de registro
 * @param {Object} data - Datos del formulario
 * @returns {string|null} - Mensaje de error o null si es válido
 */
function validateRegisterData(data) {
    if (!data.email || !data.password || !data.repeat_password || 
        !data.phone_number || !data.pin || !data.name || 
        !data.last_name || !data.country || !data.birthdate) {
        return 'Todos los campos son obligatorios';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return 'El correo electrónico no es válido';
    }
    
    if (data.password !== data.repeat_password) {
        return 'Las contraseñas no coinciden';
    }
    
    if (data.password.length < 6) {
        return 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (data.pin.length < 4 || data.pin.length > 6) {
        return 'El PIN debe tener entre 4 y 6 dígitos';
    }
    
    // Verificar si el usuario tiene al menos 18 años
    const birthDate = new Date(data.birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    if (age < 18) {
        return 'Debes ser mayor de 18 años para registrarte';
    }
    
    return null;
}

/**
 * Muestra un mensaje al usuario
 * @param {string} type - Tipo de mensaje (success, error, info)
 * @param {string} message - Mensaje a mostrar
 */
function showMessage(type, message) {
    // Buscar o crear elemento de mensaje
    let messageElement = document.getElementById('message-alert');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'message-alert';
        messageElement.className = 'alert alert-dismissible fade show';
        messageElement.style.position = 'fixed';
        messageElement.style.top = '20px';
        messageElement.style.right = '20px';
        messageElement.style.maxWidth = '400px';
        messageElement.style.zIndex = '9999';
        
        // Botón para cerrar
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        
        messageElement.appendChild(closeButton);
        document.body.appendChild(messageElement);
    }
    
    // Configurar tipo de alerta
    messageElement.className = 'alert alert-dismissible fade show';
    if (type === 'success') messageElement.classList.add('alert-success');
    else if (type === 'error') messageElement.classList.add('alert-danger');
    else if (type === 'info') messageElement.classList.add('alert-info');
    
    // Establecer mensaje
    messageElement.innerHTML = message + messageElement.innerHTML.substring(messageElement.innerHTML.indexOf('<button'));
    
    // Mostrar mensaje
    messageElement.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        if (messageElement && messageElement.parentNode) {
            messageElement.style.display = 'none';
        }
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
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando...';
    } else {
        submitButton.disabled = false;
        
        // Restaurar texto original del botón
        if (form.id === 'registerForm') {
            submitButton.innerHTML = 'Registrarse';
        } else if (form.id === 'loginForm') {
            submitButton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión';
        }
    }
}

/**
 * Decodifica un token JWT para obtener su contenido
 * @param {string} token - Token JWT
 * @returns {Object|null} - Datos del token o null si no es válido
 */
function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error al decodificar token:', error);
        return null;
    }
}