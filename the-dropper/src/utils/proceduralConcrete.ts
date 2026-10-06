import * as THREE from 'three';

/**
 * Procedurally generates high-resolution textures for architectural brutalist concrete:
 * - Tadao Ando style modular cast panels with subtle indented V-groove seams
 * - Formwork tie rod cone holes at regular architectural intervals
 * - Micro-aggregate noise, cement paste pores, and mineral mottling
 */
export function createBrutalistConcreteTextures() {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = size;
  roughnessCanvas.height = size;
  const roughCtx = roughnessCanvas.getContext('2d')!;

  // 1. Fill base concrete tones
  ctx.fillStyle = '#656b73';
  ctx.fillRect(0, 0, size, size);

  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  roughCtx.fillStyle = '#d0d0d0'; // high roughness (matte concrete)
  roughCtx.fillRect(0, 0, size, size);

  // 2. Multi-layered noise for aggregate and cement grain
  const imgData = ctx.getImageData(0, 0, size, size);
  const bumpData = bumpCtx.getImageData(0, 0, size, size);
  const roughData = roughCtx.getImageData(0, 0, size, size);

  const pixels = imgData.data;
  const bPixels = bumpData.data;
  const rPixels = roughData.data;

  // Simple pseudo-random hash for deterministic noise
  function hash(x: number, y: number) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return n - Math.floor(n);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Low frequency cloud / moisture patch
      const nLow = hash(Math.floor(x / 48), Math.floor(y / 48)) * 14;
      // High frequency cement grit
      const nHigh = (Math.random() - 0.5) * 18;
      // Fine micro sand
      const nSand = (Math.random() - 0.5) * 10;

      const totalNoise = nLow + nHigh + nSand;

      pixels[idx] = Math.min(255, Math.max(0, pixels[idx] + totalNoise));
      pixels[idx + 1] = Math.min(255, Math.max(0, pixels[idx + 1] + totalNoise));
      pixels[idx + 2] = Math.min(255, Math.max(0, pixels[idx + 2] + totalNoise + 1)); // slightly cool

      // Bump map
      const bVal = 128 + (nHigh + nSand * 0.8);
      bPixels[idx] = bVal;
      bPixels[idx + 1] = bVal;
      bPixels[idx + 2] = bVal;

      // Roughness map (0 to 255)
      const rVal = 210 + (Math.random() - 0.5) * 20;
      rPixels[idx] = rVal;
      rPixels[idx + 1] = rVal;
      rPixels[idx + 2] = rVal;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  bumpCtx.putImageData(bumpData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);

  // 3. Draw architectural cast concrete panels (6 horizontal cols x 4 vertical rows)
  const cols = 6;
  const rows = 4;
  const colW = size / cols;
  const rowH = size / rows;

  // Panel seams
  ctx.lineWidth = 2;
  bumpCtx.lineWidth = 3;

  for (let c = 0; c <= cols; c++) {
    const x = Math.round(c * colW);

    // Dark seam line
    ctx.strokeStyle = 'rgba(30, 32, 36, 0.45)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();

    // Bump seam groove (sunken)
    bumpCtx.strokeStyle = '#404040';
    bumpCtx.beginPath();
    bumpCtx.moveTo(x, 0);
    bumpCtx.lineTo(x, size);
    bumpCtx.stroke();

    // Subtle edge highlight (raised lip on right)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x + 1.5, 0);
    ctx.lineTo(x + 1.5, size);
    ctx.stroke();
  }

  for (let r = 0; r <= rows; r++) {
    const y = Math.round(r * rowH);

    // Dark seam line
    ctx.strokeStyle = 'rgba(30, 32, 36, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    // Bump seam groove
    bumpCtx.strokeStyle = '#404040';
    bumpCtx.beginPath();
    bumpCtx.moveTo(0, y);
    bumpCtx.lineTo(size, y);
    bumpCtx.stroke();

    // Edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, y + 1.5);
    ctx.lineTo(size, y + 1.5);
    ctx.stroke();
  }

  // 4. Draw architectural tie rod cone holes (Orificios de encofrado)
  const holeRadius = 14;
  const insetX = colW * 0.14;
  const insetY = rowH * 0.18;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const pX = c * colW;
      const pY = r * rowH;

      // 4 cone holes per panel
      const holePositions = [
        { x: pX + insetX, y: pY + insetY },
        { x: pX + colW - insetX, y: pY + insetY },
        { x: pX + insetX, y: pY + rowH - insetY },
        { x: pX + colW - insetX, y: pY + rowH - insetY },
      ];

      for (const h of holePositions) {
        // Outer subtle bevel indentation
        const outerGrad = ctx.createRadialGradient(h.x, h.y, holeRadius * 0.3, h.x, h.y, holeRadius * 1.5);
        outerGrad.addColorStop(0, 'rgba(35, 38, 42, 0.8)');
        outerGrad.addColorStop(0.6, 'rgba(45, 48, 54, 0.5)');
        outerGrad.addColorStop(1, 'rgba(90, 95, 102, 0)');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, holeRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner shadow circle
        ctx.fillStyle = '#22252a';
        ctx.beginPath();
        ctx.arc(h.x, h.y, holeRadius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Center bolt dot
        ctx.fillStyle = '#141618';
        ctx.beginPath();
        ctx.arc(h.x, h.y, holeRadius * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Bump map indentation (dark circle = sunken)
        const bGrad = bumpCtx.createRadialGradient(h.x, h.y, 0, h.x, h.y, holeRadius * 1.4);
        bGrad.addColorStop(0, '#101010');
        bGrad.addColorStop(0.7, '#404040');
        bGrad.addColorStop(1, '#808080');
        bumpCtx.fillStyle = bGrad;
        bumpCtx.beginPath();
        bumpCtx.arc(h.x, h.y, holeRadius * 1.4, 0, Math.PI * 2);
        bumpCtx.fill();
      }
    }
  }

  // Convert to Three.js textures
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 8;

  return { map, bumpMap, roughnessMap };
}
