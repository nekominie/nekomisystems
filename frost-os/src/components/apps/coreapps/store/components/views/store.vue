<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { STORE_CATALOG, type StoreAppItem } from '../../store_data'
import { OS_KEY } from '../../../../../api/os_api'
import IconManager from '../../../../../os/iconmanager.vue'
import { useLockStore } from '../../../../../os/lock/lock_store'

const os = inject(OS_KEY)
if (!os) throw new Error('OS API not found')

const lockStore = useLockStore()

// Navigation state
const activeTab = ref<'home' | 'apps' | 'games' | 'library'>('home')
const searchQuery = ref('')
const selectedCategoryFilter = ref<string>('todos')
const selectedApp = ref<StoreAppItem | null>(null)

// Hero carousel state
const heroIndex = ref(0)
const heroApps = computed(() => STORE_CATALOG.filter(a => a.isHero))
let heroTimer: number | null = null

const startHeroTimer = () => {
  stopHeroTimer()
  heroTimer = window.setInterval(() => {
    if (heroApps.value.length > 0) {
      heroIndex.value = (heroIndex.value + 1) % heroApps.value.length
    }
  }, 5500)
}

const stopHeroTimer = () => {
  if (heroTimer !== null) {
    clearInterval(heroTimer)
    heroTimer = null
  }
}

const nextHero = () => {
  heroIndex.value = (heroIndex.value + 1) % heroApps.value.length
  startHeroTimer()
}

const prevHero = () => {
  heroIndex.value = (heroIndex.value - 1 + heroApps.value.length) % heroApps.value.length
  startHeroTimer()
}

onMounted(() => {
  startHeroTimer()
  window.addEventListener('keydown', onKeyDown)
  lockStore.loadUserProfile()
})

onUnmounted(() => {
  stopHeroTimer()
  stopDrag()
  window.removeEventListener('keydown', onKeyDown)
})

// Installed check
const isInstalled = (appId: string) => {
  return os.state.apps.some(a => a.manifest.id === appId)
}

// Installation simulation state
const installingAppId = ref<string | null>(null)
const installProgress = ref<number>(0)
const installStatusText = ref<string>('')
const installDownloadedMb = ref<number>(0)
const installTotalMb = ref<number>(0)
const installSpeed = ref<string>('')
const installPhase = ref<'starting' | 'downloading' | 'verifying' | 'installing' | 'complete' | null>(null)
let downloadCancelRequested = false

const getAppSizeInMb = (appId: string): number => {
  const item = STORE_CATALOG.find(a => a.id === appId)
  if (!item) return 25.0
  const match = item.size.match(/([\d.]+)\s*(GB|MB|KB)?/i)
  if (!match) return 25.0
  const val = parseFloat(match[1])
  const unit = (match[2] || 'MB').toUpperCase()
  if (unit === 'GB') return val * 1024
  if (unit === 'KB') return Math.max(0.5, val / 1024)
  return val
}

const cancelDownload = () => {
  downloadCancelRequested = true
}

const resetInstallState = () => {
  installingAppId.value = null
  installProgress.value = 0
  installStatusText.value = ''
  installDownloadedMb.value = 0
  installTotalMb.value = 0
  installSpeed.value = ''
  installPhase.value = null
  downloadCancelRequested = false
}

const installAppWithSimulation = async (appId: string) => {
  if (installingAppId.value || isInstalled(appId)) return

  downloadCancelRequested = false
  installingAppId.value = appId
  installProgress.value = 0
  installPhase.value = 'starting'
  installStatusText.value = 'Iniciando descarga...'

  const totalMb = getAppSizeInMb(appId)
  installTotalMb.value = totalMb
  installDownloadedMb.value = 0

  // Duración dinámica en función del peso de la app:
  // Base 2.2s + 55ms por cada MB, acotado entre 2.5s y 7.5s
  const downloadDurationMs = Math.min(7500, Math.max(2500, Math.round(2200 + totalMb * 55)))
  const avgSpeed = (totalMb / (downloadDurationMs / 1000)).toFixed(1)
  installSpeed.value = `${avgSpeed} MB/s`

  // Fase 1: Handshake y obtención de licencia (350ms)
  await new Promise(r => setTimeout(r, 350))
  if (downloadCancelRequested) {
    resetInstallState()
    return
  }

  // Fase 2: Descarga continua proporcional al tamaño
  installPhase.value = 'downloading'
  installStatusText.value = 'Descargando...'

  const startTime = Date.now()
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (downloadCancelRequested) {
        clearInterval(timer)
        resolve()
        return
      }

      const elapsed = Date.now() - startTime
      const progressRatio = Math.min(1, elapsed / downloadDurationMs)

      // El progreso de descarga llega hasta el 88%
      const currentProgress = Math.min(88, Math.round(progressRatio * 88))
      installProgress.value = currentProgress

      const downloaded = (totalMb * (currentProgress / 88)).toFixed(1)
      installDownloadedMb.value = parseFloat(downloaded)

      // Fluctuación realista de velocidad (+/- 12%)
      const jitterSpeed = (parseFloat(avgSpeed) * (0.9 + Math.random() * 0.2)).toFixed(1)
      installSpeed.value = `${jitterSpeed} MB/s`

      if (progressRatio >= 1) {
        clearInterval(timer)
        resolve()
      }
    }, 50)
  })

  if (downloadCancelRequested) {
    resetInstallState()
    return
  }

  installDownloadedMb.value = totalMb

  // Fase 3: Verificación de firmas y suma de comprobación SHA-256 (450ms)
  installPhase.value = 'verifying'
  installProgress.value = 92
  installStatusText.value = 'Verificando paquete...'
  await new Promise(r => setTimeout(r, 450))
  if (downloadCancelRequested) {
    resetInstallState()
    return
  }

  // Fase 4: Desempaquetado e instalación en Frost OS (550ms)
  installPhase.value = 'installing'
  installProgress.value = 97
  installStatusText.value = 'Instalando en Frost-OS...'
  await new Promise(r => setTimeout(r, 550))
  if (downloadCancelRequested) {
    resetInstallState()
    return
  }

  // Instalar en el sistema
  await os.installApp(appId)

  // Fase 5: Finalización
  installPhase.value = 'complete'
  installProgress.value = 100
  installStatusText.value = '¡Instalado!'
  await new Promise(r => setTimeout(r, 600))

  resetInstallState()
}

// Launch app
const launchApp = (appId: string) => {
  os.launchApp(appId)
}

// Uninstall modal state (Windows-style dialog)
const appToUninstall = ref<StoreAppItem | null>(null)
const isUninstalling = ref(false)
const dialogOffset = ref({ x: 0, y: 0 })
let isDraggingDialog = false
let dragStartCoords = { x: 0, y: 0 }
let initialOffset = { x: 0, y: 0 }

const startDrag = (e: MouseEvent) => {
  if (e.button !== 0) return
  isDraggingDialog = true
  dragStartCoords = { x: e.clientX, y: e.clientY }
  initialOffset = { ...dialogOffset.value }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', stopDrag)
}

const onDragMove = (e: MouseEvent) => {
  if (!isDraggingDialog) return
  dialogOffset.value = {
    x: initialOffset.x + (e.clientX - dragStartCoords.x),
    y: initialOffset.y + (e.clientY - dragStartCoords.y)
  }
}

const stopDrag = () => {
  if (!isDraggingDialog) return
  isDraggingDialog = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', stopDrag)
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && appToUninstall.value && !isUninstalling.value) {
    cancelUninstall()
  }
}

const promptUninstall = (app: StoreAppItem) => {
  dialogOffset.value = { x: 0, y: 0 }
  appToUninstall.value = app
}

const cancelUninstall = () => {
  if (isUninstalling.value) return
  appToUninstall.value = null
}

const confirmUninstall = async () => {
  if (!appToUninstall.value || isUninstalling.value) return
  isUninstalling.value = true
  try {
    await os.uninstallApp(appToUninstall.value.id)
  } finally {
    isUninstalling.value = false
    appToUninstall.value = null
  }
}

// Library update check simulation
const isCheckingUpdates = ref(false)
const updateMessage = ref<string | null>(null)

const checkForUpdates = async () => {
  if (isCheckingUpdates.value) return
  isCheckingUpdates.value = true
  updateMessage.value = null

  await new Promise(r => setTimeout(r, 1600))
  isCheckingUpdates.value = false
  updateMessage.value = 'Todas las aplicaciones y componentes están actualizados.'
  setTimeout(() => {
    updateMessage.value = null
  }, 4000)
}

// Filtered apps computation
const filteredApps = computed(() => {
  let list = STORE_CATALOG

  // Search filter
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        a.shortDesc.toLowerCase().includes(q) ||
        a.subCategory.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q)
    )
  }

  // Active tab filter
  if (activeTab.value === 'apps') {
    list = list.filter(a => a.category === 'apps')
  } else if (activeTab.value === 'games') {
    list = list.filter(a => a.category === 'games')
  } else if (activeTab.value === 'library') {
    list = list.filter(a => isInstalled(a.id))
  }

  // Subcategory chip filter
  if (selectedCategoryFilter.value !== 'todos') {
    list = list.filter(a => a.subCategory.toLowerCase().includes(selectedCategoryFilter.value.toLowerCase()))
  }

  return list
})

// Subcategory chips based on active tab
const currentFilterPills = computed(() => {
  if (activeTab.value === 'apps') {
    return [
      { id: 'todos', label: 'Todas' },
      { id: 'comunicación', label: 'Comunicación' },
      { id: 'productividad', label: 'Productividad' },
      { id: 'foto', label: 'Foto y Video' },
      { id: 'música', label: 'Música' },
      { id: 'creatividad', label: 'Creatividad' },
      { id: 'herramientas', label: 'Herramientas' },
      { id: 'personalización', label: 'Personalización' }
    ]
  } else if (activeTab.value === 'games') {
    return [
      { id: 'todos', label: 'Todos' },
      { id: 'acción', label: 'Acción' },
      { id: 'casual', label: 'Casual' },
      { id: 'puzzle', label: 'Puzzle' }
    ]
  }
  return [
    { id: 'todos', label: 'Destacados' },
    { id: 'productividad', label: 'Productividad' },
    { id: 'comunicación', label: 'Redes' },
    { id: 'música', label: 'Música' },
    { id: 'foto', label: 'Multimedia' }
  ]
})

const installedCount = computed(() => {
  return STORE_CATALOG.filter(a => isInstalled(a.id)).length
})

const viewAppDetails = (app: StoreAppItem) => {
  selectedApp.value = app
}

const backToStore = () => {
  selectedApp.value = null
}

const selectNav = (tab: 'home' | 'apps' | 'games' | 'library') => {
  activeTab.value = tab
  selectedApp.value = null
  selectedCategoryFilter.value = 'todos'
}

</script>

<template>
  <div class="store-app-window">
    <!-- SIDEBAR DE NAVEGACIÓN -->
    <aside class="store-sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon-box">
          <IconManager id="store" class="brand-store-icon" />
        </div>
        <div class="brand-texts">
          <span class="brand-name">Tienda de Apps</span>
          <span class="brand-subtitle">Frost-OS</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button 
          class="nav-item" 
          :class="{ active: activeTab === 'home' && !selectedApp }"
          @click="selectNav('home')"
        >
          <i class="bi bi-house-door-fill"></i>
          <span>Inicio</span>
        </button>

        <button 
          class="nav-item" 
          :class="{ active: activeTab === 'apps' && !selectedApp }"
          @click="selectNav('apps')"
        >
          <i class="bi bi-grid-fill"></i>
          <span>Aplicaciones</span>
        </button>

        <button 
          class="nav-item" 
          :class="{ active: activeTab === 'games' && !selectedApp }"
          @click="selectNav('games')"
        >
          <i class="bi bi-controller"></i>
          <span>Juegos</span>
        </button>

        <div class="nav-divider"></div>

        <button 
          class="nav-item" 
          :class="{ active: activeTab === 'library' && !selectedApp }"
          @click="selectNav('library')"
        >
          <i class="bi bi-collection-play-fill"></i>
          <span>Biblioteca</span>
          <span class="library-badge">{{ installedCount }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="user-badge">
          <div 
            class="user-avatar-circle"
            :style="lockStore.userAvatarUrl ? { backgroundImage: `url(${lockStore.userAvatarUrl})` } : {}"
          >
            <i v-if="!lockStore.userAvatarUrl" class="bi bi-person-fill"></i>
          </div>
          <div class="user-info">
            <span class="user-name">{{ lockStore.userName || 'Usuario' }}</span>
            <span class="user-status"><span class="status-dot"></span>Conectado</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- ÁREA DE CONTENIDO PRINCIPAL -->
    <main class="store-main-area">
      <!-- HEADER CON BUSCADOR Y BREADCRUMB -->
      <header class="store-topbar">
        <div class="topbar-left">
          <button v-if="selectedApp" class="back-btn" @click="backToStore">
            <i class="bi bi-arrow-left"></i>
            <span>Volver a la tienda</span>
          </button>
          <div v-else class="page-title-badge">
            <span v-if="activeTab === 'home'">Descubrir</span>
            <span v-else-if="activeTab === 'apps'">Aplicaciones</span>
            <span v-else-if="activeTab === 'games'">Juegos</span>
            <span v-else-if="activeTab === 'library'">Mi Biblioteca</span>
          </div>
        </div>

        <div class="topbar-center">
          <div class="search-input-box">
            <i class="bi bi-search"></i>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Buscar aplicaciones, juegos y herramientas..."
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>

        <div class="topbar-right">
          <button class="topbar-btn" title="Historial y descargas" @click="selectNav('library')">
            <i class="bi bi-download"></i>
          </button>
          <div class="topbar-user-profile" title="Cuenta actual">
            <div 
              class="topbar-user-avatar"
              :style="lockStore.userAvatarUrl ? { backgroundImage: `url(${lockStore.userAvatarUrl})` } : {}"
            >
              <i v-if="!lockStore.userAvatarUrl" class="bi bi-person-fill"></i>
            </div>
            <span class="topbar-user-name">{{ lockStore.userName || 'Usuario' }}</span>
          </div>
        </div>
      </header>

      <!-- VISTA: DETALLE DE APLICACIÓN -->
      <div v-if="selectedApp" class="store-content-scroll detail-view">
        <div class="detail-hero-banner" :style="{ '--app-accent': selectedApp.accentColor }">
          <div class="detail-banner-content">
            <div class="detail-icon-box">
              <IconManager :id="selectedApp.id" class="detail-app-icon" />
            </div>

            <div class="detail-header-info">
              <div class="detail-badge-row">
                <span class="detail-subcat">{{ selectedApp.subCategory }}</span>
                <span v-if="selectedApp.badge" class="detail-badge">{{ selectedApp.badge }}</span>
              </div>
              <h1 class="detail-app-title">{{ selectedApp.name }}</h1>
              <div class="detail-dev-row">
                <span class="detail-dev">{{ selectedApp.developer }}</span>
                <span class="detail-dot">•</span>
                <span class="detail-price">{{ selectedApp.price }}</span>
              </div>

              <!-- RATING & REVIEWS -->
              <div class="detail-rating-row">
                <div class="stars-box">
                  <i v-for="n in 5" :key="n" class="bi bi-star-fill text-warning"></i>
                  <span class="rating-num">{{ selectedApp.rating }}</span>
                </div>
                <span class="rating-count">({{ selectedApp.reviewCount }})</span>
                <span class="detail-dot">•</span>
                <span class="age-badge">{{ selectedApp.ageRating }}</span>
              </div>

              <!-- ACCIONES DE INSTALACIÓN / ABRIR -->
              <div class="detail-actions-row">
                <template v-if="installingAppId === selectedApp.id">
                  <div class="install-progress-box">
                    <div class="install-progress-header">
                      <div class="install-status-group">
                        <i v-if="installPhase === 'downloading'" class="bi bi-arrow-down-circle-fill spin-pulse-icon"></i>
                        <i v-else-if="installPhase === 'verifying'" class="bi bi-shield-check text-info"></i>
                        <i v-else-if="installPhase === 'installing'" class="bi bi-gear-fill spin-icon"></i>
                        <i v-else-if="installPhase === 'complete'" class="bi bi-check-circle-fill text-success"></i>
                        <i v-else class="bi bi-hourglass-split"></i>
                        <span class="install-status-label">{{ installStatusText }}</span>
                      </div>
                      <span class="install-percent-badge">{{ installProgress }}%</span>
                    </div>

                    <div class="install-progress-bar">
                      <div 
                        class="install-progress-fill" 
                        :class="{ 'striped-anim': installPhase === 'downloading' || installPhase === 'installing' }"
                        :style="{ width: `${installProgress}%` }"
                      ></div>
                    </div>

                    <div class="install-progress-sub">
                      <span v-if="installPhase === 'downloading'">
                        {{ installDownloadedMb }} MB de {{ installTotalMb }} MB • {{ installSpeed }}
                      </span>
                      <span v-else-if="installPhase === 'verifying'">
                        Comprobando integridad y firmas...
                      </span>
                      <span v-else-if="installPhase === 'installing'">
                        Configurando ejecutables y accesos directos...
                      </span>
                      <span v-else-if="installPhase === 'complete'">
                        Listo para usar en Frost OS
                      </span>
                      <span v-else>
                        Tamaño: {{ installTotalMb }} MB
                      </span>

                      <button 
                        v-if="installPhase === 'downloading' || installPhase === 'starting'" 
                        class="btn-cancel-download" 
                        @click="cancelDownload" 
                        title="Cancelar descarga"
                      >
                        <i class="bi bi-x"></i>
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else-if="isInstalled(selectedApp.id)">
                  <button class="btn-primary-action btn-open" @click="launchApp(selectedApp.id)">
                    <i class="bi bi-box-arrow-up-right"></i>
                    <span>Abrir</span>
                  </button>
                  <button class="btn-secondary-action btn-uninstall" @click="promptUninstall(selectedApp)">
                    <i class="bi bi-trash3-fill"></i>
                    <span>Desinstalar</span>
                  </button>
                </template>

                <template v-else>
                  <button class="btn-primary-action btn-install" @click="installAppWithSimulation(selectedApp.id)">
                    <i class="bi bi-download"></i>
                    <span>Obtener</span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIONES DE DETALLE -->
        <div class="detail-body-grid">
          <!-- COLUMNA PRINCIPAL -->
          <div class="detail-left-col">
            <!-- CAPTURAS / PREVIEW -->
            <section class="detail-section">
              <h3 class="section-title">Vistas previas</h3>
              <div class="screenshots-carousel">
                <div class="screenshot-card" :style="{ borderTopColor: selectedApp.accentColor }">
                  <div class="screenshot-mockup-inner">
                    <IconManager :id="selectedApp.id" class="mockup-bg-icon" />
                    <span class="mockup-tag">Interfaz Principal</span>
                  </div>
                </div>
                <div class="screenshot-card" :style="{ borderTopColor: selectedApp.accentColor }">
                  <div class="screenshot-mockup-inner alt-mock">
                    <i class="bi bi-window-fullscreen mockup-bg-icon"></i>
                    <span class="mockup-tag">Modo Integrado Frost-OS</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- DESCRIPCIÓN -->
            <section class="detail-section">
              <h3 class="section-title">Descripción</h3>
              <p class="detail-full-desc">{{ selectedApp.fullDesc }}</p>
            </section>

            <!-- CARACTERÍSTICAS -->
            <section class="detail-section">
              <h3 class="section-title">Características principales</h3>
              <ul class="features-list">
                <li v-for="(feat, idx) in selectedApp.features" :key="idx" class="feature-item">
                  <i class="bi bi-check2-circle feature-check"></i>
                  <span>{{ feat }}</span>
                </li>
              </ul>
            </section>
          </div>

          <!-- COLUMNA LATERAL DE ESPECIFICACIONES -->
          <div class="detail-right-col">
            <div class="specs-card">
              <h4 class="specs-card-title">Especificaciones</h4>
              <div class="spec-row">
                <span class="spec-label">Tamaño aproximado</span>
                <span class="spec-value">{{ selectedApp.size }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Versión</span>
                <span class="spec-value">{{ selectedApp.version }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Desarrollador</span>
                <span class="spec-value">{{ selectedApp.developer }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Clasificación</span>
                <span class="spec-value">{{ selectedApp.ageRating }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Compatibilidad</span>
                <span class="spec-value">{{ selectedApp.requirements.os }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VISTA: BIBLIOTECA -->
      <div v-else-if="activeTab === 'library'" class="store-content-scroll library-view">
        <div class="library-header-box">
          <div class="library-header-texts">
            <h1 class="library-title">Biblioteca</h1>
            <p class="library-desc">Gestiona todas las aplicaciones instaladas en tu equipo Frost-OS.</p>
          </div>
          <div class="library-header-actions">
            <button class="btn-check-updates" :disabled="isCheckingUpdates" @click="checkForUpdates">
              <i class="bi bi-arrow-repeat" :class="{ 'spin-icon': isCheckingUpdates }"></i>
              <span>{{ isCheckingUpdates ? 'Buscando actualizaciones...' : 'Buscar actualizaciones' }}</span>
            </button>
          </div>
        </div>

        <div v-if="updateMessage" class="update-toast">
          <i class="bi bi-check-circle-fill text-success"></i>
          <span>{{ updateMessage }}</span>
        </div>

        <!-- LISTA DE APPS INSTALADAS -->
        <div class="library-apps-list">
          <div v-for="app in filteredApps" :key="app.id" class="library-app-row">
            <div class="library-app-icon-box" @click="viewAppDetails(app)">
              <IconManager :id="app.id" class="library-icon" />
            </div>

            <div class="library-app-info" @click="viewAppDetails(app)">
              <span class="library-app-name">{{ app.name }}</span>
              <div class="library-app-sub">
                <span>{{ app.developer }}</span>
                <span>•</span>
                <span>{{ app.version }}</span>
                <span>•</span>
                <span>{{ app.size }}</span>
              </div>
            </div>

            <div class="library-app-status">
              <span class="status-pill installed">Instalada</span>
            </div>

            <div class="library-app-actions">
              <button class="btn-lib-action btn-open" title="Abrir aplicación" @click="launchApp(app.id)">
                <i class="bi bi-box-arrow-up-right"></i>
                <span>Abrir</span>
              </button>
              <button class="btn-lib-action btn-uninstall" title="Desinstalar aplicación" @click="promptUninstall(app)">
                <i class="bi bi-trash3-fill"></i>
                <span>Desinstalar</span>
              </button>
            </div>
          </div>

          <div v-if="filteredApps.length === 0" class="empty-library">
            <i class="bi bi-box-seam empty-icon"></i>
            <h3>No tienes aplicaciones de usuario instaladas</h3>
            <p>Visita el Inicio o la sección de Aplicaciones para obtener nuevas apps para tu sistema.</p>
            <button class="btn-go-explore" @click="selectNav('home')">Explorar la Tienda</button>
          </div>
        </div>
      </div>

      <!-- VISTA: INICIO / APPS / JUEGOS -->
      <div v-else class="store-content-scroll catalog-view">
        <!-- FILTER PILLS -->
        <div class="filter-pills-bar">
          <button 
            v-for="pill in currentFilterPills" 
            :key="pill.id"
            class="filter-pill"
            :class="{ active: selectedCategoryFilter === pill.id }"
            @click="selectedCategoryFilter = pill.id"
          >
            {{ pill.label }}
          </button>
        </div>

        <!-- HERO SHOWCASE CAROUSEL (SOLO EN INICIO CUANDO NO HAY BÚSQUEDA) -->
        <div v-if="activeTab === 'home' && !searchQuery && heroApps.length > 0" class="hero-showcase">
          <div 
            class="hero-card"
            :style="{ '--hero-color': heroApps[heroIndex]?.accentColor }"
          >
            <div class="hero-card-left">
              <span class="hero-badge">{{ heroApps[heroIndex]?.badge || 'Destacado del editor' }}</span>
              <h2 class="hero-title">{{ heroApps[heroIndex]?.name }}</h2>
              <p class="hero-tagline">{{ heroApps[heroIndex]?.heroTagline || heroApps[heroIndex]?.shortDesc }}</p>

              <div class="hero-cta-row">
                <template v-if="isInstalled(heroApps[heroIndex]?.id)">
                  <button class="btn-hero-primary" @click="launchApp(heroApps[heroIndex]?.id)">
                    <i class="bi bi-box-arrow-up-right"></i>
                    <span>Abrir</span>
                  </button>
                </template>
                <template v-else-if="installingAppId === heroApps[heroIndex]?.id">
                  <div class="hero-progress-box">
                    <div class="hero-progress-header">
                      <span class="hero-progress-status">
                        <i class="bi bi-arrow-down-circle-fill spin-pulse-icon"></i>
                        {{ installStatusText }}
                      </span>
                      <span class="hero-progress-percent">{{ installProgress }}%</span>
                    </div>
                    <div class="hero-progress-bar">
                      <div class="hero-progress-fill" :style="{ width: `${installProgress}%` }"></div>
                    </div>
                    <div class="hero-progress-sub">
                      <span>{{ installDownloadedMb }} MB / {{ installTotalMb }} MB • {{ installSpeed }}</span>
                      <button 
                        v-if="installPhase === 'downloading' || installPhase === 'starting'" 
                        class="hero-cancel-btn" 
                        @click="cancelDownload" 
                        title="Cancelar descarga"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <button 
                    class="btn-hero-primary" 
                    @click="installAppWithSimulation(heroApps[heroIndex]?.id)"
                  >
                    <i class="bi bi-download"></i>
                    <span>Obtener</span>
                  </button>
                </template>
                <button class="btn-hero-secondary" @click="viewAppDetails(heroApps[heroIndex])">
                  <span>Detalles</span>
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>

            <div class="hero-card-right">
              <div class="hero-icon-showcase">
                <IconManager :id="heroApps[heroIndex]?.id" class="hero-giant-icon" />
              </div>
            </div>
          </div>

          <!-- CONTROLES DEL CAROUSEL -->
          <button class="carousel-arrow prev" @click="prevHero">
            <i class="bi bi-chevron-left"></i>
          </button>
          <button class="carousel-arrow next" @click="nextHero">
            <i class="bi bi-chevron-right"></i>
          </button>

          <div class="carousel-indicators">
            <span 
              v-for="(_, idx) in heroApps" 
              :key="idx" 
              class="indicator-dot" 
              :class="{ active: idx === heroIndex }"
              @click="heroIndex = idx"
            ></span>
          </div>
        </div>

        <!-- SECCIÓN: JUEGOS POPULARES EN INICIO -->
        <div v-if="activeTab === 'home' && !searchQuery" class="catalog-section">
          <div class="section-header-row">
            <h2 class="section-title">
              <i class="bi bi-controller text-info"></i>
              Juegos destacados
            </h2>
            <button class="see-all-link" @click="selectNav('games')">Ver todos</button>
          </div>

          <div class="cards-grid">
            <div 
              v-for="app in STORE_CATALOG.filter(a => a.category === 'games')" 
              :key="app.id"
              class="store-card"
              @click="viewAppDetails(app)"
            >
              <div class="card-icon-wrap" :style="{ '--app-color': app.accentColor }">
                <IconManager :id="app.id" class="card-icon" />
              </div>
              <div class="card-info">
                <h3 class="card-name">{{ app.name }}</h3>
                <span class="card-sub">{{ app.subCategory }}</span>
                <div class="card-meta">
                  <div class="card-rating">
                    <i class="bi bi-star-fill text-warning"></i>
                    <span>{{ app.rating }}</span>
                  </div>
                  <span class="card-price">{{ isInstalled(app.id) ? 'Instalada' : 'Gratis' }}</span>
                </div>
              </div>
              <div class="card-action-bar">
                <button 
                  v-if="isInstalled(app.id)" 
                  class="card-btn open" 
                  @click.stop="launchApp(app.id)"
                >
                  Abrir
                </button>
                <div 
                  v-else-if="installingAppId === app.id" 
                  class="card-progress-wrapper"
                  @click.stop
                >
                  <div class="card-progress-bar">
                    <div class="card-progress-fill" :style="{ width: `${installProgress}%` }"></div>
                  </div>
                  <div class="card-progress-labels">
                    <span class="card-progress-text">
                      {{ installPhase === 'downloading' ? `Descargando (${installProgress}%)` : installStatusText }}
                    </span>
                    <span class="card-progress-mb" v-if="installPhase === 'downloading'">
                      {{ installDownloadedMb }}/{{ installTotalMb }}M
                    </span>
                  </div>
                </div>
                <button 
                  v-else 
                  class="card-btn install"
                  @click.stop="installAppWithSimulation(app.id)"
                >
                  Obtener
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN: TODAS LAS APLICACIONES / RESULTADOS -->
        <div class="catalog-section">
          <div class="section-header-row">
            <h2 class="section-title">
              <span v-if="searchQuery">Resultados de "{{ searchQuery }}" ({{ filteredApps.length }})</span>
              <span v-else-if="activeTab === 'apps'">Todas las aplicaciones</span>
              <span v-else-if="activeTab === 'games'">Todos los juegos</span>
              <span v-else>Aplicaciones populares</span>
            </h2>
          </div>

          <div class="cards-grid">
            <div 
              v-for="app in filteredApps" 
              :key="app.id"
              class="store-card"
              @click="viewAppDetails(app)"
            >
              <div class="card-icon-wrap" :style="{ '--app-color': app.accentColor }">
                <IconManager :id="app.id" class="card-icon" />
              </div>
              <div class="card-info">
                <h3 class="card-name">{{ app.name }}</h3>
                <span class="card-sub">{{ app.subCategory }}</span>
                <p class="card-short-desc">{{ app.shortDesc }}</p>
                <div class="card-meta">
                  <div class="card-rating">
                    <i class="bi bi-star-fill text-warning"></i>
                    <span>{{ app.rating }}</span>
                  </div>
                  <span class="card-price">{{ isInstalled(app.id) ? 'Instalada' : 'Gratis' }}</span>
                </div>
              </div>
              <div class="card-action-bar">
                <button 
                  v-if="isInstalled(app.id)" 
                  class="card-btn open" 
                  @click.stop="launchApp(app.id)"
                >
                  Abrir
                </button>
                <div 
                  v-else-if="installingAppId === app.id" 
                  class="card-progress-wrapper"
                  @click.stop
                >
                  <div class="card-progress-bar">
                    <div class="card-progress-fill" :style="{ width: `${installProgress}%` }"></div>
                  </div>
                  <div class="card-progress-labels">
                    <span class="card-progress-text">
                      {{ installPhase === 'downloading' ? `Descargando (${installProgress}%)` : installStatusText }}
                    </span>
                    <span class="card-progress-mb" v-if="installPhase === 'downloading'">
                      {{ installDownloadedMb }}/{{ installTotalMb }}M
                    </span>
                  </div>
                </div>
                <button 
                  v-else 
                  class="card-btn install"
                  @click.stop="installAppWithSimulation(app.id)"
                >
                  Obtener
                </button>
              </div>
            </div>
          </div>

          <div v-if="filteredApps.length === 0" class="no-results-box">
            <i class="bi bi-search text-muted"></i>
            <h3>No se encontraron resultados</h3>
            <p>Intenta con otros términos de búsqueda o explora las categorías principales.</p>
          </div>
        </div>
      </div>
    </main>

    <!-- MODAL DE ADVERTENCIA PARA DESINSTALAR APP (VENTANA TIPO WINDOWS SIN BACKDROP) -->
    <Teleport to="body">
      <Transition name="win-dialog-fade">
        <div 
          v-if="appToUninstall" 
          class="win-dialog-window"
          :style="{ transform: `translate(calc(-50% + ${dialogOffset.x}px), calc(-50% + ${dialogOffset.y}px))` }"
          role="dialog"
          aria-modal="false"
        >
          <!-- Barra de título Windows -->
          <div class="win-dialog-titlebar" @mousedown="startDrag">
            <div class="win-dialog-titlebar-content">
              <div class="win-dialog-icon-sm">
                <IconManager :id="appToUninstall.id" />
              </div>
              <span class="win-dialog-title-text">Desinstalar una aplicación</span>
            </div>
            <button class="win-dialog-close-btn" @click="cancelUninstall" title="Cerrar">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Cuerpo tipo cuadro de diálogo de Windows con texto simple -->
          <div class="win-dialog-body">
            <div class="win-dialog-symbol">
              <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div class="win-dialog-message">
              <div class="win-dialog-main-text">
                ¿Está seguro de que desea desinstalar {{ appToUninstall.name }}?
              </div>
              <div class="win-dialog-sub-text">
                Esta aplicación y todos sus datos relacionados (configuraciones, historial y archivos asociados) se quitarán de este equipo.
              </div>
            </div>
          </div>

          <!-- Botones inferiores tipo Windows -->
          <div class="win-dialog-footer">
            <button 
              class="win-dialog-btn win-dialog-btn-danger" 
              :disabled="isUninstalling"
              @click="confirmUninstall"
            >
              <i v-if="isUninstalling" class="bi bi-arrow-repeat spin-icon"></i>
              <span>{{ isUninstalling ? 'Desinstalando...' : 'Desinstalar' }}</span>
            </button>
            <button 
              class="win-dialog-btn win-dialog-btn-secondary" 
              :disabled="isUninstalling"
              @click="cancelUninstall"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.store-app-window {
  display: flex;
  width: 100%;
  height: 100%;
  background: transparent;
  backdrop-filter: var(--os-blur-heavy, blur(28px));
  -webkit-backdrop-filter: var(--os-blur-heavy, blur(28px));
  color: #f1f5f9;
  font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
  overflow: hidden;
  user-select: none;
}

/* --- SIDEBAR --- */
.store-sidebar {
  width: 220px;
  background: rgba(14, 18, 28, 0.42);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand-icon-box {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-store-icon {
  width: 24px;
  height: 24px;
  color: var(--os-accent-color, #38bdf8);
}

.brand-texts {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.2px;
}

.brand-subtitle {
  font-size: 11px;
  color: var(--os-accent-color, #38bdf8);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.sidebar-nav {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  text-align: left;
}

.nav-item i {
  font-size: 16px;
  opacity: 0.85;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-item.active {
  background: rgba(0, 164, 239, 0.18);
  color: #38bdf8;
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 4px;
  background: #00a4ef;
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 10px 0;
}

.library-badge {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}

.sidebar-footer {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.user-avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.45), rgba(14, 165, 233, 0.65));
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: #fff;
  font-size: 15px;
}

.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: 10px;
  color: #22c55e;
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

/* --- MAIN AREA --- */
.store-main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.store-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: rgba(18, 24, 36, 0.40);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 16px;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.page-title-badge {
  font-size: 15px;
  font-weight: 600;
  color: #cbd5e1;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.2);
}

.topbar-center {
  flex: 1;
  max-width: 480px;
}

.search-input-box {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 6px 14px;
  gap: 10px;
  transition: all 0.2s;
}

.search-input-box:focus-within {
  border-color: #00A4EF;
  background: rgba(0, 0, 0, 0.45);
  box-shadow: 0 0 14px rgba(0, 164, 239, 0.25);
}

.search-input-box i {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.search-input-box input {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 13px;
  width: 100%;
  outline: none;
}

.search-input-box input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.clear-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  display: flex;
}
.clear-btn:hover {
  color: #fff;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border-radius: 8px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.topbar-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.topbar-user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: default;
  transition: all 0.15s ease;
}

.topbar-user-profile:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.topbar-user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.45), rgba(14, 165, 233, 0.65));
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: #fff;
  font-size: 13px;
}

.topbar-user-name {
  font-size: 12px;
  font-weight: 500;
  color: #f1f5f9;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- SCROLL CONTENT AREA --- */
.store-content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Custom scrollbar */
.store-content-scroll::-webkit-scrollbar {
  width: 8px;
}
.store-content-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.store-content-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
.store-content-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* --- FILTER PILLS --- */
.filter-pills-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-pill {
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.filter-pill:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.filter-pill.active {
  background: #00A4EF;
  border-color: #00A4EF;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0, 164, 239, 0.35);
}

/* --- HERO SHOWCASE --- */
.hero-showcase {
  position: relative;
  width: 100%;
}

.hero-card {
  position: relative;
  background: linear-gradient(135deg, rgba(30, 42, 62, 0.55), rgba(15, 22, 36, 0.65));
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  padding: 36px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  box-shadow: 0 20px 45px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.hero-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--hero-color, #00A4EF) 0%, transparent 70%);
  opacity: 0.25;
  filter: blur(50px);
  pointer-events: none;
}

.hero-card-left {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 2;
}

.hero-badge {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(0, 164, 239, 0.2);
  border: 1px solid rgba(0, 164, 239, 0.4);
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}

.hero-tagline {
  font-size: 14.5px;
  color: #cbd5e1;
  line-height: 1.5;
}

.hero-cta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.btn-hero-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #00A4EF;
  border: none;
  color: #fff;
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(0, 164, 239, 0.4);
}
.btn-hero-primary:hover:not(:disabled) {
  background: #0093d6;
  transform: translateY(-1px);
}

.btn-hero-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-hero-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.hero-card-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 40px;
  z-index: 2;
}

.hero-icon-showcase {
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
}

.hero-giant-icon {
  width: 90px;
  height: 90px;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: all 0.15s;
}
.carousel-arrow:hover {
  background: rgba(0, 0, 0, 0.85);
  transform: translateY(-50%) scale(1.08);
}
.carousel-arrow.prev { left: 10px; }
.carousel-arrow.next { right: 10px; }

.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: all 0.2s;
}
.indicator-dot.active {
  width: 24px;
  background: #00A4EF;
}

/* --- CATALOG SECTIONS --- */
.catalog-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 19px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.see-all-link {
  background: transparent;
  border: none;
  color: #38bdf8;
  font-size: 13px;
  cursor: pointer;
}
.see-all-link:hover {
  text-decoration: underline;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.store-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.store-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(56, 189, 248, 0.45);
  transform: translateY(-3px);
  box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 164, 239, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.card-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon {
  width: 32px;
  height: 32px;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.card-sub {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
}

.card-short-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 4px 0 6px;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 6px;
  font-size: 12px;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.card-rating i {
  font-size: 11px;
}

.card-price {
  font-size: 11.5px;
  font-weight: 600;
  color: #38bdf8;
}

.card-action-bar {
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.card-btn {
  width: 100%;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.card-btn.open {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
}
.card-btn.open:hover {
  background: rgba(255, 255, 255, 0.15);
}

.card-btn.install {
  background: #00A4EF;
  color: #fff;
}
.card-btn.install:hover:not(:disabled) {
  background: #0093d6;
}

.no-results-box {
  padding: 40px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.no-results-box i {
  font-size: 40px;
  margin-bottom: 12px;
}

/* --- DETAIL VIEW --- */
.detail-view {
  padding-top: 10px;
}

.detail-hero-banner {
  background: linear-gradient(135deg, rgba(30, 42, 62, 0.55), rgba(15, 22, 36, 0.65));
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  padding: 30px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 45px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.detail-hero-banner::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 400px;
  height: 100%;
  background: radial-gradient(circle at right, var(--app-accent, #00A4EF) 0%, transparent 70%);
  opacity: 0.2;
  filter: blur(40px);
  pointer-events: none;
}

.detail-banner-content {
  display: flex;
  gap: 28px;
  align-items: center;
  z-index: 2;
  position: relative;
}

.detail-icon-box {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.detail-app-icon {
  width: 64px;
  height: 64px;
}

.detail-header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.detail-badge-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.detail-subcat {
  font-size: 12px;
  color: #38bdf8;
  font-weight: 600;
  text-transform: uppercase;
}

.detail-badge {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  color: #f8fafc;
}

.detail-app-title {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  margin: 0;
}

.detail-dev-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.detail-dot {
  opacity: 0.4;
}

.detail-rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.stars-box {
  display: flex;
  align-items: center;
  gap: 3px;
}

.stars-box i {
  font-size: 12px;
}

.rating-num {
  font-weight: 700;
  color: #fff;
  margin-left: 4px;
}

.rating-count {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.age-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.detail-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.btn-primary-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-primary-action.btn-install {
  background: #00A4EF;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 164, 239, 0.4);
}
.btn-primary-action.btn-install:hover {
  background: #0093d6;
}

.btn-primary-action.btn-open {
  background: #2563eb;
  color: #fff;
}
.btn-primary-action.btn-open:hover {
  background: #1d4ed8;
}

.btn-secondary-action.btn-uninstall {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-secondary-action.btn-uninstall:hover {
  background: rgba(239, 68, 68, 0.22);
}

.install-progress-box {
  width: 320px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 14px;
}

.install-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.install-status-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
}

.install-percent-badge {
  font-size: 12px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 2px 7px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}

.install-progress-bar {
  width: 100%;
  height: 7px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.install-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00A4EF, #38bdf8);
  border-radius: 4px;
  transition: width 0.1s linear;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
}

.install-progress-fill.striped-anim {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 20px 20px;
  animation: progress-stripes 1s linear infinite;
}

@keyframes progress-stripes {
  from { background-position: 20px 0; }
  to { background-position: 0 0; }
}

.install-progress-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
}

.btn-cancel-download {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 11.5px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.btn-cancel-download:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* HERO PROGRESS */
.hero-progress-box {
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 14px;
}

.hero-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #fff;
}

.hero-progress-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.hero-progress-percent {
  font-weight: 700;
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
}

.hero-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  overflow: hidden;
}

.hero-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00A4EF, #38bdf8);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.hero-progress-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
}

.hero-cancel-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 13px;
  padding: 1px 4px;
  border-radius: 3px;
}

.hero-cancel-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

/* CARD PROGRESS */
.card-progress-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 4px 0;
}

.card-progress-bar {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.card-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00A4EF, #38bdf8);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.card-progress-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.card-progress-text {
  color: #38bdf8;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-progress-mb {
  color: rgba(255, 255, 255, 0.55);
  font-size: 10px;
  flex-shrink: 0;
  margin-left: 6px;
}

.spin-pulse-icon {
  color: #38bdf8;
  animation: pulse-kf 1s ease-in-out infinite;
}

@keyframes pulse-kf {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.92); }
}

/* Detail body grid */
.detail-body-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
}

.detail-left-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.screenshots-carousel {
  display: flex;
  gap: 16px;
}

.screenshot-card {
  flex: 1;
  height: 180px;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid #00A4EF;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.screenshot-mockup-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.mockup-bg-icon {
  width: 48px;
  height: 48px;
}

.mockup-tag {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-full-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13.5px;
  color: #e2e8f0;
}

.feature-check {
  color: #22c55e;
  font-size: 16px;
  margin-top: 1px;
}

.detail-right-col {
  display: flex;
  flex-direction: column;
}

.specs-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.specs-card-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}

.spec-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.spec-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.spec-value {
  font-size: 13px;
  color: #f1f5f9;
}

/* --- LIBRARY VIEW --- */
.library-header-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.library-title {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin: 0;
}

.library-desc {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 0;
}

.btn-check-updates {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-check-updates:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.update-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(34, 197, 94, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  font-size: 13px;
  color: #86efac;
}

.library-apps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.library-app-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  transition: all 0.15s;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.library-app-row:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.14);
}

.library-app-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.library-icon {
  width: 28px;
  height: 28px;
}

.library-app-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  cursor: pointer;
}

.library-app-name {
  font-size: 14.5px;
  font-weight: 600;
  color: #fff;
}

.library-app-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
}

.status-pill.installed {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  font-weight: 600;
}

.library-app-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-lib-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.btn-lib-action.btn-open {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
}
.btn-lib-action.btn-open:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-lib-action.btn-uninstall {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
}
.btn-lib-action.btn-uninstall:hover {
  background: rgba(239, 68, 68, 0.2);
}

.empty-library {
  padding: 50px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.3);
}

.btn-go-explore {
  margin-top: 10px;
  padding: 9px 20px;
  border-radius: 8px;
  background: #00A4EF;
  border: none;
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn-go-explore:hover {
  background: #0093d6;
}

/* --- WINDOWS DIALOG (UNINSTALL CONFIRMATION CON FROST OS BLUR GLASS) --- */
.win-dialog-window {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 440px;
  max-width: calc(100vw - 32px);
  background-color: rgba(22, 25, 34, 0.68);
  backdrop-filter: var(--os-blur-heavy, blur(32px)) saturate(160%);
  -webkit-backdrop-filter: var(--os-blur-heavy, blur(32px)) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 100000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.win-dialog-titlebar {
  height: 34px;
  background-color: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 12px;
  cursor: grab;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.win-dialog-titlebar:active {
  cursor: grabbing;
}

.win-dialog-titlebar-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 400;
  color: #e2e8f0;
  pointer-events: none;
  overflow: hidden;
}

.win-dialog-icon-sm {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.win-dialog-icon-sm :deep(*) {
  width: 16px !important;
  height: 16px !important;
  font-size: 14px !important;
}

.win-dialog-title-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win-dialog-close-btn {
  width: 44px;
  height: 34px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.win-dialog-close-btn:hover {
  background-color: #c42b1c;
  color: #ffffff;
}

.win-dialog-close-btn:active {
  background-color: #a81c0f;
  color: #ffffff;
}

.win-dialog-body {
  padding: 24px 22px 22px 22px;
  background: transparent;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
}

.win-dialog-symbol {
  font-size: 32px;
  color: #f59e0b;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-dialog-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.win-dialog-main-text {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.35;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.win-dialog-sub-text {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.45;
}

.win-dialog-footer {
  background-color: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 12px 18px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.win-dialog-btn {
  min-width: 90px;
  height: 32px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 400;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.win-dialog-btn-danger {
  background-color: rgba(196, 43, 28, 0.88);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 6px rgba(196, 43, 28, 0.4);
}

.win-dialog-btn-danger:hover:not(:disabled) {
  background-color: #d13425;
  border-color: rgba(255, 255, 255, 0.3);
}

.win-dialog-btn-danger:active:not(:disabled) {
  background-color: #a81c0f;
}

.win-dialog-btn-secondary {
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.win-dialog-btn-secondary:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.28);
}

.win-dialog-btn-secondary:active:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.05);
}

.win-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin-kf 1s linear infinite;
}

@keyframes spin-kf {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.win-dialog-fade-enter-active,
.win-dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}

.win-dialog-fade-enter-from,
.win-dialog-fade-leave-to {
  opacity: 0;
}
</style>
