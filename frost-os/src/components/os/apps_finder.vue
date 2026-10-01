<script lang="ts" setup>

import { inject, computed, ref, onMounted, onUnmounted } from 'vue'
import { OS_KEY } from '../api/os_api'
import { CoreApps } from '../data/core_apps'
import { InstalledApps } from '../data/installedapps'
import { useContextMenu } from './context_menu/context_menu'
import { App } from '../data/app'
import IconManager from './iconmanager.vue'
import { STORE_CATALOG } from '../apps/coreapps/store/store_data'

const os = inject(OS_KEY)
if(!os) throw new Error('OS API not found')

const { openMenu } = useContextMenu()

const searchQuery = ref('')
type SortOption = 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc' | 'developer-asc'
const sortBy = ref<SortOption>('name-asc')

const appToUninstall = ref<App | null>(null)
const isUninstalling = ref(false)

// Windows Dialog draggable state
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
    if (e.key === 'Escape') {
        if (appToUninstall.value && !isUninstalling.value) {
            cancelUninstall()
        } else {
            emit('close-app-finder')
        }
    }
}

onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
    stopDrag()
    window.removeEventListener('keydown', onKeyDown)
})

const openUninstallModal = (app: App) => {
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
        await os.uninstallApp(appToUninstall.value.manifest.id)
    } finally {
        isUninstalling.value = false
        appToUninstall.value = null
    }
}

const contextMenuApps = (e: MouseEvent, app: App, isSystem = false) => {
    const menuItems: any[] = [
        {
            label: 'Abrir',
            icon: 'bi-box-arrow-up-right',
            action: () => os.launchApp(app.manifest.id)
        },
        { separator: true },
        { 
            label: app.user.isPinned ? 'Desanclar de la barra de tareas' : 'Anclar en la barra de tareas',
            icon: app.user.isPinned ? 'bi-pin-angle-fill' : 'bi-pin-fill', 
            action: () => os.togglePinApp(app.manifest.id) 
        },
        { 
            label: app.user.isPinnedStart ? 'Desanclar del menu de inicio' : 'Anclar en el menu de inicio',
            icon: app.user.isPinnedStart ? 'bi-pin-angle-fill' : 'bi-pin-fill', 
            action: () => os.togglePinAppStart(app.manifest.id) 
        },
        { 
            label: app.user.isPinnedDesktop ? 'Eliminar acceso directo' : 'Crear acceso directo',
            icon: app.user.isPinnedDesktop ? 'bi-pin-angle-fill' : 'bi-pin-fill', 
            action: () => os.togglePinAppDesktop(app.manifest.id) 
        }
    ]

    // Solo agregar desinstalar si NO es app de sistema
    if (!isSystem && !coreAppIds.has(app.manifest.id)) {
        menuItems.push({ separator: true })
        menuItems.push({
            label: 'Desinstalar',
            icon: 'bi-trash3-fill text-danger',
            action: () => openUninstallModal(app)
        })
    }

    openMenu(e, menuItems)
}

// Metadata resolution (publisher, size, and size in bytes for sorting)
interface AppMetadata {
    developer: string
    size: string
    sizeInBytes: number
}

function parseSizeToBytes(sizeStr: string): number {
    const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|B)/i)
    if (!match) return 0
    const val = parseFloat(match[1])
    const unit = match[2].toUpperCase()
    if (unit === 'GB') return val * 1024 * 1024 * 1024
    if (unit === 'MB') return val * 1024 * 1024
    if (unit === 'KB') return val * 1024
    return val
}

const SYSTEM_APPS_METADATA: Record<string, { developer: string; size: string }> = {
    task_supervisor: { developer: 'Frost Corporation', size: '14.5 MB' },
    settings: { developer: 'Frost Corporation', size: '19.2 MB' },
    run: { developer: 'Frost Corporation', size: '4.1 MB' },
    store: { developer: 'Frost Corporation', size: '26.8 MB' },
    console: { developer: 'Frost Corporation', size: '5.2 MB' }
}

const getAppMetadata = (appId: string): AppMetadata => {
    const catalogItem = STORE_CATALOG.find(item => item.id === appId)
    if (catalogItem) {
        return {
            developer: catalogItem.developer,
            size: catalogItem.size,
            sizeInBytes: parseSizeToBytes(catalogItem.size)
        }
    }
    const sysMeta = SYSTEM_APPS_METADATA[appId]
    if (sysMeta) {
        return {
            developer: sysMeta.developer,
            size: sysMeta.size,
            sizeInBytes: parseSizeToBytes(sysMeta.size)
        }
    }
    return {
        developer: 'Frost Corporation',
        size: '15.0 MB',
        sizeInBytes: 15 * 1024 * 1024
    }
}

const allApps = computed(() => os.state.apps)
const coreAppIds = new Set(CoreApps.map(a => a.id))

// Sort comparator
const sortApps = (apps: App[], option: SortOption): App[] => {
    return [...apps].sort((a, b) => {
        const metaA = getAppMetadata(a.manifest.id)
        const metaB = getAppMetadata(b.manifest.id)
        
        switch (option) {
            case 'name-asc':
                return a.manifest.name.localeCompare(b.manifest.name, 'es', { sensitivity: 'base' })
            case 'name-desc':
                return b.manifest.name.localeCompare(a.manifest.name, 'es', { sensitivity: 'base' })
            case 'size-desc':
                return metaB.sizeInBytes - metaA.sizeInBytes
            case 'size-asc':
                return metaA.sizeInBytes - metaB.sizeInBytes
            case 'developer-asc': {
                const cmp = metaA.developer.localeCompare(metaB.developer, 'es', { sensitivity: 'base' })
                if (cmp !== 0) return cmp
                return a.manifest.name.localeCompare(b.manifest.name, 'es', { sensitivity: 'base' })
            }
            default:
                return 0
        }
    })
}

// Filter and sort for installed apps and core apps
const filterAndSort = (isCoreSection: boolean): App[] => {
    const q = searchQuery.value.trim().toLowerCase()
    let list = allApps.value.filter(a => {
        const isCore = coreAppIds.has(a.manifest.id)
        return isCoreSection ? isCore : !isCore
    })

    if (q) {
        list = list.filter(a => {
            const meta = getAppMetadata(a.manifest.id)
            return (
                a.manifest.name.toLowerCase().includes(q) ||
                meta.developer.toLowerCase().includes(q)
            )
        })
    }

    return sortApps(list, sortBy.value)
}

const visibleInstalledApps = computed(() => filterAndSort(false))
const visibleCoreApps = computed(() => filterAndSort(true))

const emit = defineEmits(['close-app-finder'])

const runApp = (id: string) => {
    emit('close-app-finder')
    os.launchApp(id)
}

</script>

<template>
    <div class="app-finder">
        <div class="app-finder-inner">
            <!-- HEADER CON BUSCADOR Y ORDENAMIENTO -->
            <div class="finder-header">                   
                <div class="header-left">
                    <div class="main-title">
                        <i class="bi bi-grid-fill header-title-icon"></i>
                        <span>Todas las aplicaciones</span>
                    </div>
                    <span class="total-count-badge" v-if="allApps.length">
                        {{ allApps.length }} apps
                    </span>
                </div>

                <div class="header-controls">
                    <!-- Buscador -->
                    <div class="search-box-wrapper">
                        <i class="bi bi-search search-icon"></i>
                        <input 
                            v-model="searchQuery" 
                            class="search-input" 
                            placeholder="Buscar app o publicador..."
                            spellcheck="false"
                        />
                        <button 
                            v-if="searchQuery" 
                            class="clear-search-btn" 
                            @click="searchQuery = ''"
                            title="Limpiar búsqueda"
                        >
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <!-- Selector de ordenamiento -->
                    <div class="sort-box-wrapper">
                        <i class="bi bi-arrow-down-up sort-icon"></i>
                        <select v-model="sortBy" class="sort-select" title="Ordenar lista de aplicaciones">
                            <option value="name-asc">Nombre (A - Z)</option>
                            <option value="name-desc">Nombre (Z - A)</option>
                            <option value="size-desc">Tamaño (Mayor a menor)</option>
                            <option value="size-asc">Tamaño (Menor a mayor)</option>
                            <option value="developer-asc">Publicador (A - Z)</option>
                        </select>
                        <i class="bi bi-chevron-down sort-chevron"></i>
                    </div>

                    <!-- Botón Cerrar -->
                    <button class="finder-close-btn" @click="emit('close-app-finder')" title="Cerrar">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>

            <!-- CONTENIDO PRINCIPAL -->
            <div class="main-container custom-scrollbar">
                <!-- Estado cuando la búsqueda no arrojó ningún resultado en ninguna sección -->
                <div v-if="searchQuery && !visibleInstalledApps.length && !visibleCoreApps.length" class="empty-search-state">
                    <div class="empty-search-icon">
                        <i class="bi bi-search"></i>
                    </div>
                    <div class="empty-search-title">No se encontraron resultados para "{{ searchQuery }}"</div>
                    <div class="empty-search-subtitle">
                        Comprueba que el nombre de la aplicación o el publicador estén bien escritos.
                    </div>
                    <button class="empty-clear-btn" @click="searchQuery = ''">
                        <i class="bi bi-arrow-counterclockwise"></i>
                        <span>Restablecer búsqueda</span>
                    </button>
                </div>

                <template v-else>
                    <!-- SECCIÓN APLICACIONES INSTALADAS -->
                    <div class="section-block">
                        <div class="section-header">
                            <div class="subtitle">
                                <span>Aplicaciones</span>
                                <span class="count-badge" v-if="visibleInstalledApps.length">({{ visibleInstalledApps.length }})</span>
                            </div>
                        </div>
                        
                        <div v-if="visibleInstalledApps.length" class="apps-grid">
                            <div
                                v-for="app in visibleInstalledApps" 
                                :key="app.manifest.id"
                                @click="runApp(app.manifest.id)"
                                @contextmenu.prevent="contextMenuApps($event, app, false)"
                                class="app-card"
                                tabindex="0"
                                @keydown.enter="runApp(app.manifest.id)"
                                :title="`${app.manifest.name} - ${getAppMetadata(app.manifest.id).developer}`"
                            >
                                <div class="app-icon-wrapper">
                                    <IconManager :id="app.manifest.id" class="app-card-icon" />
                                </div>
                                <div class="app-details">
                                    <div class="app-name-primary" :title="app.manifest.name">
                                        {{ app.manifest.name }}
                                    </div>
                                    <div class="app-meta-row">
                                        <span class="app-publisher" :title="getAppMetadata(app.manifest.id).developer">
                                            {{ getAppMetadata(app.manifest.id).developer }}
                                        </span>
                                        <span class="meta-dot">•</span>
                                        <span class="app-size-badge" title="Espacio requerido en disco">
                                            {{ getAppMetadata(app.manifest.id).size }}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    class="app-more-btn" 
                                    @click.stop="contextMenuApps($event, app, false)"
                                    title="Más opciones"
                                >
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                            </div>
                        </div>
                        <div v-else class="empty-notice">
                            {{ searchQuery ? 'No hay aplicaciones instaladas que coincidan con la búsqueda.' : 'No hay aplicaciones adicionales instaladas. Puedes obtenerlas en la Tienda de Apps.' }}
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <!-- SECCIÓN APLICACIONES DE SISTEMA -->
                    <div class="section-block">
                        <div class="section-header">
                            <div class="subtitle">
                                <span>Aplicaciones de Sistema</span>
                                <span class="count-badge" v-if="visibleCoreApps.length">({{ visibleCoreApps.length }})</span>
                            </div>
                        </div>

                        <div v-if="visibleCoreApps.length" class="apps-grid">
                            <div
                                v-for="app in visibleCoreApps" 
                                :key="app.manifest.id"
                                @click="runApp(app.manifest.id)"
                                @contextmenu.prevent="contextMenuApps($event, app, true)"
                                class="app-card"
                                tabindex="0"
                                @keydown.enter="runApp(app.manifest.id)"
                                :title="`${app.manifest.name} - Sistema Frost OS`"
                            >
                                <div class="app-icon-wrapper">
                                    <IconManager :id="app.manifest.id" class="app-card-icon" />
                                </div>
                                <div class="app-details">
                                    <div class="app-name-primary" :title="app.manifest.name">
                                        {{ app.manifest.name }}
                                    </div>
                                    <div class="app-meta-row">
                                        <span class="app-publisher" :title="getAppMetadata(app.manifest.id).developer">
                                            {{ getAppMetadata(app.manifest.id).developer }}
                                        </span>
                                        <span class="meta-dot">•</span>
                                        <span class="app-size-badge" title="Espacio requerido en disco">
                                            {{ getAppMetadata(app.manifest.id).size }}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    class="app-more-btn" 
                                    @click.stop="contextMenuApps($event, app, true)"
                                    title="Más opciones"
                                >
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                            </div>
                        </div>
                        <div v-else class="empty-notice">
                            No se encontraron aplicaciones del sistema que coincidan con la búsqueda.
                        </div>
                    </div>
                </template>
            </div>
        </div>

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
                                <IconManager :id="appToUninstall.manifest.id" />
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
                                ¿Está seguro de que desea desinstalar {{ appToUninstall.manifest.name }}?
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

.app-finder {
    display: flex;
    flex-direction: column;
    width: 860px;
    max-width: 92vw;
    height: 82vh;
    max-height: 820px;
    min-height: 520px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -52%);
    background-color: rgba(18, 22, 32, 0.72);
    backdrop-filter: var(--os-blur-heavy, blur(36px)) saturate(160%);
    -webkit-backdrop-filter: var(--os-blur-heavy, blur(36px)) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
    z-index: 1000;
    color: rgba(255, 255, 255, 0.85);
    overflow: hidden;
    user-select: none;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.app-finder-inner {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box;
}

/* HEADER */
.finder-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px;
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.header-title-icon {
    font-size: 20px;
    color: #60a5fa;
    margin-right: 8px;
}

.main-title {
    font-size: 22px;
    font-weight: 600;
    color: #ffffff;
    display: flex;
    align-items: center;
    letter-spacing: -0.3px;
}

.total-count-badge {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    font-size: 11.5px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 12px;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* BUSCADOR */
.search-box-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0 10px;
    height: 36px;
    width: 240px;
    transition: all 0.15s ease;
}

.search-box-wrapper:hover {
    background-color: rgba(0, 0, 0, 0.45);
    border-color: rgba(255, 255, 255, 0.25);
}

.search-box-wrapper:focus-within {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25);
    background-color: rgba(0, 0, 0, 0.55);
}

.search-icon {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin-right: 8px;
    flex-shrink: 0;
}

.search-input {
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 12.5px;
    width: 100%;
    padding: 0;
}

.search-input::placeholder {
    color: rgba(255, 255, 255, 0.45);
}

.clear-search-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    margin-left: 4px;
    flex-shrink: 0;
}

.clear-search-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
}

/* ORDENAMIENTO */
.sort-box-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0 10px;
    height: 36px;
    transition: all 0.15s ease;
}

.sort-box-wrapper:hover {
    background-color: rgba(0, 0, 0, 0.45);
    border-color: rgba(255, 255, 255, 0.25);
}

.sort-box-wrapper:focus-within {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25);
}

.sort-icon {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin-right: 8px;
    flex-shrink: 0;
}

.sort-select {
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    padding-right: 18px;
    appearance: none;
    -webkit-appearance: none;
}

.sort-select option {
    background-color: #1a1e29;
    color: #ffffff;
}

.sort-chevron {
    position: absolute;
    right: 10px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.55);
    pointer-events: none;
}

/* BOTÓN CERRAR */
.finder-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.finder-close-btn:hover {
    background-color: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
}

.finder-close-btn:active {
    background-color: rgba(255, 255, 255, 0.08);
}

/* MAIN CONTAINER CON SCROLLBAR ELEGANTE */
.main-container {
    border-radius: 12px;
    background-color: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.06);
    flex: 1;
    padding: 18px;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: inset 0 0 20px -8px rgba(0, 0, 0, 0.6);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* SECCIONES Y TÍTULOS */
.section-block {
    margin-bottom: 8px;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.subtitle {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.92);
    display: flex;
    align-items: center;
    letter-spacing: -0.2px;
}

.count-badge {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 6px;
    font-weight: 400;
}

.section-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
    margin: 20px 0;
}

/* GRID DE APLICACIONES */
.apps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
}

/* TARJETA DE APLICACIÓN - DISEÑO DONDE DESTACA EL NOMBRE Y EL ICONO */
.app-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    outline: none;
    box-sizing: border-box;
}

.app-card:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.22);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}

.app-card:focus-visible {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.35);
}

.app-card:active {
    transform: translateY(0);
    background: rgba(255, 255, 255, 0.06);
}

/* ICONO DESTACADO */
.app-icon-wrapper {
    width: 44px;
    height: 44px;
    min-width: 44px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    flex-shrink: 0;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s;
    box-sizing: border-box;
}

.app-card:hover .app-icon-wrapper {
    transform: scale(1.08);
    background: rgba(255, 255, 255, 0.1);
}

.app-icon-wrapper :deep(img),
.app-icon-wrapper :deep(svg),
.app-icon-wrapper :deep(.iconmanager-icon) {
    width: 100% !important;
    height: 100% !important;
    max-width: 32px;
    max-height: 32px;
    object-fit: contain;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
    display: block;
}

.app-icon-wrapper :deep(.iconmanager-icon-svg) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.app-icon-wrapper :deep(.iconmanager-icon-svg svg) {
    width: 100% !important;
    height: 100% !important;
}

/* DETALLES DE LA APLICACIÓN */
.app-details {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

/* NOMBRE DESTACADO */
.app-name-primary {
    font-size: 13.5px;
    font-weight: 600;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.2px;
    line-height: 1.3;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* METADATOS: PUBLICADOR Y TAMAÑO */
.app-meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    min-width: 0;
}

.app-publisher {
    color: rgba(255, 255, 255, 0.55);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
}

.meta-dot {
    color: rgba(255, 255, 255, 0.3);
    font-size: 9px;
    flex-shrink: 0;
}

.app-size-badge {
    color: rgba(255, 255, 255, 0.72);
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 10px;
    font-weight: 500;
    flex-shrink: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

/* BOTÓN MÁS OPCIONES (...) */
.app-more-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s ease;
    flex-shrink: 0;
    margin-left: 2px;
}

.app-card:hover .app-more-btn {
    opacity: 1;
}

.app-more-btn:hover {
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
}

/* MENSAJES DE ESTADO VACÍO */
.empty-notice {
    padding: 16px 12px;
    color: rgba(255, 255, 255, 0.45);
    font-size: 12.5px;
    text-align: center;
    font-style: italic;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px dashed rgba(255, 255, 255, 0.08);
}

.empty-search-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    gap: 12px;
}

.empty-search-icon {
    font-size: 40px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 4px;
}

.empty-search-title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
}

.empty-search-subtitle {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
    max-width: 400px;
    line-height: 1.4;
}

.empty-clear-btn {
    margin-top: 8px;
    background-color: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-size: 12.5px;
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
}

.empty-clear-btn:hover {
    background-color: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
}

/* TRANSICIONES DEL APP FINDER */
.app-finder-fade-enter-from,
.app-finder-fade-leave-to {
    opacity: 0;
    transform: translate(-50%, calc(-52% + 20px));
}

.app-finder-fade-enter-active {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-finder-fade-leave-active {
    transition: all 0.2s ease-in;
}

.app-finder-fade-enter-to,
.app-finder-fade-leave-from {
    opacity: 1;
    transform: translate(-50%, -52%);
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