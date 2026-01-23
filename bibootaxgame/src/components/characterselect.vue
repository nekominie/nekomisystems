<script setup>
import { ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'

const props = defineProps([
    'characters',
    'initialIndex'
])

const emit = defineEmits([
    'selected-character'
]);

const modalElement = ref(null)
let modalInstance = null
const selectedIndex = ref(props.initialIndex || 0)
const temporalIndex = ref(props.initialIndex)

onMounted(() => {
  modalInstance = new Modal(modalElement.value)
})

const show = () => modalInstance.show()
const hide = () => modalInstance.hide()

const confirmSelection = () => {
  emit('selected-character', temporalIndex.value)
}

defineExpose({ show, hide })
</script>

<template>
    <div ref="modalElement" class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" style="backdrop-filter: blur(16px);">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rainbow-bg" style="border: 0; height: 40rem;">
                <div class="modal-body d-flex flex-column justify-content-center align-items-center">
                    <label>Choose your character</label>
                    <label id="LabelCharacterName"></label>

                    <div id="CarouselCharacters" class="carousel slide" style="width: 100%; height: 100%;">
                        <div class="carousel-inner" style="height: 100%;">
                            <div v-for="(character, i) in characters"
                                :key = "i"
                                class="carousel-item"
                                :class="{ active: i == selectedIndex }"
                                style="max-height: 30rem; max-width: 30rem;"
                            >
                                <img
                                    :src="`/selection/${character.alias}.png`" 
                                    class="d-block w-100" 
                                    style="max-width: 100%; max-height: 26rem; object-fit: contain;"
                                    :alt="character.name"
                                >
                            </div>
                        </div>

                        <button @click="temporalIndex = (temporalIndex - 1) % characters.length" class="carousel-control-prev" type="button" data-bs-target="#CarouselCharacters" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        
                        <button @click="temporalIndex = (temporalIndex + 1) % characters.length" class="carousel-control-next" type="button" data-bs-target="#CarouselCharacters" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>                        
                    </div>

                    <button @click="confirmSelection">Done</button>
                </div>
            </div>
        </div>
    </div>
</template>