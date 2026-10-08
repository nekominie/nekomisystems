<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const emit = defineEmits<{
  (e: 'move', input: { x: number; y: number }): void;
  (e: 'aim', input: { x: number; y: number; active: boolean; fire: boolean }): void;
  (e: 'keyPress', key: string): void;
  (e: 'keyState', key: string, pressed: boolean): void;
}>();

const isMobile = ref(false);
const showOrientationWarning = ref(false);

const checkDeviceAndOrientation = () => {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  isMobile.value = isTouch && window.innerWidth <= 1024; // Mostrar en móviles/tablets
  showOrientationWarning.value = isMobile.value && window.innerHeight > window.innerWidth;
};

// --- Left Joystick (Move) ---
const leftJoy = ref({ active: false, id: -1, baseX: 0, baseY: 0, knobX: 0, knobY: 0, valX: 0, valY: 0 });

function startLeftJoystick(e: PointerEvent) {
  lockOrientation();
  if (leftJoy.value.active) return;
  leftJoy.value.active = true;
  leftJoy.value.id = e.pointerId;
  leftJoy.value.baseX = e.clientX;
  leftJoy.value.baseY = e.clientY;
  leftJoy.value.knobX = 0;
  leftJoy.value.knobY = 0;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  emit('move', { x: 0, y: 0 });
}

function moveLeftJoystick(e: PointerEvent) {
  if (!leftJoy.value.active || e.pointerId !== leftJoy.value.id) return;
  const dx = e.clientX - leftJoy.value.baseX;
  const dy = e.clientY - leftJoy.value.baseY;
  const dist = Math.hypot(dx, dy);
  const maxR = 50;
  
  let nx = dx;
  let ny = dy;
  if (dist > maxR) {
    nx = (dx / dist) * maxR;
    ny = (dy / dist) * maxR;
  }
  
  leftJoy.value.knobX = nx;
  leftJoy.value.knobY = ny;
  
  // Normalized -1 to 1 (Y is inverted for games, where -1 is up/forward)
  leftJoy.value.valX = nx / maxR;
  leftJoy.value.valY = ny / maxR;
  emit('move', { x: leftJoy.value.valX, y: -leftJoy.value.valY });
}

function endLeftJoystick(e: PointerEvent) {
  if (e.pointerId !== leftJoy.value.id) return;
  leftJoy.value.active = false;
  leftJoy.value.id = -1;
  emit('move', { x: 0, y: 0 });
}

// --- Right Joystick (Aim & Fire) ---
const rightJoy = ref({ active: false, id: -1, baseX: 0, baseY: 0, knobX: 0, knobY: 0, valX: 0, valY: 0 });

function startRightJoystick(e: PointerEvent) {
  lockOrientation();
  if (rightJoy.value.active) return;
  rightJoy.value.active = true;
  rightJoy.value.id = e.pointerId;
  rightJoy.value.baseX = e.clientX;
  rightJoy.value.baseY = e.clientY;
  rightJoy.value.knobX = 0;
  rightJoy.value.knobY = 0;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  emit('aim', { x: 0, y: 0, active: true, fire: false });
}

function moveRightJoystick(e: PointerEvent) {
  if (!rightJoy.value.active || e.pointerId !== rightJoy.value.id) return;
  const dx = e.clientX - rightJoy.value.baseX;
  const dy = e.clientY - rightJoy.value.baseY;
  const dist = Math.hypot(dx, dy);
  const maxR = 50;
  
  let nx = dx;
  let ny = dy;
  if (dist > maxR) {
    nx = (dx / dist) * maxR;
    ny = (dy / dist) * maxR;
  }
  
  rightJoy.value.knobX = nx;
  rightJoy.value.knobY = ny;
  
  const vx = nx / maxR;
  const vy = ny / maxR;
  rightJoy.value.valX = vx;
  rightJoy.value.valY = vy;
  
  // Fire if pushed more than 60%
  const fire = (Math.hypot(vx, vy) > 0.6);
  // Y is inverted here too, -vy is forward
  emit('aim', { x: vx, y: -vy, active: true, fire });
}

function endRightJoystick(e: PointerEvent) {
  if (e.pointerId !== rightJoy.value.id) return;
  rightJoy.value.active = false;
  rightJoy.value.id = -1;
  emit('aim', { x: 0, y: 0, active: false, fire: false });
}

function emitClick(key: string) {
  lockOrientation();
  emit('keyPress', key);
}
function emitKey(key: string, pressed: boolean) {
  lockOrientation();
  emit('keyState', key, pressed);
}

function lockOrientation() {
  if (screen.orientation?.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}

onMounted(() => {
  checkDeviceAndOrientation();
  window.addEventListener('resize', checkDeviceAndOrientation);
  screen.orientation?.lock('landscape').catch(() => {});
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkDeviceAndOrientation);
});
</script>

<template>
  <div class="mobile-controls" v-if="isMobile">
    <!-- Overlay for Enforcing Landscape -->
    <div v-if="showOrientationWarning" class="orientation-warning">
      <div class="warning-box">
        <i class="bi bi-phone-landscape" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
        <h2>Gira tu dispositivo</h2>
        <p>Por favor, pon la pantalla en horizontal.</p>
      </div>
    </div>

    <template v-else>
      <div class="joystick-zone left-zone" @pointerdown="startLeftJoystick" @pointermove="moveLeftJoystick" @pointerup="endLeftJoystick" @pointercancel="endLeftJoystick" @contextmenu.prevent>
        <div class="joystick-base" v-if="leftJoy.active" :style="{ left: leftJoy.baseX + 'px', top: leftJoy.baseY + 'px' }">
          <div class="joystick-knob" :style="{ transform: `translate(${leftJoy.knobX}px, ${leftJoy.knobY}px) translate(-50%, -50%)` }"></div>
        </div>
      </div>

      <div class="joystick-zone right-zone" @pointerdown="startRightJoystick" @pointermove="moveRightJoystick" @pointerup="endRightJoystick" @pointercancel="endRightJoystick" @contextmenu.prevent>
        <div class="joystick-base" v-if="rightJoy.active" :style="{ left: rightJoy.baseX + 'px', top: rightJoy.baseY + 'px' }">
          <div class="joystick-knob" :style="{ transform: `translate(${rightJoy.knobX}px, ${rightJoy.knobY}px) translate(-50%, -50%)` }"></div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="action-btn" @pointerdown="emitKey('shift', true)" @pointerup="emitKey('shift', false)" @pointercancel="emitKey('shift', false)" @contextmenu.prevent>
          <i class="bi bi-lightning-fill"></i>
        </button>
        <button class="action-btn" @pointerdown="emitClick('c')" @contextmenu.prevent>
          <i class="bi bi-incognito"></i>
        </button>
        <button class="action-btn" @pointerdown="emitClick('r')" @contextmenu.prevent>
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="action-btn" @pointerdown="emitClick('f')" @contextmenu.prevent>
          <i class="bi bi-hand-index-thumb"></i>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mobile-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.orientation-warning {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.9);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: all;
  z-index: 9999;
  text-align: center;
}
.warning-box h2 { font-size: 1.5rem; margin-bottom: 10px; }

.joystick-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50vw;
  pointer-events: all;
  touch-action: none;
}
.left-zone { left: 0; }
.right-zone { right: 0; }

.joystick-base {
  position: absolute;
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.joystick-knob {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  pointer-events: none;
}

.action-buttons {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  pointer-events: all;
}

.action-btn {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: none;
  backdrop-filter: blur(4px);
}
.action-btn:active {
  background: rgba(255, 255, 255, 0.3);
}
</style>
