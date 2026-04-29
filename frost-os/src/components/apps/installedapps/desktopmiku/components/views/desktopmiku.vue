<script setup lang="ts">

import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useDesktopMikuStore } from './store';

type Action = "idle" | "greeting" | "thinking"

type MikuAction = {
  gif: string;
  time: number;
  weight: number;
  cooldown?: number;
  class?: string;
};

const animations: Record<Action, MikuAction> = {
  idle: {
    gif: "/desktopmiku/idle.gif",
    time: 5000,
    weight: 75,
    class: "idle"
  },
  greeting: {
    gif: "/desktopmiku/greeting.gif",
    time: 5000,
    weight: 10,
    cooldown: 15000,
    class: "greeting"
  },
  thinking: {
    gif: "/desktopmiku/thinking.gif",
    time: 5000,
    weight: 15,
    cooldown: 10000,
    class: "thinking"
  },
};

const accionActual = ref<Action>("idle");

const actions: Action[] = ["idle", "greeting", "thinking"];

const lastUsed = new Map<Action, number>();

let timeoutId: ReturnType<typeof setTimeout> | null = null;

function canUseAction(action: Action): boolean {
  const cooldown = animations[action].cooldown;

  if (!cooldown) return true;

  const lastTime = lastUsed.get(action) ?? 0;
  const now = Date.now();

  return now - lastTime >= cooldown;
}

function getRandomAction(): Action {
  const availableActions = actions.filter(canUseAction);

  const totalWeight = availableActions.reduce((total, action) => {
    return total + animations[action].weight;
  }, 0);

  let random = Math.random() * totalWeight;

  for (const action of availableActions) {
    random -= animations[action].weight;

    if (random <= 0) {
      return action;
    }
  }

  return "idle";
}

function runNextAction() {
  const nextAction = accionActual.value === "idle"
    ? getRandomAction()
    : "idle";

  accionActual.value = nextAction;
  lastUsed.set(nextAction, Date.now());

  const duration = animations[nextAction].time;

  timeoutId = setTimeout(() => {
    runNextAction();
  }, duration);
}

onMounted(() => {
  runNextAction()
})

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})

</script>

<style scoped>
.miku {
  height: 30rem;          /* altura base consistente */
  display: flex;
  align-items: flex-end;  /* 👈 clave: alinea abajo */
  justify-content: center;
  position: absolute;
  bottom: 38px;
  z-index: 10000;
  /*right: 0;*/
}

.miku img {
  max-height: 100%;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(11px 1px 3px rgba(0, 0, 0, 0.459));
}

.idle{
    transform: scaleX(-1);
}
</style>

<template>
    <div class="miku" :class="animations[accionActual].class">
        <img :src="animations[accionActual].gif" :alt="accionActual" />
    </div>
</template>