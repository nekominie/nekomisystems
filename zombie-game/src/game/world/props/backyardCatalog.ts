/**
 * Catálogo de artículos de patio (traspatio/jardín) para casas residenciales.
 * Solo datos: la geometría procedural vive en backyardProps.ts y la colocación
 * lógica (reglas wall_attached / corner / open_ground / anywhere) en backyard.ts.
 */

export interface BackyardPropConfig {
  id: string;
  name: string;
  category: 'gardening' | 'furniture' | 'utility' | 'recreation';
  footprint: { width: number; depth: number; height: number }; // En unidades Three.js (metros aproximados)
  placementRule: 'wall_attached' | 'corner' | 'open_ground' | 'anywhere';
  blocksMovement: boolean;
  coverHeight: 'none' | 'low' | 'medium' | 'high'; // low: disparar por encima agachado, high: bloqueo de línea de visión
  spawnWeight: number; // Probabilidad relativa de aparición (1 - 10)
  geometryType: 'procedural_primitives' | 'instanced_mesh' | 'gltf_model';
}

export const BACKYARD_PROPS_CATALOG: BackyardPropConfig[] = [
  // ==========================================
  // 1. TALLER Y JARDINERÍA
  // ==========================================
  {
    id: 'prop_lawnmower',
    name: 'Cortacésped a gasolina',
    category: 'gardening',
    footprint: { width: 0.8, depth: 1.2, height: 0.9 },
    placementRule: 'corner',
    blocksMovement: true,
    coverHeight: 'low',
    spawnWeight: 5,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_wheelbarrow',
    name: 'Carretilla de obra',
    category: 'gardening',
    footprint: { width: 0.7, depth: 1.4, height: 0.8 },
    placementRule: 'anywhere',
    blocksMovement: true,
    coverHeight: 'low',
    spawnWeight: 6,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_garden_hose_wall',
    name: 'Manguera enrollada de pared',
    category: 'gardening',
    footprint: { width: 0.5, depth: 0.3, height: 0.6 },
    placementRule: 'wall_attached',
    blocksMovement: false,
    coverHeight: 'none',
    spawnWeight: 7,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_stacked_flowerpots',
    name: 'Pila de macetas de barro',
    category: 'gardening',
    footprint: { width: 0.6, depth: 0.6, height: 0.7 },
    placementRule: 'wall_attached',
    blocksMovement: true,
    coverHeight: 'low',
    spawnWeight: 8,
    geometryType: 'instanced_mesh',
  },

  // ==========================================
  // 2. MOBILIARIO Y DESCANSO
  // ==========================================
  {
    id: 'prop_bbq_grill',
    name: 'Parrilla asador de carbón',
    category: 'furniture',
    footprint: { width: 0.9, depth: 0.7, height: 1.1 },
    placementRule: 'open_ground',
    blocksMovement: true,
    coverHeight: 'medium',
    spawnWeight: 6,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_picnic_table',
    name: 'Mesa de picnic de madera',
    category: 'furniture',
    footprint: { width: 1.8, depth: 1.5, height: 0.85 },
    placementRule: 'open_ground',
    blocksMovement: true,
    coverHeight: 'medium',
    spawnWeight: 4,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_folding_chair',
    name: 'Silla plegable de jardín',
    category: 'furniture',
    footprint: { width: 0.6, depth: 0.6, height: 0.8 },
    placementRule: 'anywhere',
    blocksMovement: true,
    coverHeight: 'low',
    spawnWeight: 7,
    geometryType: 'instanced_mesh',
  },
  {
    id: 'prop_patio_umbrella',
    name: 'Sombrilla de jardín',
    category: 'furniture',
    footprint: { width: 2.2, depth: 2.2, height: 2.4 },
    placementRule: 'open_ground',
    blocksMovement: true, // El poste central bloquea; el dosel bloquea visión cenital
    coverHeight: 'high',
    spawnWeight: 4,
    geometryType: 'procedural_primitives',
  },

  // ==========================================
  // 3. UTILIDADES Y RESIDUOS
  // ==========================================
  {
    id: 'prop_garden_shed',
    name: 'Cobertizo de lámina exterior',
    category: 'utility',
    footprint: { width: 2.4, depth: 2.0, height: 2.2 },
    placementRule: 'corner',
    blocksMovement: true,
    coverHeight: 'high',
    spawnWeight: 3,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_trash_bin_wheelie',
    name: 'Contenedor de basura con ruedas',
    category: 'utility',
    footprint: { width: 0.6, depth: 0.7, height: 1.1 },
    placementRule: 'wall_attached',
    blocksMovement: true,
    coverHeight: 'medium',
    spawnWeight: 8,
    geometryType: 'instanced_mesh',
  },
  {
    id: 'prop_firewood_stack',
    name: 'Pila de leña cortada',
    category: 'utility',
    footprint: { width: 1.6, depth: 0.6, height: 1.0 },
    placementRule: 'wall_attached',
    blocksMovement: true,
    coverHeight: 'medium',
    spawnWeight: 6,
    geometryType: 'instanced_mesh',
  },
  {
    id: 'prop_ac_compressor_unit',
    name: 'Unidad exterior de aire acondicionado',
    category: 'utility',
    footprint: { width: 0.9, depth: 0.4, height: 0.8 },
    placementRule: 'wall_attached',
    blocksMovement: true,
    coverHeight: 'low',
    spawnWeight: 7,
    geometryType: 'procedural_primitives',
  },

  // ==========================================
  // 4. RECREACIÓN Y VARIEDAD
  // ==========================================
  {
    id: 'prop_backyard_trampoline',
    name: 'Trampolín redondo con red',
    category: 'recreation',
    footprint: { width: 3.0, depth: 3.0, height: 2.0 },
    placementRule: 'open_ground',
    blocksMovement: true,
    coverHeight: 'high',
    spawnWeight: 2,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_dog_house',
    name: 'Casita de perro de madera',
    category: 'recreation',
    footprint: { width: 1.0, depth: 1.1, height: 0.95 },
    placementRule: 'wall_attached',
    blocksMovement: true,
    coverHeight: 'low',
    spawnWeight: 5,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_inflatable_kiddie_pool',
    name: 'Alberca inflable infantil',
    category: 'recreation',
    footprint: { width: 1.8, depth: 1.8, height: 0.4 },
    placementRule: 'open_ground',
    blocksMovement: false, // Ralentiza movimiento en código
    coverHeight: 'none',
    spawnWeight: 4,
    geometryType: 'procedural_primitives',
  },
  {
    id: 'prop_target_dummy_scarecrow',
    name: 'Espantapájaros / Diana de tiro',
    category: 'recreation',
    footprint: { width: 0.7, depth: 0.5, height: 1.8 },
    placementRule: 'open_ground',
    blocksMovement: true,
    coverHeight: 'medium',
    spawnWeight: 3,
    geometryType: 'procedural_primitives',
  },
];
