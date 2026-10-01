export interface StoreAppItem {
  id: string;
  name: string;
  developer: string;
  category: 'apps' | 'games';
  subCategory: string;
  rating: number;
  reviewCount: string;
  price: string;
  size: string;
  version: string;
  ageRating: string;
  shortDesc: string;
  fullDesc: string;
  accentColor: string;
  badge?: string;
  isHero?: boolean;
  heroTagline?: string;
  features: string[];
  requirements: {
    os: string;
    ram: string;
    architecture: string;
  };
}

export const STORE_CATALOG: StoreAppItem[] = [
  {
    id: 'discord',
    name: 'Discord',
    developer: 'Discord Inc.',
    category: 'apps',
    subCategory: 'Comunicación',
    rating: 4.8,
    reviewCount: '24.5k',
    price: 'Gratis',
    size: '82.4 MB',
    version: '1.0.9015',
    ageRating: '+13',
    shortDesc: 'Tu lugar para hablar, chatear y pasar el rato con amigos y comunidades.',
    fullDesc: 'Discord es el lugar perfecto para crear un espacio para tus comunidades y amigos. Ya sea que formes parte de un club escolar, un grupo de gaming o simplemente quieras charlar con un puñado de amigos, Discord te lo pone fácil para pasar el rato todos los días y hablar más a menudo con canales de voz y texto de baja latencia.',
    accentColor: '#5865F2',
    badge: 'Más popular',
    isHero: true,
    heroTagline: 'Comunícate, juega en directo y comparte momentos con tu comunidad',
    features: [
      'Canales de voz y texto con latencia ultrabaja',
      'Integración nativa con la bandeja del sistema (System Tray)',
      'Silenciar y reactivar micrófono desde el menú contextual',
      'Servidores y grupos privados totalmente personalizables'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '256 MB mínimo',
      architecture: 'x64 / WebAssembly'
    }
  },
  {
    id: 'desktopmiku',
    name: 'Desktop Miku',
    developer: 'Nekomi Systems / Crypton',
    category: 'apps',
    subCategory: 'Personalización',
    rating: 4.9,
    reviewCount: '42.1k',
    price: 'Gratis',
    size: '45.0 MB',
    version: '2.5.0',
    ageRating: 'Todas las edades',
    shortDesc: 'Mascota virtual interactiva en tu escritorio con física ragdoll 2D y animaciones en vivo.',
    fullDesc: 'Dale vida a tu entorno de trabajo con Desktop Miku. Impulsada por Three.js y un motor físico ragdoll 2D en tiempo real, puedes interactuar directamente con Hatsune Miku, agarrarla de sus extremidades con físicas de muñeco de trapo, alternar entre vestimentas, ajustar su escala y mantenerla como compañera en tu escritorio.',
    accentColor: '#39C5BB',
    badge: 'Selección del Editor',
    isHero: true,
    heroTagline: 'Tu compañera virtual interactiva con física ragdoll sobre el escritorio',
    features: [
      'Física ragdoll (muñeco de trapo) interactiva con arrastre de cursor',
      'Límites de pantalla para que interactúe dentro del marco del escritorio',
      'Configuración de tamaño, poses y atuendos personalizables',
      'Minimizado discreto e integración en la barra de tareas'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '512 MB (aceleración por hardware recomendada)',
      architecture: 'WebGL 2.0 compatible'
    }
  },
  {
    id: 'spotify',
    name: 'Spotify',
    developer: 'Spotify AB',
    category: 'apps',
    subCategory: 'Música',
    rating: 4.7,
    reviewCount: '19.8k',
    price: 'Gratis',
    size: '95.1 MB',
    version: '1.2.31',
    ageRating: '+12',
    shortDesc: 'Millones de canciones, álbumes y podcasts listos para reproducir.',
    fullDesc: 'Con Spotify en Frost-OS, disfruta de tus artistas favoritos, descubre lanzamientos destacados y reproduce listas de música adaptadas a tu gusto. Interfaz fluida, modo oscuro envolvente y reproducción constante mientras trabajas.',
    accentColor: '#1DB954',
    badge: 'Destacado',
    isHero: true,
    heroTagline: 'Música y podcasts sin interrupciones para cada momento de tu día',
    features: [
      'Acceso a millones de pistas y podcasts',
      'Listas de reproducción inteligentes según tus preferencias',
      'Diseño moderno optimizado para rendimiento',
      'Controles rápidos integrados en el sistema'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '256 MB',
      architecture: 'x64 / WebAudio'
    }
  },
  {
    id: 'photos',
    name: 'Fotos',
    developer: 'Frost Corporation',
    category: 'apps',
    subCategory: 'Foto y Video',
    rating: 4.8,
    reviewCount: '12.1k',
    price: 'Gratis',
    size: '28.6 MB',
    version: '2026.11',
    ageRating: 'Todas las edades',
    shortDesc: 'Visualizador y organizador de imágenes con diseño Glass Blur, zoom y pase de diapositivas.',
    fullDesc: 'La aplicación Fotos brinda una experiencia ágil y elegante para explorar toda la galería fotográfica de Frost-OS. Diseñada con desenfoque acrílico, ofrece un visor inmersivo con zoom, rotación de imágenes, panel de metadatos detallados y opción de establecer como fondo de pantalla con un clic.',
    accentColor: '#0078D4',
    badge: 'Nuevo',
    isHero: false,
    features: [
      'Superficie de cristal translúcido Glass Blur (Acrylic)',
      'Visor interactivo con zoom (+/-), rotación 90° y volteo horizontal',
      'Pase de diapositivas (slideshow) automatizado',
      'Tira de miniaturas inferior (filmstrip) interactiva',
      'Botón directo "Establecer como fondo de pantalla"'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '128 MB',
      architecture: 'Cualquiera'
    }
  },
  {
    id: 'explorer',
    name: 'Archivos',
    developer: 'Frost Corporation',
    category: 'apps',
    subCategory: 'Productividad',
    rating: 4.9,
    reviewCount: '16.4k',
    price: 'Gratis',
    size: '32.0 MB',
    version: '2.1.0',
    ageRating: 'Todas las edades',
    shortDesc: 'Explorador de archivos moderno con diseño Glass Blur y carga de archivos locales.',
    fullDesc: 'Gestiona tus carpetas, archivos y documentos dentro del sistema de archivos virtual de Frost-OS. Cuenta con soporte para cargar archivos reales desde tu equipo físico, vista de árbol lateral, menú contextual del sistema y enlace directo con la app Fotos.',
    accentColor: '#F2B824',
    badge: 'Esencial',
    isHero: false,
    features: [
      'Navegación tipo Windows con barra de ruta y árbol de directorios',
      'Carga de archivos locales hacia el almacenamiento del sistema operativo',
      'Menú contextual nativo de Frost-OS con opciones completas',
      'Asociación automática con Fotos para abrir imágenes al instante'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '128 MB',
      architecture: 'IndexedDB Storage'
    }
  },
  {
    id: 'mspaint',
    name: 'Microsoft Paint',
    developer: 'Frost Corporation',
    category: 'apps',
    subCategory: 'Creatividad',
    rating: 4.5,
    reviewCount: '8.3k',
    price: 'Gratis',
    size: '34.2 MB',
    version: '11.2304',
    ageRating: 'Todas las edades',
    shortDesc: 'El clásico editor gráfico para realizar bocetos, dibujos y edición rápida de imágenes.',
    fullDesc: 'Paint es una herramienta sencilla y potente para la creación artística y el retoque rápido de capturas de pantalla. Incluye múltiples estilos de pincel, formas geométricas, selector de colores RGB y herramientas de relleno.',
    accentColor: '#E05338',
    badge: 'Clásico',
    isHero: false,
    features: [
      'Lienzo de dibujo fluido con soporte de ratón y lápiz táctil',
      'Herramientas clásicas: lápiz, borrador, cuentagotas y bote de pintura',
      'Paleta de colores expandible y selectores personalizados',
      'Exportación de creaciones en formatos de imagen estándar'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '128 MB',
      architecture: 'HTML5 Canvas'
    }
  },
  {
    id: 'calculator',
    name: 'Calculadora',
    developer: 'Frost Corporation',
    category: 'apps',
    subCategory: 'Herramientas',
    rating: 4.6,
    reviewCount: '6.9k',
    price: 'Gratis',
    size: '12.4 MB',
    version: '11.2',
    ageRating: 'Todas las edades',
    shortDesc: 'Calculadora rápida y versátil para resolver cálculos matemáticos diarios.',
    fullDesc: 'Calculadora compacta y ergonómica inspirada en la interfaz de Windows. Permite realizar operaciones matemáticas básicas, porcentajes, memoria y atajos mediante el teclado numérico de tu equipo.',
    accentColor: '#0078D4',
    features: [
      'Operaciones aritméticas estándar instantáneas',
      'Historial de operaciones y funciones de memoria (M+, M-, MR)',
      'Soporte completo de teclado numérico físico',
      'Diseño compacto y adaptable'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '64 MB',
      architecture: 'Cualquiera'
    }
  },
  {
    id: 'notepad',
    name: 'Notepad',
    developer: 'Frost Corporation',
    category: 'apps',
    subCategory: 'Productividad',
    rating: 4.7,
    reviewCount: '14.2k',
    price: 'Gratis',
    size: '8.5 MB',
    version: '11.24',
    ageRating: 'Todas las edades',
    shortDesc: 'Editor de texto sin distracciones para notas rápidas, apuntes y edición de código.',
    fullDesc: 'Notepad es la herramienta clásica por excelencia para escribir notas rápidas, guardar fragmentos de texto o inspeccionar archivos de código. Cuenta con conteo de palabras, ajuste de línea y almacenamiento automático.',
    accentColor: '#4B9FE1',
    features: [
      'Apertura ultra rápida y bajo consumo de recursos',
      'Almacenamiento persistente en el sistema operativo',
      'Ajuste de línea automático y selector de fuente',
      'Compatible con formato de texto enriquecido y plano'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '64 MB',
      architecture: 'Cualquiera'
    }
  },
  {
    id: 'doomgame',
    name: 'Doom Game',
    developer: 'id Software / Frost Retro',
    category: 'games',
    subCategory: 'Acción',
    rating: 4.9,
    reviewCount: '58.3k',
    price: 'Gratis',
    size: '12.8 MB',
    version: '1.9 Ultimate',
    ageRating: '+16',
    shortDesc: 'El legendario shooter en primera persona de 1993 optimizado para jugar en el navegador.',
    fullDesc: 'Ponte las botas del Doom Slayer y viaja a las lunas de Fobos y Deimos en Marte. Revive los niveles originales del shooter más influyente de la historia con música midi legendaria, arsenal clásico (escopeta, lanzacohetes, BFG 9000) y fluidez a 60 FPS.',
    accentColor: '#B12025',
    badge: 'Juego Legendario',
    isHero: true,
    heroTagline: 'El clásico indiscutible que revolucionó la industria de los videojuegos',
    features: [
      'Episodios y mapas clásicos originales completos',
      'Banda sonora y efectos sonoros retro inolvidables',
      'Controles optimizados para teclado y ratón',
      'Guardado de partida y rendimiento óptimo'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '256 MB',
      architecture: 'WebAssembly / JS-DOS'
    }
  },
  {
    id: 'bibootaxgame',
    name: 'Biboo Tax Game',
    developer: 'Hololive Fan Studios',
    category: 'games',
    subCategory: 'Casual',
    rating: 4.8,
    reviewCount: '11.7k',
    price: 'Gratis',
    size: '15.6 MB',
    version: '1.2.0',
    ageRating: 'Todas las edades',
    shortDesc: 'Divertido minijuego arcade casual de esquivar obstáculos y recolectar tributos de gemas.',
    fullDesc: '¡Ayuda a la pequeña gema Koseki Bijou a recolectar todos los impuestos de gemas! Esquiva trampas, aprovecha multiplicadores de puntuación y desafía tu velocidad de reacción en este adictivo y alegre juego arcade.',
    accentColor: '#A855F7',
    badge: 'Popular',
    isHero: false,
    features: [
      'Estilo artístico pixel art y chibi adorable',
      'Música animada y efectos de sonido enérgicos',
      'Puntuaciones máximas guardadas localmente',
      'Curva de dificultad accesible y divertida'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '128 MB',
      architecture: 'HTML5 Canvas'
    }
  },
  {
    id: 'tetris',
    name: 'Tetris',
    developer: 'The Tetris Company / Retro',
    category: 'games',
    subCategory: 'Puzzle',
    rating: 4.9,
    reviewCount: '33.1k',
    price: 'Gratis',
    size: '9.2 MB',
    version: '2.0.1',
    ageRating: 'Todas las edades',
    shortDesc: 'El juego de acertijos más famoso del mundo: rota las piezas y limpia líneas sin parar.',
    fullDesc: 'Tetris ofrece una experiencia atemporal donde encajas diferentes tetrominós que caen de la parte superior. A medida que despejas líneas consecutivas, la velocidad aumenta. ¡Entrena tus reflejos y bate tus récords personales!',
    accentColor: '#06B6D4',
    badge: 'Clásico Imperdible',
    isHero: false,
    features: [
      'Fiel al gameplay clásico con rotación SRS',
      'Efectos visuales modernos y sonido de caída nítido',
      'Múltiples niveles de velocidad y dificultad progresiva',
      'Estadísticas de líneas completadas y mayor puntuación'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '64 MB',
      architecture: 'Cualquiera'
    }
  },
  {
    id: 'music',
    name: 'Música',
    developer: 'Frost Corporation',
    category: 'apps',
    subCategory: 'Música',
    rating: 4.4,
    reviewCount: '5.2k',
    price: 'Gratis',
    size: '18.3 MB',
    version: '1.0.3',
    ageRating: 'Todas las edades',
    shortDesc: 'Reproductor local de canciones con soporte de listas de pistas y controles rápidos.',
    fullDesc: 'Reproduce pistas de audio en diversos formatos digitales con ecualizador gráfico y listas de reproducción sencillas. Ideal para escuchar archivos de audio locales sin conexión a internet.',
    accentColor: '#D13438',
    features: [
      'Reproducción de archivos MP3, WAV y OGG',
      'Controles multimedia directos: pausar, saltar pista y barra de progreso',
      'Visualizador de espectro sonoro reactivo',
      'Bajo impacto en memoria'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '64 MB',
      architecture: 'WebAudio'
    }
  },
  {
    id: 'pdf_viewer',
    name: 'PDF Viewer',
    developer: 'Frost Corporation',
    category: 'apps',
    subCategory: 'Productividad',
    rating: 4.8,
    reviewCount: '15.3k',
    price: 'Gratis',
    size: '22.4 MB',
    version: '2.1.0',
    ageRating: 'Todas las edades',
    shortDesc: 'Visor moderno de documentos PDF con navegación fluida, miniaturas, zoom y diseño Glass.',
    fullDesc: 'PDF Viewer es la herramienta definitiva para abrir, explorar y gestionar documentos en formato PDF dentro de Frost-OS. Diseñado con una interfaz Glass Blur translúcida, incluye soporte para miniaturas de páginas, zoom ajustable, rotación de páginas, búsqueda rápida y carga directa de archivos locales.',
    accentColor: '#E11D48',
    badge: 'Nuevo',
    features: [
      'Apertura instantánea de archivos .pdf asociados',
      'Panel lateral de miniaturas para navegación rápida',
      'Zoom interactivo (50% a 250%) y ajuste al ancho de página',
      'Rotación de documentos en 90°, 180° y 270°',
      'Impresión y exportación directa de documentos'
    ],
    requirements: {
      os: 'Frost-OS v1.0 o superior',
      ram: '128 MB',
      architecture: 'WebDocument'
    }
  }
];
