<template>
  <canvas ref="canvas" class="miku-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const canvas = ref<HTMLCanvasElement | null>(null);
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let model: THREE.Object3D | null = null;
let animationId: number;
let skeleton: THREE.Skeleton | null = null;

const bones: Record<string, THREE.Bone> = {};
const bindQuats: Record<string, THREE.Quaternion> = {};

/**
 * Rotate a bone around a world-space axis, converted to bone-local space.
 */
function rotateBoneWorld(boneName: string, axis: THREE.Vector3, angleDeg: number) {
  const bone = bones[boneName];
  if (!bone) return;
  const angle = THREE.MathUtils.degToRad(angleDeg);
  const worldQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  const parentWorldQuat = new THREE.Quaternion();
  if (bone.parent) {
    bone.parent.getWorldQuaternion(parentWorldQuat);
  }
  const parentInv = parentWorldQuat.clone().invert();
  const localDelta = parentInv.clone().multiply(worldQuat).multiply(parentWorldQuat);
  bone.quaternion.premultiply(localDelta);
  bone.updateMatrixWorld(true);
}

/**
 * Sets the model into a natural rest pose (arms down).
 */
function applyRestPose() {
  const Z = new THREE.Vector3(0, 0, 1);
  const X = new THREE.Vector3(1, 0, 0);

  // Arms DOWN from T-pose: left arm rotates -70° around Z, right +70°
  rotateBoneWorld('Arm_Left_0123', Z, -70);
  rotateBoneWorld('ForeArm_Left_0124', Z, -10);
  rotateBoneWorld('Arm_Right_0148', Z, 70);
  rotateBoneWorld('ForeArm_Right_0149', Z, 10);

  // Slight forward bend on forearms for a natural look
  rotateBoneWorld('ForeArm_Left_0124', X, 20);
  rotateBoneWorld('ForeArm_Right_0149', X, 20);

  // Store rest pose quaternions for animation layering
  for (const [name, bone] of Object.entries(bones)) {
    bindQuats[name] = bone.quaternion.clone();
  }
}

/**
 * Procedural idle animation layered on top of the rest pose.
 */
function applyIdleAnimation(time: number) {
  const sin = Math.sin;
  const deg = THREE.MathUtils.degToRad;

  const breathCycle = sin(time * 1.5);
  const swayCycle = sin(time * 0.7);
  const headCycle = sin(time * 0.5 + 0.5);

  function animateBone(name: string, rx: number, ry: number, rz: number) {
    const bone = bones[name];
    const bind = bindQuats[name];
    if (!bone || !bind) return;
    const offset = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(deg(rx), deg(ry), deg(rz))
    );
    bone.quaternion.copy(bind).multiply(offset);
  }

  // Spine breathing
  animateBone('Spine1_06', breathCycle * 1.5, 0, swayCycle * 0.8);
  animateBone('Spine2_072', breathCycle * 1.0, 0, swayCycle * 0.5);

  // Hips sway
  animateBone('Hips_05', 0, 0, swayCycle * 1.0);

  // Head & neck
  animateBone('Neck_077', headCycle * 1.5, 0, sin(time * 0.4) * 1.0);
  animateBone('Head_078', headCycle * 2.5, sin(time * 0.3) * 2, sin(time * 0.6) * 2);

  // Arms gentle sway
  animateBone('Arm_Left_0123', breathCycle * 1.5, swayCycle * 2, swayCycle * 2);
  animateBone('Arm_Right_0148', breathCycle * 1.5, -swayCycle * 2, -swayCycle * 2);
  animateBone('ForeArm_Left_0124', breathCycle * 1, swayCycle * 1.5, 0);
  animateBone('ForeArm_Right_0149', breathCycle * 1, -swayCycle * 1.5, 0);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  const time = performance.now() * 0.001;

  if (model && Object.keys(bindQuats).length > 0) {
    applyIdleAnimation(time);
  }

  // Gentle bobbing on the whole model
  if (model) {
    model.position.y = model.userData.baseY + Math.sin(time * 2) * 0.006;
  }

  renderer.render(scene, camera);
}

function handleResize() {
  if (!canvas.value) return;
  const parent = canvas.value.parentElement;
  if (!parent) return;
  const width = parent.clientWidth;
  const height = parent.clientHeight;
  if (width === 0 || height === 0) return;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

onMounted(() => {
  if (!canvas.value) return;
  const parent = canvas.value.parentElement;
  const width = parent?.clientWidth || 200;
  const height = parent?.clientHeight || 300;

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  // Use a narrower FOV to reduce perspective distortion and fill more of the view
  camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 100);
  camera.position.set(0, 0.7, 3);
  camera.lookAt(0, 0.7, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(3, 5, 5);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x8b7bff, 0.4);
  fillLight.position.set(-3, 2, -3);
  scene.add(fillLight);

  const loader = new GLTFLoader();
  loader.load(
    '/desktopmiku/models/miku/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      scene.add(model);

      // Normalize height
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const targetHeight = 1.6;
      const scale = size.y > 0 ? targetHeight / size.y : 1;
      model.scale.set(scale, scale, scale);
      model.updateMatrixWorld(true);

      // Collect bones and disable frustum culling
      model.traverse((child: any) => {
        if (child.isMesh) {
          child.frustumCulled = false;
        }
        if (child.isSkinnedMesh && !skeleton) {
          skeleton = child.skeleton;
        }
        if (child.isBone) {
          bones[child.name] = child;
        }
      });

      // Apply rest pose BEFORE calculating ground
      applyRestPose();
      model.updateMatrixWorld(true);

      // Place feet exactly at the bottom of the viewport:
      // Calculate bounding box after rest pose, then position model so
      // feet (min.y) are at y=0, and camera frames everything with feet
      // at the very bottom of the canvas.
      const posedBox = new THREE.Box3().setFromObject(model);
      model.position.y = -posedBox.min.y;
      model.userData.baseY = model.position.y;
      model.updateMatrixWorld(true);

      // Camera: frame the model so it fills the canvas height,
      // with feet at the bottom edge
      const finalBox = new THREE.Box3().setFromObject(model);
      const finalSize = new THREE.Vector3();
      finalBox.getSize(finalSize);
      const modelHeight = finalSize.y;

      const fov = camera.fov * (Math.PI / 180);
      // Distance so model height fills the canvas
      const cameraZ = (modelHeight / 2) / Math.tan(fov / 2);

      // Center camera at half model height (feet at y=0, head at y=modelHeight)
      camera.position.set(0, modelHeight / 2, cameraZ * 1.05);
      camera.lookAt(0, modelHeight / 2, 0);
      camera.updateProjectionMatrix();

      console.log('[MikuViewer] Loaded. Bones:', Object.keys(bones).length,
        'Height:', modelHeight.toFixed(2), 'CamZ:', (cameraZ * 1.05).toFixed(2));
    },
    undefined,
    (err) => console.error('[MikuViewer] Failed to load model:', err)
  );

  animate();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.miku-canvas {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>
