<script setup>

import {onMounted, computed, ref } from 'vue'
import { Modal } from 'bootstrap'

const title = ref('Biboo-Tax');

const emit = defineEmits([
    'change-character',
    'start-game'
]);

defineProps([
    'characterImage',
    'initialIndex'
])

const hide = () => modalInstance.hide();
const show = () => modalInstance.show();

const changeButtonEvent = () => {
    emit('change-character');
}

defineExpose({
    show,
    hide
});

const phrases = [
    'the gaaaame!!',
    'you shall not play',
    'la sopa del macaco',
    'best score buys dinner',
    'the end is near',
    `today is ${new Date().toDateString()}!!`,
    'bro moment',
    'bruuuuh',
    'sticking out ur gyatt for nerizzler',
    'youre so biboo tax',
    'i just wanna be your shiori',
    'youre so bau bau',
    'oh hello there pebble',
    'window cleaner laugh',
    'beeeeejou',
    'koseki bijou'
];

const subtitlePhrase = ref('');

const letras = computed(() => {
  return title.value.split('')
})

const modalElement = ref(null);
let modalInstance = null;

const generarFraseAleatoria = () => {
    const indice = Math.floor(Math.random() * phrases.length)
    subtitlePhrase.value = phrases[indice]
}

onMounted(() => {
    modalInstance = new Modal(modalElement.value);
    modalInstance.show();
    generarFraseAleatoria();
});

</script>

<template>
    <div ref="modalElement" class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" style="backdrop-filter: blur(16px);">

        <div class="modal-dialog modal-dialog-centered">

            <div class="modal-content rainbow-bg" style="border: 0; height: 30rem;">                
                <div class="modal-body d-flex flex-column justify-content-end align-items-center">

                    <h1 class="main-title breath-text">
                        <span v-for="(letra, index) in letras"
                            :key="index"
                            :style="{ '--index': index }"
                        >
                        {{ letra === ' ' ? '\u00A0' : letra }}
                        </span>
                    </h1>               
                    
                    <div class="press-start-2p-regular subtitle-phrase">
                        {{ subtitlePhrase }}
                    </div>

                    <div class="d-flex flex-row" style="width: 100%;">
                        <div class="d-flex flex-column align-items-center">
                            <label>Your character</label>
                            <div class="d-flex align-items-center justify-content-center" style="width: 16rem; height: 14rem;">
                                <img :src="characterImage" style="max-width: 100%; max-height: 100%;">
                            </div>
                            <button @click="changeButtonEvent">Change</button>
                        </div>

                        <div class="d-flex align-items-center">
                            <button @click="emit('start-game')" class="box a" onclick="StartGameplay()">Play</button>
                        </div>                
                    </div>
                
                    <img id="BibooRoll" src="../images/biboowalk.gif" style="top: 21.5rem; position: absolute; left: 18rem; width: 16rem; object-fit: cover;" />

                    <label style="color: var(--infoColor); width: 100%; padding-top: 25px;">A game made with ❤ by nekominie</label>
                </div>
            </div>
        </div>
    </div>

</template>