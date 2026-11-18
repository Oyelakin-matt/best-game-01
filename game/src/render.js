// Everything the player sees. The renderer paints the game state and nothing else:
// it never moves, scores or decides. All drawing is canvas shapes with glow —
// no images, no fonts from the network (system fonts only).
import { ARENA_W, ARENA_H, COLORS, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './game.js';

function makeStars(seed) {
  const rng = createRandom(seed);
  const layers = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const count = [90, 55, 30][layer];
    const stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: rng.range(0, ARENA_W), y: rng.range(0, ARENA_H),
        size: rng.range(0.6, 1.8) + layer * 0.5,
        tw: rng.range(0, Math.PI * 2),
      });
    }
    layers.push({ stars, speed: [14, 34, 70][layer] });
  }
  return layers;
}

function makeNebula(seed) {
  const rng = createRandom(seed + 77);
  const c = document.createElement('canvas');
  c.width = ARENA_W;
  c.height = ARENA_H;
  const x = c.getContext('2d');
  const blobs = [
    { color: '80, 40, 160', r: 320 }, { color: '20, 90, 140', r: 280 },
    { color: '160, 30, 90', r: 240 }, { color: '30, 60, 120', r: 300 },
  ];
  for (const b of blobs) {
    const bx = rng.range(100, ARENA_W - 100);
    const by = rng.range(80, ARENA_H - 80);
    const grad = x.createRadialGradient(bx, by, 0, bx, by, b.r);
    grad.addColorStop(0, `rgba(${b.color},0.20)`);
    grad.addColorStop(1, `rgba(${b.color},0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, ARENA_W, ARENA_H);
  }
  return c;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let stars = makeStars(1337);
  let nebula = makeNebula(1337);
  let view = { scale: 1, ox: 0, oy: 0, w: ARENA_W, h: ARENA_H };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const scale = Math.min(w / ARENA_W, h / ARENA_H) * dpr;
    view = {
      scale,
      ox: (canvas.width - ARENA_W * scale) / 2,
      oy: (canvas.height - ARENA_H * scale) / 2,
      w, h,
    };
  }
  window.addEventListener('resize', resize);
  resize();

  function glow(color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  function noGlow() {
    ctx.shadowBlur = 0;
  }

  function drawBackground(g, dt) {
    const grad = ctx.createLinearGradient(0, 0, 0, ARENA_H);
    grad.addColorStop(0, COLORS.bgTop);
    grad.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    ctx.drawImage(nebula, 0, 0);
    for (const layer of stars) {
      for (const s of layer.stars) {
        const y = (s.y + g.time * layer.speed) % ARENA_H;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(g.time * 1.5 + s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#cfe8ff';
        ctx.fillRect(s.x, y, s.size, s.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawShip(x, y, angle, radius, color, core) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    glow(color, 18);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -radius - 4);
    ctx.lineTo(radius * 0.8, radius * 0.7);
    ctx.lineTo(radius * 0.35, radius * 0.35);
    ctx.lineTo(-radius * 0.35, radius * 0.35);
    ctx.lineTo(-radius * 0.8, radius * 0.7);
    ctx.closePath();
    ctx.fill();
    noGlow();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.5);
    ctx.lineTo(radius * 0.3, radius * 0.4);
    ctx.lineTo(-radius * 0.3, radius * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.kind === 'drifter') {
      ctx.rotate(e.angle + Math.PI / 2);
      glow(COLORS.drifter, 16);
      ctx.fillStyle = COLORS.drifter;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      noGlow();
      ctx.fillStyle = '#ffd7ec';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'weaver') {
      ctx.rotate(e.angle + Math.PI / 2);
      glow(COLORS.weaver, 16);
      ctx.fillStyle = COLORS.weaver;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(15, 12);
      ctx.lineTo(-15, 12);
      ctx.closePath();
      ctx.fill();
      noGlow();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'spitter') {
      glow(COLORS.spitter, 16);
      ctx.fillStyle = COLORS.spitter;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + e.t;
        const px = Math.cos(a) * 18;
        const py = Math.sin(a) * 18;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      noGlow();
      ctx.fillStyle = '#f3d9ff';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'boss') {
      glow(COLORS.boss, 26);
      ctx.fillStyle = COLORS.boss;
      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.lineTo(58, 20);
      ctx.lineTo(72, -30);
      ctx.lineTo(34, -52);
      ctx.lineTo(-34, -52);
      ctx.lineTo(-72, -30);
      ctx.lineTo(-58, 20);
      ctx.closePath();
      ctx.fill();
      noGlow();
      ctx.fillStyle = COLORS.bossCore;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + Math.sin(e.t * 4) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b0010';
      ctx.beginPath();
      ctx.arc(-34, 10, 7, 0, Math.PI * 2);
      ctx.arc(34, 10, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // asteroid / asteroidSmall: jagged rock.
      ctx.rotate(e.angle);
      glow(COLORS.asteroid, 10);
      ctx.fillStyle = COLORS.asteroid;
      ctx.beginPath();
      const n = e.verts.length;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2;
        const r = e.radius * e.verts[i];
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      noGlow();
      ctx.strokeStyle = COLORS.asteroidCrack;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-e.radius * 0.4, -e.radius * 0.2);
      ctx.lineTo(0, e.radius * 0.2);
      ctx.lineTo(e.radius * 0.4, -e.radius * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    // Boss and tough enemies show a small health arc.
    if ((e.kind === 'boss' || e.maxHp >= 3) && e.hp < e.maxHp) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 8, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = '#ff5d7a';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * e.hp) / e.maxHp);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBullets(g) {
    for (const b of g.bullets) {
      glow(COLORS.bullet, 12);
      ctx.strokeStyle = COLORS.bullet;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      noGlow();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of g.enemyBullets) {
      glow(COLORS.enemyBullet, 12);
      ctx.fillStyle = COLORS.enemyBullet;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      noGlow();
      ctx.fillStyle = '#ffd7ec';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles(g) {
    for (const p of g.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPowerups(g) {
    for (const pu of g.powerups) {
      const color = { spread: COLORS.spread, rapid: COLORS.rapid, shield: COLORS.shield, life: COLORS.life }[pu.kind];
      const bob = Math.sin(pu.t * 3) * 3;
      glow(color, 16);
      ctx.fillStyle = 'rgba(5,5,20,0.85)';
      ctx.beginPath();
      ctx.arc(pu.x, pu.y + bob, pu.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      noGlow();
      ctx.fillStyle = color;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = { spread: 'S', rapid: 'R', shield: 'H', life: '+1' }[pu.kind];
      ctx.fillText(label, pu.x, pu.y + bob + 1);
    }
  }

  function text(str, x, y, size, color, align = 'center', weight = 'bold') {
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function drawHud(g) {
    const p = g.player;
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    text('SCORE', 28, 34, 13, COLORS.hudDim, 'left');
    text(String(g.score).padStart(7, '0'), 28, 62, 30, COLORS.hud, 'left');
    if (g.multiplier > 1) {
      glow(COLORS.gold, 10);
      text(`x${g.multiplier} COMBO ${g.combo}`, 28, 92, 16, COLORS.gold, 'left');
      noGlow();
    }
    // Lives, top right.
    text('LIVES', ARENA_W - 28, 34, 13, COLORS.hudDim, 'right');
    for (let i = 0; i < PLAYER.maxLives; i += 1) {
      const x = ARENA_W - 36 - i * 30;
      const y = 62;
      ctx.save();
      ctx.globalAlpha = i < p.lives ? 1 : 0.18;
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 8);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Wave, top center.
    text(`WAVE ${Math.max(1, g.waves.wave)}`, ARENA_W / 2, 34, 15, COLORS.hudDim, 'center');
    text(`BEST ${Math.max(g.best, g.score)}`, ARENA_W / 2, 60, 13, COLORS.hudDim, 'center');
    // Boss bar.
    const boss = g.waves.boss;
    if (boss) {
      const w = 420;
      const x = (ARENA_W - w) / 2;
      const y = 72;
      text('VOID LEVIATHAN', ARENA_W / 2, y + 8, 13, '#ff8095', 'center');
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x, y + 18, w, 10);
      ctx.fillStyle = COLORS.boss;
      ctx.fillRect(x, y + 18, w * Math.max(0, boss.hp / boss.maxHp), 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y + 18, w, 10);
    }
    // Power-up timers, bottom left.
    let ty = ARENA_H - 30;
    const timers = [];
    if (p.spread > 0) timers.push(['SPREAD', p.spread, COLORS.spread]);
    if (p.rapid > 0) timers.push(['RAPID', p.rapid, COLORS.rapid]);
    if (p.shield > 0) timers.push(['SHIELD', p.shield, COLORS.shield]);
    for (const [label, t, color] of timers) {
      text(`${label} ${Math.ceil(t)}s`, 28, ty, 15, color, 'left');
      ty -= 24;
    }
    if (g.muted) text('MUTED (M)', ARENA_W - 28, ARENA_H - 30, 13, COLORS.hudDim, 'right');
    // Wave banner.
    if (g.banner && g.bannerTimer > 0) {
      ctx.globalAlpha = Math.min(1, g.bannerTimer);
      glow('#ffffff', 18);
      text(g.banner, ARENA_W / 2, ARENA_H * 0.3, 40, '#ffffff', 'center');
      noGlow();
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle(g) {
    ctx.fillStyle = 'rgba(4,4,16,0.55)';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    const pulse = 1 + Math.sin(g.time * 2.2) * 0.02;
    ctx.save();
    ctx.translate(ARENA_W / 2, 218);
    ctx.scale(pulse, pulse);
    glow('#00f0ff', 34);
    text('NEON VOID', 0, 0, 92, '#e8ffff', 'center');
    noGlow();
    ctx.restore();
    glow('#ff2d95', 14);
    text('A NEON SPACE SHOOTER', ARENA_W / 2, 292, 20, '#ff8ac2', 'center');
    noGlow();
    if (g.touchControls) {
      text('LEFT THUMB — FLY THE JOYSTICK      RIGHT THUMB — AIM AND FIRE', ARENA_W / 2, 360, 17, COLORS.hud, 'center');
      text('GRAB POWER-UPS:  S SPREAD   R RAPID   H SHIELD   +1 LIFE', ARENA_W / 2, 392, 15, COLORS.hudDim, 'center');
    } else {
      text('WASD / ARROWS — FLY      MOUSE — AIM      CLICK / SPACE — FIRE', ARENA_W / 2, 360, 17, COLORS.hud, 'center');
      text('P — PAUSE      M — MUTE      GRAB POWER-UPS:  S SPREAD   R RAPID   H SHIELD   +1 LIFE', ARENA_W / 2, 392, 15, COLORS.hudDim, 'center');
    }
    text('SURVIVE THE WAVES. EVERY 5TH WAVE, THE VOID LEVIATHAN COMES.', ARENA_W / 2, 424, 15, COLORS.hudDim, 'center');
    const blink = Math.sin(g.time * 4) > -0.2;
    if (blink) {
      glow('#ffffff', 16);
      text('CLICK OR PRESS ENTER TO LAUNCH', ARENA_W / 2, 500, 24, '#ffffff', 'center');
      noGlow();
    }
    if (g.best > 0) text(`BEST  ${g.best}`, ARENA_W / 2, 556, 18, COLORS.gold, 'center');
  }

  function drawPaused(g) {
    ctx.fillStyle = 'rgba(4,4,16,0.65)';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    glow('#ffffff', 20);
    text('PAUSED', ARENA_W / 2, ARENA_H / 2 - 20, 54, '#ffffff', 'center');
    noGlow();
    text('P OR CLICK TO RESUME', ARENA_W / 2, ARENA_H / 2 + 40, 18, COLORS.hudDim, 'center');
  }

  function drawOver(g) {
    ctx.fillStyle = 'rgba(10,2,10,0.6)';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    glow('#ff2d95', 24);
    text('GAME OVER', ARENA_W / 2, 190, 64, '#ff5d7a', 'center');
    noGlow();
    if (g.newBest) {
      glow(COLORS.gold, 16);
      text('★ NEW BEST SCORE ★', ARENA_W / 2, 250, 22, COLORS.gold, 'center');
      noGlow();
    }
    const s = g.overStats || { score: g.score, wave: g.wave, kills: g.kills, best: g.best };
    text('FINAL SCORE', ARENA_W / 2, 316, 16, COLORS.hudDim, 'center');
    text(String(s.score), ARENA_W / 2, 360, 52, '#ffffff', 'center');
    text(`WAVE REACHED  ${s.wave}      SHIPS DESTROYED  ${s.kills}      BEST  ${s.best}`, ARENA_W / 2, 424, 18, COLORS.hud, 'center');
    const blink = Math.sin(g.time * 4) > -0.2;
    if (blink) {
      glow('#ffffff', 14);
      text('PRESS R OR CLICK TO FLY AGAIN', ARENA_W / 2, 500, 22, '#ffffff', 'center');
      noGlow();
    }
  }

  return {
    resize,
    draw(g, dt) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shakeX = g.shake > 0 ? (Math.random() - 0.5) * g.shake * g.shake * 18 : 0;
      const shakeY = g.shake > 0 ? (Math.random() - 0.5) * g.shake * g.shake * 18 : 0;
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shakeX * view.scale, view.oy + shakeY * view.scale);
      drawBackground(g, dt);
      for (const e of g.enemies) drawEnemy(e);
      drawPowerups(g);
      drawBullets(g);
      drawParticles(g);
      if (g.screen === SCREEN_PLAY || g.screen === SCREEN_PAUSED) {
        const p = g.player;
        if (p.alive) {
          const blink = p.invuln > 0 && Math.floor(g.time * 12) % 2 === 0;
          if (!blink) {
            drawShip(p.x, p.y, p.angle, p.radius, COLORS.player, COLORS.playerCore);
            if (p.shield > 0) {
              ctx.save();
              glow(COLORS.shield, 18);
              ctx.strokeStyle = COLORS.shield;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }
      if (g.screen === SCREEN_PLAY || g.screen === SCREEN_PAUSED) drawHud(g);
      if (g.screen === SCREEN_TITLE) drawTitle(g);
      if (g.screen === SCREEN_PAUSED) drawPaused(g);
      if (g.screen === SCREEN_OVER) drawOver(g);
      if (g.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${(g.flash * 0.45).toFixed(3)})`;
        ctx.fillRect(0, 0, ARENA_W, ARENA_H);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    setSeed(seed) {
      stars = makeStars(seed);
      nebula = makeNebula(seed);
    },
  };
}
