<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Boot from './boot.vue'
import Kernel from './kernel.vue'

const pcStatus = ref('off');
const loadedOs = ref(false);

onMounted(() => {
    const savedStatus = localStorage.getItem('pc_power_state');

    if(savedStatus === 'on') {
        pcStatus.value = 'on';
    }
    else{
        pcStatus.value = 'off';
    }
})

const powerButtonClick = () => {
    if(pcStatus.value === 'on') {
        //APAGAR
        pcStatus.value = 'off';
        loadedOs.value = false;
    }
    else{
        //ENCENDER
        pcStatus.value = 'on';
    }
    localStorage.setItem('pc_power_state', pcStatus.value);
}

const bootSuccess = () => {
    loadedOs.value = true;
}

</script>

<template>
  <div class="physical-monitor" :class="pcStatus">
    
    <div v-if="pcStatus === 'off'" class="screen screen-off">
      <button @click="powerButtonClick" class="btn-power-on">
        ⏻
      </button>
    </div>

    <Boot v-if="pcStatus === 'on'"
        @boot-success="bootSuccess"
    />

    <Kernel v-if="loadedOs"
        @shutdown="powerButtonClick"
    />
  </div>
</template>

<style scoped>
.physical-monitor {
  width: 100vw;
  height: 100vh;
  background: #1a1a1a; /* El color del marco del monitor */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.screen {
  width: 95%;
  height: 90%;
  background: #000;
  transition: background 0.5s;
}

.screen-off {
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-power-on {
  background: none;
  border: 2px solid #333;
  color: #333;
  font-size: 3rem;
  border-radius: 50%;
  cursor: pointer;
  transition: 0.3s;
}

.btn-power-on:hover {
  color: #0f0;
  border-color: #0f0;
  text-shadow: 0 0 10px #0f0;
}

.led-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: red; /* Apagado */
}

.led-indicator.on, .led-indicator.booting {
  background: #0f0;
  box-shadow: 0 0 5px #0f0;
}
</style>