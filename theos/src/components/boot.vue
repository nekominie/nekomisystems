<script setup lang="ts">
import { contain } from 'three/src/extras/TextureUtils.js';
import { onMounted, ref, nextTick } from 'vue';

const emit = defineEmits<{
    (e: 'boot-success'): void
}>();

const whiteFlash = ref(false);
const scrolledContainer = ref<HTMLElement | null>(null);
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

const fillInfoArray = async () => {

    const containerArray = <string[]>[
        `CPU_PROBE: ${cpuCores} LOGICAL CORES DETECTED`,
        `MEMORY_TEST: ${ramGb}GB SYSTEM RAM ... OK`,
        `HOST_PLATFORM: ${platform}`,
        `LOCALE_LANG: ${language}`,
        `----------------------------------------`,
        `VGA_ADAPTER: ${getGPU()}`,
        `DISP_ESTABLISHED: ${screen.width}x${screen.height} @ ${screen.colorDepth}-BIT`,
        `PIXEL_RATIO: ${window.devicePixelRatio.toFixed(2)}`,
        `RENDER_ENGINE: ${getEngine()}`,
        `----------------------------------------`,
        `NET_STATUS: ${navigator.onLine ? 'LINK ESTABLISHED' : 'LINK DOWN'}`,
        `NET_LATENCY: ${'connection' in navigator ? (navigator as any).connection.rtt + 'ms' : 'N/A'}`,
        `BATT_LEVEL: ${'getBattery' in navigator ? 'CALCULATING...' : 'A/C POWER DETECTED'}`,
        `----------------------------------------`,
        `KERNEL_LOADER: NEKO_VFS v2.0.4`,
        `MOUNTING: /root/user/home...`,
        `IDENTIFYING_TARGET: ${userAgent.split(' ')[0]}`,
        `SECURITY_CHECK: NO MALWARE DETECTED`,
        `INIT_HANDSHAKE: SUCCESSFUL`,
        `----------------------------------------`,
        'SYSTEM INFORMATION (WARNING: FOR DEVELOPERS ONLY!)',
        `USER_AGENT: ${userAgent}`,
        `BROWSER_VERSION: ${navigator.appVersion}`,
        `----------------------------------------`,
        `BOOT_MODE: NORMAL_STARTUP`,

        `READY.`,
    ];
    
    for (let i = 0; i < containerArray.length; i++) {
        const randomDelay = Math.random() * 50 + 10;     
        await new Promise(resolve => setTimeout(resolve, randomDelay));

        infoArray.value.push(containerArray[i]);

        await nextTick();

        const container = scrolledContainer.value;

        if(container){
            container.scrollTop = container.scrollHeight;
        }

        if (containerArray[i].includes('---') || containerArray[i] === 'READY.') {
            await new Promise(resolve => setTimeout(resolve, 200));
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
        <div style="width: 100%; padding: 16px; max-height: 100%; display: flex; flex-direction: column;">
            <div class="post-header">
                <img src="../img/boot/nekomisystems_logo.png">
                <div>NEKO_BIOS © 2026 v1.0 NekomiWorks Ltd.</div>
            </div>
            <div ref="scrolledContainer"  class="posting-info-container">
                <div class="post-info">
                    <h2>INITIALIZING BOOT CHECKUP</h2>
                    <div  style="font-size: 23px;">
                        <div v-for="info in infoArray" :key="info">
                            {{ info }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="post-footer">
                <div>-----------------------------------------------------------------------</div>
                <div>(c) 2026 NekomiSystems Co. property of NekomiWorks Ltd.</div>
                <div>build 4892-58936-1447884-259484</div>
            </div>
        </div>
    </div>
</template>