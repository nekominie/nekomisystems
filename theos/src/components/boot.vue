<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue';

const emit = defineEmits<{
    (e: 'boot-success'): void
}>();

const whiteFlash = ref(false);
let infoArray = ref<string[]>([]);

const cpuCores = navigator.hardwareConcurrency || 'Unknown';
const ramGb = (navigator as any).deviceMemory || '4+'; // (Cast a any porque no es estándar en todos los browsers)
const userAgent = navigator.userAgent;
const platform = navigator.platform;
const language = navigator.language.toUpperCase();

const getEngine = () => {
  if (userAgent.includes("Chrome")) return "Chromium Engine"
  if (userAgent.includes("Firefox")) return "Gecko Engine"
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "WebKit Engine"
  return "Unknown Engine"
}

const getGPU = () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return "Generic VGA Card";
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  //return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_ADAPTER_ID) : "Standard VGA";
};

onMounted(() => {
    whiteFlash.value = true;

    setTimeout(() => {
        whiteFlash.value = false;
        fillInfoArray();
    }, 50);
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fillInfoArray = async () => {

    const containerArray = <string[]>[
        'CPU Cores: ' + cpuCores,
        'OS: ' + navigator.appVersion,
        'Browser: ' + navigator.appName,
        'Browser Version: ' + navigator.appVersion,
        'Screen Resolution: ' + screen.width + 'x' + screen.height,
        'Color Depth: ' + screen.colorDepth,
        'Device Pixel Ratio: ' + window.devicePixelRatio,
        'User Agent: ' + userAgent,
        'Platform: ' + platform,
        'Language: ' + language,
        'Engine: ' + getEngine(),
        'GPU: ' + getGPU(),
        'RAM: ' + ramGb + ' GB',
        'CPU Cores: ' + cpuCores,
        'OS: ' + navigator.appVersion,
        'Browser: ' + navigator.appName,
        'Browser Version: ' + navigator.appVersion,
        'Screen Resolution: ' + screen.width + 'x' + screen.height,
        'Color Depth: ' + screen.colorDepth,
        'Device Pixel Ratio: ' + window.devicePixelRatio,
        'User Agent: ' + userAgent,
        'Platform: ' + platform,
        'Language: ' + language,
        'Engine: ' + getEngine(),
        'GPU: ' + getGPU(),
        'RAM: ' + ramGb + ' GB'
    ];

    for (const line of containerArray) {
        infoArray.value.push(line);
            
        if (line.includes('RAM')){
            await sleep(800); 
        }
        else{
            await sleep(100);         
        }
    }

    setTimeout(() => emit('boot-success'), 2000);
}

</script>

<style>
    @import '../styles/boot.css';
</style>

<template>
    <div 
        class="post-main-container"
        :class="{ 
            'white-flash': whiteFlash 
        }"
    >
        <div style="width: 100%; padding: 16px; max-height: 100%;">
            <div class="post-header">
                <img src="../img/boot/nekomisystems_logo.png">
                <div>NEKO_BIOS © 2026 v1.0 NekomiWorks Ltd.</div>
            </div>
            <div class="posting-info-container">

                <div class="post-info">
                    <h2>SYSTEM INFORMATION</h2>
                    <ul style="font-size: 23px;">
                        <li v-for="info in infoArray" :key="info">
                            {{ info }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>