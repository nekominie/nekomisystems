<script setup lang="ts">
const gameUrl = '/bibootaxgame/' /*`${import.meta.env.VITE_GAME_URL}/bibootaxgame/`*/
</script>

<template>
  <iframe style="width: 100%; height: 100%;" 
    :src="gameUrl"
  ></iframe>
</template>