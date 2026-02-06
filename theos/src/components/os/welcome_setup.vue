<script lang="ts" setup>
import { onMounted, ref } from 'vue';

const emit = defineEmits<{
    (e: 'finishedSetup'): void
}>()

const hideOverlay = ref(false)
const deleteOverlay = ref(false)
const animateGreeting = ref(false);
const translateGreeting = ref(true);
const showText1 = ref(false);
const showText2 = ref(false);
const showUi = ref(false);
const showButton = ref(false);

const usernameInput = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const selectedFile = ref<File | null>(null)

onMounted(() => {
    setTimeout(() => {
        hideOverlay.value = true
    }, 100);

    setTimeout(() => {
        deleteOverlay.value = true
    }, 1100);

    setTimeout(() => {
        animateGreeting.value = true
    }, 2000);

    setTimeout(() => {
        translateGreeting.value = false
    }, 3700);

    setTimeout(() => {
        showText1.value = true
    }, 4500);

    setTimeout(() => {
        showText2.value = true
    }, 5500);

    setTimeout(() => {
        showUi.value = true
    }, 6500);

    setTimeout(() => {
        showButton.value = true
    }, 6500);
})

const triggerFileInput = () => {
    fileInput.value?.click()
}

const handleFileChange = (event: any) => {
    const target = event.target as HTMLInputElement;

    if (target.files && target.files[0]) {
        const file = target.files[0];        
        selectedFile.value = file;
        previewUrl.value = URL.createObjectURL(file);
    }
}

const saveToIndexedDB = async (userName: string, imageFile: File) => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NekomiOS_DB", 1);

        request.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("user_data")) {
                db.createObjectStore("user_data");
            }
        };

        request.onsuccess = (e: any) => {
            const db = e.target.result;
            const transaction = db.transaction("user_data", "readwrite");
            const store = transaction.objectStore("user_data");

            // Guardamos el objeto completo (nombre + archivo BLOB)
            store.put({ 
                name: userName, 
                avatar: imageFile, 
                setupDate: new Date() 
            }, "profile");

            transaction.oncomplete = () => resolve(true);
        };
        
        request.onerror = () => reject("Error al guardar en DB");
    });
};

const finishSetup = async () => {
    if (!selectedFile.value || !usernameInput.value) return alert("Faltan datos");
    
    await saveToIndexedDB(usernameInput.value, selectedFile.value);
    alert("¡Configuración guardada en el disco del navegador!");
    // Aquí rediriges al Desktop
    
    emit('finishedSetup')
};

</script>

<template>
    <div class="welcome-container main-font">

        <div v-if="!deleteOverlay" class="overlay" :class="{ 'hide': hideOverlay }"></div>

        <div class="ui-container">
            <div style="padding-top: 4rem; height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; align-items: baseline; margin-bottom: 1rem;">
                    <div class="greeting-container"
                        :class="{ 
                            'animate-greeting': animateGreeting,
                            'greeting-translated': translateGreeting
                        }"
                    >
                    ¡Hola!
                    </div>
                    <div class="animated-text" :class="{ 'show': showText1 }" style="font-size: 3rem; opacity: 0;">
                        Es la primera vez que te vemos por aqui
                    </div>
                </div>

                <div class="animated-text" :class="{ 'show': showText2 }" style="font-size: 35px; opacity: 0; display: flex; justify-content: center;">
                    Cuentanos mas sobre ti...
                </div>

                <div class="inputs-container animated-text" :class="{ 'show': showUi }">
                    <div style="display: flex; align-items: center; justify-content: center;">
                        <div style="margin-right: 4rem; display: flex; flex-direction: column; align-items: center;">
                            <div class="profile-picture"
                                :style="{ backgroundImage: `url(${previewUrl || ''})`, backgroundSize: 'cover' }"
                            ></div>
                            <div>
                                <button class="upload-btn" @click="triggerFileInput">Subir foto de perfil...</button>
                                <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" style="display: none;"/>
                            </div>
                        </div>
                        <div>
                            <div>
                                Nuevo usuario
                            </div>
                            <input v-model="usernameInput" class="username-input" placeholder="Ingresa tu nombre"/>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>

            <div style="margin-right: 6rem; width: 100%; display: flex; justify-content: flex-end; padding-bottom: 2rem;">
                <button class="continue-btn animated-text" :class="{ 'show': showUi }" @click="finishSetup">Continuar</button>
            </div>
        </div>

        <div class="bg-container">
        </div>
    </div>
</template>

<style scoped>
    .continue-btn{
        padding: 10px 20px;
        border-radius: 12px;
        border: none;
        background-color: #00000000;
        color: #d9d9d9;
        cursor: pointer;
        font-size: 18px;
        backdrop-filter: blur(10px);
        opacity: 0;
    }

    .animated-text{
        transition: opacity 0.2s ease-in;
    }

    .greeting-container{
        margin-right: 30px; 
        font-size: 7rem; 
        opacity: 1;
        transition: opacity 0.2s ease-in;
    }

    .greeting-translated{
        opacity: 0;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%); 
        position: absolute;
    }

    .overlay{
        background-color: black;
        position: absolute;
        height: 100%;
        width: 100%;
        z-index: 10;
        transition: opacity 1s ease-in;
    }   

    .hide{
        opacity: 0;
    }

    .show{
        opacity: 1 !important;
    }

    .animate-greeting{
        animation: showAndHide 1.5s linear /*forwards*/;
    }

    @keyframes showAndHide {
        0% { opacity: 0; transform: translate(-50%, -35%); }
        20%, 80% { opacity: 1; /*transform: translate(-50%, -50%);*/ }
        100% { opacity: 0; transform: translate(-50%, -65%); }
    }

    .profile-picture{
        border: solid 8px #ffffff;
        border-radius: 50%;
        background-color: #bfbfbf;
        width: 10rem;
        height: 10rem;
    }

    .upload-btn{
        padding: 7px 12px;
        background-color: #504d4d00;
        border-radius: 9px;
        border: 0;
        /*backdrop-filter: blur(40px);*/
        cursor: pointer;
        font-size: 17px;
        color: #ffffff;
        text-decoration: underline;
    }

    .username-input{
        padding: 0px 13px;
        font-size: 23px;
        color: #cbcbcb;
        border-radius: 13px;
        border: 0;
        background-color: #0000003d;
        backdrop-filter: blur(1px);
        width: 201px;
        height: 40px;
    }

    .inputs-container{
        font-size: 2rem;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        flex: 1;
        opacity:0;
    }


    .bg-container{
        height: 100%;
        width: 100%;

        background-image: url('/wallpapers/default-wallpaper.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }

    .welcome-container{
        height: 100dvh;
        width: 100vw;
    }

    .ui-container{
        position:absolute;
        height: 100%;
        width: 100%;
        background-color: #00000061;
        backdrop-filter: blur(65px);
        color: white;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center
    }
</style>