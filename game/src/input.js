// Keyboard + mouse, read fresh every frame. Actions are edge-triggered where the
// game needs one press to mean one thing (start, pause, restart); movement and
// firing are held states.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    held.add(e.code);
    pressed.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') pressed.add(ACTION_CONFIRM);
    if (e.code === 'KeyP' || e.code === 'Escape') pressed.add(ACTION_PAUSE);
    if (e.code === 'KeyM') pressed.add(ACTION_MUTE);
  }

  function onKeyUp(e) {
    held.delete(e.code);
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 1280;
    mouse.y = ((e.clientY - rect.top) / rect.height) * 720;
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      mouse.down = true;
      pressed.add(ACTION_CONFIRM);
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    mouse,
    move() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const dir = MOVE_KEYS[code];
        if (dir === 'up') y -= 1;
        if (dir === 'down') y += 1;
        if (dir === 'left') x -= 1;
        if (dir === 'right') x += 1;
      }
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    firing() {
      return held.has('Space') || mouse.down;
    },
    confirmPressed() {
      return pressed.has(ACTION_CONFIRM);
    },
    pausePressed() {
      return pressed.has(ACTION_PAUSE);
    },
    mutePressed() {
      return pressed.has(ACTION_MUTE);
    },
    restartPressed() {
      return pressed.has('KeyR');
    },
    endFrame() {
      pressed.clear();
    },
  };
}
