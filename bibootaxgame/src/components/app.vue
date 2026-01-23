<script setup>

import { ref, computed } from 'vue'
import WelcomeMenu from './welcomemenu.vue';
import CharacterSelect from './characterselect.vue';

const titulo = ref("Biboo-Tax: The Game")

const characters = [
    { name: 'Koseki Bijou', alias: 'biboo' },
    { name: 'Nerissa Ravencroft', alias: 'rissa' },
    { name: 'Mococo Abyssgard', alias: 'moco-chan' },
    { name: 'Fuwawa Abyssgard', alias: 'fuwawa' },
    { name: 'Shiori Novella', alias: 'shiori' },
    { name: 'Hakos Baelz', alias: 'bae' },
    { name: 'Ouro Kronii', alias: 'kronii' },
    { name: 'IRyS', alias: 'irys' },
    { name: 'Nanashi Mumei', alias: 'moom' },
    { name: 'Ceres Fauna', alias: 'fauna' },
    { name: 'Tsukumo Sana', alias: 'sana' },
    { name: 'Takanashi Kiara', alias: 'wawa' },
    { name: 'Mori Calliope', alias: 'dad' },
    { name: "Ninomae Ina'nis", alias: 'ina' },
    { name: 'Gawr Gura', alias: 'gooba' },
    { name: 'Amelia Watson', alias: 'ame' }
]

const imgStringPath = '/selection'
const selectedIndex = ref(Number(localStorage.getItem('selectedIndex')) || 0)

const currentCharacterImg = computed(() => {
    const char = characters[selectedIndex.value]
    return char ? `${imgStringPath}/${char.alias}.png` : `${imgStringPath}/biboo.png`
})

const welcomeMenuRef = ref(null)
const characterSelectRef = ref(null)

const openCharacterSelect = () => {
    welcomeMenuRef.value.hide();
    characterSelectRef.value.show();
}

const closeCharacterSelect = (index) => {
    selectedIndex.value = index
    localStorage.setItem('selectedIndex', index);

    characterSelectRef.value.hide();
    welcomeMenuRef.value.show();
}

const startGameplay = () => {
    welcomeMenuRef.value.hide();
}

</script>

<template>
    <div style="height: 100%; width: 100%;">
        <img :src="currentCharacterImg" style="position: fixed; top: 100px; left: 100px; width: 180px; object-fit: cover;" />

        <WelcomeMenu 
            ref="welcomeMenuRef"
            :character-image="currentCharacterImg"
            @change-character="openCharacterSelect"
            @start-game="startGameplay"
        />

        <CharacterSelect 
            ref="characterSelectRef"
            :characters="characters"
            :initial-index="selectedIndex"
            @selected-character="closeCharacterSelect"
        />
    </div>
</template>