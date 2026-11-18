// Waves: what shows up, and when. A wave has a budget of enemy "cost" spent on a
// shuffled queue; the queue trickles in over time. Every 5th wave is a boss wave:
// one boss, plus a slow trickle of drifters so the player never waits in silence.
import { spawnEnemy, spawnBoss } from './entities.js';

const COST = { drifter: 1, weaver: 2, spitter: 3, asteroid: 2 };

export function createWaveState() {
  return {
    wave: 0,
    queue: [],
    spawnTimer: 0,
    spawnInterval: 1.1,
    bossActive: false,
    boss: null,
    betweenWaves: 0,
    banner: '',
    bannerTimer: 0,
  };
}

function buildQueue(wave, rng) {
  const budget = 6 + wave * 3;
  const kinds = ['drifter', 'weaver', 'spitter', 'asteroid'];
  const weights = [0.42, 0.26, 0.16, 0.16];
  const queue = [];
  let spent = 0;
  while (spent < budget) {
    let roll = rng.next();
    let kind = 'drifter';
    for (let i = 0; i < kinds.length; i += 1) {
      if (roll < weights[i]) {
        kind = kinds[i];
        break;
      }
      roll -= weights[i];
    }
    queue.push(kind);
    spent += COST[kind];
  }
  // Shuffle so the wave never opens the same way twice.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export function startWave(w, wave, rng, onBoss) {
  w.wave = wave;
  w.betweenWaves = 0;
  w.spawnInterval = Math.max(0.45, 1.15 - wave * 0.05);
  w.spawnTimer = 0.6;
  if (wave % 5 === 0) {
    w.queue = ['drifter', 'drifter', 'drifter', 'drifter'];
    w.boss = spawnBoss(wave, rng);
    w.bossActive = true;
    w.banner = `WAVE ${wave} — VOID LEVIATHAN`;
    if (onBoss) onBoss();
  } else {
    w.queue = buildQueue(wave, rng);
    w.boss = null;
    w.bossActive = false;
    w.banner = `WAVE ${wave}`;
  }
  w.bannerTimer = 2.2;
}

export function updateWaves(w, enemies, rng, dt) {
  w.bannerTimer = Math.max(0, w.bannerTimer - dt);
  if (w.queue.length > 0) {
    w.spawnTimer -= dt;
    if (w.spawnTimer <= 0) {
      w.spawnTimer = w.spawnInterval * rng.range(0.7, 1.3);
      const kind = w.queue.shift();
      enemies.push(spawnEnemy(kind, rng, w.wave));
    }
  }
}

export function waveCleared(w, enemies) {
  return w.queue.length === 0 && enemies.length === 0 && !w.bossActive;
}
