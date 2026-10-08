import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Assets de Miku (app "desktopmiku" de frost-os, servidos desde /public/desktopmiku), compartidos
 * por el jugador y los zombis.
 *
 * El modelo y sus animaciones vienen en GLB separados que comparten el mismo esqueleto Mixamo de
 * 28 huesos y sin texturas embebidas (se asignan por nombre de material). Cada GLB se descarga una
 * sola vez y las instancias se crean con SkeletonUtils.clone (geometría, texturas y materiales
 * compartidos; esqueleto propio).
 */
const BASE = '/desktopmiku/models/miku';
const glbUrl = (name: string) => `${BASE}/animations/Meshy_AI_miku_biped_Animation_${name}_withSkin.glb`;

export const MIKU_HEIGHT = 1.75; // metros

/** Tono verde multiplicado sobre las texturas de los zombis. */
const ZOMBIE_TINT = new THREE.Color(0.55, 0.95, 0.5);

// ---------- Texturas (únicas) ----------
let textures: Record<'Body' | 'Cloth' | 'Face' | 'Hair' | 'HairStencil', THREE.Texture> | null = null;
function getTextures() {
  if (textures) return textures;
  const loader = new THREE.TextureLoader();
  const t = (file: string) => {
    const tex = loader.load(`${BASE}/textures/${file}`);
    tex.flipY = true; // igual que el visor original: los UV de estos GLB vienen invertidos
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  textures = {
    Body: t('Body_baseColor.png'),
    Cloth: t('Cloth_baseColor.png'),
    Face: t('Face_baseColor.png'),
    Hair: t('Hair_baseColor.png'),
    HairStencil: t('Hair_Stencil_baseColor.png'),
  };
  return textures;
}

// ---------- Materiales (un juego normal y otro verde, compartidos por todas las instancias) ----------
type MatKey = 'ClothTrance' | 'Cloth' | 'Body' | 'Eyes' | 'Face' | 'HairShadow' | 'HairStencil' | 'Hair';
const materialSets = new Map<boolean, Map<MatKey, THREE.Material>>();

function materialSet(tinted: boolean): Map<MatKey, THREE.Material> {
  const cached = materialSets.get(tinted);
  if (cached) return cached;

  const tex = getTextures();
  const tint = tinted ? ZOMBIE_TINT : new THREE.Color(1, 1, 1);
  const side = THREE.DoubleSide;
  /** Capas superpuestas (ojos, cejas, sombra de pelo): sin escritura de profundidad. */
  const overlay = (map: THREE.Texture | undefined, color: THREE.Color) =>
    new THREE.MeshLambertMaterial({
      map,
      color,
      side,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

  const set = new Map<MatKey, THREE.Material>([
    ['ClothTrance', new THREE.MeshLambertMaterial({ map: tex.Cloth, color: tint, side, transparent: true, opacity: 0.95 })],
    ['Cloth', new THREE.MeshLambertMaterial({ map: tex.Cloth, color: tint, side })],
    ['Body', new THREE.MeshLambertMaterial({ map: tex.Body, color: tint, side })],
    ['Face', new THREE.MeshLambertMaterial({ map: tex.Face, color: tint, side })],
    // Los ojos conservan su color original para que se distingan en la cara verde
    ['Eyes', overlay(tex.Face, new THREE.Color(1, 1, 1))],
    ['HairShadow', overlay(undefined, new THREE.Color(1, 0.8, 0.78))],
    ['HairStencil', overlay(tex.HairStencil, tint)],
    ['Hair', new THREE.MeshLambertMaterial({ map: tex.Hair, color: tint, side, transparent: true, alphaTest: 0.1 })],
  ]);
  materialSets.set(tinted, set);
  return set;
}

/**
 * Asigna materiales iluminados (sol/luna/sombras) según el nombre del material del GLB.
 * `lite` (multitudes): oculta las capas decorativas (sombra y brillo del pelo, falda translúcida) y solo
 * deja que cuerpo y ropa proyecten sombra, reduciendo de 9 a 6 mallas dibujadas por personaje.
 */
function applyMaterials(root: THREE.Object3D, tinted: boolean, lite: boolean) {
  const set = materialSet(tinted);
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    o.frustumCulled = false; // los skinned meshes se mueven fuera de su bounding box de reposo
    const n: string = o.material?.name || '';
    let key: MatKey | null = null;
    let casts = true;

    if (n.includes('Cloth_Trance')) key = 'ClothTrance';
    else if (n.includes('Cloth')) key = 'Cloth';
    else if (n.includes('Body')) key = 'Body';
    else if (n.includes('Stencil_eye')) (key = 'Eyes'), (casts = false); // Stencil_eye y Stencil_eyebrow
    else if (n.includes('Face')) key = 'Face';
    else if (n.includes('Hair_Shadow')) (key = 'HairShadow'), (casts = false);
    else if (n.includes('Hair_Stencil')) (key = 'HairStencil'), (casts = false);
    else if (n.includes('Hair')) key = 'Hair';

    if (key) o.material = set.get(key)!;
    if (lite) {
      if (key === 'ClothTrance' || key === 'HairShadow' || key === 'HairStencil') o.visible = false;
      if (key === 'Hair' || key === 'Face' || key === 'Eyes') casts = false;
    }
    o.castShadow = casts;
    o.userData.canCast = casts;
  });
}

// ---------- GLB / plantillas ----------
interface MikuTemplate {
  scene: THREE.Object3D;
  /** Escala para llegar a MIKU_HEIGHT y desplazamiento para apoyar los pies en y = 0. */
  scale: number;
  offsetY: number;
  clip: THREE.AnimationClip;
}

const templates = new Map<string, Promise<MikuTemplate>>();

/**
 * Las animaciones traen movimiento horizontal de la cadera (p. ej. el idle desplaza ~0.4 m) que,
 * al cruzar entre clips, haría "saltar" al personaje. Se centra la cadera en X/Z y se conserva
 * solo el balanceo vertical (Y).
 */
function removeHipsDrift(clip: THREE.AnimationClip) {
  for (const track of clip.tracks) {
    if (!track.name.endsWith('Hips.position')) continue;
    const v = track.values as unknown as Float32Array;
    const n = v.length / 3;
    let mx = 0;
    let mz = 0;
    for (let i = 0; i < n; i++) {
      mx += v[i * 3];
      mz += v[i * 3 + 2];
    }
    mx /= n;
    mz /= n;
    for (let i = 0; i < n; i++) {
      v[i * 3] -= mx;
      v[i * 3 + 2] -= mz;
    }
  }
}

/** Descarga (una sola vez) el GLB de la animación `name`: 'Running', 'Walking', 'Stand_and_Chat'... */
export function loadMikuTemplate(name: string): Promise<MikuTemplate> {
  let p = templates.get(name);
  if (!p) {
    p = new GLTFLoader().loadAsync(glbUrl(name)).then((gltf) => {
      const clip = gltf.animations[0];
      clip.name = name;
      removeHipsDrift(clip);

      gltf.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const scale = size.y > 0 ? MIKU_HEIGHT / size.y : 1;
      return { scene: gltf.scene, scale, offsetY: -box.min.y * scale, clip };
    });
    templates.set(name, p);
  }
  return p;
}

export interface MikuInstance {
  /** Añadir a la escena / mover. */
  root: THREE.Group;
  /** Raíz sobre la que se crea el AnimationMixer. */
  model: THREE.Object3D;
}

/** Crea una instancia independiente (esqueleto propio) del modelo de la plantilla. */
export function instantiateMiku(template: MikuTemplate, tinted: boolean, lite = false): MikuInstance {
  const model = cloneSkinned(template.scene);
  applyMaterials(model, tinted, lite);
  model.scale.setScalar(template.scale);
  model.position.y = template.offsetY;
  const root = new THREE.Group();
  root.add(model);
  return { root, model };
}

/** Libera los recursos propios de una instancia (la geometría, texturas y materiales son compartidos). */
export function disposeMikuInstance(inst: MikuInstance) {
  inst.model.traverse((o: any) => {
    if (o.isSkinnedMesh) o.skeleton?.dispose();
  });
  inst.root.removeFromParent();
}

export type { MikuTemplate };
