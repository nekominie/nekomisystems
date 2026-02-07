<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { UserProfile } from '../types'

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
    <div class="start-menu" style="height: 600px; width: 300px;">
        <div class="start-menu-header">
            <div class="user-picture"
                :style="{ backgroundImage: `url(${previewUrl || ''})`, backgroundSize: 'cover' }"
            >
            </div>

            <div style="display:flex; justify-content: center; font-size: 20px;">{{ userName }}</div>

        </div>

        <div class="divider"></div>
        
        <div class="start-menu-main" style="flex: 1;">
            <div style="display: flex; flex-direction: column;">
                <div style="flex: 1;"></div>
                <button
                    @click=""
                >
                    Ver todas las aplicaciones
                </button>
            </div>

            <div></div>

        </div>

        <div class="divider"></div>

        <div class="start-menu-container">
            <button class="start-menu-button"
                @click="$emit('shutdown')"
            >
                Apagar
            </button>
        </div>
  </div>
</template>