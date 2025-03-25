/**
 * accessControl.js
 * Script para proteger las páginas que requieren autenticación
 * Se ejecuta inmediatamente sin esperar a DOMContentLoaded
 */

// Lista de páginas públicas que no requieren autenticación
const publicPages = [
    'login.html',
    'signup.html',
];

// Posibles valores para el parámetro 'reason'
const loginReasons = {
    'login_required': 'Acceso restringido: Debes iniciar sesión para acceder a esa página.',
    'token_expired': 'Sesión expirada: Tu sesión ha caducado, por favor inicia sesión nuevamente.',
    'permission_denied': 'Permiso denegado: No tienes suficientes permisos para acceder a esa sección.',
    'invalid_token': 'Sesión inválida: Por favor inicia sesión nuevamente.'
};

// Función para verificar autenticación - EJECUTAR INMEDIATAMENTE
(function checkAuthenticationImmediately() {
    // Obtener la página actual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Si es una página pública, no verificar autenticación
    if (publicPages.includes(currentPage)) {
        return true;
    }
    
    // Verificar si existe token
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No se encontró token de autenticación. Redirigiendo a login...');
        showAuthAlert('login_required');
        return false;
    }
    
    // Verificar si el token ha expirado (decodificando JWT)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Verificar expiración si existe la propiedad exp
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expirado. Redirigiendo a login...');
            localStorage.removeItem('token');
            localStorage.removeItem('adminId');
            localStorage.removeItem('userName');
            showAuthAlert('token_expired');
            return false;
        }
        
        // Si llegamos aquí, la autenticación es válida
        return true;
    } catch (error) {
        console.error('Error al verificar token:', error);
        showAuthAlert('invalid_token');
        return false;
    }
})();

// Función para mostrar alerta y redirigir
function showAuthAlert(reason = 'login_required') {
    // Detener la carga de la página inmediatamente
    window.stop();
    
    // Guardar la URL actual para redireccionar después del login
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    
    // Mostrar alerta nativa del navegador
    alert(loginReasons[reason] || loginReasons['login_required']);
    
    // Redirigir a login con parámetro de razón
    window.location.href = `login.html?reason=${reason}`;
}

// Exportar función para uso explícito si es necesario
window.checkAuth = function() {
    // Obtener la página actual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Si es una página pública, no verificar autenticación
    if (publicPages.includes(currentPage)) {
        return true;
    }
    
    // Verificar si existe token
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No se encontró token de autenticación. Redirigiendo a login...');
        showAuthAlert('login_required');
        return false;
    }
    
    return true;
};