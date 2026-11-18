// Staged scenes for screenshots: each builds a real game state (the same objects
// the loop builds) and lets the renderer paint it. Shot mode never advances the
// loop, so a seed replays the same frame every time.
import { ARENA_W, ARENA_H } from './config.js';
import { createGame, startGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './game.js';
import { spawnEnemy, spawnBoss, burst } from './entities.js';

function demoEnemy(g, kind, x, y) {
  const e = spawnEnemy(kind, g.rng, 1);
  e.x = x;
  e.y = y;
  e.t = 1.5;
  if (kind === 'weaver') e.baseX = x;
  return e;
}

export function stageShot(name, seed) {
  const g = createGame(seed);
  g.best = 12500;
  if (name === 'title') {
    g.screen = SCREEN_TITLE;
    g.time = 3.4;
    g.enemies = [
      demoEnemy(g, 'drifter', 220, 150),
      demoEnemy(g, 'weaver', 1060, 200),
      demoEnemy(g, 'asteroid', 640, 120),
      demoEnemy(g, 'spitter', 420, 560),
    ];
    return g;
  }
  if (name === 'play') {
    startGame(g);
    g.screen = SCREEN_PLAY;
    g.time = 42.5;
    g.score = 4850;
    g.kills = 63;
    g.combo = 12;
    g.multiplier = 4;
    g.waves.wave = 3;
    g.waves.banner = '';
    g.waves.bannerTimer = 0;
    g.player.x = 640;
    g.player.y = 520;
    g.player.angle = -Math.PI / 2 - 0.2;
    g.player.spread = 4;
    g.enemies = [
      demoEnemy(g, 'drifter', 300, 180),
      demoEnemy(g, 'weaver', 520, 140),
      demoEnemy(g, 'spitter', 760, 150),
      demoEnemy(g, 'asteroid', 980, 200),
      demoEnemy(g, 'drifter', 900, 320),
      demoEnemy(g, 'weaver', 180, 300),
    ];
    g.bullets = [
      { x: 620, y: 460, vx: 0, vy: -760, radius: 4, damage: 1, friendly: true, life: 1 },
      { x: 660, y: 440, vx: 120, vy: -740, radius: 4, damage: 1, friendly: true, life: 1 },
      { x: 600, y: 420, vx: -120, vy: -740, radius: 4, damage: 1, friendly: true, life: 1 },
      { x: 640, y: 380, vx: 0, vy: -760, radius: 4, damage: 1, friendly: true, life: 1 },
    ];
    g.enemyBullets = [
      { x: 760, y: 220, vx: -60, vy: 300, radius: 5, damage: 1, friendly: false, life: 4 },
      { x: 520, y: 260, vx: 40, vy: 300, radius: 5, damage: 1, friendly: false, life: 4 },
    ];
    g.powerups = [
      { kind: 'spread', x: 820, y: 420, vy: 70, radius: 15, t: 1 },
      { kind: 'shield', x: 420, y: 480, vy: 70, radius: 15, t: 2 },
    ];
    burst(g.particles, 300, 180, '#ff9f1c', 18, 240, 0.8);
    burst(g.particles, 980, 200, '#9aa5c4', 12, 180, 0.7);
    return g;
  }
  if (name === 'boss') {
    startGame(g);
    g.screen = SCREEN_PLAY;
    g.time = 128.2;
    g.score = 12400;
    g.kills = 121;
    g.combo = 8;
    g.multiplier = 3;
    g.waves.wave = 5;
    g.waves.banner = '';
    g.waves.bannerTimer = 0;
    g.player.x = 640;
    g.player.y = 560;
    g.player.lives = 2;
    g.player.angle = -Math.PI / 2;
    const boss = spawnBoss(5, g.rng);
    boss.x = 640;
    boss.y = 180;
    boss.hp = Math.floor(boss.maxHp * 0.6);
    boss.t = 2.4;
    g.enemies = [boss];
    g.waves.boss = boss;
    g.waves.bossActive = true;
    g.bullets = [
      { x: 620, y: 500, vx: 0, vy: -760, radius: 4, damage: 1, friendly: true, life: 1 },
      { x: 660, y: 490, vx: 0, vy: -760, radius: 4, damage: 1, friendly: true, life: 1 },
      { x: 640, y: 460, vx: 0, vy: -760, radius: 4, damage: 1, friendly: true, life: 1 },
    ];
    g.enemyBullets = [];
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + 0.6;
      g.enemyBullets.push({
        x: 640 + Math.cos(a) * 150, y: 180 + Math.sin(a) * 150,
        vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
        radius: 5, damage: 1, friendly: false, life: 4,
      });
    }
    burst(g.particles, 640, 250, '#ff2244', 20, 300, 0.8);
    return g;
  }
  // results
  g.screen = SCREEN_OVER;
  g.time = 8.0;
  g.score = 18750;
  g.wave = 7;
  g.kills = 142;
  g.best = 18750;
  g.newBest = true;
  g.overStats = { score: 18750, wave: 7, kills: 142, best: 18750 };
  burst(g.particles, ARENA_W / 2, 360, '#ffd166', 30, 260, 1.1);
  return g;
}
