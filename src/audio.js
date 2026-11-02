// Audio engine: plays pre-rendered WAV sound effects (public/sfx/*.wav) and hosts the music bus.
// Browsers only allow audio after a user gesture, so call unlock() from input handlers.
//
// Signal chain (kept deliberately simple, no dynamics processing):
//   effects (buffer sources) -> sfx gain -\
//                                          +-> master (volume / mute) -> speakers
//   music (see music.js) ----> bus --------/
//
// There is no compressor / limiter on purpose: the samples are normalised well below full
// scale and the music is quiet, so nothing clips, and compressors add their own distortion.

const MASTER_VOLUME = 0.8;
const SFX_VOLUME = 0.9;

const SOUND_NAMES = [
  "flap",
  "score",
  "coin",
  "power",
  "shieldBreak",
  "hit",
  "die",
  "click",
  "gem",
];
const BASE_URL = import.meta.env?.BASE_URL ?? "./";

// Events that browsers accept as a user gesture for starting audio. Which ones count differs
// per browser (e.g. Chrome ignores touch pointerdown, iOS needs touchend/click).
const UNLOCK_EVENTS = [
  "pointerdown",
  "pointerup",
  "touchend",
  "click",
  "keydown",
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bus = null; // music input
    this.sfx = null; // sound effects input
    this.muted = false;
    this.musicVolume = 1; // 0..1, set from the settings
    this.sfxVolume = 1;
    this.noiseBuffer = null;
    this.buffers = new Map();
  }

  /** Keep trying to unlock on every gesture until the context is actually running. */
  installAutoUnlock(target = window) {
    const handler = () => {
      this.unlock();
      if (this.ctx && this.ctx.state === "running") {
        for (const ev of UNLOCK_EVENTS)
          target.removeEventListener(ev, handler, true);
      }
    };
    for (const ev of UNLOCK_EVENTS) target.addEventListener(ev, handler, true);
  }

  unlock() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(ctx.destination);

      this.bus = ctx.createGain();
      this.bus.gain.value = this.musicVolume;
      this.bus.connect(this.master);

      this.sfx = ctx.createGain();
      this.sfx.gain.value = SFX_VOLUME * this.sfxVolume;
      this.sfx.connect(this.master);

      this.loadSounds();
    }
    if (this.ctx.state !== "running") {
      this.ctx.resume().catch(() => {});
      // iOS Safari only starts audio after something has been played inside a gesture.
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.ctx.createBuffer(1, 1, 22050);
        src.connect(this.ctx.destination);
        src.start(0);
      } catch {
        // ignore
      }
    }
  }

  /** Fetch and decode all sound effects. A missing file just means that effect stays silent. */
  loadSounds() {
    const ctx = this.ctx;
    for (const name of SOUND_NAMES) {
      fetch(`${BASE_URL}sfx/${name}.wav`)
        .then((res) => {
          if (!res.ok) throw new Error(`${name}.wav: HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => this.buffers.set(name, buffer))
        .catch((err) =>
          console.warn("Could not load sound effect:", err.message),
        );
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : MASTER_VOLUME,
        this.ctx.currentTime,
        0.01,
      );
    }
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    this.bus?.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    this.sfx?.gain.setTargetAtTime(SFX_VOLUME * v, this.ctx.currentTime, 0.02);
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running" && !this.muted;
  }

  /** Looping white noise, shared with the music's drums. */
  getNoiseBuffer() {
    if (!this.noiseBuffer) {
      const ctx = this.ctx;
      const len = ctx.sampleRate;
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }

  /** Plays a sound effect. `rate` changes the pitch (1 = normal). */
  play(name, { rate = 1 } = {}) {
    if (!this.ready) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(this.sfx);
    src.start();
  }
}

export const audio = new AudioEngine();
