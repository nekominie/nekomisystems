<script setup lang="ts">
    import { ref } from 'vue'
    const text = ref('')

    /*<iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/track/1R0TzCHCkRpgWloQCn7Mh8?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy">        
    </iframe>*/
</script>

<template>
    <div style="background-color: #1b5589; width: 100%; height: 100%;">
        <iframe data-testid="embed-iframe" src="https://open.spotify.com/embed/playlist/22qeDuOyuPAPHs7KDZnpmj?utm_source=generator" width="100%" height="100%" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
    </div>
</template>