// Synthesised sound only: every effect is an oscillator or a burst of filtered
// noise through the Web Audio API. No audio files, no network. The context is
// created lazily on the first user gesture, so a silent page load stays silent.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone({ freq = 440, end = null, type = 'square', dur = 0.12, vol = 0.5, slide = 0 }) {
    const c = ensure();
    if (!c || muted) return;
    if (c.state === 'suspended') void c.resume();
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(1, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.3, vol = 0.5, low = 400, high = 4000 }) {
    const c = ensure();
    if (!c || muted) return;
    if (c.state === 'suspended') void c.resume();
    const t0 = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (low + high) / 2;
    filter.Q.value = 0.7;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone({ freq: 880, end: 220, type: 'square', dur: 0.09, vol: 0.22 });
    },
    enemyShoot() {
      tone({ freq: 320, end: 140, type: 'sawtooth', dur: 0.14, vol: 0.12 });
    },
    explosion(big = false) {
      noise({ dur: big ? 0.55 : 0.28, vol: big ? 0.6 : 0.35, low: 120, high: 1800 });
      tone({ freq: big ? 160 : 220, end: 40, type: 'sine', dur: big ? 0.5 : 0.3, vol: 0.5 });
    },
    hit() {
      noise({ dur: 0.2, vol: 0.4, low: 800, high: 3000 });
      tone({ freq: 200, end: 60, type: 'sawtooth', dur: 0.25, vol: 0.4 });
    },
    powerup() {
      tone({ freq: 523, type: 'sine', dur: 0.1, vol: 0.35 });
      setTimeout(() => tone({ freq: 659, type: 'sine', dur: 0.1, vol: 0.35 }), 70);
      setTimeout(() => tone({ freq: 784, type: 'sine', dur: 0.16, vol: 0.4 }), 140);
    },
    waveClear() {
      tone({ freq: 392, type: 'triangle', dur: 0.12, vol: 0.35 });
      setTimeout(() => tone({ freq: 523, type: 'triangle', dur: 0.12, vol: 0.35 }), 100);
      setTimeout(() => tone({ freq: 659, type: 'triangle', dur: 0.2, vol: 0.4 }), 200);
    },
    bossAlarm() {
      tone({ freq: 440, type: 'sawtooth', dur: 0.22, vol: 0.3 });
      setTimeout(() => tone({ freq: 349, type: 'sawtooth', dur: 0.3, vol: 0.3 }), 220);
    },
    gameOver() {
      tone({ freq: 330, end: 55, type: 'triangle', dur: 0.9, vol: 0.4 });
    },
  };
}
