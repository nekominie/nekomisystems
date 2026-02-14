<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StartSettings from './start_settings.vue'
import type { UserProfile } from '../data/types'

const previewUrl = ref('')
const userName = ref('')

onMounted(() => {
    fillProfile();
})

const getProfileFromDB = async (): Promise<UserProfile | null> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NekomiOS_DB", 1);

        request.onsuccess = (e: any) => {
            const db = e.target.result;
            const transaction = db.transaction("user_data", "readonly");
            const store = transaction.objectStore("user_data");

            const getRequest = store.get("profile");

            getRequest.onsuccess = () => {
                resolve(getRequest.result as UserProfile || null); // Aquí viene { name, avatar, setupDate }
            };

            getRequest.onerror = () => reject("Error al obtener el perfil");
        };

        request.onerror = () => reject("No se pudo abrir la base de datos");
    });
};

const fillProfile = async () => {
    try{
        const profile = await getProfileFromDB();

        if(profile){
            previewUrl.value = URL.createObjectURL(profile.avatar);
            userName.value = profile.name;
        }
    }
    catch(e){
        console.error(e);
    }
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
                    @close-startmenu="$emit('close-startmenu')"
                />

                <div class="divider"></div>

                <div style="padding-top: 9px;">
                    <button class="start-menu-button" style="border-radius: 4px; width: 100%; height: 28px;"
                    @click="$emit('shutdown')"
                    >
                        <i class="bi-power" style="display: flex; font-size: 18px; margin-right: 5px;"></i>
                        Apagar
                    </button>            
                </div>
            </div>
        </div>
        <div style="display: flex; flex-direction: column; height: 100%; background-color: #00000040; flex: 1; border-radius: 9px;">
            <div style="flex: 1;"></div>
            <button class="see-all-apps-btn"
                @click=""
            >
                Ver todas las aplicaciones
            </button>
        </div>
  </div>
</template>