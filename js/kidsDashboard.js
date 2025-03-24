/**
 * kidsDashboard.js - Maneja la funcionalidad del dashboard para usuarios infantiles
 */

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let currentProfile = null;
let playlists = [];
let currentPlaylistVideos = {};
let youtubePlayer = null;
let currentPlayingVideo = null;
let currentPlaylistId = null;
let currentVideoIndex = -1;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación del perfil infantil
    checkProfileAuth();
    
    // Inicializar eventos
    initEvents();
});

/**
 * Verifica si hay un perfil infantil autenticado
 */
function checkProfileAuth() {
    const profileId = localStorage.getItem('profileId');
    const profilePin = localStorage.getItem('profilePin');
    
    if (!profileId || !profilePin) {
        // Si no hay ID o PIN de perfil, redirigir a la selección de perfiles
        window.location.href = 'profileSelection.html';
        return;
    }
    
    // Cargar datos del perfil y sus playlists
    loadProfileData();
    loadPlaylists();
}

/**
 * Carga los datos del perfil actual
 */
async function loadProfileData() {
    const profileId = localStorage.getItem('profileId');
    const profilePin = localStorage.getItem('profilePin');
    
    if (!profileId || !profilePin) return;
    
    try {
        // Obtener datos del perfil usando PIN para autenticación
        const response = await fetch(`${API_URL}/public/verify-pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                profileId: profileId,
                pin: profilePin
            })
        });
        
        if (!response.ok) {
            throw new Error('Perfil no válido');
        }
        
        currentProfile = await response.json();
        updateProfileUI(currentProfile);
        
    } catch (error) {
        console.error('Error:', error);
        // Si hay error de autenticación, redirigir a la selección de perfiles
        window.location.href = 'profileSelection.html';
    }
}

/**
 * Actualiza la interfaz con la información del perfil
 * @param {Object} profile - Datos del perfil
 */
function updateProfileUI(profile) {
    if (!profile) return;
    
    // Actualizar nombre en el navbar y saludo
    const profileNameElement = document.getElementById('profileName');
    const welcomeTitleElement = document.getElementById('welcomeTitle');
    
    if (profileNameElement) {
        profileNameElement.textContent = profile.name || 'Mi Perfil';
    }
    
    if (welcomeTitleElement) {
        welcomeTitleElement.textContent = `¡Hola, ${profile.name || 'amigo'}!`;
    }
    
    // Actualizar avatar
    const navProfileAvatarElement = document.getElementById('navProfileAvatar');
    if (navProfileAvatarElement) {
        navProfileAvatarElement.innerHTML = `
            <img src="${profile.avatar || 'https://loodibee.com/wp-content/uploads/Netflix-avatar-2.png'}" 
                 alt="${profile.name || 'Perfil'}" class="profile-avatar-img">
        `;
    }
}

/**
 * Carga las playlists asignadas al perfil actual
 */
async function loadPlaylists() {
    const profilePin = localStorage.getItem('profilePin');
    
    if (!profilePin) return;
    
    try {
        const response = await fetch(`${API_URL}/restricted/playlists`, {
            method: 'GET',
            headers: {
                'x-restricted-pin': profilePin
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar playlists');
        }
        
        playlists = await response.json();
        
        // Ocultar indicador de carga
        document.getElementById('loadingIndicator').style.display = 'none';
        
        if (playlists.length === 0) {
            // Mostrar mensaje de no hay playlists
            document.getElementById('noPlaylistsMessage').style.display = 'block';
        } else {
            // Renderizar playlists
            renderPlaylists(playlists);
            
            // Cargar videos de cada playlist
            for (const playlist of playlists) {
                await loadPlaylistVideos(playlist._id);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        // Ocultar indicador de carga y mostrar mensaje de error
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('noPlaylistsMessage').style.display = 'block';
    }
}

/**
 * Renderiza las playlists en la interfaz
 * @param {Array} playlists - Lista de playlists
 */
function renderPlaylists(playlists) {
    const playlistsContainer = document.getElementById('playlistsContainer');
    
    // Mantener el indicador de carga y mensaje de no playlists (ya ocultos)
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noPlaylistsMessage = document.getElementById('noPlaylistsMessage');
    
    // Limpiar contenedor excepto los elementos mencionados
    Array.from(playlistsContainer.children).forEach(child => {
        if (child !== loadingIndicator && child !== noPlaylistsMessage) {
            playlistsContainer.removeChild(child);
        }
    });
    
    // Crear sección para cada playlist
    playlists.forEach(playlist => {
        const playlistSection = document.createElement('div');
        playlistSection.className = 'playlist-section mb-5';
        
        playlistSection.innerHTML = `
            <div class="section-header d-flex justify-content-between align-items-center mb-3">
                <h2 class="section-title">
                    <i class="bi bi-collection-play me-2"></i> ${playlist.name}
                </h2>
                <span class="video-count badge rounded-pill">
                    ${playlist.videoCount || 0} videos
                </span>
            </div>
            <div class="video-carousel">
                <div class="row g-4" id="playlist-${playlist._id}">
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando videos...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        playlistsContainer.appendChild(playlistSection);
    });
}

/**
 * Carga los videos de una playlist
 * @param {string} playlistId - ID de la playlist
 */
async function loadPlaylistVideos(playlistId) {
    const profilePin = localStorage.getItem('profilePin');
    
    if (!profilePin) return;
    
    try {
        const response = await fetch(`${API_URL}/restricted/videos?playlistId=${playlistId}`, {
            method: 'GET',
            headers: {
                'x-restricted-pin': profilePin
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error al cargar videos de playlist ${playlistId}`);
        }
        
        const videos = await response.json();
        
        // Guardar videos en la variable global
        currentPlaylistVideos[playlistId] = videos;
        
        // Renderizar videos de esta playlist
        renderPlaylistVideos(playlistId, videos);
        
    } catch (error) {
        console.error('Error:', error);
        // Mostrar mensaje de error en el carrusel de videos
        const playlistElement = document.getElementById(`playlist-${playlistId}`);
        if (playlistElement) {
            playlistElement.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-warning" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        No se pudieron cargar los videos
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Renderiza los videos de una playlist
 * @param {string} playlistId - ID de la playlist
 * @param {Array} videos - Lista de videos
 */
function renderPlaylistVideos(playlistId, videos) {
    const playlistElement = document.getElementById(`playlist-${playlistId}`);
    
    if (!playlistElement) return;
    
    // Limpiar elemento
    playlistElement.innerHTML = '';
    
    if (videos.length === 0) {
        // Mostrar mensaje de no hay videos
        playlistElement.innerHTML = `
            <div class="col-12 text-center">
                <div class="empty-playlist">
                    <i class="bi bi-film"></i>
                    <p>No hay videos en esta playlist</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Renderizar cada video como una tarjeta
    videos.forEach((video, index) => {
        // Obtener ID del video de YouTube para la miniatura
        const videoId = getYouTubeVideoId(video.youtubeUrl);
        const thumbnailUrl = videoId ? 
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 
            'https://via.placeholder.com/320x180.png?text=Video';
        
        const videoCard = document.createElement('div');
        videoCard.className = 'col-md-4 col-lg-3 col-sm-6';
        
        videoCard.innerHTML = `
            <div class="video-card" data-video-id="${video._id}" data-youtube-id="${videoId}" data-video-name="${video.name}">
                <div class="video-thumbnail">
                    <img src="${thumbnailUrl}" alt="${video.name}" class="video-thumbnail-img">
                    <div class="play-overlay">
                        <i class="bi bi-play-circle"></i>
                    </div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.name}</h3>
                </div>
            </div>
        `;
        
        // Añadir evento de clic para reproducir el video
        videoCard.querySelector('.video-card').addEventListener('click', () => {
            playVideo(video, playlistId, index);
        });
        
        playlistElement.appendChild(videoCard);
    });
}

/**
 * Reproduce un video en el modal
 * @param {Object} video - Datos del video
 * @param {string} playlistId - ID de la playlist (opcional)
 * @param {number} videoIndex - Índice del video en la playlist (opcional)
 */
function playVideo(video, playlistId = null, videoIndex = -1) {
    // Obtener ID del video de YouTube
    const videoId = getYouTubeVideoId(video.youtubeUrl);
    
    if (!videoId) {
        alert('No se pudo reproducir el video. URL no válida.');
        return;
    }
    
    // Actualizar título y descripción en el modal
    document.getElementById('videoTitle').textContent = video.name || 'Video';
    document.getElementById('videoDescription').textContent = video.description || '';
    
    // Guardar información del video y playlist actuales
    currentPlayingVideo = video;
    currentPlaylistId = playlistId;
    currentVideoIndex = videoIndex;
    
    // Si tenemos una playlist, mostrar su nombre y actualizar controles
    if (playlistId && videoIndex !== -1 && currentPlaylistVideos[playlistId]) {
        const playlist = playlists.find(p => p._id === playlistId);
        if (playlist) {
            document.getElementById('currentPlaylistName').textContent = playlist.name;
            document.getElementById('playlistBadge').classList.remove('d-none');
            
            // Habilitar o deshabilitar botones de navegación según la posición del video
            updateNavigationButtons(playlistId, videoIndex);
        }
    } else {
        // Si no es parte de una playlist, ocultar controles de playlist
        document.getElementById('playlistBadge').classList.add('d-none');
        document.getElementById('prevVideoBtn').disabled = true;
        document.getElementById('nextVideoBtn').disabled = true;
    }
    
    // Cargar el reproductor de YouTube usando la API
    const videoPlayer = document.getElementById('videoPlayer');
    
    // Primero, asegurarnos de destruir completamente el reproductor actual si existe
    if (youtubePlayer) {
        try {
            youtubePlayer.destroy();
        } catch (e) {
            console.error('Error al destruir el reproductor:', e);
        }
        youtubePlayer = null;
    }
    
    // Limpiar contenido del reproductor
    videoPlayer.innerHTML = '';
    
    // Crear un div para el reproductor
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtubePlayerIframe';
    videoPlayer.appendChild(playerDiv);
    
    // Mostrar modal solo si no está ya visible
    const videoPlayerModalElement = document.getElementById('videoPlayerModal');
    if (!videoPlayerModalElement.classList.contains('show')) {
        const videoPlayerModal = new bootstrap.Modal(videoPlayerModalElement);
        videoPlayerModal.show();
    }
    
    // Cargar la API de YouTube si aún no está cargada
    if (!window.YT) {
        // Crear la función de callback global
        window.onYouTubeIframeAPIReady = function() {
            createYouTubePlayer(videoId);
        };
        
        // Cargar la API de YouTube
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        // La API ya está cargada, crear el reproductor directamente
        createYouTubePlayer(videoId);
    }
}

/**
 * Crea un reproductor de YouTube con la API de IFrame
 * @param {string} videoId - ID del video de YouTube
 */
function createYouTubePlayer(videoId) {
    youtubePlayer = new YT.Player('youtubePlayerIframe', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'rel': 0,  // No mostrar videos relacionados
            'modestbranding': 1
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

/**
 * Maneja los cambios de estado del reproductor de YouTube
 * @param {Object} event - Evento de cambio de estado
 */
function onPlayerStateChange(event) {
    // Estado 0 = video terminado
    if (event.data === 0) {
        // Verificar si la reproducción automática está activada
        const autoplayEnabled = document.getElementById('autoplaySwitch').checked;
        
        if (autoplayEnabled && currentPlaylistId && currentVideoIndex !== -1) {
            playNextVideo();
        }
    }
}

/**
 * Actualiza los botones de navegación (anterior/siguiente)
 * @param {string} playlistId - ID de la playlist
 * @param {number} videoIndex - Índice del video actual
 */
function updateNavigationButtons(playlistId, videoIndex) {
    const videos = currentPlaylistVideos[playlistId];
    if (!videos) return;
    
    const prevButton = document.getElementById('prevVideoBtn');
    const nextButton = document.getElementById('nextVideoBtn');
    
    // Habilitar/deshabilitar botón anterior
    prevButton.disabled = videoIndex <= 0;
    
    // Habilitar/deshabilitar botón siguiente
    nextButton.disabled = videoIndex >= videos.length - 1;
}

/**
 * Reproduce el video anterior de la playlist
 */
function playPreviousVideo() {
    if (!currentPlaylistId || currentVideoIndex <= 0) return;
    
    const videos = currentPlaylistVideos[currentPlaylistId];
    if (!videos) return;
    
    const newIndex = currentVideoIndex - 1;
    if (newIndex >= 0) {
        playVideo(videos[newIndex], currentPlaylistId, newIndex);
    }
}

/**
 * Reproduce el siguiente video de la playlist
 */
function playNextVideo() {
    if (!currentPlaylistId || currentVideoIndex === -1) return;
    
    const videos = currentPlaylistVideos[currentPlaylistId];
    if (!videos) return;
    
    const newIndex = currentVideoIndex + 1;
    if (newIndex < videos.length) {
        playVideo(videos[newIndex], currentPlaylistId, newIndex);
    }
}

/**
 * Obtiene el ID de un video de YouTube a partir de su URL
 * @param {string} url - URL del video de YouTube
 * @returns {string|null} - ID del video o null si no se pudo extraer
 */
function getYouTubeVideoId(url) {
    if (!url) return null;
    
    // Intentar varios patrones para diferentes formatos de URL de YouTube
    
    // Formato estándar: youtube.com/watch?v=ID
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/e\/|youtube\/watch\?v=|youtube\.com\/watch\?feature=player_embedded&v=)([^#\&\?]*)/);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }
    
    // Formato corto: youtu.be/ID
    match = url.match(/youtu\.be\/([^#\&\?]*)/);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }
    
    // Formato de embed: youtube.com/embed/ID
    match = url.match(/youtube\.com\/embed\/([^#\&\?]*)/);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }
    
    // Si todos los patrones fallan, intentar el patrón general
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    match = url.match(regExp);
    
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

/**
 * Busca videos por nombre o descripción
 * @param {string} searchTerm - Término de búsqueda
 */
async function searchVideos(searchTerm) {
    if (!searchTerm) return;
    
    const profilePin = localStorage.getItem('profilePin');
    
    if (!profilePin) return;
    
    try {
        // Mostrar sección de resultados con indicador de carga
        const searchResultsSection = document.getElementById('searchResultsSection');
        const searchResults = document.getElementById('searchResults');
        
        searchResultsSection.style.display = 'block';
        searchResults.innerHTML = `
            <div class="col-12 text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Buscando...</span>
                </div>
                <p class="mt-2">Buscando "${searchTerm}"...</p>
            </div>
        `;
        
        // Realizar búsqueda
        const response = await fetch(`${API_URL}/restricted/videos?search=${encodeURIComponent(searchTerm)}`, {
            method: 'GET',
            headers: {
                'x-restricted-pin': profilePin
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al buscar videos');
        }
        
        const videos = await response.json();
        
        // Renderizar resultados
        renderSearchResults(videos, searchTerm);
        
    } catch (error) {
        console.error('Error:', error);
        // Mostrar mensaje de error
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Ocurrió un error al buscar. Inténtalo de nuevo.
                </div>
            </div>
        `;
    }
}

/**
 * Renderiza los resultados de búsqueda
 * @param {Array} videos - Videos encontrados
 * @param {string} searchTerm - Término de búsqueda
 */
function renderSearchResults(videos, searchTerm) {
    const searchResults = document.getElementById('searchResults');
    
    // Limpiar resultados anteriores
    searchResults.innerHTML = '';
    
    if (videos.length === 0) {
        // Mostrar mensaje de no resultados
        searchResults.innerHTML = `
            <div class="col-12 text-center">
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h3>No se encontraron resultados</h3>
                    <p>No hay videos que coincidan con "${searchTerm}"</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Renderizar cada video encontrado
    videos.forEach(video => {
        // Obtener ID del video de YouTube para la miniatura
        const videoId = getYouTubeVideoId(video.youtubeUrl);
        const thumbnailUrl = videoId ? 
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 
            'https://via.placeholder.com/320x180.png?text=Video';
        
        const videoCard = document.createElement('div');
        videoCard.className = 'col-md-4 col-lg-3 col-sm-6';
        
        videoCard.innerHTML = `
            <div class="video-card search-result" data-video-id="${video._id}" data-youtube-id="${videoId}" data-video-name="${video.name}">
                <div class="video-thumbnail">
                    <img src="${thumbnailUrl}" alt="${video.name}" class="video-thumbnail-img">
                    <div class="play-overlay">
                        <i class="bi bi-play-circle"></i>
                    </div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.name}</h3>
                    <p class="video-playlist-name">
                        <i class="bi bi-collection"></i> 
                        ${getPlaylistName(video.playlistId) || 'Playlist'}
                    </p>
                </div>
            </div>
        `;
        
        // Añadir evento de clic para reproducir el video
        videoCard.querySelector('.video-card').addEventListener('click', () => {
            playVideo(video);
        });
        
        searchResults.appendChild(videoCard);
    });
}

/**
 * Obtiene el nombre de una playlist por su ID
 * @param {string} playlistId - ID de la playlist
 * @returns {string|null} - Nombre de la playlist o null si no se encuentra
 */
function getPlaylistName(playlistId) {
    const playlist = playlists.find(p => p._id === playlistId);
    return playlist ? playlist.name : null;
}

/**
 * Inicializa los eventos de la página
 */
function initEvents() {
    // Evento para el botón de volver a la selección de perfiles
    const backToProfilesBtn = document.getElementById('backToProfilesBtn');
    if (backToProfilesBtn) {
        backToProfilesBtn.addEventListener('click', () => {
            window.location.href = 'profileSelection.html';
        });
    }
    
    // Evento para el botón de salir
    const exitProfileBtn = document.getElementById('exitProfileBtn');
    if (exitProfileBtn) {
        exitProfileBtn.addEventListener('click', () => {
            // Eliminar datos del perfil del almacenamiento local
            localStorage.removeItem('profileId');
            localStorage.removeItem('profilePin');
            
            // Redireccionar a la selección de perfiles
            window.location.href = 'profileSelection.html';
        });
    }
    
    // Evento para el campo de búsqueda
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    if (searchInput && searchButton) {
        // Buscar al hacer clic en el botón
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                searchVideos(searchTerm);
            }
        });
        
        // Buscar al presionar Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    searchVideos(searchTerm);
                }
            }
        });
    }
    
    // Evento para cerrar la búsqueda
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            document.getElementById('searchResultsSection').style.display = 'none';
            document.getElementById('searchInput').value = '';
        });
    }
    
    // Evento para el modal de video (limpiar iframe al cerrar)
    const videoPlayerModal = document.getElementById('videoPlayerModal');
    if (videoPlayerModal) {
        videoPlayerModal.addEventListener('hidden.bs.modal', () => {
            // Detener y destruir completamente el reproductor si existe
            if (youtubePlayer) {
                try {
                    youtubePlayer.stopVideo();
                    youtubePlayer.destroy();
                } catch (e) {
                    console.error('Error al limpiar el reproductor:', e);
                }
                youtubePlayer = null;
            }
            
            // Limpiar contenedor del reproductor
            const videoPlayer = document.getElementById('videoPlayer');
            if (videoPlayer) {
                videoPlayer.innerHTML = '';
            }
            
            // Reiniciar variables
            currentPlayingVideo = null;
            currentPlaylistId = null;
            currentVideoIndex = -1;
            
            // Asegurarse de que los controles de playlist estén ocultos
            document.getElementById('playlistBadge').classList.add('d-none');
        });
    }
    
    // Eventos para los botones de navegación de playlist
    const prevVideoBtn = document.getElementById('prevVideoBtn');
    const nextVideoBtn = document.getElementById('nextVideoBtn');
    
    if (prevVideoBtn) {
        prevVideoBtn.addEventListener('click', playPreviousVideo);
    }
    
    if (nextVideoBtn) {
        nextVideoBtn.addEventListener('click', playNextVideo);
    }
}