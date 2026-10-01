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

const getParticleStyle = (n: number) => {
    const seed = n * 7.3;
    const left = ((seed * 13.7) % 100);
    const size = 2 + ((seed * 3.1) % 5);
    const duration = 8 + ((seed * 2.3) % 12);
    const delayVal = ((seed * 1.7) % 8);
    const startY = -10 - ((seed * 4.1) % 20);
    return {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${duration}s`,
        animationDelay: `${delayVal}s`,
        top: `${startY}%`,
    };
};

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

    <div v-if="!doneLoading" class="frost-boot-screen">
        <!-- Floating ice particles -->
        <div class="frost-particles">
            <div v-for="n in 20" :key="n" class="frost-particle" :style="getParticleStyle(n)"></div>
        </div>

        <!-- Central content -->
        <div class="frost-boot-content">
            <!-- Snowflake logo with glow -->
            <div class="frost-logo-container">
                <div class="frost-logo-glow"></div>
                <svg class="frost-snowflake" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <!-- Main vertical line -->
                    <line x1="50" y1="8" x2="50" y2="92" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <!-- 60° lines -->
                    <line x1="50" y1="50" x2="86.3" y2="29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="50" y1="50" x2="13.7" y2="71" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="50" y1="50" x2="86.3" y2="71" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="50" y1="50" x2="13.7" y2="29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <!-- Top branch details -->
                    <line x1="50" y1="22" x2="40" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="50" y1="22" x2="60" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="50" y1="34" x2="38" y2="27" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="50" y1="34" x2="62" y2="27" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <!-- Bottom branch details -->
                    <line x1="50" y1="78" x2="40" y2="85" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="50" y1="78" x2="60" y2="85" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="50" y1="66" x2="38" y2="73" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="50" y1="66" x2="62" y2="73" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <!-- Right-upper branch details -->
                    <line x1="64" y1="42" x2="74" y2="44" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="64" y1="42" x2="67" y2="32" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="75" y1="35.5" x2="83" y2="40" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="75" y1="35.5" x2="78" y2="26" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <!-- Left-lower branch details -->
                    <line x1="36" y1="58" x2="26" y2="56" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="36" y1="58" x2="33" y2="68" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="25" y1="64.5" x2="17" y2="60" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="25" y1="64.5" x2="22" y2="74" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <!-- Right-lower branch details -->
                    <line x1="64" y1="58" x2="74" y2="56" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="64" y1="58" x2="67" y2="68" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="75" y1="64.5" x2="83" y2="60" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="75" y1="64.5" x2="78" y2="74" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <!-- Left-upper branch details -->
                    <line x1="36" y1="42" x2="26" y2="44" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="36" y1="42" x2="33" y2="32" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="25" y1="35.5" x2="17" y2="40" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="25" y1="35.5" x2="22" y2="26" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <!-- Center crystal -->
                    <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.6"/>
                </svg>
            </div>

            <!-- Frost OS text -->
            <div class="frost-os-text">
                <span class="frost-text-main">Frost</span>
                <span class="frost-text-secondary">OS</span>
            </div>

            <!-- Loading bar -->
            <div class="frost-loader-wrapper">
                <div class="frost-loader-track">
                    <div class="frost-loader-bar"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="shutdown-bg" v-if="runShutdown">
    </div>
</template>

<style scoped>
    /* ═══════════════════════════════════════════════════════════════
       FROST BOOT SCREEN
       ═══════════════════════════════════════════════════════════════ */

    .frost-boot-screen {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 50% 40%, #0a1628 0%, #060d18 50%, #020509 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        z-index: 200;
    }

    /* ── Floating ice particles ── */
    .frost-particles {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    .frost-particle {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(140, 210, 255, 0.7) 0%, rgba(140, 210, 255, 0) 70%);
        animation: frostFloat linear infinite;
        opacity: 0;
    }

    @keyframes frostFloat {
        0% {
            transform: translateY(0) scale(0);
            opacity: 0;
        }
        10% {
            opacity: 0.6;
            transform: translateY(10vh) scale(1);
        }
        90% {
            opacity: 0.3;
        }
        100% {
            transform: translateY(120vh) scale(0.3);
            opacity: 0;
        }
    }

    /* ── Central content wrapper ── */
    .frost-boot-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        z-index: 1;
        animation: frostContentReveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes frostContentReveal {
        0% {
            opacity: 0;
            filter: blur(20px);
            transform: scale(0.9);
        }
        100% {
            opacity: 1;
            filter: blur(0px);
            transform: scale(1);
        }
    }

    /* ── Snowflake logo ── */
    .frost-logo-container {
        position: relative;
        width: 120px;
        height: 120px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .frost-logo-glow {
        position: absolute;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(100, 200, 255, 0.15) 0%, transparent 70%);
        animation: frostGlowPulse 3s ease-in-out infinite;
    }

    @keyframes frostGlowPulse {
        0%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
        }
        50% {
            transform: scale(1.2);
            opacity: 1;
        }
    }

    .frost-snowflake {
        width: 100px;
        height: 100px;
        color: rgba(180, 225, 255, 0.9);
        filter: drop-shadow(0 0 12px rgba(100, 200, 255, 0.5));
        animation: frostSnowflakeSpin 20s linear infinite;
    }

    @keyframes frostSnowflakeSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }

    /* ── Frost OS text ── */
    .frost-os-text {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        user-select: none;
    }

    .frost-text-main {
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 2.4rem;
        font-weight: 200;
        letter-spacing: 0.4rem;
        color: rgba(210, 235, 255, 0.95);
        text-shadow: 0 0 20px rgba(100, 200, 255, 0.3);
        animation: frostTextReveal 2s ease-out forwards;
    }

    .frost-text-secondary {
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 2.4rem;
        font-weight: 500;
        letter-spacing: 0.2rem;
        color: rgba(100, 200, 255, 0.85);
        text-shadow: 0 0 15px rgba(100, 200, 255, 0.4);
        animation: frostTextReveal 2s ease-out 0.3s forwards;
        opacity: 0;
    }

    @keyframes frostTextReveal {
        0% {
            opacity: 0;
            letter-spacing: 1.5rem;
            filter: blur(8px);
        }
        100% {
            opacity: 1;
            letter-spacing: inherit;
            filter: blur(0px);
        }
    }

    /* ── Loading bar ── */
    .frost-loader-wrapper {
        width: 240px;
        animation: frostLoaderAppear 1s ease-out 0.8s forwards;
        opacity: 0;
    }

    @keyframes frostLoaderAppear {
        to { opacity: 1; }
    }

    .frost-loader-track {
        height: 3px;
        width: 100%;
        background: rgba(100, 200, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
        backdrop-filter: blur(4px);
    }

    .frost-loader-bar {
        height: 100%;
        width: 40%;
        border-radius: 3px;
        background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.6), rgba(180, 230, 255, 0.9), rgba(100, 200, 255, 0.6), transparent);
        animation: frostLoaderSlide 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    @keyframes frostLoaderSlide {
        0%   { transform: translateX(-150%); }
        100% { transform: translateX(400%); }
    }

    /* ═══════════════════════════════════════════════════════════════
       SHUTDOWN & TRANSITIONS (preserved)
       ═══════════════════════════════════════════════════════════════ */

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