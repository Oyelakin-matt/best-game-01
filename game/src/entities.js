// Everything that flies, shoots, explodes or gets picked up. Entities are plain
// objects; the factories below build them and the update functions move them.
// The game owns the lists; this file owns what one of each thing is and does.
import { ARENA_W, ARENA_H, PLAYER, ENEMY, BOSS, POWERUP, COLORS } from './config.js';

export function createPlayer() {
  return {
    x: ARENA_W / 2,
    y: ARENA_H - 90,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    fireTimer: 0,
    lives: PLAYER.startLives,
    invuln: 0,
    shield: 0,
    spread: 0,
    rapid: 0,
    alive: true,
    trailTimer: 0,
  };
}

export function updatePlayer(p, move, aim, dt) {
  p.vx += move.x * PLAYER.accel * dt;
  p.vy += move.y * PLAYER.accel * dt;
  p.vx *= Math.pow(PLAYER.drag, dt * 60);
  p.vy *= Math.pow(PLAYER.drag, dt * 60);
  const speed = Math.hypot(p.vx, p.vy);
  const max = PLAYER.speed;
  if (speed > max) {
    p.vx = (p.vx / speed) * max;
    p.vy = (p.vy / speed) * max;
  }
  p.x = Math.min(ARENA_W - p.radius, Math.max(p.radius, p.x + p.vx * dt));
  p.y = Math.min(ARENA_H - p.radius, Math.max(p.radius, p.y + p.vy * dt));
  const target = Math.atan2(aim.y - p.y, aim.x - p.x);
  let diff = target - p.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  p.angle += diff * Math.min(1, dt * 18);
  p.fireTimer -= dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.shield = Math.max(0, p.shield - dt);
  p.spread = Math.max(0, p.spread - dt);
  p.rapid = Math.max(0, p.rapid - dt);
}

export function playerFire(p) {
  const interval = p.rapid > 0 ? PLAYER.fireInterval / 2 : PLAYER.fireInterval;
  if (p.fireTimer > 0) return [];
  p.fireTimer = interval;
  const shots = [];
  const angles = p.spread > 0 ? [-0.21, 0, 0.21] : [0];
  for (const off of angles) {
    const a = p.angle + off;
    shots.push({
      x: p.x + Math.cos(a) * (p.radius + 6),
      y: p.y + Math.sin(a) * (p.radius + 6),
      vx: Math.cos(a) * PLAYER.bulletSpeed,
      vy: Math.sin(a) * PLAYER.bulletSpeed,
      radius: 4,
      damage: PLAYER.bulletDamage,
      friendly: true,
      life: 1.2,
    });
  }
  return shots;
}

export function spawnEnemy(kind, rng, wave) {
  const x = rng.range(60, ARENA_W - 60);
  const hpScale = 1 + Math.floor((wave - 1) / 4);
  if (kind === 'drifter') {
    return {
      kind, x, y: -30, vx: 0, vy: 0, radius: ENEMY.drifter.radius,
      hp: ENEMY.drifter.hp * hpScale, maxHp: ENEMY.drifter.hp * hpScale,
      speed: rng.range(150, 200) + wave * 4, t: rng.range(0, 6), score: ENEMY.drifter.score,
      fireTimer: 0, angle: Math.PI / 2, spin: 0,
    };
  }
  if (kind === 'weaver') {
    return {
      kind, x, y: -30, vx: 0, vy: 0, radius: ENEMY.weaver.radius,
      hp: ENEMY.weaver.hp * hpScale, maxHp: ENEMY.weaver.hp * hpScale,
      speed: rng.range(130, 170) + wave * 3, t: rng.range(0, 6), score: ENEMY.weaver.score,
      fireTimer: 0, angle: Math.PI / 2, spin: 0, baseX: x, phase: rng.range(0, Math.PI * 2),
    };
  }
  if (kind === 'spitter') {
    return {
      kind, x, y: -30, vx: 0, vy: 0, radius: ENEMY.spitter.radius,
      hp: ENEMY.spitter.hp * hpScale, maxHp: ENEMY.spitter.hp * hpScale,
      speed: ENEMY.spitter.speed, t: 0, score: ENEMY.spitter.score,
      fireTimer: rng.range(1, 2), angle: Math.PI / 2, spin: 0,
      holdY: rng.range(90, 170), dir: rng.pick([-1, 1]),
    };
  }
  // asteroid
  return {
    kind, x, y: -40, vx: rng.range(-30, 30), vy: ENEMY.asteroid.speed,
    radius: ENEMY.asteroid.radius, hp: ENEMY.asteroid.hp * hpScale,
    maxHp: ENEMY.asteroid.hp * hpScale, speed: ENEMY.asteroid.speed, t: 0,
    score: ENEMY.asteroid.score, fireTimer: 0, angle: rng.range(0, Math.PI * 2),
    spin: rng.range(-1.2, 1.2), verts: Array.from({ length: 9 }, () => rng.range(0.78, 1.18)),
  };
}

export function spawnAsteroidSmall(parent, rng) {
  return {
    kind: 'asteroidSmall', x: parent.x, y: parent.y,
    vx: rng.range(-90, 90), vy: rng.range(40, 110), radius: ENEMY.asteroidSmall.radius,
    hp: ENEMY.asteroidSmall.hp, maxHp: ENEMY.asteroidSmall.hp, speed: 0, t: 0,
    score: ENEMY.asteroidSmall.score, fireTimer: 0, angle: rng.range(0, Math.PI * 2),
    spin: rng.range(-2, 2), verts: Array.from({ length: 8 }, () => rng.range(0.8, 1.15)),
  };
}

export function spawnBoss(wave, rng) {
  const hp = BOSS.baseHp + BOSS.hpPerWave * wave;
  return {
    kind: 'boss', x: ARENA_W / 2, y: -90, vx: 0, vy: 0, radius: BOSS.radius,
    hp, maxHp: hp, speed: 90, t: 0, score: BOSS.score, fireTimer: 2,
    angle: Math.PI / 2, spin: 0, mode: 0, modeTimer: 4, dir: 1,
  };
}

export function updateEnemy(e, player, dt, rng) {
  e.t += dt;
  e.fireTimer -= dt;
  if (e.kind === 'drifter') {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    e.vx = Math.cos(a) * e.speed;
    e.vy = Math.sin(a) * e.speed;
    e.angle = a;
  } else if (e.kind === 'weaver') {
    e.vy = e.speed;
    e.x = e.baseX + Math.sin(e.t * 2.4 + e.phase) * 110;
    e.angle = Math.PI / 2 + Math.cos(e.t * 2.4 + e.phase) * 0.5;
  } else if (e.kind === 'spitter') {
    if (e.y < e.holdY) {
      e.vy = e.speed;
    } else {
      e.vy = 0;
      e.x += e.dir * 70 * dt;
      if (e.x < 50 || e.x > ARENA_W - 50) e.dir *= -1;
    }
    e.angle = Math.PI / 2;
  } else if (e.kind === 'boss') {
    e.modeTimer -= dt;
    if (e.modeTimer <= 0) {
      e.mode = (e.mode + 1) % 3;
      e.modeTimer = e.mode === 0 ? 4 : 3;
    }
    if (e.y < 180) {
      e.vy = 70;
    } else {
      e.vy = 0;
      e.x += e.dir * 110 * dt;
      if (e.x < 130 || e.x > ARENA_W - 130) e.dir *= -1;
    }
    e.angle = Math.PI / 2;
  } else {
    e.angle += e.spin * dt;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
}

export function enemyFire(e, player) {
  const bullets = [];
  if (e.kind === 'spitter' && e.fireTimer <= 0 && e.y > 40) {
    e.fireTimer = 1.7;
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    bullets.push({
      x: e.x, y: e.y + e.radius, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
      radius: 5, damage: 1, friendly: false, life: 4,
    });
  }
  if (e.kind === 'boss' && e.fireTimer <= 0 && e.y > 40) {
    if (e.mode === 0) {
      e.fireTimer = 0.9;
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2 + e.t;
        bullets.push({
          x: e.x, y: e.y, vx: Math.cos(a) * BOSS.bulletSpeed, vy: Math.sin(a) * BOSS.bulletSpeed,
          radius: 5, damage: 1, friendly: false, life: 4,
        });
      }
    } else if (e.mode === 1) {
      e.fireTimer = 0.5;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      for (const off of [-0.25, 0, 0.25]) {
        bullets.push({
          x: e.x, y: e.y + 30, vx: Math.cos(a + off) * 340, vy: Math.sin(a + off) * 340,
          radius: 5, damage: 1, friendly: false, life: 4,
        });
      }
    } else {
      e.fireTimer = 1.4;
      for (const off of [-0.9, -0.45, 0, 0.45, 0.9]) {
        bullets.push({
          x: e.x, y: e.y + 30, vx: Math.sin(off) * 260, vy: Math.cos(off) * 260,
          radius: 5, damage: 1, friendly: false, life: 4,
        });
      }
    }
  }
  return bullets;
}

export function updateBullet(b, dt) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.life -= dt;
}

export function offArena(b, margin = 60) {
  return b.x < -margin || b.x > ARENA_W + margin || b.y < -margin || b.y > ARENA_H + margin;
}

export function spawnPowerup(x, y, rng) {
  const roll = rng.next();
  const kind = roll < 0.02 ? 'life' : rng.pick(['spread', 'rapid', 'shield']);
  return { kind, x, y, vy: POWERUP.fallSpeed, radius: POWERUP.radius, t: 0 };
}

export function updatePowerup(p, dt) {
  p.t += dt;
  p.y += p.vy * dt;
  p.x += Math.sin(p.t * 2.2) * 24 * dt;
}

export function burst(particles, x, y, color, count, speed, life = 0.7) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: life * (0.5 + Math.random() * 0.5), maxLife: life,
      size: 1.5 + Math.random() * 2.5, color,
    });
  }
  if (particles.length > 450) particles.splice(0, particles.length - 450);
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function powerupColor(kind) {
  return COLORS[kind] || COLORS.spread;
}
