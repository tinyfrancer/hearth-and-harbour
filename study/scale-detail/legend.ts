/**
 * Art study (not shipped): the characters the figures are drawn in, shared by
 * all three sizes. A character names a material and a shape group (pixels in
 * one group are lit as one surface), and may push the light a step or pin it.
 */
import type { Legend } from './engine';

export const HERO_LEGEND: Legend = {
  // Hair and face.
  H: { m: 'hair' },
  j: { m: 'hair', o: -1 },
  h: { m: 'hair', o: 1 },
  s: { m: 'skin', g: 'face' },
  y: { m: 'skin', g: 'face', o: -1 },
  z: { m: 'skin', g: 'face', o: 1 },
  Z: { m: 'skin', g: 'face', o: 2 },
  m: { m: 'skin', g: 'face', t: 4 },
  n: { m: 'skin', g: 'face', t: 3 },
  k: { m: 'skin', g: 'neck', o: 1 },
  f: { m: 'skin', g: 'hand' },
  F: { m: 'skin', g: 'hand', o: 1 },
  w: { m: 'eye', t: 1 },
  e: { m: 'eye', t: 4 },
  E: { m: 'eye', t: 2 },
  b: { m: 'hair', t: 5 },
  // Plate: breastplate (a ridge down the middle), pauldrons, knee cops.
  P: { m: 'plate', g: 'breast', o: -0.3 },
  Q: { m: 'plate', g: 'breast', o: 0.7 },
  p: { m: 'plate', g: 'breast', o: -1.3 },
  q: { m: 'plate', g: 'breast', o: 1.7 },
  ':': { m: 'plate', g: 'breast', o: -2.2 },
  A: { m: 'plate', g: 'paul' },
  a: { m: 'plate', g: 'paul', o: -1 },
  B: { m: 'plate', g: 'paul', o: 1.7 },
  K: { m: 'plate', g: 'knee' },
  '^': { m: 'plate', g: 'knee', o: 1.5 },
  W: { m: 'plate', t: 0 },
  // Cloth and leather.
  T: { m: 'teal', g: 'sleeve' },
  t: { m: 'teal', g: 'sleeve', o: 1 },
  U: { m: 'teal', g: 'skirt' },
  u: { m: 'teal', g: 'skirt', o: 1 },
  L: { m: 'leather', g: 'belt' },
  g: { m: 'gold', g: 'buckle' },
  R: { m: 'cloth', g: 'legs' },
  r: { m: 'cloth', g: 'legs', o: 1 },
  O: { m: 'leather', g: 'boot' },
  o: { m: 'leather', g: 'cuff', o: -0.5 },
  S: { m: 'leather', g: 'boot', t: 5 },
  '~': { m: 'leather', g: 'bracer' },
  C: { m: 'crimson', g: 'cloak' },
  c: { m: 'crimson', g: 'cloak', o: -1 },
  D: { m: 'crimson', g: 'cloak', o: 1 },
  // The kite shield: one curved surface, rim, field and cross.
  N: { m: 'plate', g: 'shield', o: 1.2 },
  V: { m: 'blue', g: 'shield' },
  v: { m: 'blue', g: 'shield', o: -1 },
  X: { m: 'gold', g: 'shield', o: -0.3 },
  x: { m: 'gold', g: 'shield', o: 1 },
  // The sword.
  M: { m: 'plate', g: 'blade' },
  '|': { m: 'plate', g: 'blade', o: -1 },
  G: { m: 'gold', g: 'guard' },
  J: { m: 'leather', g: 'grip' },
};

export const legendOf = (extra: Legend = {}): Legend => ({ ...HERO_LEGEND, ...extra });

export const VILLAGER_EXTRA: Legend = {
  l: { m: 'linen', g: 'hood', o: -0.4 },
  i: { m: 'linen', g: 'hood', o: 1 },
  I: { m: 'linen', g: 'hood', o: 2.2 },
  K: { m: 'linen', g: 'cape', o: -0.4 },
  Y: { m: 'linen', g: 'cape', o: 0.8 },
  T: { m: 'linen', g: 'tunic', o: 0.5 },
  t: { m: 'linen', g: 'tunic', o: 1.5 },
  '%': { m: 'linen', g: 'tunic', o: 2 },
  U: { m: 'linen', g: 'skirt', o: 0.5 },
  u: { m: 'linen', g: 'skirt', o: 1.5 },
  A: { m: 'linen', g: 'arm' },
  a: { m: 'linen', g: 'arm', o: 1 },
  R: { m: 'linen', g: 'legs', o: 0.6 },
  r: { m: 'linen', g: 'legs', o: 1.6 },
  L: { m: 'wood', g: 'belt', o: 0.5 },
  O: { m: 'leather', g: 'boot' },
};
