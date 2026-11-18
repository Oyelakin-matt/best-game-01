// Boot and the one loop: input is read every frame, the game advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over.
//
// ?seed=N fixes the random pattern. ?shot=title|play|boss|results (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame, updateGame, SCREEN_OVER } from './game.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);
renderer.setSeed(seed);
void createRandom(seed);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

let game;
let frames = 0;

function draw() {
  renderer.draw(game, 0);
  frames += 1;
}

if (shot) {
  game = stageShot(shot, seed);
  game.best = Math.max(game.best, readBest());
  let painted = 0;
  (function paint() {
    draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  })();
} else {
  game = createGame(seed);
  game.best = readBest();
  let last = performance.now();
  let acc = 0;
  let savedBest = game.best;

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    acc += elapsed;
    while (acc >= STEP) {
      updateGame(game, input, audio, STEP);
      input.endFrame();
      acc -= STEP;
      if (game.screen === SCREEN_OVER && game.best > savedBest) {
        savedBest = game.best;
        saveBest(game.best);
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// A small live handle for headless play-tests: state, score, lives, wave, counts.
window.__neonvoid = {
  get state() {
    return game.screen;
  },
  get score() {
    return game.score;
  },
  get lives() {
    return game.player.lives;
  },
  get wave() {
    return game.waves.wave;
  },
  get kills() {
    return game.kills;
  },
  get enemies() {
    return game.enemies.length;
  },
  get bullets() {
    return game.bullets.length;
  },
  get frames() {
    return frames;
  },
  get boss() {
    const b = game.waves.boss;
    return b ? { hp: b.hp, maxHp: b.maxHp } : null;
  },
  get best() {
    return game.best;
  },
  get player() {
    return { x: Math.round(game.player.x), y: Math.round(game.player.y), alive: game.player.alive };
  },
};
