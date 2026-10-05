/**
 * Placeholder colours for the scenes, named once. Each is a step on one of the
 * style guide's base ramps; they stand in until the scenes draw with the art
 * lane's palette (with its day and dusk) and real tiles.
 */
export const SCENE_COLOURS = {
  grass1: '#93d667',
  grass2: '#74c256',
  grass3: '#58a548',
  cobble1: '#c2b9a6',
  cobble2: '#9d9484',
  cobble3: '#7a7268',
  stone1: '#b9c0cc',
  stone2: '#8b93a6',
  stone3: '#626a80',
  sea1: '#6fd6ee',
  sea2: '#3fb2e2',
  sea3: '#2a86c9',
  wood1: '#d59a5a',
  wood2: '#b0703e',
  wood3: '#7a4a2c',
  wood4: '#52301e',
  pine1: '#4a9a62',
  pine2: '#2f744e',
  pine3: '#1e523c',
  red1: '#d85a50',
  red2: '#b8323c',
  skin1: '#f8cda4',
  gold1: '#ffd34d',
  navy1: '#232a45',
  navy2: '#38426a',
  ink: '#1a1224',
} as const;

export type SceneColour = keyof typeof SCENE_COLOURS;
