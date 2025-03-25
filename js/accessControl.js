// Lista de páginas públicas que no requieren autenticación
const publicPages = [
    'login.html',
    'signup.html',
];

// Lista de páginas de administrador que requieren PIN adicional
const adminPages = [
    'dashboard.html',
    'createProfile.html',
    'editProfile.html',
    'createPlaylist.html',
    'editPlaylist.html',
    'addVideo.html',
    'editVideo.html'
];

// Posibles valores para el parámetro 'reason'
const loginReasons = {
    'login_required': 'Acceso restringido: Debes iniciar sesión para acceder a esa página.',
    'token_expired': 'Sesión expirada: Tu sesión ha caducado, por favor inicia sesión nuevamente.',
    'permission_denied': 'Permiso denegado: No tienes suficientes permisos para acceder a esa sección.',
    'invalid_token': 'Sesión inválida: Por favor inicia sesión nuevamente.',
    'admin_pin_required': 'Verificación requerida: Debes ingresar el PIN de administrador para acceder a esta sección.'
};

// Función para verificar autenticación - EJECUTAR INMEDIATAMENTE
(function checkAuthenticationImmediately() {
    // Obtener la página actual y la ruta completa
    const path = window.location.pathname;
    const currentPage = path.split('/').pop() || 'login.html';
    
    console.log('Verificando acceso a:', path);
    
    // Detectar si es una página de administrador (método más robusto)
    const isAdminPage = path.includes('/admin/') || adminPages.includes(currentPage);
    
    // Si es una página pública, no verificar autenticación
    if (publicPages.includes(currentPage)) {
        console.log('Página pública, acceso permitido');
        return true;
    }
    
    // Verificar si existe token
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No se encontró token de autenticación. Redirigiendo a login...');
        showAuthAlert('login_required');
        return false;
    }
    
    // Para páginas de administrador, requerir verificación adicional de PIN
    if (isAdminPage) {
        console.log('Página de administrador detectada, verificando PIN...');
        // Verificar si el PIN de administrador fue verificado recientemente
        const adminPinVerified = sessionStorage.getItem('adminPinVerified');
        const verificationTime = parseInt(sessionStorage.getItem('adminPinVerifiedTime') || '0');
        const currentTime = Date.now();
        const timeDiff = currentTime - verificationTime;
        const MAX_VERIFICATION_TIME = 30 * 60 * 1000; // 30 minutos en milisegundos
        
        console.log('Estado de verificación PIN:', { 
            adminPinVerified, 
            timeDiff, 
            valid: (adminPinVerified && timeDiff <= MAX_VERIFICATION_TIME) 
        });
        
        // Si no hay verificación o ha expirado, redirigir a selección de perfiles
        if (!adminPinVerified || timeDiff > MAX_VERIFICATION_TIME) {
            console.log('Acceso a página de administrador sin verificación de PIN. Redirigiendo...');
            showAdminPinAlert();
            return false;
        }
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
            sessionStorage.removeItem('adminPinVerified');
            sessionStorage.removeItem('adminPinVerifiedTime');
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
    
    // Determinar la ruta correcta según la estructura del sitio
    // Usar una ruta absoluta desde la raíz del sitio
    window.location.href = '../shared/login.html?reason=' + reason;
}

// Función para mostrar alerta de PIN de administrador y redirigir
function showAdminPinAlert() {
    // Detener la carga de la página inmediatamente
    window.stop();
    
    // Guardar la URL actual para redireccionar después de la verificación
    sessionStorage.setItem('adminRedirectAfterPin', window.location.href);
    
    // Mostrar alerta nativa del navegador
    alert(loginReasons['admin_pin_required']);
    
    // Redirigir a selección de perfiles con parámetro para solicitar PIN
    // Usar una ruta absoluta desde la raíz del sitio
    window.location.href = '../users/profileSelection.html?verifyAdmin=true';
}

// Exportar función para uso explícito si es necesario
window.checkAuth = function() {
    // Obtener la página actual
    const path = window.location.pathname;
    const currentPage = path.split('/').pop() || 'login.html';
    
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

// Marcar como verificado el PIN de administrador
window.markAdminPinVerified = function() {
    sessionStorage.setItem('adminPinVerified', 'true');
    sessionStorage.setItem('adminPinVerifiedTime', Date.now().toString());
};