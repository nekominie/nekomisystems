<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { saveUserProfile } from '../../database/user_profile';

const emit = defineEmits<{
    (e: 'finishedSetup'): void
}>();

const hideDarkOverlay = ref(false);
const deleteDarkOverlay = ref(false);

const showGreeting = ref(false);
const showSubtitles = ref(false);
const showFormCard = ref(false);
const showContinueBtn = ref(false);

const isSaving = ref(false);
const isExiting = ref(false);

const usernameInput = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);
const selectedFile = ref<File | null>(null);

onMounted(() => {
    // Secuencia de entrada fluida y profesional
    setTimeout(() => {
        hideDarkOverlay.value = true;
    }, 60);

    setTimeout(() => {
        deleteDarkOverlay.value = true;
    }, 800);

    setTimeout(() => {
        showGreeting.value = true;
    }, 250);

    setTimeout(() => {
        showSubtitles.value = true;
    }, 650);

    setTimeout(() => {
        showFormCard.value = true;
    }, 1050);

    setTimeout(() => {
        showContinueBtn.value = true;
    }, 1300);
});

const triggerFileInput = () => {
    fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        const file = target.files[0];
        selectedFile.value = file;
        if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl.value);
        }
        previewUrl.value = URL.createObjectURL(file);
    }
};

const avatarStyle = computed(() => {
    if (previewUrl.value) {
        return {
            backgroundImage: `url(${previewUrl.value})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderColor: 'rgba(180, 225, 255, 0.8)'
        };
    }
    return {};
});

const finishSetup = async () => {
    if (isSaving.value) return;
    isSaving.value = true;

    // Guardado resiliente en IndexedDB con respaldo en localStorage (sin diálogos molestos)
    try {
        await saveUserProfile(usernameInput.value, selectedFile.value);
    } catch (err) {
        console.error('Error durante el guardado de bienvenida:', err);
    }

    // Iniciar la transición helada hacia el escritorio
    isExiting.value = true;

    // Pequeño desfase para que la capa de hielo florezca antes de transferir control a kernel
    setTimeout(() => {
        emit('finishedSetup');
    }, 350);
};
</script>

<template>
    <div class="welcome-container main-font" :class="{ 'is-exiting': isExiting }">
        <!-- Capa de oscurecimiento inicial que se desvanece suavemente -->
        <div v-if="!deleteDarkOverlay" class="dark-overlay" :class="{ 'hide': hideDarkOverlay }"></div>

        <!-- Capa de fondo con wallpaper nativo -->
        <div class="bg-wallpaper"></div>

        <!-- Velo de desenfoque acrílico y atmósfera helada -->
        <div class="frosted-glass-backdrop">
            <div class="ambient-frost-glow"></div>
        </div>

        <!-- Contenido principal interactivo -->
        <div class="ui-wrapper">
            <div class="welcome-box">
                <!-- Encabezado con animaciones tipográficas profesionales -->
                <header class="welcome-header">
                    <div class="frost-pill-badge" :class="{ 'reveal': showGreeting }">
                        <i class="bi bi-snow"></i> Frost OS
                    </div>

                    <h1 class="welcome-title" :class="{ 'reveal': showGreeting }">
                        ¡Hola!
                    </h1>

                    <p class="welcome-subtitle" :class="{ 'reveal': showSubtitles }">
                        Es la primera vez que te vemos por aquí
                    </p>

                    <p class="welcome-prompt" :class="{ 'reveal': showSubtitles }">
                        Cuéntanos más sobre ti para preparar tu espacio
                    </p>
                </header>

                <!-- Tarjeta de configuración de usuario con efecto glassmorphism -->
                <div class="profile-card" :class="{ 'reveal': showFormCard }">
                    <!-- Foto de perfil -->
                    <div class="avatar-column">
                        <div class="avatar-ring" :style="avatarStyle" @click="triggerFileInput" title="Cambiar foto de perfil">
                            <i v-if="!previewUrl" class="bi bi-person-fill avatar-icon-placeholder"></i>
                            <div class="avatar-hover-overlay">
                                <i class="bi bi-camera-fill"></i>
                            </div>
                        </div>

                        <button type="button" class="upload-pill-btn" @click="triggerFileInput">
                            <i class="bi bi-image"></i>
                            <span>{{ previewUrl ? 'Cambiar foto' : 'Subir foto' }}</span>
                        </button>
                        <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" style="display: none;" />
                    </div>

                    <!-- Separador vertical sutil -->
                    <div class="card-separator"></div>

                    <!-- Campo de nombre de usuario -->
                    <div class="info-column">
                        <label class="field-label" for="username-input">
                            <span>Nombre de usuario</span>
                            <span class="label-optional">(Opcional)</span>
                        </label>

                        <div class="input-glow-wrapper">
                            <i class="bi bi-person input-prefix-icon"></i>
                            <input
                                id="username-input"
                                v-model="usernameInput"
                                class="frost-text-input"
                                placeholder="Ingresa tu nombre..."
                                maxlength="32"
                                autocomplete="off"
                                spellcheck="false"
                                @keydown.enter.prevent="finishSetup"
                            />
                        </div>
                        <span class="field-hint">Podrás personalizarlo en Ajustes cuando quieras.</span>
                    </div>
                </div>

                <!-- Botón de acción Continuar -->
                <footer class="action-footer" :class="{ 'reveal': showContinueBtn }">
                    <button
                        type="button"
                        class="continue-action-btn"
                        :disabled="isSaving"
                        @click="finishSetup"
                    >
                        <span v-if="!isSaving" class="btn-inner">
                            Continuar
                            <i class="bi bi-arrow-right"></i>
                        </span>
                        <span v-else class="btn-inner loading-state">
                            <i class="bi bi-snow spin-icon"></i>
                            Iniciando...
                        </span>
                    </button>
                </footer>
            </div>
        </div>

        <!-- Efecto de transición congelada (Frost Veil) al continuar -->
        <div class="frost-veil" :class="{ 'frost-veil-active': isExiting }">
            <div class="frost-crystallize-layer"></div>
        </div>
    </div>
</template>

<style scoped>
/* Contenedor principal */
.welcome-container {
    position: relative;
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
    user-select: none;
    background-color: #040911;
    color: #f1f7ff;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Fondo con el wallpaper nativo */
.bg-wallpaper {
    position: absolute;
    inset: 0;
    background-image: url('/wallpapers/default-wallpaper.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transform: scale(1.02);
    transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s ease;
}

.is-exiting .bg-wallpaper {
    filter: blur(12px) brightness(1.15);
    transform: scale(1.06);
}

/* Capa acrílica con desenfoque helado */
.frosted-glass-backdrop {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 35%, rgba(12, 22, 38, 0.65) 0%, rgba(4, 9, 17, 0.85) 100%);
    backdrop-filter: blur(55px);
    -webkit-backdrop-filter: blur(55px);
    z-index: 1;
}

.ambient-frost-glow {
    position: absolute;
    top: -15%;
    left: 20%;
    width: 60%;
    height: 70%;
    background: radial-gradient(ellipse at center, rgba(140, 210, 255, 0.15) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(40px);
}

/* Capa de oscurecimiento inicial */
.dark-overlay {
    position: absolute;
    inset: 0;
    background-color: #000000;
    z-index: 50;
    opacity: 1;
    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
}

.dark-overlay.hide {
    opacity: 0;
}

/* Interfaz Principal */
.ui-wrapper {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 720px;
    padding: 24px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s ease;
}

.is-exiting .ui-wrapper {
    opacity: 0;
    transform: scale(0.96) translateY(-10px);
    filter: blur(16px);
}

.welcome-box {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* Encabezado y tipografía rediseñada */
.welcome-header {
    text-align: center;
    margin-bottom: 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.frost-pill-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    border-radius: 20px;
    background: rgba(180, 225, 255, 0.12);
    border: 1px solid rgba(210, 240, 255, 0.25);
    color: #bce3ff;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 14px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transform: translateY(12px) scale(0.95);
    filter: blur(6px);
    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.frost-pill-badge.reveal {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
}

.welcome-title {
    margin: 0 0 10px 0;
    font-size: 4.2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.05;
    background: linear-gradient(135deg, #ffffff 40%, #c4e4ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 4px 20px rgba(160, 215, 255, 0.35));
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), filter 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    filter: blur(10px);
}

.welcome-title.reveal {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
}

.welcome-subtitle {
    margin: 0 0 6px 0;
    font-size: 1.85rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #e6f2ff;
    opacity: 0;
    transform: translateY(16px);
    filter: blur(8px);
    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.welcome-subtitle.reveal {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
}

.welcome-prompt {
    margin: 0;
    font-size: 1.15rem;
    color: #9ac2e8;
    font-weight: 400;
    opacity: 0;
    transform: translateY(14px);
    filter: blur(6px);
    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.welcome-prompt.reveal {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
}

/* Tarjeta Glassmorphism de perfil */
.profile-card {
    width: 100%;
    background: rgba(18, 30, 48, 0.55);
    border: 1px solid rgba(200, 230, 255, 0.18);
    border-radius: 24px;
    padding: 32px 36px;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: center;
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.55),
                inset 0 1px 1px rgba(255, 255, 255, 0.2);
    opacity: 0;
    transform: translateY(20px) scale(0.98);
    filter: blur(10px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.profile-card.reveal {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
}

/* Columna de Avatar */
.avatar-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
}

.avatar-ring {
    position: relative;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(60, 95, 135, 0.4), rgba(20, 40, 65, 0.6));
    border: 3px solid rgba(180, 225, 255, 0.4);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(140, 205, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.avatar-ring:hover {
    transform: scale(1.04);
    border-color: rgba(210, 240, 255, 0.8);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 28px rgba(160, 220, 255, 0.4);
}

.avatar-icon-placeholder {
    font-size: 52px;
    color: rgba(220, 240, 255, 0.7);
}

.avatar-hover-overlay {
    position: absolute;
    inset: 0;
    background: rgba(5, 15, 30, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 24px;
    opacity: 0;
    backdrop-filter: blur(4px);
    transition: opacity 0.25s ease;
}

.avatar-ring:hover .avatar-hover-overlay {
    opacity: 1;
}

.upload-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #d8ecff;
    padding: 7px 15px;
    border-radius: 20px;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.25s ease;
}

.upload-pill-btn:hover {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(180, 225, 255, 0.4);
    color: #ffffff;
    transform: translateY(-1px);
}

/* Separador de tarjeta */
.card-separator {
    width: 1px;
    height: 100px;
    background: linear-gradient(to bottom, transparent, rgba(200, 230, 255, 0.2) 30%, rgba(200, 230, 255, 0.2) 70%, transparent);
    margin: 0 32px;
}

/* Columna de Input de información */
.info-column {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.field-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #e1efff;
    margin-bottom: 10px;
    letter-spacing: 0.02em;
}

.label-optional {
    font-size: 0.8rem;
    font-weight: 400;
    color: #8bb3dc;
}

.input-glow-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
}

.input-prefix-icon {
    position: absolute;
    left: 14px;
    font-size: 1.15rem;
    color: #8cb5dc;
    pointer-events: none;
    transition: color 0.25s ease;
}

.frost-text-input {
    width: 100%;
    box-sizing: border-box;
    padding: 13px 16px 13px 44px;
    background: rgba(8, 16, 28, 0.6);
    border: 1px solid rgba(180, 220, 255, 0.2);
    border-radius: 14px;
    color: #ffffff;
    font-size: 1.1rem;
    font-family: inherit;
    outline: none;
    backdrop-filter: blur(12px);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.frost-text-input:focus {
    background: rgba(10, 20, 35, 0.8);
    border-color: rgba(130, 205, 255, 0.7);
    box-shadow: 0 0 20px rgba(100, 190, 255, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.frost-text-input:focus ~ .input-prefix-icon,
.input-glow-wrapper:focus-within .input-prefix-icon {
    color: #bde2ff;
}

.frost-text-input::placeholder {
    color: rgba(160, 195, 230, 0.45);
}

.field-hint {
    margin-top: 9px;
    font-size: 0.82rem;
    color: #85add4;
}

/* Pie de acciones (Continuar) */
.action-footer {
    width: 100%;
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
    opacity: 0;
    transform: translateY(16px);
    filter: blur(8px);
    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.action-footer.reveal {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
}

.continue-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 160px;
    padding: 13px 32px;
    border-radius: 16px;
    border: 1px solid rgba(200, 235, 255, 0.4);
    background: linear-gradient(135deg, rgba(50, 130, 220, 0.65) 0%, rgba(20, 85, 175, 0.75) 100%);
    color: #ffffff;
    font-size: 1.05rem;
    font-weight: 600;
    font-family: inherit;
    letter-spacing: 0.02em;
    cursor: pointer;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 10px 28px rgba(10, 70, 160, 0.35),
                inset 0 1px 1px rgba(255, 255, 255, 0.4);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.continue-action-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    background: linear-gradient(135deg, rgba(70, 155, 245, 0.8) 0%, rgba(30, 105, 205, 0.9) 100%);
    border-color: rgba(220, 245, 255, 0.7);
    box-shadow: 0 14px 36px rgba(15, 95, 210, 0.5),
                0 0 24px rgba(130, 210, 255, 0.4),
                inset 0 1px 1px rgba(255, 255, 255, 0.6);
}

.continue-action-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 6px 18px rgba(10, 70, 160, 0.35);
}

.continue-action-btn:disabled {
    cursor: default;
    opacity: 0.9;
}

.btn-inner {
    display: inline-flex;
    align-items: center;
    gap: 10px;
}

.continue-action-btn:hover .bi-arrow-right {
    transform: translateX(4px);
}

.bi-arrow-right {
    transition: transform 0.25s ease;
}

.loading-state {
    color: #dff0ff;
}

.spin-icon {
    display: inline-block;
    animation: spinFrost 1.6s linear infinite;
}

@keyframes spinFrost {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Transición de descongelamiento hacia el escritorio */
.frost-veil {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 40;
    opacity: 0;
    background: radial-gradient(circle at center, rgba(220, 245, 255, 0.45) 0%, rgba(140, 210, 255, 0.3) 45%, rgba(10, 22, 40, 0.85) 100%);
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
    transition: opacity 0.5s ease-out, backdrop-filter 0.5s ease-out;
}

.frost-veil-active {
    opacity: 1;
    backdrop-filter: blur(40px) brightness(1.2);
    -webkit-backdrop-filter: blur(40px) brightness(1.2);
}

.frost-crystallize-layer {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
    background-size: 24px 24px;
    opacity: 0.6;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .profile-card {
        flex-direction: column;
        padding: 24px;
    }

    .card-separator {
        width: 80%;
        height: 1px;
        margin: 20px 0;
    }

    .welcome-title {
        font-size: 3rem;
    }

    .welcome-subtitle {
        font-size: 1.4rem;
    }

    .action-footer {
        justify-content: center;
    }

    .continue-action-btn {
        width: 100%;
    }
}
</style>