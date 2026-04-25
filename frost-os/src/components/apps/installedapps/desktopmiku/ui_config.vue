<script setup lang="ts">

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
                    <input style="width: 100%;" type="range" min="0" max="100" />
                </div>
            </div>
        </div>
    </div>
</template>