<script setup lang="ts">
import { onMounted, ref, inject } from 'vue'
import StartSettings from './start_settings.vue'
import IconManager from './iconmanager.vue'
import type { UserProfile } from '../data/types'
import type { App } from '../data/app'
import { OS_KEY } from '../api/os_api'
import { useLockStore } from './lock/lock_store'

import { getUserProfile } from '../../database/user_profile'

const os = inject(OS_KEY)
if(!os) throw new Error('OS API not found')

const lockStore = useLockStore()

const previewUrl = ref('')
const userName = ref('')

const props = defineProps<{ 
    pinnedApps: App[]
}>()

const emit = defineEmits<{
    (e: 'view-app-finder'): void,
    (e: 'view-start-settings'): void,
    (e: 'shutdown'): void,
    (e: 'restart'): void,
    (e: 'close-startmenu'): void
}>()

onMounted(() => {
    fillProfile();
})

const fillProfile = async () => {
    try {
        const profile = await getUserProfile();

        if (profile) {
            if (profile.avatar && profile.avatar instanceof Blob) {
                if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
                    URL.revokeObjectURL(previewUrl.value);
                }
                previewUrl.value = URL.createObjectURL(profile.avatar);
            }
            if (profile.name) {
                userName.value = profile.name;
            }
        }
    } catch(e) {
        console.error('Error cargando perfil en startmenu:', e);
    }
}

const launchApp = (id: string) => {
    os.launchApp(id)
    emit('close-startmenu')
}

const lockSystem = () => {
    emit('close-startmenu')
    lockStore.lock()
}

const restartSystem = () => {
    emit('close-startmenu')
    emit('restart')
}

</script>

<style scoped>
    @import '../styles/start.css';
</style>

<template>
    <div class="start-menu" style="height: 38rem; width: 23rem; flex-direction: row;">

        <div style="display: flex; flex-direction: column; height: 100%; flex: 1;">

            <div style="margin-right: 14px; height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; height: 14%; justify-content: center; align-items: flex-end; padding-bottom: 7px;">
                    <div class="user-picture"
                        :style="{ backgroundImage: `url(${previewUrl || ''})`, backgroundSize: 'cover' }"
                    >
                    </div>            
                    <div style="display:flex; justify-content: center; font-size: 16px;">{{ userName }}</div>
                </div>
                <div class="divider"></div>

                <StartSettings 
                    @launch-app="launchApp($event)"
                />

                <div class="divider"></div>

                <div style="padding-top: 9px; display: flex; flex-direction: column; gap: 4px;">
                    <button class="start-menu-button" style="border-radius: 4px; width: 100%; height: 28px;"
                    @click="lockSystem"
                    >
                        <i class="bi-lock" style="display: flex; font-size: 16px; margin-right: 5px;"></i>
                        Bloquear
                    </button>
                    <button class="start-menu-button" style="border-radius: 4px; width: 100%; height: 28px;"
                    @click="restartSystem"
                    >
                        <i class="bi-arrow-clockwise" style="display: flex; font-size: 16px; margin-right: 5px;"></i>
                        Reiniciar
                    </button>
                    <button class="start-menu-button" style="border-radius: 4px; width: 100%; height: 28px;"
                    @click="emit('shutdown')"
                    >
                        <i class="bi-power" style="display: flex; font-size: 18px; margin-right: 5px;"></i>
                        Apagar
                    </button>            
                </div>
            </div>
        </div>
        <div style="display: flex; flex-direction: column; height: 100%; background-color: #00000040; flex: 1; border-radius: 9px; box-shadow: inset 0 0 15px -8px #000000;">
            <div style="flex: 1; padding: 9px;">

                <div v-for="app in pinnedApps" :key="app.manifest.id" class="pinned-app-container" @click="launchApp(app.manifest.id)">
                    <IconManager :id="app.manifest.id" class="app-icon" />
                    <div class="app-name">{{ app.manifest.name }}</div>
                </div>
            </div>
            <button class="see-all-apps-btn"
                @click="emit('view-app-finder')"
            >
                Ver todas las aplicaciones
            </button>
        </div>
  </div>
</template>