import { defineStore } from 'pinia';
import { ref } from 'vue';

export type MikuAction = "idle" | "greeting" | "thinking";

export const useDesktopMikuStore = defineStore('app_desktopmiku', () => {
  const currentAction = ref<MikuAction>('idle');
  const actionTriggerTimestamp = ref<number>(0);
  const speechText = ref<string>('¡Hola! ♪ Cuidaré de tu escritorio hoy también. (◕‿◕)✿');

  function triggerAction(action: MikuAction) {
    currentAction.value = action;
    actionTriggerTimestamp.value = Date.now();
  }

  function setSpeech(text: string) {
    speechText.value = text;
  }

  return {
    currentAction,
    actionTriggerTimestamp,
    speechText,
    triggerAction,
    setSpeech
  };
});