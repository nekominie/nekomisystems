<script setup lang="ts">

import OperatingSystem from './os.vue'
import { onMounted, ref } from 'vue'

const emit = defineEmits<{
    (e: 'shutdown'): void
}>()

const props = defineProps<{ 
    startUp: boolean
}>()

const doneLoading = ref(false);
const runShutdown = ref(false);

onMounted(() => {
    if(props.startUp) {
        //es un booteo

        //return
        setTimeout(() => {
            doneLoading.value = true;
        }, 4000);
    }
    else{
        //no es un booteo, mostrar os
        doneLoading.value = true;
    }
})

const acpiHandler = () => {
    runShutdown.value = true;

    setTimeout(() => {
        emit('shutdown');
    }, 800);

}
</script>

<template>
    <OperatingSystem v-if="doneLoading" :class="{ 'shutdown-run': runShutdown }"
        @shutdown="acpiHandler"
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
        height: 100%;
        width: 100%;
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
</style>