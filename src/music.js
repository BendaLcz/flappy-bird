// 8-bit background music, generated live with Web Audio (no audio files).
//
// Each track is a short composed tune (8 bars, looped) played by NES-style voices:
//   lead   - pulse or triangle wave playing the melody
//   arp    - arpeggio on the current chord
//   bass   - triangle wave
//   drums  - kick / snare / hi-hat (only while playing)
// Each sky theme plays the tune transposed to a different key (see `shifts`).
//
// It is scheduled from the render loop with a short look-ahead (no timers), so it stops by
// itself when the tab is hidden. It shares the master volume (and the mute button) with the
// sound effects.
//
// Adding a track: add an entry to TRACKS below, and a matching entry (same id) to
// TRACKS in catalog.js so it shows up in the shop.

import { audio } from "./audio.js";

const LOOKAHEAD = 0.4; // seconds of audio scheduled ahead of time

// Set to false to turn off the kick / snare / hi-hat.
const DRUMS = true;

const LEVEL = { normal: 0.45, calm: 0.2 };
const CUTOFF = { normal: 7000, calm: 1200 };

// Bass notes on every eighth note: [step, semitones above the chord root, length in steps].
const bounce = (offsets, len) =>
  Array.from({ length: 8 }, (_, i) => [
    i * 2,
    offsets[i % offsets.length],
    len,
  ]);

// Lead bars: 16 sixteenth-note steps each. "-" holds the previous note, "." is a rest.
export const TRACKS = {
  // Upbeat and bouncy, C major.
  sunny: {
    bpm: 132,
    shifts: [0, 2, -3, -5], // day C, dusk D, night A, dawn G
    lead: {
      duty: 0.25,
      vol: 0.085,
      bars: [
        "E5 - G5 - E5 - C5 - D5 - E5 - G5 - - -", // C
        "D5 - G5 - D5 - B4 - C5 - D5 - B4 - - -", // G
        "C5 - E5 - A5 - G5 - E5 - C5 - A4 - - -", // Am
        "A4 - C5 - F5 - E5 - C5 - A4 - C5 - - .", // F
        "G5 - - - E5 - C5 - E5 - G5 - C6 - - -", // C
        "B5 - - - G5 - D5 - G5 - B5 - D6 - - -", // G
        "A5 - G5 - F5 - E5 - D5 - C5 - A4 - C5 -", // F
        "D5 - - - G4 - B4 - D5 - - - . . . .", // G
      ],
    },
    arp: {
      type: "square",
      vol: 0.028,
      every: 2,
      offset: 1,
      len: 1.3,
      order: [0, 1, 2, 1],
    },
    bass: { vol: 0.2, events: bounce([0, 12], 1.7) },
    chords: {
      C: { root: 48, arp: [60, 64, 67] },
      G: { root: 55, arp: [59, 62, 67] },
      Am: { root: 57, arp: [60, 64, 69] },
      F: { root: 53, arp: [60, 65, 69] },
    },
    progression: ["C", "G", "Am", "F", "C", "G", "F", "G"],
    drums: { kick: [0, 8, 10], snare: [4, 12], hat: [2, 6, 10, 14] },
  },

  // Slow and dreamy, A minor: long soft melody notes over a gentle arpeggio.
  moon: {
    bpm: 92,
    shifts: [0, 2, 5, 3],
    lead: {
      type: "triangle",
      vol: 0.14,
      end: 0.3,
      bars: [
        "E5 - - - - - - - C5 - - - D5 - E5 -", // Am
        "F5 - - - E5 - - - C5 - - - A4 - - -", // F
        "G5 - - - E5 - - - C5 - E5 - G5 - - -", // C
        "D5 - - - B4 - - - D5 - - - G5 - - -", // G
        "A5 - - - E5 - - - C5 - D5 - E5 - - -", // Am
        "A5 - - - G5 - F5 - E5 - - - C5 - - -", // F
        "D5 - - - G5 - - - F5 - E5 - D5 - B4 -", // G
        "B4 - - - E5 - - - D5 - C5 - B4 - - .", // E
      ],
    },
    arp: {
      type: "triangle",
      vol: 0.05,
      end: 0.4,
      every: 4,
      offset: 2,
      len: 3,
      order: [0, 1, 2, 1],
    },
    bass: {
      vol: 0.2,
      events: [
        [0, 0, 6],
        [8, 0, 3],
        [12, 7, 3],
      ],
    },
    chords: {
      Am: { root: 45, arp: [60, 64, 69] },
      F: { root: 41, arp: [60, 65, 69] },
      C: { root: 48, arp: [60, 64, 67] },
      G: { root: 43, arp: [59, 62, 67] },
      E: { root: 40, arp: [59, 64, 68] },
    },
    progression: ["Am", "F", "C", "G", "Am", "F", "G", "E"],
    drums: { kick: [0, 10], snare: [8], hat: [4, 12] },
  },

  // Fast and energetic, D minor: running eighth notes over a driving bass.
  arcade: {
    bpm: 144,
    shifts: [0, 2, 3, 5],
    lead: {
      duty: 0.125,
      vol: 0.07,
      bars: [
        "D5 - F5 - A5 - F5 - D5 - F5 - A5 - D6 -", // Dm
        "D5 - F5 - Bb5 - F5 - D5 - F5 - Bb5 - A5 -", // Bb
        "C5 - F5 - A5 - F5 - C5 - F5 - A5 - C6 -", // F
        "E5 - G5 - C6 - G5 - E5 - G5 - C6 - B5 -", // C
        "A5 - - - F5 - D5 - A4 - D5 - F5 - A5 -", // Dm
        "Bb5 - - - F5 - D5 - Bb4 - D5 - F5 - Bb5 -", // Bb
        "C6 - - - G5 - E5 - C5 - E5 - G5 - E5 -", // C
        "A5 - G5 - E5 - C#5 - A4 - C#5 - E5 - - .", // A
      ],
    },
    arp: {
      type: "square",
      vol: 0.025,
      every: 2,
      offset: 1,
      len: 1.2,
      order: [0, 2, 1, 2],
    },
    bass: { vol: 0.2, events: bounce([0, 0, 12, 0], 1.6) },
    chords: {
      Dm: { root: 50, arp: [62, 65, 69] },
      Bb: { root: 46, arp: [58, 62, 65] },
      F: { root: 41, arp: [60, 65, 69] },
      C: { root: 48, arp: [60, 64, 67] },
      A: { root: 45, arp: [57, 61, 64] },
    },
    progression: ["Dm", "Bb", "F", "C", "Dm", "Bb", "C", "A"],
    drums: {
      kick: [0, 6, 8, 14],
      snare: [4, 12],
      hat: [0, 2, 4, 6, 8, 10, 12, 14],
    },
  },
};

// ---- Parsing / validation (runs once at load, so a typo in a tune fails loudly) ----
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`Bad note: ${name}`);
  return (
    12 * (Number(m[3]) + 1) +
    NOTE_PC[m[1]] +
    (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)
  );
}

function parseLead(id, bars) {
  const events = new Array(bars.length * 16).fill(null);
  let cur = null;
  bars.forEach((bar, b) => {
    const tokens = bar.trim().split(/\s+/);
    if (tokens.length !== 16)
      throw new Error(`${id}: bar ${b + 1} has ${tokens.length} steps`);
    tokens.forEach((tok, i) => {
      if (tok === "-") {
        if (cur) cur.len++;
      } else if (tok === ".") {
        cur = null;
      } else {
        cur = { midi: noteToMidi(tok), len: 1 };
        events[b * 16 + i] = cur;
      }
    });
  });
  return events;
}

for (const [id, tr] of Object.entries(TRACKS)) {
  tr.id = id;
  tr.sixteenth = 60 / tr.bpm / 4;
  tr.steps = tr.lead.bars.length * 16;
  tr.leadEvents = parseLead(id, tr.lead.bars);
  if (tr.progression.length !== tr.lead.bars.length)
    throw new Error(`${id}: progression length`);
  for (const name of tr.progression) {
    if (!tr.chords[name]) throw new Error(`${id}: unknown chord ${name}`);
  }
  tr.bassByStep = new Array(16).fill(null);
  for (const ev of tr.bass.events) tr.bassByStep[ev[0]] = ev;
}

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

/** Pulse wave with the given duty cycle (0.5 = square). */
function makePulse(ctx, duty) {
  const N = 48;
  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  for (let n = 1; n < N; n++) {
    real[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
    imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
  }
  return ctx.createPeriodicWave(real, imag);
}

class Music {
  constructor() {
    this.ctx = null;
    this.input = null;
    this.lp = null;
    this.pulses = new Map();

    this.trackId = null;
    this.track = null;
    this.nextTime = 0;
    this.step = 0;
    this.shift = 0;

    this.calm = null;
    this.playing = false;
    this.theme = 0;
  }

  build(ctx) {
    this.ctx = ctx;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = CUTOFF.normal;
    lp.Q.value = 0.5;
    lp.connect(audio.bus);

    const input = ctx.createGain();
    input.gain.value = LEVEL.normal;
    input.connect(lp);

    this.lp = lp;
    this.input = input;
    this.calm = false;
  }

  pulse(duty) {
    if (!this.pulses.has(duty))
      this.pulses.set(duty, makePulse(this.ctx, duty));
    return this.pulses.get(duty);
  }

  setTrack(id) {
    this.trackId = id;
    this.track = TRACKS[id] || TRACKS.sunny;
    this.step = 0;
    this.nextTime = 0; // start the new track right away, from its first bar
  }

  /** Called every frame. `calm` muffles the music (paused / game over). */
  update({ playing, calm, theme, track }) {
    const ctx = audio.ctx;
    if (!ctx || ctx.state !== "running" || audio.muted) {
      this.nextTime = 0; // re-sync when sound comes back
      return;
    }
    if (!this.input) this.build(ctx);
    if (!this.track || track !== this.trackId) this.setTrack(track);

    this.playing = playing;
    this.theme = theme;
    this.setCalm(calm);

    const tr = this.track;
    const now = ctx.currentTime;
    if (this.nextTime < now) {
      // First start, or coming back after a pause / hidden tab: restart at the top of a bar.
      this.nextTime = now + 0.08;
      this.step -= this.step % 16;
    }
    while (this.nextTime < now + LOOKAHEAD) {
      this.scheduleStep(this.nextTime);
      this.nextTime += tr.sixteenth;
      this.step = (this.step + 1) % tr.steps;
    }
  }

  setCalm(calm) {
    if (calm === this.calm) return;
    this.calm = calm;
    const t = this.ctx.currentTime;
    this.input.gain.setTargetAtTime(calm ? LEVEL.calm : LEVEL.normal, t, 0.2);
    this.lp.frequency.setTargetAtTime(
      calm ? CUTOFF.calm : CUTOFF.normal,
      t,
      0.2,
    );
  }

  scheduleStep(t) {
    const tr = this.track;
    const s = this.step;
    const st = s & 15; // step within the bar
    const chord = tr.chords[tr.progression[s >> 4]];

    // Key changes only at the start of the loop so the tune is never cut in half.
    if (s === 0) this.shift = tr.shifts[this.theme] ?? 0;
    const sh = this.shift;

    // Lead
    const lead = tr.leadEvents[s];
    if (lead) {
      this.voice({
        wave: tr.lead.duty ? this.pulse(tr.lead.duty) : null,
        type: tr.lead.type,
        freq: mtof(lead.midi + sh),
        t,
        dur: lead.len * tr.sixteenth * 0.95,
        vol: tr.lead.vol,
        end: tr.lead.end,
      });
    }

    // Arpeggio
    const a = tr.arp;
    if (a && st >= a.offset && (st - a.offset) % a.every === 0) {
      const idx = a.order[((st - a.offset) / a.every) % a.order.length];
      this.voice({
        type: a.type,
        freq: mtof(chord.arp[idx] + sh),
        t,
        dur: tr.sixteenth * a.len,
        vol: a.vol,
        end: a.end,
      });
    }

    // Bass
    const b = tr.bassByStep[st];
    if (b) {
      this.voice({
        type: "triangle",
        freq: mtof(chord.root + sh + b[1]),
        t,
        dur: tr.sixteenth * b[2],
        vol: tr.bass.vol,
      });
    }

    if (DRUMS && this.playing) this.drums(tr.drums, st, t);
  }

  drums(d, st, t) {
    if (d.kick.includes(st)) this.kick(t);
    if (d.snare.includes(st)) this.snare(t);
    if (d.hat.includes(st)) this.hat(t);
  }

  // ---- Voices ----
  /** One note with a short attack and a linear decay (no clicks). `end` = level at the note's end. */
  voice({ wave, type = "square", freq, t, dur, vol, end = 0.7 }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    if (wave) o.setPeriodicWave(wave);
    else o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.linearRampToValueAtTime(vol * end, t + Math.max(0.006, dur - 0.02));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g);
    g.connect(this.input);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.003);
    g.gain.linearRampToValueAtTime(0, t + 0.16);
    o.connect(g);
    g.connect(this.input);
    o.start(t);
    o.stop(t + 0.18);
  }

  noiseHit(t, dur, vol, filterType, freq) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = audio.getNoiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.002);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.input);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  snare(t) {
    this.noiseHit(t, 0.1, 0.055, "bandpass", 1800);
  }

  hat(t) {
    this.noiseHit(t, 0.03, 0.02, "highpass", 4500);
  }
}

export const music = new Music();
