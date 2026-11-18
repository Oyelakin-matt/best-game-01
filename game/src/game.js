// NEON VOID — the game itself: one state object, one update step, and the rules
// that turn flying and shooting into a score. Screens: title, playing, paused,
// over. The renderer only paints this state; it never decides anything.
import { ARENA_W, ARENA_H, PLAYER, SCORE, POWERUP } from './config.js';
import { createRandom } from './random.js';
import {
  createPlayer, updatePlayer, playerFire, updateEnemy, enemyFire,
  updateBullet, offArena, spawnPowerup, updatePowerup, burst, updateParticles,
  spawnAsteroidSmall,
} from './entities.js';
import { createWaveState, startWave, updateWaves, waveCleared } from './waves.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createGame(seed) {
  const rng = createRandom(seed);
  return {
    rng,
    seed,
    screen: SCREEN_TITLE,
    time: 0,
    score: 0,
    best: 0,
    kills: 0,
    combo: 0,
    multiplier: 1,
    wave: 0,
    player: createPlayer(),
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    powerups: [],
    waves: createWaveState(),
    shake: 0,
    flash: 0,
    banner: '',
    bannerTimer: 0,
    overStats: null,
    newBest: false,
    muted: false,
    demoTimer: 0,
  };
}

export function startGame(g) {
  g.screen = SCREEN_PLAY;
  g.time = 0;
  g.score = 0;
  g.kills = 0;
  g.combo = 0;
  g.multiplier = 1;
  g.player = createPlayer();
  g.enemies = [];
  g.bullets = [];
  g.enemyBullets = [];
  g.particles = [];
  g.powerups = [];
  g.waves = createWaveState();
  g.shake = 0;
  g.flash = 0;
  g.overStats = null;
  g.newBest = false;
  startWave(g.waves, 1, g.rng, null);
}

function addScore(g, base) {
  const gained = base * g.multiplier;
  g.score += gained;
  return gained;
}

function killEnemy(g, e, audio) {
  g.kills += 1;
  g.combo += 1;
  g.multiplier = Math.min(1 + Math.floor(g.combo / SCORE.killComboStep), SCORE.maxMultiplier);
  addScore(g, e.score);
  burst(g.particles, e.x, e.y, e.kind === 'boss' ? '#ff2244' : '#ff9f1c', e.kind === 'boss' ? 60 : 22, e.kind === 'boss' ? 420 : 260, 0.8);
  if (audio) audio.explosion(e.kind === 'boss' || e.kind === 'asteroid');
  if (e.kind === 'asteroid') {
    g.enemies.push(spawnAsteroidSmall(e, g.rng));
    g.enemies.push(spawnAsteroidSmall(e, g.rng));
  }
  if (e.kind === 'boss') {
    g.waves.bossActive = false;
    g.waves.boss = null;
    g.shake = 1;
    g.flash = 0.5;
  }
  if (g.rng.next() < POWERUP.dropChance) {
    g.powerups.push(spawnPowerup(e.x, e.y, g.rng));
  }
}

function damagePlayer(g, audio) {
  const p = g.player;
  if (p.invuln > 0 || !p.alive) return;
  if (p.shield > 0) {
    p.shield = 0;
    p.invuln = 1.2;
    burst(g.particles, p.x, p.y, '#4da6ff', 26, 300, 0.6);
    if (audio) audio.hit();
    return;
  }
  p.lives -= 1;
  p.invuln = PLAYER.invulnTime;
  g.combo = 0;
  g.multiplier = 1;
  g.shake = 0.8;
  burst(g.particles, p.x, p.y, '#00f0ff', 40, 380, 0.9);
  if (audio) audio.hit();
  if (p.lives <= 0) {
    p.alive = false;
    burst(g.particles, p.x, p.y, '#ffffff', 70, 460, 1.2);
    g.shake = 1;
    endGame(g, audio);
  }
}

function endGame(g, audio) {
  g.screen = SCREEN_OVER;
  g.overStats = { score: g.score, wave: g.wave, kills: g.kills, best: Math.max(g.best, g.score) };
  g.newBest = g.score > g.best && g.score > 0;
  if (g.newBest) g.best = g.score;
  if (audio) audio.gameOver();
}

function applyPowerup(g, kind, audio) {
  const p = g.player;
  if (kind === 'spread') p.spread = PLAYER.powerTime;
  if (kind === 'rapid') p.rapid = PLAYER.powerTime;
  if (kind === 'shield') p.shield = PLAYER.shieldTime;
  if (kind === 'life') p.lives = Math.min(PLAYER.maxLives, p.lives + 1);
  if (audio) audio.powerup();
}

function collide(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

export function updateGame(g, input, audio, dt) {
  if (g.screen === SCREEN_TITLE) {
    g.time += dt;
    g.demoTimer += dt;
    updateParticles(g.particles, dt);
    if (g.demoTimer > 2.5) {
      g.demoTimer = 0;
      const kinds = ['drifter', 'weaver', 'asteroid'];
      const kind = kinds[Math.floor(g.rng.next() * kinds.length)];
      const e = { kind, x: g.rng.range(80, ARENA_W - 80), y: -30, vx: 0, vy: 60, radius: 16, hp: 1, maxHp: 1, speed: 60, t: 0, score: 0, fireTimer: 0, angle: Math.PI / 2, spin: 0.4, baseX: 0, phase: 0, verts: [1, 1, 1, 1, 1, 1, 1, 1, 1] };
      g.enemies.push(e);
    }
    for (let i = g.enemies.length - 1; i >= 0; i -= 1) {
      const e = g.enemies[i];
      e.y += 60 * dt;
      e.angle += (e.spin || 0) * dt;
      if (e.y > ARENA_H + 60) g.enemies.splice(i, 1);
    }
    if (input.confirmPressed()) {
      if (audio) audio.unlock();
      startGame(g);
    }
    return;
  }

  if (g.screen === SCREEN_OVER) {
    g.time += dt;
    updateParticles(g.particles, dt);
    if (input.confirmPressed() || input.restartPressed()) {
      if (audio) audio.unlock();
      startGame(g);
    }
    return;
  }

  if (g.screen === SCREEN_PAUSED) {
    if (input.pausePressed() || input.confirmPressed()) g.screen = SCREEN_PLAY;
    return;
  }

  // SCREEN_PLAY
  g.time += dt;
  const p = g.player;

  if (input.pausePressed()) {
    g.screen = SCREEN_PAUSED;
    return;
  }
  if (input.mutePressed() && audio) {
    g.muted = audio.toggleMute();
  }

  updatePlayer(p, input.move(), input.mouse, dt);
  if (input.firing() && p.alive) {
    const shots = playerFire(p);
    if (shots.length > 0) {
      g.bullets.push(...shots);
      if (audio) audio.shoot();
      p.trailTimer = 0;
    }
  }

  // Engine trail.
  p.trailTimer -= dt;
  if (p.alive && (input.move().x !== 0 || input.move().y !== 0) && p.trailTimer <= 0) {
    p.trailTimer = 0.03;
    g.particles.push({
      x: p.x - Math.cos(p.angle) * p.radius, y: p.y - Math.sin(p.angle) * p.radius,
      vx: -Math.cos(p.angle) * 60 + (Math.random() - 0.5) * 30,
      vy: -Math.sin(p.angle) * 60 + (Math.random() - 0.5) * 30,
      life: 0.3, maxLife: 0.3, size: 2, color: '#00f0ff',
    });
  }

  updateWaves(g.waves, g.enemies, g.rng, dt);
  g.wave = g.waves.wave;

  for (const e of g.enemies) {
    updateEnemy(e, p, dt, g.rng);
    const shots = enemyFire(e, p);
    if (shots.length > 0) {
      g.enemyBullets.push(...shots);
      if (audio) audio.enemyShoot();
    }
  }

  for (let i = g.bullets.length - 1; i >= 0; i -= 1) {
    const b = g.bullets[i];
    updateBullet(b, dt);
    if (b.life <= 0 || offArena(b, 40)) g.bullets.splice(i, 1);
  }
  for (let i = g.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = g.enemyBullets[i];
    updateBullet(b, dt);
    if (b.life <= 0 || offArena(b, 40)) g.enemyBullets.splice(i, 1);
  }

  // Player bullets vs enemies.
  for (let i = g.bullets.length - 1; i >= 0; i -= 1) {
    const b = g.bullets[i];
    let hit = false;
    for (let j = g.enemies.length - 1; j >= 0; j -= 1) {
      const e = g.enemies[j];
      if (collide(b, e)) {
        hit = true;
        e.hp -= b.damage;
        burst(g.particles, b.x, b.y, '#ffe14d', 5, 140, 0.3);
        if (e.hp <= 0) {
          killEnemy(g, e, audio);
          g.enemies.splice(j, 1);
        }
        break;
      }
    }
    if (hit) g.bullets.splice(i, 1);
  }

  // Enemy bullets vs player.
  if (p.alive) {
    for (let i = g.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = g.enemyBullets[i];
      if (collide(b, p)) {
        g.enemyBullets.splice(i, 1);
        damagePlayer(g, audio);
        if (g.screen !== SCREEN_PLAY) return;
        break;
      }
    }
  }

  // Enemies vs player (ramming).
  if (p.alive) {
    for (let j = g.enemies.length - 1; j >= 0; j -= 1) {
      const e = g.enemies[j];
      if (collide(e, p)) {
        if (e.kind !== 'boss') {
          e.hp = 0;
          killEnemy(g, e, audio);
          g.enemies.splice(j, 1);
        }
        damagePlayer(g, audio);
        if (g.screen !== SCREEN_PLAY) return;
        break;
      }
    }
  }

  // Power-ups.
  for (let i = g.powerups.length - 1; i >= 0; i -= 1) {
    const pu = g.powerups[i];
    updatePowerup(pu, dt);
    if (pu.y > ARENA_H + 30) {
      g.powerups.splice(i, 1);
      continue;
    }
    if (p.alive && collide(pu, p)) {
      applyPowerup(g, pu.kind, audio);
      burst(g.particles, pu.x, pu.y, '#39ff88', 14, 200, 0.5);
      g.powerups.splice(i, 1);
    }
  }

  // Enemies that drifted off the bottom come back as nothing: remove them.
  for (let i = g.enemies.length - 1; i >= 0; i -= 1) {
    const e = g.enemies[i];
    if (e.y > ARENA_H + 90 || e.x < -120 || e.x > ARENA_W + 120) {
      g.enemies.splice(i, 1);
    }
  }

  // Wave clear.
  if (waveCleared(g.waves, g.enemies)) {
    const bonus = SCORE.waveClearBonus * g.waves.wave;
    g.score += bonus;
    g.banner = `WAVE ${g.waves.wave} CLEAR  +${bonus}`;
    g.bannerTimer = 2.2;
    if (audio) audio.waveClear();
    startWave(g.waves, g.waves.wave + 1, g.rng, audio ? () => audio.bossAlarm() : null);
  }

  if (g.waves.bannerTimer > 0) {
    g.banner = g.waves.banner;
    g.bannerTimer = g.waves.bannerTimer;
  } else if (g.bannerTimer > 0) {
    g.bannerTimer -= dt;
    if (g.bannerTimer <= 0) g.banner = '';
  }

  updateParticles(g.particles, dt);
  g.shake = Math.max(0, g.shake - dt * 1.6);
  g.flash = Math.max(0, g.flash - dt * 1.4);
}
