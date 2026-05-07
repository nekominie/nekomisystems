<template>
  <div class="frst-bg-dark main-container">
    <div class="d-flex flex-column" style="flex: 1; padding: 10px;">
        <div class="d-flex flex-row align-items-center" style="gap: 20px;">
            <div class="run-icon">
                <i class="bi bi-terminal-fill"></i>
            </div>

            <p>Escriba el nombre del programa, carpeta, documento o recurso que desea abrir.</p>
        </div>

        <div class="d-flex flex-row align-items-center" style="gap: 10px;">
            <label for="run-input">Abrir:</label>

            <input class="frst-txt-input"
                style="flex: 1;"
                id="run-input"
                v-model="command" 
                type="text" 
                autofocus 
                @keyup.enter="executeCommand"
                placeholder="frost://settings"
            />
        </div>
    </div>
        <div class="btn-container" style="align-self: end;">
            <button class="frst-btn primary" @click="executeCommand">Aceptar</button>
            <button class="frst-btn generic" @click="$emit('close')">Cancelar</button>
            <button class="frst-btn generic" @click="browseFiles">Examinar...</button>
        </div>    
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useOsStore } from "../../../../../os/os_store";

const os = useOsStore();

const props = defineProps({
  win: Object,
  os: Object
});

const command = ref('');

const executeCommand = () => {
  if (!command.value.trim()) return;
  console.log(`Ejecutando: ${command.value}`);
  // Aquí integrarías con tu os.launchApp o un manejador de protocolos
  // props.os.execute(command.value);

  os.state.apps.find(app => app.manifest.id === command.value);

  os.launchApp(command.value);
};

const browseFiles = () => {
  // Lógica para abrir el explorador de archivos
};
</script>

<style scoped>
.run-icon {
  font-size: 2.5rem;
  color: var(--frst-font-normal); /* Un azul vibrante estilo Frost */
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.486));
}

.main-container{
    height: 100%;
    color: var(--frst-font-normal);
    display: flex;
    flex-direction: column;
}

.btn-container{
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: flex-end;
    gap: 10px;
    flex: 1;
    width: 100%;
    background-color: var(--frst-bg-dark);
    padding: 13px;
    margin-top: 25px;
}

</style>