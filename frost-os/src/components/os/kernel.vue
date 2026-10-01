<script setup lang="ts">

import { onMounted, ref } from 'vue'
import OperatingSystem from '../os.vue'
import WelcomeSetup from './welcome_setup.vue'
import { useLockStore } from './lock/lock_store'

const emit = defineEmits<{
    (e: 'shutdown'): void
    (e: 'restart'): void
}>()

const props = defineProps<{ 
    startUp: boolean
}>()

const lockStore = useLockStore()

const doneLoading = ref(false);
const runShutdown = ref(false);
const showSetup = ref(false);
const isTransitioningToDesktop = ref(false);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

onMounted(async () => {

    if (props.startUp) {
        // Si es un booteo, esperamos los 4 segundos obligatorios
        doneLoading.value = false;
        await delay(4000);
    }
    
    const didSetup = localStorage.getItem('ranSetup') === 'true';

    if (!didSetup) {
        // Si no ha hecho el setup, lo mandamos para alla
        showSetup.value = true;
    } else {
        // Si ya lo hizo, nos aseguramos que el setup esté oculto
        showSetup.value = false;
    }

    doneLoading.value = true;
})

const finishedSetup = () => {
    isTransitioningToDesktop.value = true;
    localStorage.setItem('ranSetup', 'true');
    lockStore.unlock(); // Asegurar ingreso directo al escritorio

    setTimeout(() => {
        showSetup.value = false;
        isTransitioningToDesktop.value = false;
    }, 950);
}

const acpiHandler = () => {
    runShutdown.value = true;

    setTimeout(() => {
        emit('shutdown');
    }, 800);

}

const restartHandler = () => {
    runShutdown.value = true;
    localStorage.setItem('frost_lock_state', 'locked');

    setTimeout(() => {
        emit('restart');
    }, 800);
}
</script>

<template>

    <OperatingSystem v-if="doneLoading && (!showSetup || isTransitioningToDesktop)" 
        :class="{ 
            'shutdown-run': runShutdown,
            'frost-desktop-reveal': isTransitioningToDesktop
        }"
        @shutdown="acpiHandler"
        @restart="restartHandler"
    />

    <WelcomeSetup v-if="showSetup"
        :class="{ 'frost-thaw-exit': isTransitioningToDesktop }"
        @finishedSetup="finishedSetup"
    />

    <div v-if="!doneLoading" class="loading-os-container" >
        <div style="background-color: black;">
            <div style="color: white;">
                <!--<img src="" alt="">-->
                <i class="bi-cup-hot-fill"></i>
            </div>
            <div style="display: flex; justify-content: center; width: 20rem;">
                <span class="loader"></span>
            </div>
        </div>
    </div>

    <div class="shutdown-bg" v-if="runShutdown">
    </div>
</template>

<style scoped>
    .loading-os-container {
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .loading-os-container i{
        font-size: 100px;
    }

    .loading-os-container > div {
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: space-evenly;
        align-items: center;
        flex-direction: column;
    }

    .loader{
        display: block;
        position: relative;
        height: 12px;
        width: 80%;
        border: 1px solid #fff;
        border-radius: 10px;
        overflow: hidden;
    }
    
    .loader::after {
        content: '';
        width: 40%;
        height: 100%;
        background: #FF3D00;
        position: absolute;
        top: 0;
        left: 0;
        box-sizing: border-box;
        animation: animloader 2s linear infinite;
    }
    
    @keyframes animloader {
      0% {
        left: 0;
        transform: translateX(-100%);
      }
      100% {
        left: 100%;
        transform: translateX(0%);
      }
    }

    .shutdown-bg{
        position: absolute;
        left: 0;
        top: 0;
        height: 100vh;
        width: 100vw;
        background-color: black;
        z-index: -1;
    }

    .shutdown-run {
        animation: shutdown 0.7s cubic-bezier(0.755, 0.05, 0.855, 0.06) forwards;
    }

    @keyframes shutdown {
    0% {
        transform: scaleY(1) scaleX(1);
    }
    70% {
        transform: scaleY(0.01) scaleX(1);
    }
    100% {
        transform: scaleY(0) scaleX(0);
        opacity: 0;
    }
    }

    /* Transición Helada (Frost Thaw) hacia el Escritorio */
    .frost-desktop-reveal {
        animation: frostRevealDesktop 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes frostRevealDesktop {
        0% {
            filter: blur(28px) brightness(1.2);
            transform: scale(1.03);
            opacity: 0.6;
        }
        100% {
            filter: blur(0px) brightness(1);
            transform: scale(1);
            opacity: 1;
        }
    }

    .frost-thaw-exit {
        pointer-events: none;
        animation: frostThawDissolve 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        position: absolute;
        inset: 0;
        z-index: 100;
    }

    @keyframes frostThawDissolve {
        0% {
            opacity: 1;
            filter: blur(0px);
        }
        35% {
            opacity: 0.95;
            filter: blur(14px) brightness(1.2);
        }
        100% {
            opacity: 0;
            filter: blur(35px) brightness(1.3);
            transform: scale(1.04);
        }
    }
</style>