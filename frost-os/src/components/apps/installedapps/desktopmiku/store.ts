import { defineStore } from 'pinia';
import { ref } from 'vue';

export type MikuAction =
  | "idle"
  | "walking"
  | "running"
  | "quick_walk"
  | "red_carpet"
  | "dance_groove"
  | "dance_shake"
  | "handstand"
  | "chat"
  | "scheming"
  | "fist_pump"
  | "sit_drink"
  | "sit_doze"
  | "sleep"
  | "wake_up"
  | "stand_up"
  | "sliding_roll"
  | "pole_balance"
  | "fall_backward"
  | "fall_shot"
  // Legacy aliases
  | "greeting"
  | "thinking";

export const useDesktopMikuStore = defineStore('app_desktopmiku', () => {
  const currentAction = ref<MikuAction>('chat');
  const actionTriggerTimestamp = ref<number>(0);
  const resetTriggerTimestamp = ref<number>(0);
  const currentScale = ref<number>(1.0);
  const speechText = ref<string>('¡Hola! ♪ Cuidaré de tu escritorio hoy también. (◕‿◕)✿');

  function triggerAction(action: MikuAction) {
    currentAction.value = action;
    actionTriggerTimestamp.value = Date.now();
  }

  function resetModel() {
    currentAction.value = 'chat';
    resetTriggerTimestamp.value = Date.now();
  }

  function setScale(scale: number) {
    currentScale.value = scale;
  }

  function setSpeech(text: string) {
    speechText.value = text;
  }

  return {
    currentAction,
    actionTriggerTimestamp,
    resetTriggerTimestamp,
    currentScale,
    speechText,
    triggerAction,
    resetModel,
    setScale,
    setSpeech
  };
});