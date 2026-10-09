import * as THREE from 'three';
import { disposeMikuInstance, instantiateMiku, loadMikuTemplate, type MikuInstance } from './mikuAssets';
import { loadAnimation, splitClip } from './animationAssets';

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
  /** Duración total de la recarga en curso (s). Sirve para calzar los brazos con el arma. 0 = desconocida. */
  reloadDuration?: number;
  hasGun: boolean;
  isBlocking: boolean;
}

/**
 * Controlador de animación dinámico para el personaje.
 * Reacciona a la cámara, velocidad, dirección de desplazamiento,
 * acciones de combate cuerpo a cuerpo y recarga. Sin animación de daño:
 * el daño se comunica con sangre en pantalla, nunca interrumpe la marcha.
 */
export class PlayerAvatar {
  readonly root: THREE.Group;
  private inst: MikuInstance;
  private mixer: THREE.AnimationMixer;

  // Acciones de animación cacheadas (separadas por tren superior e inferior)
  private lowerLocomotionActions = new Map<LocomotionClip, THREE.AnimationAction>();
  private upperLocomotionActions = new Map<LocomotionClip, THREE.AnimationAction>();
  
  private lowerActionActions = new Map<ActionClip, THREE.AnimationAction>();
  private upperActionActions = new Map<ActionClip, THREE.AnimationAction>();

  private currentLowerLocomotion: LocomotionClip = 'idle';
  private currentUpperLocomotion: LocomotionClip = 'idle';
  private activeAction: ActionClip | null = null;
  private actionTimer = 0;
  private isDead = false;
  /** Duración original de cada clip de locomoción (para calzar recargas). */
  private locomotionDurations = new Map<LocomotionClip, number>();
  /** Materiales originales durante el resplandor de resurrección. */
  private reviveMats: { mesh: THREE.Mesh; orig: THREE.Material | THREE.Material[] }[] = [];
  private reviveLight: THREE.PointLight | null = null;

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
      this.locomotionDurations.set(key, clip.duration);
      const { upper, lower } = splitClip(clip);
      
      const lowerAction = this.mixer.clipAction(lower);
      lowerAction.setLoop(THREE.LoopRepeat, Infinity);
      this.lowerLocomotionActions.set(key, lowerAction);

      const upperAction = this.mixer.clipAction(upper);
      upperAction.setLoop(THREE.LoopRepeat, Infinity);
      this.upperLocomotionActions.set(key, upperAction);
    }

    // Registrar clips de acción (un solo disparo)
    for (const [key, clip] of Object.entries(actionClips) as [ActionClip, THREE.AnimationClip][]) {
      const { upper, lower } = splitClip(clip);

      const lowerAction = this.mixer.clipAction(lower);
      lowerAction.setLoop(THREE.LoopOnce, 1);
      lowerAction.clampWhenFinished = true;
      this.lowerActionActions.set(key, lowerAction);

      const upperAction = this.mixer.clipAction(upper);
      upperAction.setLoop(THREE.LoopOnce, 1);
      upperAction.clampWhenFinished = true;
      this.upperActionActions.set(key, upperAction);
    }

    const initialLower = this.lowerLocomotionActions.get('idle');
    const initialUpper = this.upperLocomotionActions.get('idle');
    if (initialLower) initialLower.play();
    if (initialUpper) initialUpper.play();
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
      death: deathClip,
    };

    return new PlayerAvatar(instantiateMiku(baseTemplate, false), locomotionClips, actionClips);
  }

  /**
   * Actualiza el estado dinámico de locomoción según la cámara, velocidad e intenciones del jugador.
   */
  setLocomotion(input: LocomotionInput) {
    if (this.isDead) return;

    let targetLower: LocomotionClip = 'idle';
    let targetUpper: LocomotionClip = 'idle';

    const absDiff = Math.abs(input.moveHeadingDiff);
    const forward = absDiff <= Math.PI * 0.35;

    // 1. Tren inferior: las piernas dependen SOLO de la marcha (caminar, correr,
    // sigilo), nunca de la dirección ni de la pose de apuntar. Así no hay
    // agachones al girar la vista: de lado o de espaldas las piernas hacen el
    // mismo ciclo de marcha y solo el torso apunta.
    if (!input.moving) {
      if (input.turnDirection === 'left') targetLower = 'turn_left';
      else if (input.turnDirection === 'right') targetLower = 'turn_right';
      else targetLower = 'idle';
    } else if (input.isStealth) {
      targetLower = 'sneak';
    } else if (input.isSprinting) {
      targetLower = 'run';
    } else {
      targetLower = 'walk';
    }

    // 2. Tren superior: lo que hacen los brazos, independiente de las piernas.
    // (Los clips agachados strafe/walk_back quedan fuera de la selección para
    // que el torso nunca se agache a medio giro; la pose de apuntar es el
    // upper de walk_back sobre piernas normales.)
    // Por defecto el torso sigue la cadencia de las piernas; la recarga impone la suya.
    let upperFollowsLegs = true;
    if (input.isBlocking) {
      targetUpper = 'block';
    } else if (input.isReloading) {
      targetUpper = input.isSprinting && input.moving ? 'run_reload' : 'walk_reload';
      upperFollowsLegs = false;
    } else if (input.hasGun) {
      if (input.isSprinting && input.moving && forward) {
        // Al esprintar de frente se baja el rifle aunque se esté apuntando.
        targetUpper = 'run_rifle_low';
      } else if (input.isAiming) {
        // Pose de apuntar sobre piernas normales (misma que en reposo).
        targetUpper = 'walk_back';
      } else {
        targetUpper = 'run_rifle_low';
      }
    } else if (input.isStealth) {
      targetUpper = 'sneak';
    } else if (input.moving) {
      // Sin arma el torso espeja a las piernas (clip original completo).
      targetUpper = targetLower;
    } else {
      targetUpper = 'idle';
    }

    // 3. Ajustar cadencias (Lower por velocidad; Upper sigue a las piernas
    // salvo en recarga, que va a ritmo del arma para terminar a la par).
    const nextLower = this.lowerLocomotionActions.get(targetLower);
    const nextUpper = this.upperLocomotionActions.get(targetUpper);

    if (nextLower) {
      if (targetLower === 'run') nextLower.timeScale = THREE.MathUtils.clamp(input.speed / RUN_CLIP_SPEED, 0.6, 2.0);
      else if (targetLower === 'walk' || targetLower === 'sneak' || targetLower === 'walk_back' || targetLower === 'strafe_left' || targetLower === 'strafe_right') nextLower.timeScale = THREE.MathUtils.clamp(input.speed / WALK_CLIP_SPEED, 0.6, 2.2);
      else nextLower.timeScale = 1.0;
    }

    if (nextUpper) {
      if (!upperFollowsLegs) {
        // Recarga: calzar los brazos con la duración real del arma.
        const clipDur = this.locomotionDurations.get(targetUpper) ?? 1.0;
        const reloadDur = input.reloadDuration ?? 0;
        nextUpper.timeScale = reloadDur > 0.2 ? clipDur / reloadDur : 1.0;
      } else if (targetUpper === 'run' || targetUpper === 'run_rifle_low' || targetUpper === 'run_reload') nextUpper.timeScale = THREE.MathUtils.clamp(input.speed / RUN_CLIP_SPEED, 0.6, 2.0);
      else if (targetUpper === 'walk' || targetUpper === 'sneak' || targetUpper === 'walk_back' || targetUpper === 'walk_reload' || targetUpper === 'strafe_left' || targetUpper === 'strafe_right') nextUpper.timeScale = THREE.MathUtils.clamp(input.speed / WALK_CLIP_SPEED, 0.6, 2.2);
      else nextUpper.timeScale = 1.0;
    }

    // 4. Fundidos (Crossfades)
    if (targetLower !== this.currentLowerLocomotion) {
      const prevLower = this.lowerLocomotionActions.get(this.currentLowerLocomotion);
      if (nextLower && prevLower) {
        nextLower.reset().play();
        if (!this.activeAction) nextLower.crossFadeFrom(prevLower, 0.18, false);
      }
      this.currentLowerLocomotion = targetLower;
    }
    
    if (targetUpper !== this.currentUpperLocomotion) {
      const prevUpper = this.upperLocomotionActions.get(this.currentUpperLocomotion);
      if (nextUpper && prevUpper) {
        nextUpper.reset().play();
        if (!this.activeAction) nextUpper.crossFadeFrom(prevUpper, 0.18, false);
      }
      this.currentUpperLocomotion = targetUpper;
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
   * La duración se toma del clip para que el golpe y el arma vayan calzados.
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
    this.triggerOneShotAction(clipKey);
  }

  /**
   * Animación de muerte cuando la salud llega a 0.
   */
  playDeath() {
    if (this.isDead) return;
    this.isDead = true;

    if (this.activeAction) {
      this.lowerActionActions.get(this.activeAction)?.stop();
      this.upperActionActions.get(this.activeAction)?.stop();
    }
    const currentLower = this.lowerLocomotionActions.get(this.currentLowerLocomotion);
    const currentUpper = this.upperLocomotionActions.get(this.currentUpperLocomotion);
    
    const deathLower = this.lowerActionActions.get('death');
    const deathUpper = this.upperActionActions.get('death');

    if (deathLower && currentLower) {
      deathLower.reset().play();
      deathLower.crossFadeFrom(currentLower, 0.2, false);
    }
    if (deathUpper && currentUpper) {
      deathUpper.reset().play();
      deathUpper.crossFadeFrom(currentUpper, 0.2, false);
    }
  }

  private triggerOneShotAction(clipKey: ActionClip) {
    const lowerAction = this.lowerActionActions.get(clipKey);
    const upperAction = this.upperActionActions.get(clipKey);
    if (!lowerAction || !upperAction) return;

    const baseLower = this.lowerLocomotionActions.get(this.currentLowerLocomotion);
    const baseUpper = this.upperLocomotionActions.get(this.currentUpperLocomotion);

    lowerAction.reset().play();
    upperAction.reset().play();

    if (baseLower) lowerAction.crossFadeFrom(baseLower, 0.1, false);
    if (baseUpper) upperAction.crossFadeFrom(baseUpper, 0.1, false);

    this.activeAction = clipKey;
    // El golpe dura lo que dura su clip (bate y puños calzados).
    this.actionTimer = upperAction.getClip().duration;
  }

  update(dt: number) {
    this.mixer.update(dt);

    if (this.activeAction && !this.isDead) {
      this.actionTimer -= dt;
      if (this.actionTimer <= 0) {
        // Regresar a la locomoción base suavemente
        const lowerAction = this.lowerActionActions.get(this.activeAction);
        const upperAction = this.upperActionActions.get(this.activeAction);
        const baseLower = this.lowerLocomotionActions.get(this.currentLowerLocomotion);
        const baseUpper = this.upperLocomotionActions.get(this.currentUpperLocomotion);
        
        if (lowerAction && baseLower) {
          baseLower.reset().play();
          baseLower.crossFadeFrom(lowerAction, 0.2, false);
        }
        if (upperAction && baseUpper) {
          baseUpper.reset().play();
          baseUpper.crossFadeFrom(upperAction, 0.2, false);
        }
        this.activeAction = null;
      }
    }
  }
  getRightHandBone(): THREE.Object3D | null {
    return this.inst.model.getObjectByName('mixamorigRightHand') || null;
  }

  /**
   * Posición mundial de la mano derecha (origen de golpes y referencia para
   * pegar el arma). Si el modelo aún no resolvió el hueso, estima a la altura
   * del pecho sobre la raíz.
   */
  getRightHandWorldPosition(out = new THREE.Vector3()): THREE.Vector3 {
    const bone = this.inst.model.getObjectByName('mixamorigRightHand');
    if (bone) return bone.getWorldPosition(out);
    return out.set(this.root.position.x, 1.1, this.root.position.z);
  }

  /**
   * Inicia el resplandor de canalización de resurrección: clona los materiales
   * del modelo (son compartidos con zombis y resto de instancias) y suma una
   * luz puntual que crece con setReviveGlow(0..1). Llamar a clearReviveGlow()
   * al terminar para restaurar los materiales originales.
   */
  beginReviveGlow() {
    this.clearReviveGlow();
    this.inst.model.traverse((o: any) => {
      if (!o.isMesh) return;
      const mesh = o as THREE.Mesh;
      const orig = mesh.material;
      const copy = Array.isArray(orig) ? orig.map((m) => m.clone()) : (orig as THREE.Material).clone();
      this.reviveMats.push({ mesh, orig });
      mesh.material = copy as any;
    });
    const light = new THREE.PointLight(0xffe6a3, 0, 16, 1.6);
    light.position.set(0, 1.4, 0);
    this.root.add(light);
    this.reviveLight = light;
    this.setReviveGlow(0);
  }

  /** Intensidad del resplandor de canalización (0 apagado → 1 cegador). */
  setReviveGlow(t: number) {
    const e = THREE.MathUtils.clamp(t, 0, 1);
    const k = e * e;
    for (const { mesh } of this.reviveMats) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats as THREE.MeshLambertMaterial[]) {
        if (m.emissive) m.emissive.setRGB(k, 0.85 * k, 0.55 * k);
      }
    }
    if (this.reviveLight) this.reviveLight.intensity = k * 60;
  }

  /** Restaura materiales originales y apaga la luz de canalización. */
  clearReviveGlow() {
    for (const { mesh, orig } of this.reviveMats) {
      const cur = mesh.material;
      mesh.material = orig as any;
      if (Array.isArray(cur)) cur.forEach((m) => m.dispose?.());
      else (cur as THREE.Material)?.dispose?.();
    }
    this.reviveMats = [];
    if (this.reviveLight) {
      this.root.remove(this.reviveLight);
      this.reviveLight.dispose();
      this.reviveLight = null;
    }
  }

  /** Devuelve al personaje a la vida (nueva partida): sin muerte ni resplandor, en idle. */
  resetLife() {
    this.isDead = false;
    this.clearReviveGlow();
    this.activeAction = null;
    this.actionTimer = 0;
    this.mixer.stopAllAction();
    const lower = this.lowerLocomotionActions.get('idle');
    const upper = this.upperLocomotionActions.get('idle');
    if (lower) lower.reset().play();
    if (upper) upper.reset().play();
    this.currentLowerLocomotion = 'idle';
    this.currentUpperLocomotion = 'idle';
  }

  dispose() {
    this.clearReviveGlow();
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.inst.model);
    disposeMikuInstance(this.inst);
  }
}
