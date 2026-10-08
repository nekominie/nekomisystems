<template>
  <canvas ref="canvasRef" class="fixed inset-0 w-full h-full pointer-events-none z-0"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);

let animationId = 0;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

interface AshParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  hue: number;
}

interface BloodDrip {
  x: number;
  y: number;
  length: number;
  speed: number;
  maxLen: number;
  width: number;
}

interface ZombieSilhouette {
  x: number;
  y: number;
  speed: number;
  scale: number;
  step: number;
}

const particles: AshParticle[] = [];
const bloodDrips: BloodDrip[] = [];
const zombies: ZombieSilhouette[] = [];

let flashIntensity = 0;
let nextFlashTime = 300;

function handleMouseMove(e: MouseEvent) {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', handleMouseMove);

  // Initialize fallout ash particles
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2.2 + 0.5,
      speedY: Math.random() * 0.9 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.6 + 0.2,
      hue: Math.random() > 0.8 ? 0 : 40, // occasionally glowing ember
    });
  }

  // Blood drips from the top
  for (let i = 0; i < 18; i++) {
    bloodDrips.push({
      x: Math.random() * window.innerWidth,
      y: 0,
      length: Math.random() * 20 + 5,
      speed: Math.random() * 0.4 + 0.1,
      maxLen: Math.random() * 90 + 30,
      width: Math.random() * 3 + 1.5,
    });
  }

  // Distant silhouettes of zombies
  for (let i = 0; i < 7; i++) {
    zombies.push({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight * 0.68 + Math.random() * 120,
      speed: (Math.random() * 0.2 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
      scale: Math.random() * 0.4 + 0.45,
      step: Math.random() * 10,
    });
  }

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // Dark moody background base
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, w, h);

    // Subtle isometric grid lines on ground
    const groundY = h * 0.62;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;

    // Draw isometric grid ground
    for (let x = -w; x < w * 2; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + w * 0.8, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x - w * 0.8, h);
      ctx.stroke();
    }
    ctx.restore();

    // Red warning emergency strobe glow from corners
    const time = Date.now() * 0.002;
    const pulse = (Math.sin(time) + 1) * 0.5;

    const redGlow = ctx.createRadialGradient(w * 0.85, h * 0.2, 10, w * 0.85, h * 0.2, 450);
    redGlow.addColorStop(0, `rgba(180, 20, 20, ${0.15 + pulse * 0.12})`);
    redGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = redGlow;
    ctx.fillRect(0, 0, w, h);

    // Distant lightning flash check
    nextFlashTime--;
    if (nextFlashTime <= 0) {
      flashIntensity = Math.random() * 0.35 + 0.15;
      nextFlashTime = Math.floor(Math.random() * 450 + 200);
    }
    if (flashIntensity > 0) {
      ctx.fillStyle = `rgba(180, 200, 220, ${flashIntensity})`;
      ctx.fillRect(0, 0, w, h);
      flashIntensity *= 0.85;
      if (flashIntensity < 0.01) flashIntensity = 0;
    }

    // Draw distant zombie silhouettes
    zombies.forEach((z) => {
      z.x += z.speed;
      z.step += 0.04;
      if (z.x < -100) z.x = w + 50;
      if (z.x > w + 100) z.x = -50;

      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.scale(z.scale * (z.speed > 0 ? 1 : -1), z.scale);
      ctx.fillStyle = 'rgba(10, 12, 18, 0.88)';

      const limp = Math.sin(z.step) * 4;

      // Zombie head
      ctx.beginPath();
      ctx.arc(0, -65 + limp * 0.5, 9, 0, Math.PI * 2);
      ctx.fill();

      // Zombie torso (hunched forward)
      ctx.beginPath();
      ctx.moveTo(-7, -54 + limp * 0.5);
      ctx.lineTo(12, -50 + limp * 0.5);
      ctx.lineTo(6, -20);
      ctx.lineTo(-6, -20);
      ctx.closePath();
      ctx.fill();

      // Zombie arms outstretched
      ctx.beginPath();
      ctx.moveTo(8, -48 + limp * 0.5);
      ctx.lineTo(24, -42 + Math.cos(z.step) * 3);
      ctx.lineTo(23, -38);
      ctx.lineTo(7, -43);
      ctx.closePath();
      ctx.fill();

      // Legs dragging
      ctx.beginPath();
      ctx.moveTo(-4, -20);
      ctx.lineTo(-7 + Math.sin(z.step) * 6, 0);
      ctx.lineTo(3, -20);
      ctx.lineTo(4 - Math.sin(z.step) * 6, 0);
      ctx.stroke();

      ctx.restore();
    });

    // Dark foggy gradient along the bottom
    const fog = ctx.createLinearGradient(0, groundY - 50, 0, h);
    fog.addColorStop(0, 'rgba(5, 6, 10, 0)');
    fog.addColorStop(0.5, 'rgba(8, 10, 15, 0.7)');
    fog.addColorStop(1, 'rgba(4, 5, 8, 0.95)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, groundY - 50, w, h - (groundY - 50));

    // Draw Blood Drips from top border
    bloodDrips.forEach((drip) => {
      if (drip.length < drip.maxLen) {
        drip.length += drip.speed;
      }
      ctx.save();
      const dripGrad = ctx.createLinearGradient(drip.x, 0, drip.x, drip.length);
      dripGrad.addColorStop(0, '#580808');
      dripGrad.addColorStop(0.8, '#880808');
      dripGrad.addColorStop(1, '#b80c09');

      ctx.strokeStyle = dripGrad;
      ctx.lineWidth = drip.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(drip.x, 0);
      ctx.lineTo(drip.x, drip.length);
      ctx.stroke();

      // Drop bead at bottom of drip
      ctx.fillStyle = '#b80c09';
      ctx.beginPath();
      ctx.arc(drip.x, drip.length, drip.width * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Ash & Embers
    particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y > h) {
        p.y = -10;
        p.x = Math.random() * w;
      }
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      if (p.hue === 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${p.opacity * (0.6 + Math.sin(time * 3 + p.x) * 0.4)})`;
      } else {
        ctx.fillStyle = `rgba(180, 185, 200, ${p.opacity * 0.4})`;
      }
      ctx.fill();
    });

    // Survivor Flashlight glow following mouse cursor
    const light = ctx.createRadialGradient(mouseX, mouseY, 15, mouseX, mouseY, 320);
    light.addColorStop(0, 'rgba(230, 240, 255, 0.055)');
    light.addColorStop(0.5, 'rgba(200, 220, 240, 0.025)');
    light.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    // Vignette dark edges
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.85);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(2, 3, 5, 0.88)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    animationId = requestAnimationFrame(render);
  }

  render();

  onUnmounted(() => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', handleMouseMove);
  });
});
</script>
