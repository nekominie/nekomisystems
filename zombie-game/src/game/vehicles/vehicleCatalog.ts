import type { VehicleArchetype, VehicleConfig } from './vehicleTypes';

export const MINI_HATCHBACK: VehicleConfig = {
  id: 'mini_hatchback',
  name: 'Mini Hatchback',
  archetype: 'compact',
  mass: 920,
  maxSpeed: 21.0, // ~75.6 km/h
  accelerationForce: 13.0,
  brakingForce: 21.0,
  steerAngle: 0.62,
  offroadTractionMultiplier: 0.45,
  maxDurability: 160,
  fuelCapacity: 35,
  fuelConsumptionRate: 0.0085,
  engineNoiseIdle: 7,
  engineNoiseMax: 20,
  trunkStorageSlots: 6,
  dims: {
    L: 3.65,
    W: 1.65,
    bodyH: 0.68,
    bodyY: 0.30,
    cabL: 1.75,
    cabW: 1.50,
    cabH: 0.65,
    cabZ: -0.05,
  },
  defaultColors: [0xe11d48, 0x0284c7, 0x16a34a, 0xfacc15, 0x475569, 0xf8fafc],
};

export const CLASSIC_SEDAN: VehicleConfig = {
  id: 'classic_sedan',
  name: 'Sedán Clásico',
  archetype: 'sedan',
  mass: 1420,
  maxSpeed: 24.0, // ~86.4 km/h
  accelerationForce: 11.2,
  brakingForce: 18.5,
  steerAngle: 0.55,
  offroadTractionMultiplier: 0.55,
  maxDurability: 230,
  fuelCapacity: 50,
  fuelConsumptionRate: 0.012,
  engineNoiseIdle: 10,
  engineNoiseMax: 28,
  trunkStorageSlots: 10,
  dims: {
    L: 4.45,
    W: 1.82,
    bodyH: 0.72,
    bodyY: 0.32,
    cabL: 2.15,
    cabW: 1.62,
    cabH: 0.62,
    cabZ: -0.15,
  },
  defaultColors: [0x1d4ed8, 0xb91c1c, 0x15803d, 0x334155, 0x111827, 0xd1d5db],
};

export const PICKUP_4X4: VehicleConfig = {
  id: 'pickup_4x4',
  name: 'Pickup 4x4 Sierra',
  archetype: 'offroad',
  mass: 2100,
  maxSpeed: 22.5, // ~81 km/h
  accelerationForce: 12.5,
  brakingForce: 17.5,
  steerAngle: 0.50,
  offroadTractionMultiplier: 0.88,
  maxDurability: 340,
  fuelCapacity: 75,
  fuelConsumptionRate: 0.0165,
  engineNoiseIdle: 13,
  engineNoiseMax: 35,
  trunkStorageSlots: 15,
  dims: {
    L: 5.10,
    W: 2.05,
    bodyH: 0.88,
    bodyY: 0.44,
    cabL: 1.85,
    cabW: 1.85,
    cabH: 0.80,
    cabZ: 0.65,
    bedL: 2.20,
  },
  defaultColors: [0x854d0e, 0x3f6212, 0x1e293b, 0x991b1b, 0x57534e, 0x14532d],
};

export const CARGO_TRUCK: VehicleConfig = {
  id: 'cargo_truck',
  name: 'Camión de Carga',
  archetype: 'truck',
  mass: 3950,
  maxSpeed: 17.0, // ~61.2 km/h
  accelerationForce: 8.0,
  brakingForce: 14.5,
  steerAngle: 0.42,
  offroadTractionMultiplier: 0.68,
  maxDurability: 500,
  fuelCapacity: 120,
  fuelConsumptionRate: 0.024,
  engineNoiseIdle: 16,
  engineNoiseMax: 45,
  trunkStorageSlots: 26,
  dims: {
    L: 6.40,
    W: 2.30,
    bodyH: 1.10,
    bodyY: 0.52,
    cabL: 1.70,
    cabW: 2.15,
    cabH: 1.20,
    cabZ: 1.60,
    bedL: 3.50,
  },
  defaultColors: [0x0369a1, 0xca8a04, 0xb91c1c, 0xf1f5f9, 0x334155],
};

export const SPORT_COUPE_V8: VehicleConfig = {
  id: 'sport_coupe_v8',
  name: 'Coupé V8',
  archetype: 'sport',
  mass: 1280,
  maxSpeed: 29.5, // ~106.2 km/h
  accelerationForce: 17.5,
  brakingForce: 24.0,
  steerAngle: 0.52,
  offroadTractionMultiplier: 0.35,
  maxDurability: 180,
  fuelCapacity: 55,
  fuelConsumptionRate: 0.0195,
  engineNoiseIdle: 15,
  engineNoiseMax: 42,
  trunkStorageSlots: 6,
  dims: {
    L: 4.50,
    W: 1.90,
    bodyH: 0.60,
    bodyY: 0.25,
    cabL: 1.85,
    cabW: 1.58,
    cabH: 0.54,
    cabZ: -0.22,
  },
  defaultColors: [0xdc2626, 0xf59e0b, 0x0284c7, 0x09090b, 0xf8fafc, 0x4f46e5],
};

export const RURAL_AMBULANCE: VehicleConfig = {
  id: 'rural_ambulance',
  name: 'Ambulancia Rural',
  archetype: 'emergency',
  mass: 2450,
  maxSpeed: 22.5, // ~81 km/h
  accelerationForce: 10.8,
  brakingForce: 19.0,
  steerAngle: 0.48,
  offroadTractionMultiplier: 0.72,
  maxDurability: 350,
  fuelCapacity: 80,
  fuelConsumptionRate: 0.0175,
  engineNoiseIdle: 11,
  engineNoiseMax: 36,
  trunkStorageSlots: 18,
  dims: {
    L: 5.35,
    W: 2.10,
    bodyH: 0.95,
    bodyY: 0.40,
    cabL: 3.35,
    cabW: 1.95,
    cabH: 1.05,
    cabZ: 0.25,
    lightBar: true,
  },
  defaultColors: [0xf8fafc],
};

/** Catálogo general con los 6 vehículos base */
export const VEHICLE_CATALOG: VehicleConfig[] = [
  MINI_HATCHBACK,
  CLASSIC_SEDAN,
  PICKUP_4X4,
  CARGO_TRUCK,
  SPORT_COUPE_V8,
  RURAL_AMBULANCE,
];

export const VEHICLE_CONFIG_BY_ID: Record<string, VehicleConfig> = {
  [MINI_HATCHBACK.id]: MINI_HATCHBACK,
  [CLASSIC_SEDAN.id]: CLASSIC_SEDAN,
  [PICKUP_4X4.id]: PICKUP_4X4,
  [CARGO_TRUCK.id]: CARGO_TRUCK,
  [SPORT_COUPE_V8.id]: SPORT_COUPE_V8,
  [RURAL_AMBULANCE.id]: RURAL_AMBULANCE,
};

export const VEHICLE_CONFIG_BY_ARCHETYPE: Record<VehicleArchetype, VehicleConfig> = {
  compact: MINI_HATCHBACK,
  sedan: CLASSIC_SEDAN,
  offroad: PICKUP_4X4,
  truck: CARGO_TRUCK,
  sport: SPORT_COUPE_V8,
  emergency: RURAL_AMBULANCE,
};

export function getVehicleConfig(idOrArchetype: string): VehicleConfig {
  return VEHICLE_CONFIG_BY_ID[idOrArchetype] || (VEHICLE_CONFIG_BY_ARCHETYPE as any)[idOrArchetype] || CLASSIC_SEDAN;
}
