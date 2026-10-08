import * as THREE from 'three';
import { disposeMikuInstance, instantiateMiku, loadMikuTemplate, type MikuInstance } from './mikuAssets';
import { loadAnimation } from './animationAssets';

/** Velocidad base de referencia (m/s) para ajustar la cadencia de pasos. */
const WALK_CLIP_SPEED = 1.4;
const RUN_CLIP_SPEED = 4.5;

export type LocomotionClip =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sneak'
  | 'turn_left'
  | 'turn_right'
  | 'walk_back'
  | 'strafe_left'
  | 'strafe_right'
  | 'run_rifle_low'
  | 'walk_reload'
  | 'run_reload'
  | 'block';

export type ActionClip =
  | 'melee_attack'
  | 'punch'
  | 'kick'
  | 'elbow'
  | 'hit_reaction'
  | 'hit_reaction_2'
  | 'death';

export interface LocomotionInput {
  moving: boolean;
  speed: number;
  /** Diferencia angular entre dirección de movimiento y orientación del personaje (-PI a PI) */
  moveHeadingDiff: number;
  /** Dirección en la que está girando el cuerpo en el lugar para seguir el cursor ('left' o 'right'), o nulo si no gira */
  turnDirection?: 'left' | 'right' | null;
  isSprinting: boolean;
  isStealth?: boolean;
  isAiming: boolean;
  isReloading: boolean;
  hasGun: boolean;
  isBlocking: boolean;
}

/**
 * Controlador de animación dinámico para el personaje.
 * Reacciona a la cámara, velocidad, dirección de desplazamiento (strafe, retroceso),
 * acciones de combate, recarga y reacciones a impactos.
 */
export class PlayerAvatar {
  readonly root: THREE.Group;
  private inst: MikuInstance;
  private mixer: THREE.AnimationMixer;

  // Acciones de animación cacheadas
  private locomotionActions = new Map<LocomotionClip, THREE.AnimationAction>();
  private actionActions = new Map<ActionClip, THREE.AnimationAction>();

  private currentLocomotion: LocomotionClip = 'idle';
  private activeAction: ActionClip | null = null;
  private actionTimer = 0;
  private isDead = false;

  private constructor(
    inst: MikuInstance,
    locomotionClips: Record<LocomotionClip, THREE.AnimationClip>,
    actionClips: Record<ActionClip, THREE.AnimationClip>
  ) {
    this.inst = inst;
    this.root = inst.root;
    this.mixer = new THREE.AnimationMixer(inst.model);

    // Registrar clips de locomoción (en loop)
    for (const [key, clip] of Object.entries(locomotionClips) as [LocomotionClip, THREE.AnimationClip][]) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      this.locomotionActions.set(key, action);
    }

    // Registrar clips de acción (un solo disparo)
    for (const [key, clip] of Object.entries(actionClips) as [ActionClip, THREE.AnimationClip][]) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      this.actionActions.set(key, action);
    }

    const initial = this.locomotionActions.get('idle');
    if (initial) {
      initial.play();
    }
  }

  static async load(): Promise<PlayerAvatar> {
    // 1. Cargar el modelo base Miku
    const baseTemplate = await loadMikuTemplate('Running');

    // 2. Cargar en paralelo todos los clips de animación provistos en src/animations
    const [
      idleClip,
      walkClip,
      runClip,
      sneakClip,
      turnLeftClip,
      walkBackAimClip,
      strafeLeftClip,
      strafeRightClip,
      runRifleLowClip,
      walkReloadClip,
      runReloadClip,
      blockClip,
      meleeClip,
      punchClip,
      kickClip,
      elbowClip,
      hit1Clip,
      hit2Clip,
      deathClip,
    ] = await Promise.all([
      loadAnimation('idle'),
      loadAnimation('caminar'),
      loadAnimation('correr'),
      loadAnimation('sigilo'),
      loadAnimation('turn_left'),
      loadAnimation('apuntar_espaldas'),
      loadAnimation('agachado_izquierda'),
      loadAnimation('agachado_derecha'),
      loadAnimation('correr_rifle_abajo'),
      loadAnimation('caminar_recarga'),
      loadAnimation('correr_recarga'),
      loadAnimation('bloquear_1'),
      loadAnimation('bat_swing'),
      loadAnimation('punetazo'),
      loadAnimation('patada_derecha'),
      loadAnimation('golpes_codo'),
      loadAnimation('reaccion_golpe'),
      loadAnimation('reaccion_golpe_2'),
      loadAnimation('muerte'),
    ]);

    const { mirrorAnimation } = await import('./animationAssets');
    const turnRightClip = mirrorAnimation(turnLeftClip);

    const locomotionClips: Record<LocomotionClip, THREE.AnimationClip> = {
      idle: idleClip,
      walk: walkClip,
      run: runClip,
      sneak: sneakClip,
      turn_left: turnLeftClip,
      turn_right: turnRightClip,
      walk_back: walkBackAimClip,
      strafe_left: strafeLeftClip,
      strafe_right: strafeRightClip,
      run_rifle_low: runRifleLowClip,
      walk_reload: walkReloadClip,
      run_reload: runReloadClip,
      block: blockClip,
    };

    const actionClips: Record<ActionClip, THREE.AnimationClip> = {
      melee_attack: meleeClip,
      punch: punchClip,
      kick: kickClip,
      elbow: elbowClip,
      hit_reaction: hit1Clip,
      hit_reaction_2: hit2Clip,
      death: deathClip,
    };

    return new PlayerAvatar(instantiateMiku(baseTemplate, false), locomotionClips, actionClips);
  }

  /**
   * Actualiza el estado dinámico de locomoción según la cámara, velocidad e intenciones del jugador.
   */
  setLocomotion(input: LocomotionInput) {
    if (this.isDead) return;

    let targetClip: LocomotionClip = 'idle';

    if (input.isBlocking) {
      targetClip = 'block';
    } else if (input.isReloading && input.moving) {
      targetClip = input.isSprinting ? 'run_reload' : 'walk_reload';
    } else if (!input.moving) {
      if (input.turnDirection === 'left') {
        targetClip = 'turn_left';
      } else if (input.turnDirection === 'right') {
        targetClip = 'turn_right';
      } else {
        targetClip = 'idle';
      }
    } else {
      // Movimiento direccional según la orientación del cuerpo (cámara y cursor)
      const absDiff = Math.abs(input.moveHeadingDiff);

      if (input.isStealth) {
        // En sigilo, postura agachada y sigilosa
        targetClip = 'sneak';
      } else if (absDiff <= Math.PI * 0.35) {
        // Hacia adelante normal o corriendo
        if (input.isSprinting) {
          targetClip = input.hasGun ? 'run_rifle_low' : 'run';
        } else {
          targetClip = 'walk';
        }
      } else if (absDiff >= Math.PI * 0.65) {
        // Hacia atrás
        targetClip = 'walk_back';
      } else if (input.moveHeadingDiff > 0) {
        // Desplazamiento lateral derecho (Strafe derecha)
        targetClip = 'strafe_right';
      } else {
        // Desplazamiento lateral izquierdo (Strafe izquierda)
        targetClip = 'strafe_left';
      }
    }

    // Ajustar cadencia de pasos al ritmo de la velocidad física
    const nextAction = this.locomotionActions.get(targetClip);
    if (nextAction) {
      if (targetClip === 'run' || targetClip === 'run_rifle_low' || targetClip === 'run_reload') {
        nextAction.timeScale = THREE.MathUtils.clamp(input.speed / RUN_CLIP_SPEED, 0.6, 2.0);
      } else if (targetClip === 'walk' || targetClip === 'sneak' || targetClip === 'walk_back' || targetClip === 'strafe_left' || targetClip === 'strafe_right') {
        nextAction.timeScale = THREE.MathUtils.clamp(input.speed / WALK_CLIP_SPEED, 0.6, 2.2);
      } else {
        nextAction.timeScale = 1.0;
      }
    }

    if (targetClip !== this.currentLocomotion) {
      const prevAction = this.locomotionActions.get(this.currentLocomotion);
      if (nextAction && prevAction) {
        nextAction.reset().play();
        // Si no hay una acción especial activa, fundir suavemente
        if (!this.activeAction) {
          nextAction.crossFadeFrom(prevAction, 0.18, false);
        }
      }
      this.currentLocomotion = targetClip;
    }
  }

  /**
   * Método de compatibilidad para llamadas simples (jugadores remotos, etc.).
   */
  setState(state: 'idle' | 'run' | 'walk' | 'sneak', speed = RUN_CLIP_SPEED) {
    this.setLocomotion({
      moving: state !== 'idle',
      speed,
      moveHeadingDiff: 0,
      turnDirection: null,
      isSprinting: state === 'run',
      isStealth: state === 'sneak',
      isAiming: false,
      isReloading: false,
      hasGun: false,
      isBlocking: false,
    });
  }

  /**
   * Dispara una acción de combate cuerpo a cuerpo (swing de bate, puñetazo, patada o codazo).
   */
  playAttack(type: 'melee' | 'punch' | 'kick' | 'elbow' = 'melee') {
    if (this.isDead) return;

    const actionMap: Record<string, ActionClip> = {
      melee: 'melee_attack',
      punch: 'punch',
      kick: 'kick',
      elbow: 'elbow',
    };
    const clipKey = actionMap[type] || 'melee_attack';
    this.triggerOneShotAction(clipKey, 0.55);
  }

  /**
   * Reacción a impacto recibido (zombi golpeando al personaje).
   */
  playHitReaction() {
    if (this.isDead) return;
    const clipKey: ActionClip = Math.random() < 0.5 ? 'hit_reaction' : 'hit_reaction_2';
    this.triggerOneShotAction(clipKey, 0.4);
  }

  /**
   * Animación de muerte cuando la salud llega a 0.
   */
  playDeath() {
    if (this.isDead) return;
    this.isDead = true;

    if (this.activeAction) {
      const cur = this.actionActions.get(this.activeAction);
      cur?.stop();
    }
    const currentLoc = this.locomotionActions.get(this.currentLocomotion);
    const deathAction = this.actionActions.get('death');

    if (deathAction) {
      deathAction.reset().play();
      if (currentLoc) {
        deathAction.crossFadeFrom(currentLoc, 0.2, false);
      }
    }
  }

  private triggerOneShotAction(clipKey: ActionClip, duration: number) {
    const action = this.actionActions.get(clipKey);
    if (!action) return;

    const baseAction = this.locomotionActions.get(this.currentLocomotion);
    action.reset().play();

    if (baseAction) {
      action.crossFadeFrom(baseAction, 0.1, false);
    }

    this.activeAction = clipKey;
    this.actionTimer = duration;
  }

  update(dt: number) {
    this.mixer.update(dt);

    if (this.activeAction && !this.isDead) {
      this.actionTimer -= dt;
      if (this.actionTimer <= 0) {
        // Regresar a la locomoción base suavemente
        const action = this.actionActions.get(this.activeAction);
        const baseAction = this.locomotionActions.get(this.currentLocomotion);
        if (action && baseAction) {
          baseAction.reset().play();
          baseAction.crossFadeFrom(action, 0.2, false);
        }
        this.activeAction = null;
      }
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.inst.model);
    disposeMikuInstance(this.inst);
  }
}
