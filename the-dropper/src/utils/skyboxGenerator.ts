import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

/** Default sun position (kept for reference / other consumers) */
export const SUN_POSITION = new THREE.Vector3(200, 150, -200);

// Helper to generate a lens flare texture procedurally
function createLensFlareTexture(size: number, type: 'circle' | 'burst' | 'ring'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  
  const center = size / 2;

  if (type === 'circle') {
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  } else if (type === 'ring') {
    context.beginPath();
    context.arc(center, center, center * 0.8, 0, Math.PI * 2);
    context.lineWidth = size * 0.1;
    context.strokeStyle = 'rgba(255,255,255,0.3)';
    context.stroke();
    // Inner fade
    const gradient = context.createRadialGradient(center, center, center * 0.6, center, center, center * 0.9);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  } else if (type === 'burst') {
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.1, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Generates procedural cloud texture
function createCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 2048, 2048);
  
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 2048;
    const radius = Math.random() * 150 + 50;
    
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const alpha = Math.random() * 0.4 + 0.1;
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // wrap around for seamless tiling
    if (x - radius < 0 || x + radius > 2048 || y - radius < 0 || y + radius > 2048) {
       const xOffset = x < radius ? 2048 : (x > 2048 - radius ? -2048 : 0);
       const yOffset = y < radius ? 2048 : (y > 2048 - radius ? -2048 : 0);
       
       if (xOffset !== 0) {
          ctx.beginPath(); ctx.arc(x + xOffset, y, radius, 0, Math.PI * 2); ctx.fill();
       }
       if (yOffset !== 0) {
          ctx.beginPath(); ctx.arc(x, y + yOffset, radius, 0, Math.PI * 2); ctx.fill();
       }
       if (xOffset !== 0 && yOffset !== 0) {
          ctx.beginPath(); ctx.arc(x + xOffset, y + yOffset, radius, 0, Math.PI * 2); ctx.fill();
       }
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ───────────────────────── Time of day ─────────────────────────

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Smoothstep that also works with reversed edges (edge0 > edge1) */
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Sun/moon orbit radius for the visible discs, and distance of the shadow-casting light */
const CELESTIAL_RADIUS = 400;
const LIGHT_DISTANCE = 300;

interface SkyStop {
  /** sin(sun elevation) at which this palette applies */
  s: number;
  zenith: THREE.Color;
  mid: THREE.Color;
  horizon: THREE.Color;
  ground: THREE.Color;
  sun: THREE.Color;
  cloud: THREE.Color;
  ambientColor: THREE.Color;
  ambient: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemi: number;
}

const c = (hex: string) => new THREE.Color(hex);

/** Palettes sorted by sun elevation: night → twilight → sunrise/sunset → golden hour → day */
const SKY_STOPS: SkyStop[] = [
  {
    s: -0.3,
    zenith: c('#01030b'), mid: c('#040a1c'), horizon: c('#0a1330'), ground: c('#010208'),
    sun: c('#ff7a40'), cloud: c('#1c2640'),
    ambientColor: c('#5a6cb0'), ambient: 0.1,
    hemiSky: c('#3a4a8a'), hemiGround: c('#101420'), hemi: 0.12,
  },
  {
    s: -0.1,
    zenith: c('#0b1538'), mid: c('#2c2a5c'), horizon: c('#8a4a62'), ground: c('#07091a'),
    sun: c('#ff6a30'), cloud: c('#6a5a78'),
    ambientColor: c('#8a80b8'), ambient: 0.22,
    hemiSky: c('#6a5a98'), hemiGround: c('#2a2030'), hemi: 0.25,
  },
  {
    s: 0.04,
    zenith: c('#243f7a'), mid: c('#8a6a9a'), horizon: c('#ff9a5a'), ground: c('#3a2b3a'),
    sun: c('#ff8a40'), cloud: c('#ffb08a'),
    ambientColor: c('#e0b8c0'), ambient: 0.35,
    hemiSky: c('#c89aa8'), hemiGround: c('#5a4650'), hemi: 0.45,
  },
  {
    s: 0.2,
    zenith: c('#3a6fb8'), mid: c('#9bb6dc'), horizon: c('#ffd2a0'), ground: c('#8a96a8'),
    sun: c('#ffc88f'), cloud: c('#ffe6cf'),
    ambientColor: c('#e8dccb'), ambient: 0.5,
    hemiSky: c('#d8dff0'), hemiGround: c('#8a8a96'), hemi: 0.6,
  },
  {
    s: 0.5,
    zenith: c('#3d7fd0'), mid: c('#8fbdee'), horizon: c('#d6e8f8'), ground: c('#aebfd0'),
    sun: c('#fff4e0'), cloud: c('#ffffff'),
    ambientColor: c('#c8ddf5'), ambient: 0.6,
    hemiSky: c('#cce0ff'), hemiGround: c('#7a94b4'), hemi: 0.7,
  },
];

const MOON_LIGHT_COLOR = new THREE.Color('#8ea8ff');
const WHITE = new THREE.Color(0xffffff);

export interface TimeOfDayState {
  hour: number;
  /** sin(sun elevation): 1 = zenith, 0 = horizon, < 0 = night */
  sunElevation: number;
  /** 0 (night) → 1 (full daylight) */
  daylight: number;
  /** 0 (bright day) → 1 (dark night); drives artificial lights */
  darkness: number;
}

export interface SkySystem {
  sunLight: THREE.DirectionalLight;
  updateClouds: (time: number) => void;
  /** Moves the sun/moon, recolors sky, fog, clouds and lights for the given hour (0-24) */
  setTimeOfDay: (hour: number) => TimeOfDayState;
  dispose: () => void;
}

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Note: three.js already prepends the tone mapping / colorspace function definitions to every
// ShaderMaterial, so only the *_fragment chunks that call them are included here.
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunGlow;
  uniform vec3 uMoonDir;
  uniform float uMoonGlow;
  uniform float uStars;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col;
    if (h >= 0.0) {
      col = mix(uHorizon, uMid, smoothstep(0.0, 0.35, h));
      col = mix(col, uZenith, smoothstep(0.25, 1.0, h));
    } else {
      col = mix(uHorizon, uGround, smoothstep(0.0, -0.4, h));
    }

    // Sun halo (stronger and wider near the horizon)
    float sd = max(dot(d, uSunDir), 0.0);
    col += uSunColor * (pow(sd, 6.0) * 0.22 + pow(sd, 48.0) * 0.5) * uSunGlow;

    // Moon halo
    float md = max(dot(d, uMoonDir), 0.0);
    col += vec3(0.55, 0.65, 0.95) * pow(md, 40.0) * 0.3 * uMoonGlow;

    // Stars: cheap hashed 3D grid, drawn on the whole sphere (the platform floats in the sky,
    // so the default top-down camera looks at the lower half) and faded out near the nadir
    if (uStars > 0.001) {
      vec3 sp = d * 300.0;
      vec3 cell = floor(sp);
      float r = hash(cell);
      if (r > 0.9985) {
        float dist = length(fract(sp) - 0.5);
        float twinkle = 0.6 + 0.4 * hash(cell + 7.0);
        float star = smoothstep(0.7, 0.12, dist) * twinkle;
        col += vec3(star) * 1.6 * uStars * smoothstep(-0.75, -0.1, h);
      }
    }

    // Tiny dither to hide banding in the gradient
    col += (hash(d * 1200.0) - 0.5) * (2.0 / 255.0);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSkyboxAndLights(scene: THREE.Scene): SkySystem {
  const disposables: { dispose: () => void }[] = [];

  // 1. Procedural gradient sky dome (GPU shader: cheap to animate every frame)
  const skyUniforms = {
    uZenith: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uSunGlow: { value: 1 },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uMoonGlow: { value: 0 },
    uStars: { value: 0 },
  };
  const skyGeo = new THREE.SphereGeometry(800, 48, 24);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  disposables.push(skyGeo, skyMat);
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.renderOrder = -1000;
  skyMesh.frustumCulled = false;
  scene.add(skyMesh);

  // 2. Visible Sun Disc
  const sunGeo = new THREE.SphereGeometry(6, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
  });
  disposables.push(sunGeo, sunMat);
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sunMesh);

  // 3. Sun Corona Sprite
  const coronaCanvas = document.createElement('canvas');
  coronaCanvas.width = 128;
  coronaCanvas.height = 128;
  const coronaCtx = coronaCanvas.getContext('2d')!;
  const coronaGrad = coronaCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  coronaGrad.addColorStop(0, 'rgba(255, 240, 200, 1)');
  coronaGrad.addColorStop(0.2, 'rgba(255, 220, 150, 0.8)');
  coronaGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
  coronaCtx.fillStyle = coronaGrad;
  coronaCtx.fillRect(0, 0, 128, 128);

  const coronaTex = new THREE.CanvasTexture(coronaCanvas);
  disposables.push(coronaTex);
  const coronaMat = new THREE.SpriteMaterial({
    map: coronaTex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  disposables.push(coronaMat);
  const coronaSprite = new THREE.Sprite(coronaMat);
  coronaSprite.scale.set(76, 76, 1);
  scene.add(coronaSprite);

  // 4. Moon (disc + soft glow sprite)
  const moonGeo = new THREE.SphereGeometry(4.5, 28, 28);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xe6edff, fog: false });
  disposables.push(moonGeo, moonMat);
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  scene.add(moonMesh);

  const moonGlowCanvas = document.createElement('canvas');
  moonGlowCanvas.width = 128;
  moonGlowCanvas.height = 128;
  const moonGlowCtx = moonGlowCanvas.getContext('2d')!;
  const moonGlowGrad = moonGlowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  moonGlowGrad.addColorStop(0, 'rgba(200, 215, 255, 0.9)');
  moonGlowGrad.addColorStop(0.25, 'rgba(160, 185, 255, 0.35)');
  moonGlowGrad.addColorStop(1, 'rgba(120, 150, 255, 0)');
  moonGlowCtx.fillStyle = moonGlowGrad;
  moonGlowCtx.fillRect(0, 0, 128, 128);
  const moonGlowTex = new THREE.CanvasTexture(moonGlowCanvas);
  disposables.push(moonGlowTex);
  const moonGlowMat = new THREE.SpriteMaterial({
    map: moonGlowTex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  disposables.push(moonGlowMat);
  const moonGlowSprite = new THREE.Sprite(moonGlowMat);
  moonGlowSprite.scale.set(46, 46, 1);
  scene.add(moonGlowSprite);

  // 5. Lens Flare (attached to the sun, hidden together with it at night)
  const lensflare = new Lensflare();
  
  const texFlare0 = createLensFlareTexture(512, 'circle');
  const texFlare1 = createLensFlareTexture(512, 'circle');
  const texFlare2 = createLensFlareTexture(256, 'ring');
  const texFlare3 = createLensFlareTexture(256, 'burst');
  
  disposables.push(texFlare0, texFlare1, texFlare2, texFlare3);

  lensflare.addElement(new LensflareElement(texFlare0, 300, 0, new THREE.Color(0xfff8e8)));
  lensflare.addElement(new LensflareElement(texFlare3, 400, 0.2, new THREE.Color(0xffffff)));
  lensflare.addElement(new LensflareElement(texFlare1, 150, 0.6, new THREE.Color(0xdce8ff)));
  lensflare.addElement(new LensflareElement(texFlare2, 200, 0.8, new THREE.Color(0xffe8f0)));
  lensflare.addElement(new LensflareElement(texFlare1, 80, 1.0, new THREE.Color(0xdce8ff)));

  sunMesh.add(lensflare);

  // 6. Cloud deck (tinted by the time of day)
  const cloudGeo = new THREE.PlaneGeometry(1000, 1000);
  disposables.push(cloudGeo);

  const cloudLayers: THREE.Mesh[] = [];
  const cloudMats: THREE.MeshBasicMaterial[] = [];

  const cloudTex1 = createCloudTexture();
  const cloudMat1 = new THREE.MeshBasicMaterial({
    map: cloudTex1,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: true,
  });
  disposables.push(cloudTex1, cloudMat1);
  const layer1 = new THREE.Mesh(cloudGeo, cloudMat1);
  layer1.rotation.x = -Math.PI / 2;
  layer1.position.y = 120;
  scene.add(layer1);
  cloudLayers.push(layer1);
  cloudMats.push(cloudMat1);

  const cloudTex2 = createCloudTexture();
  const cloudMat2 = new THREE.MeshBasicMaterial({
    map: cloudTex2,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: true,
  });
  disposables.push(cloudTex2, cloudMat2);
  const layer2 = new THREE.Mesh(cloudGeo, cloudMat2);
  layer2.rotation.x = -Math.PI / 2;
  layer2.position.y = 135;
  scene.add(layer2);
  cloudLayers.push(layer2);
  cloudMats.push(cloudMat2);

  const cloudTex3 = createCloudTexture();
  const cloudMat3 = new THREE.MeshBasicMaterial({
    map: cloudTex3,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: true,
  });
  disposables.push(cloudTex3, cloudMat3);
  const layer3 = new THREE.Mesh(cloudGeo, cloudMat3);
  layer3.rotation.x = -Math.PI / 2;
  layer3.position.y = 150;
  scene.add(layer3);
  cloudLayers.push(layer3);
  cloudMats.push(cloudMat3);

  // 7. Lighting: one directional light is the sun by day and the moon by night
  const dirLight = new THREE.DirectionalLight(0xfff8e8, 3.0);
  dirLight.castShadow = true;
  // 2048² over a 40 m frustum is ~2 cm per texel: plenty, and 4x cheaper than 4096²
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 20;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 500;
  dirLight.shadow.bias = -0.0003;
  dirLight.shadow.radius = 2.5;
  scene.add(dirLight);

  const ambientLight = new THREE.AmbientLight(0xc8ddf5, 0.6);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xcce0ff, 0x7a94b4, 0.7);
  scene.add(hemiLight);

  // Scratch objects (no per-update allocations)
  const sunDir = new THREE.Vector3();
  const mix = {
    zenith: new THREE.Color(),
    mid: new THREE.Color(),
    horizon: new THREE.Color(),
    ground: new THREE.Color(),
    sun: new THREE.Color(),
    cloud: new THREE.Color(),
    ambientColor: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    ambient: 0,
    hemi: 0,
  };
  let lastShadowOn = true;

  const sampleStops = (s: number) => {
    let i = 0;
    while (i < SKY_STOPS.length - 2 && s > SKY_STOPS[i + 1].s) i++;
    const a = SKY_STOPS[i];
    const b = SKY_STOPS[i + 1];
    const t = clamp01((s - a.s) / (b.s - a.s));
    mix.zenith.copy(a.zenith).lerp(b.zenith, t);
    mix.mid.copy(a.mid).lerp(b.mid, t);
    mix.horizon.copy(a.horizon).lerp(b.horizon, t);
    mix.ground.copy(a.ground).lerp(b.ground, t);
    mix.sun.copy(a.sun).lerp(b.sun, t);
    mix.cloud.copy(a.cloud).lerp(b.cloud, t);
    mix.ambientColor.copy(a.ambientColor).lerp(b.ambientColor, t);
    mix.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
    mix.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
    mix.ambient = a.ambient + (b.ambient - a.ambient) * t;
    mix.hemi = a.hemi + (b.hemi - a.hemi) * t;
  };

  const setTimeOfDay = (hourIn: number): TimeOfDayState => {
    const hour = ((hourIn % 24) + 24) % 24;

    // Sun orbit: rises at 06:00 (east, +X), peaks at 12:00, sets at 18:00 (west, -X)
    const a = ((hour - 6) / 12) * Math.PI;
    sunDir.set(Math.cos(a), Math.sin(a), -0.55).normalize();
    const s = sunDir.y;

    sampleStops(s);

    // Sky shader
    skyUniforms.uZenith.value.copy(mix.zenith);
    skyUniforms.uMid.value.copy(mix.mid);
    skyUniforms.uHorizon.value.copy(mix.horizon);
    skyUniforms.uGround.value.copy(mix.ground);
    skyUniforms.uSunDir.value.copy(sunDir);
    skyUniforms.uSunColor.value.copy(mix.sun);
    skyUniforms.uSunGlow.value = smooth(-0.12, 0.02, s) * (1 + 1.5 * (1 - smooth(0, 0.4, s)));
    skyUniforms.uMoonDir.value.copy(sunDir).negate();
    skyUniforms.uMoonGlow.value = smooth(0.05, -0.15, s);
    skyUniforms.uStars.value = smooth(-0.02, -0.28, s);

    // Sun / moon discs
    const sunVisible = s > -0.1;
    sunMesh.visible = sunVisible;
    coronaSprite.visible = sunVisible;
    if (sunVisible) {
      sunMesh.position.copy(sunDir).multiplyScalar(CELESTIAL_RADIUS);
      coronaSprite.position.copy(sunMesh.position);
      sunMat.color.copy(mix.sun).lerp(WHITE, 0.45 * smooth(0, 0.4, s));
      coronaMat.opacity = smooth(-0.1, 0.05, s);
    }
    const moonVisible = s < 0.1;
    moonMesh.visible = moonVisible;
    moonGlowSprite.visible = moonVisible;
    if (moonVisible) {
      moonMesh.position.copy(sunDir).multiplyScalar(-CELESTIAL_RADIUS);
      moonGlowSprite.position.copy(moonMesh.position);
      moonGlowMat.opacity = smooth(0.1, -0.1, s);
    }

    // Clouds pick up the sky color
    for (const m of cloudMats) m.color.copy(mix.cloud);

    // Fog follows the horizon color (denser at night)
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(mix.horizon);
      scene.fog.density = 0.003 + 0.0015 * (1 - smooth(-0.15, 0.2, s));
    }

    // Ambient / hemisphere fill
    ambientLight.color.copy(mix.ambientColor);
    ambientLight.intensity = mix.ambient;
    hemiLight.color.copy(mix.hemiSky);
    hemiLight.groundColor.copy(mix.hemiGround);
    hemiLight.intensity = mix.hemi;

    // Directional light: sun above the horizon, moon below it. Both fade to 0 at the horizon,
    // so the switch of direction is never visible.
    const sunI = 3.0 * smooth(0, 0.3, s);
    const moonI = 0.45 * smooth(0, -0.25, s);
    if (s >= 0) {
      dirLight.position.copy(sunDir).multiplyScalar(LIGHT_DISTANCE);
      dirLight.color.copy(mix.sun);
      dirLight.intensity = sunI;
    } else {
      dirLight.position.copy(sunDir).multiplyScalar(-LIGHT_DISTANCE);
      dirLight.color.copy(MOON_LIGHT_COLOR);
      dirLight.intensity = moonI;
    }
    // Only the sun casts shadows (moonlight is too faint to be worth another pass)
    const shadowOn = s > 0.03;
    if (shadowOn !== lastShadowOn) {
      dirLight.castShadow = shadowOn;
      lastShadowOn = shadowOn;
    }

    return {
      hour,
      sunElevation: s,
      daylight: smooth(-0.05, 0.3, s),
      darkness: 1 - smooth(-0.05, 0.35, s),
    };
  };

  // Start at midday-ish so the first frame is bright
  setTimeOfDay(13);

  return {
    sunLight: dirLight,
    updateClouds: (time: number) => {
      cloudTex1.offset.x = time * 0.01;
      cloudTex1.offset.y = time * 0.005;
      cloudTex2.offset.x = time * 0.015;
      cloudTex2.offset.y = time * 0.008;
      cloudTex3.offset.x = time * 0.02;
      cloudTex3.offset.y = time * 0.012;
    },
    setTimeOfDay,
    dispose: () => {
      scene.remove(skyMesh, sunMesh, coronaSprite, moonMesh, moonGlowSprite, ...cloudLayers, dirLight, ambientLight, hemiLight);
      sunMesh.remove(lensflare);
      disposables.forEach(d => d.dispose());
      
      // Cleanup shadows and lensflare internals if necessary
      dirLight.shadow.map?.dispose();
      lensflare.dispose();
    }
  };
}
