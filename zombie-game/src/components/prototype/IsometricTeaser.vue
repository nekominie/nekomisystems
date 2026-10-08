<template>
  <div class="fixed inset-0 z-40 bg-[#050608] flex flex-col">
    <!-- Top HUD Bar -->
    <header class="relative z-10 bg-black/80 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
        <span class="font-mono text-xs uppercase font-bold text-stone-200">
          PROTOTIPO ISOMÉTRICO EN VIVO // ZONA REFUGIO
        </span>
        <span class="text-[10px] font-mono px-2 py-0.5 bg-stone-900 border border-stone-700 text-stone-400">
          WASD: Moverse | Ratón: Linterna / Apuntar | Click: Atacar
        </span>
      </div>

      <button
        type="button"
        class="steel-btn px-4 py-1.5 text-xs font-mono font-bold uppercase text-stone-300 hover:text-white flex items-center gap-2"
        @click="exit"
      >
        <i class="bi bi-box-arrow-left"></i>
        <span>Volver al Menú (ESC)</span>
      </button>
    </header>

    <!-- Canvas Container -->
    <div class="relative flex-1 overflow-hidden">
      <canvas ref="gameCanvas" class="w-full h-full block cursor-crosshair"></canvas>

      <!-- Bottom Vitals HUD -->
      <div class="absolute bottom-4 left-4 z-10 bg-black/80 border border-stone-800 p-3 rounded-xs flex items-center gap-6 font-mono text-xs">
        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">SALUD SUPERVIVIENTE</div>
          <div class="w-32 h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-red-600" :style="{ width: `${playerHealth}%` }"></div>
          </div>
        </div>

        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">ESTAMINA</div>
          <div class="w-32 h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-yellow-500" :style="{ width: `${playerStamina}%` }"></div>
          </div>
        </div>

        <div>
          <span class="text-[10px] text-stone-500 uppercase block mb-0.5">ZOMBIS EN ÁREA</span>
          <span class="text-sm font-bold text-red-400">{{ zombieCount }} ACTIVOS</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { sound } from '../../audio/soundEngine';

const emit = defineEmits<{
  (e: 'exit'): void;
}>();

const gameCanvas = ref<HTMLCanvasElement | null>(null);
const playerHealth = ref(100);
const playerStamina = ref(85);
const zombieCount = ref(6);

let animId = 0;

// Player position in world coordinates (grid units)
const player = {
  x: 5,
  y: 5,
  angle: 0,
  speed: 0.08,
  isSwinging: false,
  swingProgress: 0,
};

const keys: Record<string, boolean> = {};

let mouseScreenX = 0;
let mouseScreenY = 0;

interface GameZombie {
  x: number;
  y: number;
  speed: number;
  health: number;
}

const zombies: GameZombie[] = [
  { x: 2, y: 1, speed: 0.02, health: 100 },
  { x: 9, y: 3, speed: 0.018, health: 100 },
  { x: 3, y: 8, speed: 0.022, health: 100 },
  { x: 8, y: 9, speed: 0.019, health: 100 },
  { x: 1, y: 6, speed: 0.021, health: 100 },
  { x: 7, y: 2, speed: 0.025, health: 100 },
];

interface BloodStain {
  wx: number;
  wy: number;
  radius: number;
}

const stains: BloodStain[] = [
  { wx: 3, wy: 4, radius: 14 },
  { wx: 6, wy: 7, radius: 20 },
  { wx: 2, wy: 8, radius: 12 },
];

const TILE_W = 64;
const TILE_H = 32;
const MAP_SIZE = 12;

function worldToScreen(wx: number, wy: number, originX: number, originY: number) {
  const sx = (wx - wy) * (TILE_W / 2) + originX;
  const sy = (wx + wy) * (TILE_H / 2) + originY;
  return { sx, sy };
}

function handleKeyDown(e: KeyboardEvent) {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape') {
    exit();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  keys[e.key.toLowerCase()] = false;
}

function handleMouseMove(e: MouseEvent) {
  const canvas = gameCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouseScreenX = e.clientX - rect.left;
  mouseScreenY = e.clientY - rect.top;
}

function handleMouseDown() {
  if (player.isSwinging) return;
  player.isSwinging = true;
  player.swingProgress = 0;
  sound.playClick();

  // Check hit against zombies
  zombies.forEach((z) => {
    const dist = Math.hypot(z.x - player.x, z.y - player.y);
    if (dist < 1.4) {
      z.health -= 50;
      sound.playPlayClick();
      stains.push({
        wx: z.x,
        wy: z.y,
        radius: Math.random() * 10 + 10,
      });
    }
  });

  // Remove dead zombies
  for (let i = zombies.length - 1; i >= 0; i--) {
    if (zombies[i].health <= 0) {
      zombies.splice(i, 1);
    }
  }
  zombieCount.value = zombies.length;
}

function exit() {
  sound.playClick();
  emit('exit');
}

onMounted(() => {
  const canvas = gameCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function resize() {
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);

  function loop() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // Movement updates
    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['arrowup']) {
      dx -= 1;
      dy -= 1;
    }
    if (keys['s'] || keys['arrowdown']) {
      dx += 1;
      dy += 1;
    }
    if (keys['a'] || keys['arrowleft']) {
      dx -= 1;
      dy += 1;
    }
    if (keys['d'] || keys['arrowright']) {
      dx += 1;
      dy -= 1;
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * player.speed;
      player.y += (dy / len) * player.speed;
      player.x = Math.max(0.5, Math.min(MAP_SIZE - 0.5, player.x));
      player.y = Math.max(0.5, Math.min(MAP_SIZE - 0.5, player.y));
    }

    // Weapon swing animation
    if (player.isSwinging) {
      player.swingProgress += 0.15;
      if (player.swingProgress >= 1) {
        player.isSwinging = false;
        player.swingProgress = 0;
      }
    }

    // Zombie AI towards player
    zombies.forEach((z) => {
      const dist = Math.hypot(player.x - z.x, player.y - z.y);
      if (dist > 0.4 && dist < 6) {
        z.x += ((player.x - z.x) / dist) * z.speed;
        z.y += ((player.y - z.y) / dist) * z.speed;
      }
    });

    // Camera origin centered on player
    const originX = w / 2 - (player.x - player.y) * (TILE_W / 2);
    const originY = h / 2 - (player.x + player.y) * (TILE_H / 2);

    // Compute player angle toward mouse cursor
    const playerScreen = worldToScreen(player.x, player.y, originX, originY);
    player.angle = Math.atan2(mouseScreenY - playerScreen.sy, mouseScreenX - playerScreen.sx);

    // Render Dark Floor
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, w, h);

    // Draw Isometric Tiles
    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        const { sx, sy } = worldToScreen(x, y, originX, originY);

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
        ctx.lineTo(sx, sy + TILE_H);
        ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
        ctx.closePath();

        // Concrete / Steel Floor checker
        const isAlternate = (x + y) % 2 === 0;
        ctx.fillStyle = isAlternate ? '#12151c' : '#181b24';
        ctx.fill();

        ctx.strokeStyle = '#222836';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw Blood Stains
    stains.forEach((stain) => {
      const { sx, sy } = worldToScreen(stain.wx, stain.wy, originX, originY);
      ctx.beginPath();
      ctx.arc(sx, sy, stain.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(127, 29, 29, 0.7)';
      ctx.fill();
    });

    // Draw Flashlight Cone from player toward mouse
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(playerScreen.sx, playerScreen.sy);
    const spread = 0.55;
    const range = 380;
    ctx.arc(playerScreen.sx, playerScreen.sy, range, player.angle - spread, player.angle + spread);
    ctx.closePath();

    const flashGrad = ctx.createRadialGradient(
      playerScreen.sx,
      playerScreen.sy,
      20,
      playerScreen.sx,
      playerScreen.sy,
      range
    );
    flashGrad.addColorStop(0, 'rgba(255, 250, 220, 0.35)');
    flashGrad.addColorStop(0.5, 'rgba(230, 240, 255, 0.12)');
    flashGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
    ctx.fillStyle = flashGrad;
    ctx.fill();
    ctx.restore();

    // Draw Zombies
    zombies.forEach((z) => {
      const pos = worldToScreen(z.x, z.y, originX, originY);

      // Zombie shadow
      ctx.beginPath();
      ctx.ellipse(pos.sx, pos.sy + 4, 10, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Zombie body
      ctx.beginPath();
      ctx.arc(pos.sx, pos.sy - 16, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#365314'; // Putrid green
      ctx.fill();
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(pos.sx - 2, pos.sy - 18, 2, 2);
      ctx.fillRect(pos.sx + 2, pos.sy - 18, 2, 2);
    });

    // Draw Player
    // Shadow
    ctx.beginPath();
    ctx.ellipse(playerScreen.sx, playerScreen.sy + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(playerScreen.sx, playerScreen.sy - 18, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a8a'; // Blue survivor jacket
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Weapon swing / Aim line
    ctx.save();
    ctx.translate(playerScreen.sx, playerScreen.sy - 14);
    ctx.rotate(player.angle + (player.isSwinging ? Math.sin(player.swingProgress * Math.PI) * 1.5 : 0));

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(26, 0);
    ctx.stroke();
    ctx.restore();

    // Darkness vignette
    const darkVig = ctx.createRadialGradient(
      playerScreen.sx,
      playerScreen.sy,
      80,
      playerScreen.sx,
      playerScreen.sy,
      Math.max(w, h) * 0.7
    );
    darkVig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    darkVig.addColorStop(0.7, 'rgba(5, 6, 10, 0.75)');
    darkVig.addColorStop(1, 'rgba(2, 3, 5, 0.95)');
    ctx.fillStyle = darkVig;
    ctx.fillRect(0, 0, w, h);

    animId = requestAnimationFrame(loop);
  }

  loop();

  onUnmounted(() => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mousedown', handleMouseDown);
  });
});
</script>
