// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let currentPin = '';
let selectedProfileId = null;
let profilesData = [];

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Cargar perfiles desde el backend
    loadProfiles();
    
    // Inicializar eventos para el teclado PIN
    initializePinPad();
    
    // Configurar eventos para botones
    setupEventListeners();
});

// Cargar perfiles desde la API
function loadProfiles() {
    const adminId = localStorage.getItem('adminId');
    
    if (!adminId) {
        // Si no hay adminId en localStorage, redirigir al login
        window.location.href = 'login.html';
        return;
    }
    
    // URL para obtener perfiles, filtrando por adminId
    const profilesUrl = `${API_URL}/public/profiles?adminId=${adminId}`;
    
    fetch(profilesUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar perfiles');
            }
            return response.json();
        })
        .then(profiles => {
            profilesData = profiles;
            renderProfiles(profiles);
        })
        .catch(error => {
            console.error('Error:', error);
            // Si hay un error al cargar perfiles, mostrar mensaje o redirigir
            showErrorMessage('No se pudieron cargar los perfiles. Por favor, intenta de nuevo.');
        });
}

// Renderizar perfiles en la interfaz
function renderProfiles(profiles) {
    const profilesContainer = document.getElementById('profilesContainer');
    
    // Limpiar todos los perfiles excepto el de administrador
    const adminProfile = document.querySelector('.admin-profile');
    profilesContainer.innerHTML = '';
    
    // Añadir todos los perfiles restringidos
    profiles.forEach(profile => {
        const profileElement = createProfileElement(profile);
        profilesContainer.appendChild(profileElement);
    });
    
    // Añadir el perfil de administrador
    profilesContainer.appendChild(adminProfile);
    
    // Añadir el botón "Añadir perfil" solo cuando el administrador está autenticado
    const token = localStorage.getItem('token');
    if (token) {
        const addProfileElement = createAddProfileElement();
        profilesContainer.appendChild(addProfileElement);
    }
}

// Crear elemento HTML para un perfil
function createProfileElement(profile) {
    const profileCol = document.createElement('div');
    profileCol.className = 'col-6 col-sm-4 col-md-3 col-lg-2 profile-card';
    
    // Comprobar si el avatar es una URL válida
    const avatarSrc = isValidUrl(profile.avatar) ? 
        profile.avatar : 
        'https://loodibee.com/wp-content/uploads/Netflix-avatar-2.png'; // Avatar por defecto
    
    profileCol.innerHTML = `
        <img class="profile-avatar" src="${avatarSrc}" alt="${profile.full_name}" data-profile-id="${profile._id}">
        <div class="profile-name">${profile.full_name}</div>
    `;
    
    // Añadir evento de clic para este perfil
    const avatarElement = profileCol.querySelector('.profile-avatar');
    avatarElement.addEventListener('click', () => {
        selectedProfileId = profile._id;
        showPinModal(profile.full_name);
    });
    
    return profileCol;
}

// Crear elemento para "Añadir perfil"
function createAddProfileElement() {
    const addProfileCol = document.createElement('div');
    addProfileCol.className = 'col-6 col-sm-4 col-md-3 col-lg-2 profile-card';
    
    addProfileCol.innerHTML = `
        <div class="add-profile-btn">
            <i class="bi bi-plus-lg"></i>
        </div>
        <div class="profile-name">Añadir perfil</div>
    `;
    
    // Añadir evento de clic para ir a la página de creación de perfiles
    addProfileCol.addEventListener('click', () => {
        // Verificar que el token es válido antes de redirigir
        if (localStorage.getItem('token')) {
            window.location.href = 'dashboard.html';
        } else {
            // Si no hay token válido, mostrar el modal de login de administrador
            showAdminLoginModal();
        }
    });
    
    return addProfileCol;
}

// Configurar todos los event listeners
function setupEventListeners() {
    // Botón para cambiar de cuenta
    document.getElementById('switchAccountBtn').addEventListener('click', () => {
        showAdminLoginModal();
    });
    
    // Evento de click en el perfil de administrador
    document.querySelector('.admin-profile').addEventListener('click', () => {
        showAdminLoginModal();
    });
    
    // Manejar envío del formulario de login de administrador
    document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAdminLogin();
    });
}

// Inicializar el teclado de PIN
function initializePinPad() {
    // Botones numéricos
    document.querySelectorAll('.pin-button[data-digit]').forEach(button => {
        button.addEventListener('click', () => {
            const digit = button.getAttribute('data-digit');
            addPinDigit(digit);
        });
    });
    
    // Botón de borrar
    document.querySelector('.pin-button[data-action="clear"]').addEventListener('click', () => {
        if (currentPin.length > 0) {
            currentPin = currentPin.slice(0, -1);
            updatePinCircles();
        }
    });
    
    // Botón de enviar
    document.querySelector('.pin-button[data-action="submit"]').addEventListener('click', () => {
        verifyPin();
    });
}

// Mostrar modal para introducir PIN
function showPinModal(profileName) {
    // Mostrar el nombre del perfil en el modal
    document.getElementById('profileNameInModal').textContent = profileName;
    
    // Resetear PIN actual
    currentPin = '';
    updatePinCircles();
    
    // Ocultar mensaje de error si estaba visible
    document.getElementById('pinError').style.display = 'none';
    
    // Mostrar el modal
    const pinModal = new bootstrap.Modal(document.getElementById('pinModal'));
    pinModal.show();
}

// Mostrar modal de login de administrador
function showAdminLoginModal() {
    // Limpiar campos y errores
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminLoginError').style.display = 'none';
    
    // Mostrar el modal
    const adminLoginModal = new bootstrap.Modal(document.getElementById('adminLoginModal'));
    adminLoginModal.show();
}

// Añadir un dígito al PIN actual
function addPinDigit(digit) {
    // Solo permitir hasta 6 dígitos
    if (currentPin.length < 6) {
        currentPin += digit;
        updatePinCircles();
        
        // Si ya tenemos 6 dígitos, verificar automáticamente
        if (currentPin.length === 6) {
            setTimeout(verifyPin, 300); // Pequeña pausa para que sea visible el último círculo
        }
    }
}

// Actualizar visualización de círculos del PIN
function updatePinCircles() {
    const circles = document.querySelectorAll('.pin-circle');
    
    // Resetear todos los círculos
    circles.forEach((circle, index) => {
        if (index < currentPin.length) {
            circle.classList.add('filled');
        } else {
            circle.classList.remove('filled');
        }
    });
}

// Verificar PIN con el backend
function verifyPin() {
    if (currentPin.length === 0) return;
    
    // Datos para la verificación
    const verifyData = {
        profileId: selectedProfileId,
        pin: currentPin
    };
    
    // Llamada a la API para verificar PIN
    fetch(`${API_URL}/public/verify-pin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(verifyData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('PIN incorrecto');
        }
        return response.json();
    })
    .then(data => {
        // PIN correcto - guardar información y redirigir
        localStorage.setItem('profileId', selectedProfileId);
        localStorage.setItem('profilePin', currentPin);
        
        // Cerrar el modal y redirigir a la página principal
        const pinModal = bootstrap.Modal.getInstance(document.getElementById('pinModal'));
        pinModal.hide();
        
        // Redirigir a la página principal para niños
        window.location.href = 'kidsDashboard.html';
    })
    .catch(error => {
        console.error('Error al verificar PIN:', error);
        // Mostrar mensaje de error
        document.getElementById('pinError').style.display = 'block';
        // Resetear PIN para nuevo intento
        currentPin = '';
        updatePinCircles();
    });
}

// Manejar login de administrador
function handleAdminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    // Validación básica
    if (!email || !password) {
        document.getElementById('adminLoginError').textContent = 'Por favor, completa todos los campos.';
        document.getElementById('adminLoginError').style.display = 'block';
        return;
    }
    
    // Datos para la autenticación
    const loginData = {
        username: email,
        password: password
    };
    
    // Llamada a la API para iniciar sesión
    fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Credenciales incorrectas');
        }
        return response.json();
    })
    .then(data => {
        // Login exitoso - guardar token y adminId
        localStorage.setItem('token', data.token);
        
        // Decodificar token para obtener adminId
        const adminId = decodeToken(data.token).id;
        localStorage.setItem('adminId', adminId);
        
        // Cerrar modal y redirigir al dashboard
        const adminLoginModal = bootstrap.Modal.getInstance(document.getElementById('adminLoginModal'));
        adminLoginModal.hide();
        
        // Redirigir al dashboard de administrador
        window.location.href = 'dashboard.html';
    })
    .catch(error => {
        console.error('Error de inicio de sesión:', error);
        // Mostrar mensaje de error
        document.getElementById('adminLoginError').textContent = 'Credenciales incorrectas. Inténtalo de nuevo.';
        document.getElementById('adminLoginError').style.display = 'block';
    });
}

// Decodificar token JWT
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
        return {};
    }
}

// Comprobar si una cadena es una URL válida
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Mostrar mensaje de error
function showErrorMessage(message) {
    // Implementar según el diseño (alerta, toast, etc.)
    alert(message);
}