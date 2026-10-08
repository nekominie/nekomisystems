export const WORLD = {
  /** Lado de un chunk en metros. */
  chunkSize: 64,
  /** Radio (en chunks) de chunks cargados alrededor del jugador. */
  viewRadius: 3,
  /** Resolución de la malla del suelo (metros por celda). */
  groundCell: 2,
  /** Radio libre de vegetación/estructuras alrededor del spawn (0,0). */
  spawnClearRadius: 6,

  /** Una región contiene como máximo una ciudad. Debe ser múltiplo de chunkSize. */
  regionSize: 512,
  cityChance: 0.55,
  city: {
    /** Distancia entre ejes de calles (calle + manzana). */
    pitch: 40,
    streetW: 8,
    minBlocks: 3,
    maxBlocks: 6,
  },

  /** Pueblos: una celda de `cell` m contiene como máximo un pueblo. */
  towns: { cell: 256, chance: 0.2, cabinCrateChance: 0.25 },
  /** Carreteras entre ciudades (asfalto, con curvas). */
  highway: { width: 7, step: 6, tollChance: 0.3, carChance: 0.15, carSpacing: 32 },
  /** Senderos de tierra entre campamentos y torres de guardabosques. */
  trail: { range: 320, step: 3 },
  camp: { baseChance: 0.012, forestChance: 0.2, towerChance: 0.55 },
  cars: { cityChance: 0.2, townChance: 0.22, fieldWreckChance: 0.03 },
  /** Zombis por chunk (promedio aprox.): campo ~4, ciudad/pueblo ~24. */
  zombies: { fieldMax: 8, townMin: 14, townExtra: 21 },

  /** Armas en el suelo: probabilidad de que una casa residencial deje una delante de su puerta. */
  drops: { houseChance: 0.12 },

  cabinChance: 0.3,
  /** Probabilidad de que una cabaña tenga una caja de botín dentro. */
  cabinCrateChance: 0.6,

  /** Tamaño de celda del muestreo con jitter para cada tipo de vegetación. */
  treeCell: 4,
  bushCell: 6,
  grassCell: 2,
} as const;
