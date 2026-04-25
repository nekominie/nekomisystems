<script lang="ts" setup>

import { computed } from 'vue';
import { useVolumeSliderStore } from './store';
const store = useVolumeSliderStore('volume_slider')

const trigger = computed(() => store.state.trigger);

</script>

<template>
    <div class="master-container">
        <div style="display: flex; flex-direction: column; width: 100%;">

            <div style="font-weight: 400;">Volumen Maestro</div>
            
            <div style="display: flex; flex-direction: row; align-items: center;">
                <div>
                    <i class="bi bi-volume-up-fill"></i>
                </div>
                <div style="flex: 1;">
                    <input style="width: 100%;" type="range" min="0" max="100" v-model="trigger" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.master-container{
    bottom: 60px;
    right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgb(0 0 0 / 28%);
    border-radius: 10px;
    backdrop-filter: blur(6px);
    padding: 5px 14px;
    color: rgba(255, 255, 255, 0.711);
    width: 300px;
}

.master-container i{
    font-size: 30px;
    margin-right: 10px;
    color: white;
}
</style>