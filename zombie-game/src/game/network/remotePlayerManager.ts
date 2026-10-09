import * as THREE from 'three';
import { PlayerAvatar } from '../world/playerAvatar';
import { WeaponCompanion } from '../weapons/weaponCompanion';
import type { WeaponId } from '../weapons/weaponTypes';
import { getWeaponDef } from '../weapons/weaponDefs';
import type { PlayerNetworkState } from './networkTypes';

interface RemotePlayerEntry {
  state: PlayerNetworkState;
  root: THREE.Group;
  avatar?: PlayerAvatar;
  companion: WeaponCompanion;
  fallbackMesh?: THREE.Mesh;
  nameTagSprite: THREE.Sprite;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetHeading: number;
  currentX: number;
  currentY: number;
  currentZ: number;
  currentHeading: number;
  isMoving: boolean;
  health: number;
}

export class RemotePlayerManager {
  private readonly scene: THREE.Scene;
  private readonly players = new Map<string, RemotePlayerEntry>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Crea o actualiza un jugador remoto en la escena Three.js.
   */
  async updatePlayer(state: PlayerNetworkState) {
    let entry = this.players.get(state.connectionId);

    if (!entry) {
      entry = await this.spawnPlayer(state);
      this.players.set(state.connectionId, entry);
    }

    // Actualizar objetivos para interpolación
    entry.state = state;
    entry.targetX = state.x;
    entry.targetY = state.y;
    entry.targetZ = state.z;
    entry.targetHeading = state.heading;
    entry.isMoving = state.isMoving;
    entry.health = state.health;

    // Si está en un vehículo, ocultar el avatar a pie
    if (entry.avatar) {
      entry.avatar.root.visible = !state.isInVehicle;
    }
    if (entry.fallbackMesh) {
      entry.fallbackMesh.visible = !state.isInVehicle;
    }

    // Actualizar arma equipada
    if (state.equippedWeapon !== undefined) {
      const def = getWeaponDef(state.equippedWeapon as WeaponId);
      entry.companion.setWeapon((state.equippedWeapon as WeaponId) || null, def?.category === 'melee');
    }
  }

  private async spawnPlayer(state: PlayerNetworkState): Promise<RemotePlayerEntry> {
    const root = new THREE.Group();
    root.position.set(state.x, state.y, state.z);
    root.rotation.y = state.heading;

    // 1. Etiqueta flotante con nombre y barra de vida (Billboard Sprite)
    const nameTagSprite = this.createNameTagSprite(state.nickname, state.health);
    nameTagSprite.position.set(0, 2.15, 0);
    root.add(nameTagSprite);

    // 2. Malla temporal mientras carga el modelo Miku
    const fallbackGeo = new THREE.CapsuleGeometry(0.28, 0.9, 4, 8);
    fallbackGeo.translate(0, 0.75, 0);
    const fallbackMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
    fallbackMesh.castShadow = true;
    root.add(fallbackMesh);

    this.scene.add(root);

    // 3. Arma equipada visual
    const companion = new WeaponCompanion(this.scene);
    if (state.equippedWeapon) {
      const def = getWeaponDef(state.equippedWeapon as WeaponId);
      companion.setWeapon(state.equippedWeapon as WeaponId, def?.category === 'melee');
    }

    const entry: RemotePlayerEntry = {
      state,
      root,
      companion,
      fallbackMesh,
      nameTagSprite,
      targetX: state.x,
      targetY: state.y,
      targetZ: state.z,
      targetHeading: state.heading,
      currentX: state.x,
      currentY: state.y,
      currentZ: state.z,
      currentHeading: state.heading,
      isMoving: state.isMoving,
      health: state.health,
    };

    // 3. Cargar el avatar Miku asíncronamente
    PlayerAvatar.load()
      .then((avatar) => {
        if (!this.players.has(state.connectionId)) {
          avatar.dispose();
          return;
        }
        entry.avatar = avatar;
        if (entry.fallbackMesh) {
          root.remove(entry.fallbackMesh);
          entry.fallbackMesh.geometry.dispose();
          entry.fallbackMesh = undefined;
        }
        root.add(avatar.root);
        entry.companion.setHandBone(avatar.getRightHandBone());
        avatar.root.visible = !state.isInVehicle;
      })
      .catch((err) => {
        console.warn('[RemotePlayerManager] Error cargando avatar Miku para jugador remoto:', err);
      });

    return entry;
  }

  /**
   * Crea un sprite 2D en espacio 3D para el nombre del jugador.
   */
  private createNameTagSprite(nickname: string, health: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Fondo semitransparente
      ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
      ctx.roundRect(10, 10, 236, 44, 8);
      ctx.fill();

      // Borde
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texto de Nickname
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nickname, 128, 26);

      // Barra de vida pequeña
      const hpWidth = 180;
      const hpLeft = (256 - hpWidth) / 2;
      const hpPct = Math.max(0, Math.min(1, health / 100));
      ctx.fillStyle = '#262626';
      ctx.fillRect(hpLeft, 42, hpWidth, 6);
      ctx.fillStyle = hpPct > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(hpLeft, 42, hpWidth * hpPct, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 0.38, 1);
    return sprite;
  }

  /**
   * Actualiza la interpolación física y animaciones de todos los jugadores remotos (60 FPS).
   */
  update(dt: number) {
    for (const entry of this.players.values()) {
      // Interpolación suave LERP de posición
      const lerpSpeed = Math.min(1, dt * 14);
      entry.currentX += (entry.targetX - entry.currentX) * lerpSpeed;
      entry.currentY += (entry.targetY - entry.currentY) * lerpSpeed;
      entry.currentZ += (entry.targetZ - entry.currentZ) * lerpSpeed;

      // Interpolación angular de heading
      let diff = entry.targetHeading - entry.currentHeading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      entry.currentHeading += diff * lerpSpeed;

      entry.root.position.set(entry.currentX, entry.currentY, entry.currentZ);
      entry.root.rotation.y = entry.currentHeading;

      // Animar avatar Miku
      if (entry.avatar && !entry.state.isInVehicle) {
        const isSneak = entry.state.isStealth || entry.state.currentAnim === 'sneak';
        const anim = entry.isMoving ? (entry.state.isRunning ? 'run' : isSneak ? 'sneak' : 'walk') : 'idle';
        entry.avatar.setState(anim, entry.state.speed || 4.5);
        entry.avatar.update(dt);
      }

      // Actualizar arma equipada flotante
      entry.companion.update(
        performance.now() / 1000,
        entry.currentX,
        entry.currentZ,
        entry.currentHeading,
        !entry.state.isInVehicle
      );
    }
  }

  /**
   * Elimina un jugador que abandonó la partida.
   */
  removePlayer(connectionId: string) {
    const entry = this.players.get(connectionId);
    if (!entry) return;

    this.scene.remove(entry.root);
    entry.avatar?.dispose();
    entry.companion.dispose();
    entry.fallbackMesh?.geometry.dispose();
    entry.nameTagSprite.material.dispose();
    this.players.delete(connectionId);
  }

  /**
   * Reproduce una animación de ataque o disparo en el avatar del jugador remoto.
   */
  playAttack(connectionId: string, isMelee: boolean) {
    const entry = this.players.get(connectionId);
    if (entry && entry.avatar) {
      entry.avatar.playAttack(isMelee ? 'melee' : 'punch');
    }
  }

  /**
   * IDs de vehículos con conductor remoto a bordo (para tratarlos como
   * sólidos/atacables por los zombis locales en multijugador).
   */
  getInVehicleRiders(): { vehicleId: string }[] {
    const list: { vehicleId: string }[] = [];
    for (const p of this.players.values()) {
      if (p.state.isInVehicle && p.state.vehicleId) {
        list.push({ vehicleId: p.state.vehicleId });
      }
    }
    return list;
  }

  /**
   * Obtiene las coordenadas actuales de todos los jugadores remotos con su estado de sigilo/carrera.
   */
  getOtherPlayerPositions(): { x: number; z: number; isStealth?: boolean; isRunning?: boolean }[] {
    const list: { x: number; z: number; isStealth?: boolean; isRunning?: boolean }[] = [];
    for (const p of this.players.values()) {
      list.push({
        x: p.currentX,
        z: p.currentZ,
        isStealth: p.state.isStealth || p.state.currentAnim === 'sneak',
        isRunning: p.state.isRunning,
      });
    }
    return list;
  }

  /**
   * Limpia todos los jugadores remotos.
   */
  clear() {
    for (const [id] of this.players) {
      this.removePlayer(id);
    }
    this.players.clear();
  }
}
