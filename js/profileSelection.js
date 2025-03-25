/**
 * profileSelection.js
 * Script para la selección de perfiles en KidsTube
 */

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const profilesContainer = document.getElementById('profilesContainer');
    const switchAccountBtn = document.getElementById('switchAccountBtn');
    const adminNavBtn = document.getElementById('adminNavBtn');
    
    // Referencias para el modal de PIN
    const pinModal = document.getElementById('pinModal');
    const profileNameInModal = document.getElementById('profileNameInModal');
    const pinCircles = document.querySelectorAll('.pin-circle');
    const pinButtons = document.querySelectorAll('.pin-button');
    const pinError = document.getElementById('pinError');
    
    // Variables para el manejo del PIN
    let selectedProfile = null;
    let enteredPin = '';
    let maxPinLength = 6;
    let pinPurpose = ''; // Nueva variable para controlar el propósito del PIN (perfil, admin, nuevo perfil)
    
    // Inicialización
    init();
    
    /**
     * Inicializa la página
     */
    function init() {
        // Verificar si hay sesión de administrador
        const token = localStorage.getItem('token');
        if (!token) {
            // Si no hay sesión, redirigir al login
            window.location.href = 'login.html';
            return;
        }
        
        // Cargar perfiles
        loadProfiles();
        
        // Configurar event listeners
        setupEventListeners();
    }
    
    /**
     * Configura los event listeners
     */
    function setupEventListeners() {
        // Evento para el botón de cambiar cuenta
        switchAccountBtn.addEventListener('click', function() {
            handleLogout();
        });
        
        // Evento para el botón de administrador en la navbar
        if (adminNavBtn) {
            adminNavBtn.addEventListener('click', function() {
                showAdminPinModal('admin');
            });
        }
        
        // Eventos para el teclado numérico del PIN
        pinButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Verificar si es un dígito o una acción
                const digit = this.getAttribute('data-digit');
                const action = this.getAttribute('data-action');
                
                if (digit) {
                    handlePinDigit(digit);
                } else if (action === 'clear') {
                    handlePinClear();
                } else if (action === 'submit') {
                    handlePinSubmit();
                }
            });
        });
        
        // Añadir evento para cerrar el modal y reiniciar el PIN
        pinModal.addEventListener('hidden.bs.modal', function() {
            resetPin();
        });
    }
    
    /**
     * Carga los perfiles disponibles
     */
    async function loadProfiles() {
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch('http://localhost:3000/api/admin/restricted_users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar los perfiles');
            }
            
            const profiles = await response.json();
            
            // Renderizar perfiles
            renderProfiles(profiles);
        } catch (error) {
            console.error('Error:', error);
            profilesContainer.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                        <h3 class="mt-3">Error al cargar perfiles</h3>
                        <p class="text-muted">No se pudieron cargar los perfiles infantiles.</p>
                        <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Renderiza los perfiles en la interfaz
     * @param {Array} profiles - Lista de perfiles
     */
    function renderProfiles(profiles) {
        profilesContainer.innerHTML = '';
        
        // Si no hay perfiles, mostrar un mensaje
        if (profiles.length === 0) {
            profilesContainer.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-person-plus" style="font-size: 3rem; color: #6c757d;"></i>
                        <h3 class="mt-3">No hay perfiles infantiles</h3>
                        <p class="text-muted">No hay perfiles disponibles.</p>
                    </div>
                </div>
            `;
            
            return;
        }
        
        // Añadir cada perfil
        profiles.forEach(profile => {
            const profileCol = document.createElement('div');
            profileCol.className = 'col-6 col-sm-4 col-md-3';
            
            profileCol.innerHTML = `
                <div class="profile-card" data-profile-id="${profile._id}" data-profile-name="${profile.full_name}" data-profile-avatar="${profile.avatar}">
                    <img src="${profile.avatar}" alt="${profile.full_name}" class="profile-avatar">
                    <h5 class="profile-name">${profile.full_name}</h5>
                </div>
            `;
            
            // Añadir evento click para seleccionar el perfil
            const profileCard = profileCol.querySelector('.profile-card');
            profileCard.addEventListener('click', function() {
                const profileId = this.getAttribute('data-profile-id');
                const profileName = this.getAttribute('data-profile-name');
                const profileAvatar = this.getAttribute('data-profile-avatar');
                
                // Guardar referencia al perfil seleccionado
                selectedProfile = {
                    _id: profileId,
                    full_name: profileName,
                    avatar: profileAvatar
                };
                
                // Mostrar el nombre del perfil en el modal
                profileNameInModal.textContent = profileName;
                
                // Establecer el propósito del PIN
                pinPurpose = 'profile';
                
                // Abrir modal para pedir PIN
                const modal = new bootstrap.Modal(pinModal);
                modal.show();
            });
            
            profilesContainer.appendChild(profileCol);
        });
    }
    
    /**
     * Muestra el modal para ingresar el PIN del administrador
     * @param {string} purpose - Propósito del PIN: 'admin'
     */
    function showAdminPinModal(purpose) {
        // Guardar el propósito
        pinPurpose = purpose;
        
        // Modificar el título del modal según el propósito
        profileNameInModal.textContent = 'Administrador';
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(pinModal);
        modal.show();
    }
    
    /**
     * Maneja la entrada de un dígito del PIN
     * @param {string} digit - Dígito ingresado
     */
    function handlePinDigit(digit) {
        // Verificar que no se exceda la longitud máxima
        if (enteredPin.length < maxPinLength) {
            // Añadir dígito al PIN
            enteredPin += digit;
            
            // Actualizar círculos de PIN
            updatePinCircles();
            
            // Si se completa el PIN, verificar automáticamente
            if (enteredPin.length === maxPinLength) {
                // Esperar un momento para que se vea el último círculo lleno
                setTimeout(handlePinSubmit, 500);
            }
        }
    }
    
    /**
     * Actualiza la visualización de los círculos del PIN
     */
    function updatePinCircles() {
        // Actualizar cada círculo según la longitud del PIN actual
        pinCircles.forEach((circle, index) => {
            if (index < enteredPin.length) {
                circle.classList.add('filled');
            } else {
                circle.classList.remove('filled');
            }
        });
        
        // Ocultar mensaje de error si estaba visible
        pinError.style.display = 'none';
    }
    
    /**
     * Maneja la acción de borrar el PIN
     */
    function handlePinClear() {
        // Si hay al menos un dígito, borrar el último
        if (enteredPin.length > 0) {
            enteredPin = enteredPin.substring(0, enteredPin.length - 1);
            updatePinCircles();
        }
    }
    
    /**
     * Maneja la acción de enviar/verificar el PIN
     */
    async function handlePinSubmit() {
        // Verificar que haya un PIN ingresado
        if (enteredPin.length === 0) {
            return;
        }
        
        // Lógica según el propósito del PIN
        if (pinPurpose === 'profile') {
            // Verificar PIN de perfil infantil
            await verifyProfilePin();
        } else if (pinPurpose === 'admin') {
            // Verificar PIN de administrador
            verifyAdminPin();
        }
    }
    
    /**
     * Verifica el PIN de un perfil infantil
     */
    async function verifyProfilePin() {
        // Verificar que haya un perfil seleccionado
        if (!selectedProfile) {
            return;
        }
        
        console.log('Verificando PIN para perfil:', selectedProfile.full_name);
        
        // Verificar el PIN
        try {
            const token = localStorage.getItem('token');
            console.log('Token usado para verificación:', token ? 'disponible' : 'no disponible');
            
            const response = await fetch('http://localhost:3000/api/public/verify-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    profileId: selectedProfile._id,
                    pin: enteredPin
                })
            });
            
            console.log('Respuesta de verificación PIN:', response.status, response.statusText);
            
            if (response.ok) {
                // PIN correcto, guardar información del perfil
                const verifiedProfile = await response.json();
                console.log('Perfil verificado:', verifiedProfile);
                
                // Almacenar datos del perfil seleccionado en localStorage
                const profileData = {
                    _id: selectedProfile._id, // Usamos el ID del perfil seleccionado para mayor seguridad
                    full_name: selectedProfile.full_name,
                    avatar: selectedProfile.avatar,
                    pin: enteredPin // Guardamos el PIN para solicitudes futuras
                };
                
                console.log('Datos de perfil a guardar:', profileData);
                localStorage.setItem('currentProfile', JSON.stringify(profileData));
                
                // Cerrar el modal
                const modalInstance = bootstrap.Modal.getInstance(pinModal);
                modalInstance.hide();
                
                // Redireccionar al dashboard infantil
                window.location.href = 'kidsDashboard.html';
            } else {
                console.error('PIN incorrecto o error en verificación');
                const errorText = await response.text();
                console.error('Detalles del error:', errorText);
                
                // PIN incorrecto, mostrar error
                showPinError();
            }
        } catch (error) {
            console.error('Error al verificar PIN:', error);
            showPinError();
        }
    }
    
    /**
     * Verifica el PIN del administrador
     * Este método verifica el PIN contra el valor almacenado en localStorage
     */
    function verifyAdminPin() {
        // Obtener el PIN del administrador almacenado durante el login
        const adminPin = localStorage.getItem('adminPin');
        
        if (!adminPin) {
            console.error('No se encontró el PIN del administrador');
            showPinError('No se encontraron datos del administrador');
            return;
        }
        
        // Comparar el PIN ingresado con el PIN del administrador
        if (enteredPin === adminPin) {
            // PIN correcto
            const modalInstance = bootstrap.Modal.getInstance(pinModal);
            modalInstance.hide();
            
            // Redireccionar al panel de administración
            window.location.href = 'dashboard.html';
        } else {
            // PIN incorrecto
            showPinError();
        }
    }
    
    /**
     * Muestra un mensaje de error para el PIN
     * @param {string} message - Mensaje de error opcional
     */
    function showPinError(message = 'PIN incorrecto. Inténtalo de nuevo.') {
        // Resetear el PIN ingresado
        enteredPin = '';
        updatePinCircles();
        
        // Actualizar mensaje de error si se proporciona uno personalizado
        if (message) {
            pinError.textContent = message;
        }
        
        // Mostrar mensaje de error
        pinError.style.display = 'inline-block';
        
        // Animación de shake para el error
        pinError.classList.remove('shake-animation');
        void pinError.offsetWidth; // Truco para reiniciar la animación
        pinError.classList.add('shake-animation');
    }
    
    /**
     * Resetea el estado del PIN
     */
    function resetPin() {
        enteredPin = '';
        updatePinCircles();
        pinError.style.display = 'none';
        pinPurpose = '';
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
                localStorage.removeItem('currentProfile');
                localStorage.removeItem('adminPin');
                
                // Redireccionar a la página de login
                window.location.href = 'login.html';
            } else {
                alert('Error al cerrar sesión. Intente nuevamente.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cerrar sesión. Intente nuevamente.');
        }
    }
});