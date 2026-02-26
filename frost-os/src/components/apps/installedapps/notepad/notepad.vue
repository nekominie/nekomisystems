<script setup lang="ts">
    import { ref, inject } from 'vue'
    import { OS_KEY } from '../../../api/os_api'

    const os = inject(OS_KEY)!
    if (!os) throw new Error('OS API not found')

    const text = ref('')

    /*await os.measure('notepad', async () => {
    })*/

</script>

<template>
    <div class="notepad-container" style="height: 100%; width: 100%;">
      <textarea 
        v-model="text" 
        placeholder="Escribe algo aquí..."
        class="notepad-textarea"
        style="height: 100%; width: 100%;"
      ></textarea>
  </div>
</template>