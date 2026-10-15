import type { ZombieSyncDto } from './networkTypes';

/** Identidad estricta y versiones monotónicas; sin búsqueda por proximidad. */
export class ZombieReplicaBook {
  readonly states = new Map<string, ZombieSyncDto>();
  private readonly predicted = new Set<string>();
  private readonly pendingByZombie = new Map<string, string>();

  accept(state: ZombieSyncDto): boolean {
    if (!state.id || !Number.isFinite(state.version) ||
        ![state.x, state.z, state.rot, state.health].every(Number.isFinite)) return false;
    const old = this.states.get(state.id);
    if (old && (state.version! <= old.version! ||
        (old.dead && !state.dead) || (old.removed && !state.removed))) return false;
    this.states.set(state.id, state);
    return true;
  }

  predict(eventId: string, zombieId = '') {
    this.predicted.add(eventId);
    this.pendingByZombie.set(eventId, zombieId);
    if (this.predicted.size > 2048) {
      const oldest = this.predicted.values().next().value!;
      this.predicted.delete(oldest);
      this.pendingByZombie.delete(oldest);
    }
  }

  wasPredicted(eventId?: string): boolean {
    if (!eventId) return false;
    this.pendingByZombie.delete(eventId);
    return this.predicted.delete(eventId);
  }

  hasPendingFor(zombieId: string): boolean {
    for (const id of this.pendingByZombie.values()) if (id === zombieId) return true;
    return false;
  }

  clear() {
    this.states.clear();
    this.predicted.clear();
    this.pendingByZombie.clear();
  }
}
