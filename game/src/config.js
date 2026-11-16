// Emberfall tuning: every number the game balances on, in one place.
// The world is a fixed 1280x720 stage; the page scales it to fit the window.

// Stage and arena ------------------------------------------------------------
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const ARENA = { x: 56, y: 84, w: 1168, h: 580 }; // play field inside the frame

// Player ---------------------------------------------------------------------
export const PLAYER = {
  radius: 15,
  baseHp: 100,
  baseSpeed: 268,
  baseFireRate: 4.2, // shots per second
  baseDamage: 1,
  projectileSpeed: 660,
  projectileRadius: 5,
  invulnSeconds: 0.65, // mercy invulnerability after a hit
  contactKnockback: 260,
};

// Experience -----------------------------------------------------------------
// Sparks needed to go from `level` to `level + 1`.
export function xpForLevel(level) {
  return 6 + (level - 1) * 5;
}

// Enemies --------------------------------------------------------------------
// score: points on a kill. xp: sparks dropped. touch: damage on contact.
export const ENEMIES = {
  shade:   { radius: 16, hp: 3,  speed: 74,  touch: 10, score: 10, xp: 1, color: '#8b7fd4' },
  dart:    { radius: 11, hp: 2,  speed: 128, touch: 8,  score: 15, xp: 1, color: '#4fd8c8' },
  mite:    { radius: 9,  hp: 1,  speed: 96,  touch: 6,  score: 5,  xp: 1, color: '#c792ff' },
  splitter:{ radius: 21, hp: 9,  speed: 58,  touch: 12, score: 30, xp: 3, color: '#e06ba8' },
  bulwark: { radius: 31, hp: 30, speed: 34,  touch: 20, score: 80, xp: 6, color: '#6a5acd' },
};

// Waves ----------------------------------------------------------------------
export const WAVE_SECONDS = 25; // length of one wave
export function spawnInterval(wave) {
  return Math.max(0.34, 1.25 - wave * 0.09);
}
export function enemyHpScale(wave) {
  return wave <= 2 ? 1 : 1 + (wave - 2) * 0.09;
}
// Which kinds may appear from a given wave on.
export function unlockedKinds(wave) {
  const kinds = ['shade', 'shade', 'shade'];
  if (wave >= 2) kinds.push('dart', 'dart');
  if (wave >= 3) kinds.push('splitter');
  if (wave >= 4) kinds.push('bulwark');
  if (wave >= 5) kinds.push('dart', 'splitter');
  return kinds;
}

// Palette --------------------------------------------------------------------
export const COLORS = {
  ink: '#0b0e1d',
  floor: '#12162b',
  floorLine: '#1d2342',
  frame: '#2a3160',
  ember: '#ffb347',
  emberHot: '#ff7847',
  spark: '#ffd76a',
  text: '#f2ead8',
  textDim: '#9aa3c7',
  hp: '#ff5d6c',
  xp: '#ffd76a',
  card: '#1a2040',
  cardEdge: '#3a4478',
};
