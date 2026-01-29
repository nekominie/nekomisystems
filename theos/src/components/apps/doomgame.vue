<script setup>
const gameUrl = `${import.meta.env.VITE_GAME_URL}/doomgame/`
</script>

<template>
  <iframe style="width: 100%; height: 100%;" 
    :src="gameUrl"
  ></iframe>
</template>