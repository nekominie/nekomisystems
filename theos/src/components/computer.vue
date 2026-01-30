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
  <div class="off-screen-container main-font" :class="pcStatus">
    
    <div v-if="pcStatus === 'off'" class="d-flex-center">
      
      <div class="message-container" style="padding-bottom: 30px;">
        Nada que ver aqui
      </div>
      
      <div class="case-frame" style="margin-bottom: 12px; display: flex; flex-direction: row; align-items: center; justify-content: center;">
        <div></div>
        
        <div class="btn-frame d-flex-center">
          <button @click="powerButtonClick" class="btn-power-on d-flex-center">
            <i class="bi-power d-flex"></i>
            <div class="btn-shine"></div>
          </button>
        </div>
        
        <div>
          <div>
            <div></div>
            <div>POWER</div>
          </div>
        </div>
      </div>
      
      <div class="message-container d-flex-center">
        <div style="padding-bottom: 77px;">Apagaste tu computadora</div>
        <div style="font-size: 40px;">
          ¡Prendela de nuevo!
        </div>
        <div class="message-subtitle" style="font-size: 27px;">
          Presiona el boton...
        </div>
      </div>
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

@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@200..800&display=swap');

.main-font{
  font-family: "Oxanium", sans-serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
}

.off-screen-container {
  width: 100%;
  height: 100%;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.message-container{
  color: rgb(102, 102, 102);  
  font-size: 50px;
}

.d-flex-center{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.case-frame{
  background: linear-gradient(186deg, #fbd298, #a58352);
  width: 46rem;
  height: 30rem;
  box-shadow: inset 0px 0px 64px 76px #000000;
  background-clip: padding-box;
  /*filter: brightness(55%);*/
  /*border-radius: 24%;*/
  opacity: 60%;
}

.btn-power-on{
  background-color: #797979;
  border: 0;
  border-radius: 50%;
  width: 9rem;
  height: 9rem;
  box-shadow: inset 0px 0px 11px 6px #00000085;
  cursor: pointer;
}

.btn-shine{
  background: linear-gradient(180deg, #ffffff, #ffffff00);
  width: 7.5rem;
  height: 7.5rem;
  position: relative;
  border-radius: 50%;
  opacity: 50%;
}

.btn-power-on i{
  position: absolute;
  font-size: 4rem;
  color: #00000080;
}

.btn-frame{
    background: linear-gradient(127deg, #d5d5d5, #6d6d6d);
    border-radius: 50%;
    width: 12rem;
    height: 12rem;
    border: solid 4px #898989;
    box-shadow: 0px 0px 15px 2px #0000008c;
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

/*.btn-power-on {
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
}*/

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