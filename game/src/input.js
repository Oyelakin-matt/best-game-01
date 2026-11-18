// Keyboard + mouse, read fresh every frame. Actions are edge-triggered where the
// game needs one press to mean one thing (start, pause, restart); movement and
// firing are held states.
//
// Touch devices get the same states from fingers: a touch starting on the left
// 45% of the screen steers a virtual joystick, a touch on the right side aims
// (the ship turns toward it, like the mouse) and auto-fires while held. The
// joystick and fire ring are DOM, drawn by main.js from touchState; the canvas
// itself never paints touch UI, so desktop play and screenshots stay clean.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

export const IS_TOUCH = ('ontouchstart' in window)
  || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

const JOY_RADIUS = 56; // px the stick travels from its origin, on screen

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
  const touch = {
    joyId: null,
    joyOrigin: { x: 0, y: 0 },
    joyVec: { x: 0, y: 0 },
    aimId: null,
    aimClient: { x: 0, y: 0 },
    firing: false,
  };

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

  function toArena(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1280,
      y: ((clientY - rect.top) / rect.height) * 720,
    };
  }

  function onTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (t.clientX - rect.left < rect.width * 0.45 && touch.joyId === null) {
        touch.joyId = t.identifier;
        touch.joyOrigin = { x: t.clientX, y: t.clientY };
        touch.joyVec = { x: 0, y: 0 };
      } else if (touch.aimId === null) {
        touch.aimId = t.identifier;
        const a = toArena(t.clientX, t.clientY);
        touch.aimClient = { x: t.clientX, y: t.clientY };
        mouse.x = a.x;
        mouse.y = a.y;
        touch.firing = true;
      }
    }
    pressed.add(ACTION_CONFIRM);
  }

  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touch.joyId) {
        let dx = (t.clientX - touch.joyOrigin.x) / JOY_RADIUS;
        let dy = (t.clientY - touch.joyOrigin.y) / JOY_RADIUS;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        touch.joyVec = { x: dx, y: dy };
      } else if (t.identifier === touch.aimId) {
        const a = toArena(t.clientX, t.clientY);
        touch.aimClient = { x: t.clientX, y: t.clientY };
        mouse.x = a.x;
        mouse.y = a.y;
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touch.joyId) {
        touch.joyId = null;
        touch.joyVec = { x: 0, y: 0 };
      } else if (t.identifier === touch.aimId) {
        touch.aimId = null;
        touch.firing = false;
      }
    }
  }

  if (IS_TOUCH) {
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  return {
    mouse,
    isTouch: IS_TOUCH,
    touch,
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
      if (touch.joyId !== null) {
        x += touch.joyVec.x;
        y += touch.joyVec.y;
      }
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    firing() {
      return held.has('Space') || mouse.down || touch.firing;
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
