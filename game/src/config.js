// NEON VOID — tuning and palette. One place for every number the game plays by,
// so balance lives here and nowhere else.
export const ARENA_W = 1280;
export const ARENA_H = 720;

export const STEP = 1 / 60;
export const BEST_KEY = 'neonvoid.best';

export const PLAYER = {
  radius: 14,
  speed: 430,
  accel: 2600,
  drag: 0.86,
  fireInterval: 0.16,
  bulletSpeed: 760,
  bulletDamage: 1,
  startLives: 3,
  maxLives: 5,
  invulnTime: 2.0,
  shieldTime: 10,
  powerTime: 9,
};

export const ENEMY = {
  drifter: { hp: 1, speed: 170, radius: 16, score: 50, cost: 1 },
  weaver: { hp: 2, speed: 150, radius: 16, score: 100, cost: 2 },
  spitter: { hp: 3, speed: 110, radius: 18, score: 150, cost: 3 },
  asteroid: { hp: 6, speed: 55, radius: 34, score: 80, cost: 2 },
  asteroidSmall: { hp: 2, speed: 95, radius: 16, score: 40, cost: 0 },
};

export const BOSS = {
  radius: 72,
  baseHp: 120,
  hpPerWave: 20,
  score: 2000,
  bulletSpeed: 260,
};

export const POWERUP = {
  dropChance: 0.12,
  fallSpeed: 70,
  radius: 15,
  kinds: ['spread', 'rapid', 'shield', 'life'],
};

export const COLORS = {
  bgTop: '#070716',
  bgBottom: '#0d0a2e',
  player: '#00f0ff',
  playerCore: '#e8ffff',
  bullet: '#8ff7ff',
  enemyBullet: '#ff5da2',
  drifter: '#ff2d95',
  weaver: '#ff9f1c',
  spitter: '#b537f2',
  asteroid: '#9aa5c4',
  asteroidCrack: '#ffb347',
  boss: '#ff2244',
  bossCore: '#ff8095',
  spread: '#39ff88',
  rapid: '#ffe14d',
  shield: '#4da6ff',
  life: '#ff6ec7',
  hud: '#e8f6ff',
  hudDim: '#7d8db0',
  gold: '#ffd166',
};

export const SCORE = {
  waveClearBonus: 250,
  killComboStep: 4,
  maxMultiplier: 5,
};
