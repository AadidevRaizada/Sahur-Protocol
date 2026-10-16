// Shared palette. Source: Sahur_Protocol.html CSS vars, ENEMY_TYPES, BOSSES and BIOMES.
export const PAL = {
  // game UI
  ink: '#07090f', panel: '#10141f', line: '#232a3d',
  real: '#ffb547', wood: '#b0743a', glitch: '#ff3df0', cyan: '#35e8ff',
  text: '#e8e4d8', dim: '#8b8fa3', danger: '#ff4d5e',
  // Sahur
  woodLight: '#e09a52', woodMid: '#b0743a', woodDark: '#6b3d1a', woodGrain: '#8a5326',
  // the player blob
  blob: '#e8e4d8', blobShadow: '#b9b3a3', blobOutline: '#07090f',
  // enemies
  slopling: '#ff3df0', drone: '#35e8ff', wraith: '#c07bff', hand: '#b0a4ff', yesman: '#3dff9d', golem: '#ffb547',
  // bosses
  echo: '#ff3df0', scraper: '#c07bff', valuation: '#35e8ff',
  bubble: ['#ffffff', '#c8f4ff', '#ffb3f2', '#8f7bff'] as const,
  // light moods
  phoneBlue: '#3a6dff', phoneBlueDeep: '#0d1a4a', sirenRed: '#ff2a3d', fire: '#ff8a2a', morning: '#f3ead8',
  // biomes
  forestBg: '#0b1410', forestAccent: '#3dff9d',
  wastesBg: '#12100b', wastesAccent: '#ffb547',
  boardBg: '#0c0f1a', boardAccent: '#35e8ff',
  core: '#f7f5ff',
} as const;
