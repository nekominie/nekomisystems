<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useLockStore } from './lock_store';
import { useSettingsStore } from '../../apps/coreapps/settings/store';

const emit = defineEmits<{
  (e: 'shutdown'): void;
}>();

const lockStore = useLockStore();
const settingsStore = useSettingsStore();

const currentTime = ref('');
const currentDate = ref('');
const inputPin = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isShaking = ref(false);
const showPowerMenu = ref(false);
const pinInputRef = ref<HTMLInputElement | null>(null);

let timeTimer: number | null = null;

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  };
  currentDate.value = now.toLocaleDateString('es-ES', options);
};

const backgroundImageStyle = computed(() => {
  const url = lockStore.lockBgMode === 'custom' && lockStore.customBgUrl
    ? lockStore.customBgUrl
    : settingsStore.wallpaperUrl;
  return {
    backgroundImage: `url(${url})`
  };
});

const onGlanceClick = () => {
  lockStore.showChallenge();
  errorMessage.value = '';
  inputPin.value = '';
  nextTick(() => {
    pinInputRef.value?.focus();
  });
};

const onCancelChallenge = () => {
  lockStore.hideChallenge();
  errorMessage.value = '';
  inputPin.value = '';
  showPowerMenu.value = false;
};

const handleUnlockSubmit = () => {
  if (!lockStore.requirePin) {
    lockStore.unlock();
    return;
  }

  if (!inputPin.value) {
    showError('Introduce tu PIN');
    return;
  }

  const isValid = lockStore.validatePin(inputPin.value);
  if (!isValid) {
    showError('El PIN introducido es incorrecto');
    inputPin.value = '';
    pinInputRef.value?.focus();
  }
};

const showError = (msg: string) => {
  errorMessage.value = msg;
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 400);
};

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  if (!lockStore.isLocked) return;

  if (!lockStore.isChallengeVisible) {
    // Cualquier tecla pasa a la vista de desafío
    onGlanceClick();
  } else {
    // Si presiona Escape, regresa a la vista ambiental
    if (e.key === 'Escape') {
      onCancelChallenge();
    }
  }
};

const handleWheel = (e: WheelEvent) => {
  if (!lockStore.isChallengeVisible && e.deltaY < -20) {
    onGlanceClick();
  }
};

const handlePowerAction = (action: 'shutdown' | 'restart') => {
  showPowerMenu.value = false;
  if (action === 'shutdown') {
    emit('shutdown');
  } else if (action === 'restart') {
    window.location.reload();
  }
};

onMounted(() => {
  updateClock();
  timeTimer = window.setInterval(updateClock, 1000);
  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('wheel', handleWheel, { passive: true });
});

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer);
  window.removeEventListener('keydown', handleGlobalKeyDown);
  window.removeEventListener('wheel', handleWheel);
});
</script>

<template>
  <div 
    class="frost-lock-screen"
    :style="backgroundImageStyle"
    @click.self="!lockStore.isChallengeVisible ? onGlanceClick() : null"
  >
    <!-- Capa de desenfoque / acrílico -->
    <div 
      class="lock-overlay" 
      :class="{ 'challenge-active': lockStore.isChallengeVisible }"
    ></div>

    <!-- 1. VISTA AMBIENTAL (GLANCE CLOCK) -->
    <div 
      v-if="!lockStore.isChallengeVisible"
      class="lock-glance-view"
      @click="onGlanceClick"
    >
      <div class="lock-clock-container">
        <div class="lock-time">{{ currentTime }}</div>
        <div class="lock-date">{{ currentDate }}</div>
      </div>

      <div class="lock-prompt">
        <i class="bi bi-chevron-compact-up lock-chevron"></i>
        <span>Haz clic o presiona cualquier tecla para desbloquear</span>
      </div>
    </div>

    <!-- 2. VISTA DE DESAFÍO / INICIO DE SESIÓN -->
    <div 
      v-else
      class="lock-challenge-view"
      @click.self="showPowerMenu = false"
    >
      <div class="challenge-card" :class="{ 'shake-animation': isShaking }">
        <!-- Avatar de Usuario -->
        <div class="user-avatar-wrapper">
          <img 
            v-if="lockStore.userAvatarUrl" 
            :src="lockStore.userAvatarUrl" 
            alt="Avatar de usuario" 
            class="user-avatar-img"
          />
          <div v-else class="user-avatar-fallback">
            <i class="bi bi-person-fill"></i>
          </div>
        </div>

        <div class="challenge-username">{{ lockStore.userName }}</div>

        <!-- Formulario con PIN requerido -->
        <div v-if="lockStore.requirePin" class="pin-form">
          <div class="pin-input-group">
            <input 
              ref="pinInputRef"
              v-model="inputPin"
              :type="showPassword ? 'text' : 'password'"
              placeholder="PIN"
              class="pin-input"
              maxlength="20"
              @keydown.enter.prevent="handleUnlockSubmit"
              @input="errorMessage = ''"
            />
            <button 
              type="button" 
              class="pin-action-btn"
              :title="showPassword ? 'Ocultar PIN' : 'Mostrar PIN'"
              @click="showPassword = !showPassword"
              style="right: 36px;"
            >
              <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
            <button 
              type="button" 
              class="pin-action-btn" 
              title="Desbloquear"
              @click="handleUnlockSubmit"
            >
              <i class="bi bi-arrow-right-short"></i>
            </button>
          </div>

          <div v-if="errorMessage" class="pin-error-text">
            <i class="bi bi-exclamation-circle"></i>
            <span>{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Botón Simple si no requiere PIN -->
        <button 
          v-else 
          class="unlock-btn"
          @click="handleUnlockSubmit"
        >
          <i class="bi bi-unlock-fill"></i>
          <span>Iniciar sesión</span>
        </button>

        <button class="cancel-challenge-btn" @click="onCancelChallenge">
          <i class="bi bi-arrow-left"></i>
          <span>Volver al reloj</span>
        </button>
      </div>
    </div>

    <!-- Barra Inferior: Red, Batería y Opciones de Apagado -->
    <div class="lock-bottom-bar" @click.stop>
      <div class="bottom-icon-item" title="Red conectada">
        <i class="bi bi-wifi"></i>
      </div>
      <div class="bottom-icon-item" title="Batería 100%">
        <i class="bi bi-battery-full"></i>
      </div>
      
      <div class="power-menu-trigger">
        <button 
          class="power-btn" 
          title="Opciones de energía"
          @click="showPowerMenu = !showPowerMenu"
        >
          <i class="bi bi-power"></i>
        </button>

        <div v-if="showPowerMenu" class="power-dropdown">
          <button @click="handlePowerAction('restart')">
            <i class="bi bi-arrow-clockwise"></i>
            <span>Reiniciar</span>
          </button>
          <button @click="handlePowerAction('shutdown')">
            <i class="bi bi-power"></i>
            <span>Apagar</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/lock_screen.css';
</style>
