// Synthesised sound effects: every sound is a small oscillator phrase, so
// the game needs no audio files. The context is created lazily on the
// first user gesture, as browsers require, and M toggles mute.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._lastPlayed = new Map();
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // One enveloped tone. `slide` bends the frequency over the note.
  _tone({ freq = 440, slide = 0, type = 'square', dur = 0.12, vol = 0.5, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Throttle identical effects so a busy frame stays pleasant.
  _play(name, everyMs, fn) {
    const now = performance.now();
    if (now - (this._lastPlayed.get(name) || 0) < everyMs) return;
    this._lastPlayed.set(name, now);
    fn();
  }

  shoot() {
    this._play('shoot', 45, () => this._tone({ freq: 720, slide: -260, type: 'square', dur: 0.07, vol: 0.16 }));
  }

  hit() {
    this._play('hit', 40, () => this._tone({ freq: 240, slide: -60, type: 'triangle', dur: 0.05, vol: 0.22 }));
  }

  enemyDie() {
    this._play('die', 55, () => {
      this._tone({ freq: 320, slide: -190, type: 'sawtooth', dur: 0.14, vol: 0.2 });
      this._tone({ freq: 140, slide: -60, type: 'triangle', dur: 0.12, vol: 0.16, delay: 0.02 });
    });
  }

  pickup() {
    this._play('pickup', 60, () => this._tone({ freq: 880, slide: 340, type: 'sine', dur: 0.09, vol: 0.2 }));
  }

  hurt() {
    this._play('hurt', 200, () => {
      this._tone({ freq: 160, slide: -70, type: 'sawtooth', dur: 0.22, vol: 0.34 });
      this._tone({ freq: 90, slide: -30, type: 'square', dur: 0.2, vol: 0.2, delay: 0.02 });
    });
  }

  levelup() {
    this._play('levelup', 300, () => {
      [523, 659, 784, 1046].forEach((freq, i) =>
        this._tone({ freq, type: 'triangle', dur: 0.16, vol: 0.24, delay: i * 0.07 }),
      );
    });
  }

  choose() {
    this._play('choose', 120, () => {
      this._tone({ freq: 660, type: 'triangle', dur: 0.1, vol: 0.22 });
      this._tone({ freq: 990, type: 'triangle', dur: 0.14, vol: 0.22, delay: 0.06 });
    });
  }

  waveStart() {
    this._play('wave', 400, () => {
      this._tone({ freq: 196, type: 'sawtooth', dur: 0.3, vol: 0.16 });
      this._tone({ freq: 294, type: 'sawtooth', dur: 0.3, vol: 0.14, delay: 0.05 });
    });
  }

  gameover() {
    this._play('gameover', 800, () => {
      [392, 330, 262, 196].forEach((freq, i) =>
        this._tone({ freq, type: 'triangle', dur: 0.3, vol: 0.24, delay: i * 0.16 }),
      );
    });
  }

  click() {
    this._play('click', 80, () => this._tone({ freq: 540, type: 'sine', dur: 0.06, vol: 0.2 }));
  }
}
