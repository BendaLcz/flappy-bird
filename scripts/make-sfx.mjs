// Renders the sound effects to 16-bit mono WAV files: `npm run sfx`  ->  public/sfx/*.wav
//
// Everything is rendered offline, so there is no real-time synthesis in the browser:
//  - band-limited waveforms (no aliasing "fizz")
//  - smooth envelopes that start and end at exactly zero (no clicks)
//  - each file is normalised to a fixed peak well below full scale (no clipping)
//
// To use your own sounds, drop WAV files with the same names into public/sfx/ (and do not
// re-run this script, it would overwrite them).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const MAX_HZ = 9000; // highest harmonic that is ever generated
const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "sfx",
);
mkdirSync(outDir, { recursive: true });

// Deterministic noise so the files are identical on every run.
let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};

/** One cycle of a band-limited waveform; `p` is the phase in cycles [0, 1). */
function wave(type, p, f) {
  const w = 2 * Math.PI * p;
  if (type === "sine") return Math.sin(w);
  const maxK = Math.min(Math.floor(MAX_HZ / f), Math.floor(SR / 2 / f));
  let s = 0;
  if (type === "tri") {
    for (let k = 1; k <= maxK; k += 2)
      s += ((((k - 1) / 2) % 2 ? -1 : 1) * Math.sin(k * w)) / (k * k);
    return s * (8 / (Math.PI * Math.PI));
  }
  // square
  for (let k = 1; k <= maxK; k += 2) s += Math.sin(k * w) / k;
  return s * (4 / Math.PI);
}

const newBuf = (secs) => new Float32Array(Math.ceil(secs * SR));

/** Adds a (gliding) tone. The envelope is a short attack followed by a smooth fade to zero. */
function tone(
  buf,
  {
    start = 0,
    dur,
    f0,
    f1 = f0,
    type = "tri",
    amp = 1,
    attack = 0.006,
    curve = 2,
  },
) {
  const n = Math.floor(dur * SR);
  const s0 = Math.floor(start * SR);
  const a = Math.max(1, Math.floor(attack * SR));
  let phase = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / n;
    const f = f0 * (f1 / f0) ** t;
    phase += f / SR;
    phase -= Math.floor(phase);
    const env = Math.min(1, i / a) * (1 - t) ** curve;
    buf[s0 + i] += amp * env * wave(type, phase, f);
  }
}

/** Adds a burst of low-passed noise (two one-pole filters = 12 dB/oct). */
function noise(
  buf,
  { start = 0, dur, cutoff, amp = 1, attack = 0.003, curve = 2 },
) {
  const n = Math.floor(dur * SR);
  const s0 = Math.floor(start * SR);
  const a = Math.max(1, Math.floor(attack * SR));
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / n;
    y1 += k * (rnd() - y1);
    y2 += k * (y1 - y2);
    buf[s0 + i] += amp * Math.min(1, i / a) * (1 - t) ** curve * y2 * 3;
  }
}

// ---- The sounds. `peak` is the final peak level (1 = full scale). ----
const SOUNDS = {
  flap: {
    peak: 0.4,
    make() {
      const b = newBuf(0.15);
      tone(b, { dur: 0.11, f0: 380, f1: 700, type: "tri" });
      return b;
    },
  },
  score: {
    peak: 0.35,
    make() {
      const b = newBuf(0.3);
      tone(b, { dur: 0.1, f0: 880, type: "tri" });
      tone(b, { start: 0.09, dur: 0.18, f0: 1320, type: "tri" });
      return b;
    },
  },
  coin: {
    peak: 0.4,
    make() {
      const b = newBuf(0.3);
      tone(b, { dur: 0.09, f0: 1200, f1: 1800, type: "sine" });
      tone(b, { start: 0.07, dur: 0.2, f0: 1800, type: "sine" });
      tone(b, { start: 0.07, dur: 0.2, f0: 3600, type: "sine", amp: 0.15 });
      return b;
    },
  },
  power: {
    peak: 0.4,
    make() {
      const b = newBuf(0.5);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(b, { start: i * 0.07, dur: 0.16, f0: f, type: "tri", curve: 1.5 }),
      );
      return b;
    },
  },
  shieldBreak: {
    peak: 0.5,
    make() {
      const b = newBuf(0.35);
      noise(b, { dur: 0.22, cutoff: 2500, amp: 0.6 });
      tone(b, { dur: 0.3, f0: 500, f1: 120, type: "tri" });
      return b;
    },
  },
  hit: {
    peak: 0.55,
    make() {
      const b = newBuf(0.3);
      noise(b, { dur: 0.2, cutoff: 1000, amp: 0.5 });
      tone(b, { dur: 0.24, f0: 220, f1: 60, type: "tri" });
      return b;
    },
  },
  die: {
    peak: 0.4,
    make() {
      const b = newBuf(0.7);
      tone(b, {
        start: 0.12,
        dur: 0.5,
        f0: 420,
        f1: 90,
        type: "tri",
        curve: 1.3,
      });
      return b;
    },
  },
  click: {
    peak: 0.3,
    make() {
      const b = newBuf(0.08);
      tone(b, { dur: 0.06, f0: 700, type: "tri" });
      return b;
    },
  },
  // Diamond: a rising sparkle.
  gem: {
    peak: 0.4,
    make() {
      const b = newBuf(0.75);
      [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => {
        tone(b, { start: i * 0.06, dur: 0.3, f0: f, type: "sine", curve: 1.6 });
        tone(b, {
          start: i * 0.06,
          dur: 0.2,
          f0: f * 2,
          type: "sine",
          amp: 0.12,
        });
      });
      tone(b, {
        start: 0.3,
        dur: 0.42,
        f0: 3136,
        type: "sine",
        amp: 0.5,
        curve: 1.4,
      });
      return b;
    },
  },
};

// ---- WAV writer ----
function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      i * 2,
    );
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const db = (x) => (20 * Math.log10(x || 1e-9)).toFixed(1);

for (const [name, { peak, make }] of Object.entries(SOUNDS)) {
  const buf = make();
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  for (let i = 0; i < buf.length; i++) buf[i] *= peak / max;

  let sq = 0;
  let jump = 0;
  for (let i = 0; i < buf.length; i++) {
    sq += buf[i] * buf[i];
    if (i) jump = Math.max(jump, Math.abs(buf[i] - buf[i - 1]));
  }
  writeFileSync(join(outDir, `${name}.wav`), encodeWav(buf));
  console.log(
    `${name.padEnd(12)} ${(buf.length / SR).toFixed(2)}s  peak ${db(peak)} dB  rms ${db(Math.sqrt(sq / buf.length))} dB  ` +
      `first ${buf[0].toFixed(4)}  last ${buf[buf.length - 1].toFixed(4)}  max step ${jump.toFixed(3)}`,
  );
}
