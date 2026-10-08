import type { VehicleBiome, VehicleArchetype, VehicleLockState } from './vehicleTypes';
import { VEHICLE_CONFIG_BY_ARCHETYPE } from './vehicleCatalog';
import { VehicleInstance } from './vehicleInstance';

interface BiomeWeight {
  archetype: VehicleArchetype;
  weight: number;
}

/** Ponderaciones por bioma especificadas en los requerimientos */
const BIOME_WEIGHTS: Record<VehicleBiome, BiomeWeight[]> = {
  city: [
    { archetype: 'sedan', weight: 40 },
    { archetype: 'compact', weight: 35 },
    { archetype: 'truck', weight: 15 },
    { archetype: 'sport', weight: 7 },
    { archetype: 'emergency', weight: 3 },
  ],
  town: [
    { archetype: 'sedan', weight: 40 },
    { archetype: 'compact', weight: 35 },
    { archetype: 'truck', weight: 15 },
    { archetype: 'sport', weight: 7 },
    { archetype: 'emergency', weight: 3 },
  ],
  countryside: [
    { archetype: 'offroad', weight: 60 },
    { archetype: 'truck', weight: 25 },
    { archetype: 'sedan', weight: 15 },
  ],
  camp: [
    { archetype: 'offroad', weight: 60 },
    { archetype: 'truck', weight: 25 },
    { archetype: 'sedan', weight: 15 },
  ],
  cabin: [
    { archetype: 'offroad', weight: 60 },
    { archetype: 'truck', weight: 25 },
    { archetype: 'sedan', weight: 15 },
  ],
};

/**
 * Selecciona un arquetipo ponderado según el bioma donde se genera el vehículo.
 */
export function rollArchetypeForBiome(biome: VehicleBiome, roll: number): VehicleArchetype {
  const table = BIOME_WEIGHTS[biome] ?? BIOME_WEIGHTS.city;
  const total = table.reduce((sum, item) => sum + item.weight, 0);
  let threshold = roll * total;

  for (const item of table) {
    threshold -= item.weight;
    if (threshold <= 0) {
      return item.archetype;
    }
  }

  return table[0].archetype;
}

/**
 * Selecciona el estado de bloqueo inicial:
 * 25% 'unlocked', 45% 'locked', 30% 'broken'
 */
export function rollLockState(roll: number): VehicleLockState {
  if (roll < 0.25) return 'unlocked';
  if (roll < 0.70) return 'locked';
  return 'broken';
}

/**
 * Calcula el combustible inicial:
 * 20% probabilidad de 0 L; 80% restante valor aleatorio entre 0 y 0.75 * fuelCapacity.
 */
export function rollInitialFuel(fuelCapacity: number, zeroRoll: number, fuelRoll: number): number {
  if (zeroRoll < 0.20) {
    return 0;
  }
  return Number((fuelRoll * 0.75 * fuelCapacity).toFixed(1));
}

/**
 * Función principal de spawn procedural de vehículos según bioma y posición.
 * @param biome Bioma de origen ('city', 'town', 'countryside', 'camp', 'cabin')
 * @param position Coordenadas de mundo (x, z) y orientación heading opcional
 * @param rng Generador de números aleatorios 0..1 (opcional, usa Math.random por defecto)
 * @returns Instancia completamente configurada de VehicleInstance
 */
export function spawnVehicle(
  biome: VehicleBiome,
  position: { x: number; z: number; heading?: number },
  rng: () => number = Math.random,
): VehicleInstance {
  // 1. Selección ponderada de arquetipo y configuración
  const archetype = rollArchetypeForBiome(biome, rng());
  const config = VEHICLE_CONFIG_BY_ARCHETYPE[archetype];

  // 2. Estado de bloqueo
  const lockState = rollLockState(rng());

  // 3. Durabilidad inicial
  let initialDurability = 0;
  if (lockState !== 'broken') {
    // Vehículo operativo: entre 40% y 100% de durabilidad inicial
    initialDurability = Math.round(config.maxDurability * (0.40 + 0.60 * rng()));
  }

  // 4. Combustible inicial
  const initialFuel = rollInitialFuel(config.fuelCapacity, rng(), rng());

  // 5. Color aleatorio de la paleta del modelo
  const color = config.defaultColors[Math.floor(rng() * config.defaultColors.length)];

  // 6. Instanciación y retorno
  return new VehicleInstance(
    config,
    position,
    {
      durability: initialDurability,
      fuel: initialFuel,
      lockState,
      color,
    },
  );
}
