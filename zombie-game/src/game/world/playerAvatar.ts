import * as THREE from 'three';
import { disposeMikuInstance, instantiateMiku, loadMikuTemplate, type MikuInstance } from './mikuAssets';

/** Velocidad (m/s) a la que el clip de correr a timeScale 1 no patina los pies (aprox.). */
const RUN_CLIP_SPEED = 4.5;

export type AvatarState = 'idle' | 'run';

/**
 * Jugador = Miku, con animación de correr (Running) al moverse y de idle (Stand and Chat) al estar quieto.
 * El modelo base sale del GLB de Running; el clip de idle, del GLB de Stand_and_Chat.
 */
export class PlayerAvatar {
  /** Añadir a la escena; la posición/rotación Y se controlan desde fuera. */
  readonly root: THREE.Group;
  private inst: MikuInstance;
  private mixer: THREE.AnimationMixer;
  private actions: Record<AvatarState, THREE.AnimationAction>;
  private state: AvatarState = 'idle';

  private constructor(inst: MikuInstance, clips: Record<AvatarState, THREE.AnimationClip>) {
    this.inst = inst;
    this.root = inst.root;
    this.mixer = new THREE.AnimationMixer(inst.model);
    this.actions = {
      idle: this.mixer.clipAction(clips.idle),
      run: this.mixer.clipAction(clips.run),
    };
    this.actions.idle.play();
  }

  static async load(): Promise<PlayerAvatar> {
    const [run, idle] = await Promise.all([loadMikuTemplate('Running'), loadMikuTemplate('Stand_and_Chat')]);
    return new PlayerAvatar(instantiateMiku(run, false), { run: run.clip, idle: idle.clip });
  }

  /** Cambia de animación con fundido; `speed` (m/s) ajusta la cadencia de la carrera. */
  setState(state: AvatarState, speed = RUN_CLIP_SPEED) {
    if (state === 'run') {
      this.actions.run.timeScale = THREE.MathUtils.clamp(speed / RUN_CLIP_SPEED, 0.6, 2.2);
    }
    if (state === this.state) return;
    const next = this.actions[state];
    const prev = this.actions[this.state];
    next.reset().play();
    next.crossFadeFrom(prev, 0.2, false);
    this.state = state;
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.inst.model);
    disposeMikuInstance(this.inst);
  }
}
