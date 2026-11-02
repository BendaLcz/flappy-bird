// Development readout: frame rate and tap latency. Shown automatically in `npm run dev`,
// and in any build with `?perf` in the address (e.g. http://192.168.1.20:4173/?perf).
// `?perf=0` hides it again. It is plain DOM text, so it adds almost nothing to the frame cost.

const WINDOW = 60; // frames kept for the frame-rate figures
const TAPS = 20; // taps kept for the latency figures

export function perfEnabled() {
  const q = new URLSearchParams(globalThis.location?.search ?? "").get("perf");
  if (q !== null) return q !== "0" && q !== "false";
  return !!import.meta.env?.DEV;
}

const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const push = (a, v, max) => {
  a.push(v);
  if (a.length > max) a.shift();
};

export class PerfMeter {
  constructor() {
    this.prev = null;
    this.frames = []; // recent frame-to-frame times (ms)
    this.pending = null; // time of a tap that has not been drawn yet
    this.latencies = []; // tap -> end of the frame that shows it (ms)
    this.inputDelays = []; // tap -> our handler running (ms)
  }

  /** Call once per animation frame with the frame's timestamp. */
  frame(t) {
    if (this.prev !== null) push(this.frames, t - this.prev, WINDOW);
    this.prev = t;
  }

  /**
   * A tap or key press reached the game. `eventTs` is the event's own timestamp (when the
   * browser got it), `now` is the time our handler ran.
   */
  tap(eventTs, now) {
    const ok =
      Number.isFinite(eventTs) && eventTs <= now && now - eventTs < 1000;
    const start = ok ? eventTs : now;
    push(this.inputDelays, now - start, TAPS);
    if (this.pending === null) this.pending = start; // several taps before a frame: the oldest counts
  }

  /**
   * Call after each frame has been drawn. `stillQueued` is true while the game has not yet
   * turned the tap into a flap (it happens in the next simulation step).
   */
  drawn(now, stillQueued = false) {
    if (this.pending === null || stillQueued) return;
    push(this.latencies, now - this.pending, TAPS);
    this.pending = null;
  }

  stats() {
    const f = this.frames;
    const mean = avg(f);
    return {
      fps: mean ? 1000 / mean : 0,
      frameMs: mean,
      worstMs: f.length ? Math.max(...f) : 0,
      tapLast: this.latencies.at(-1) ?? null,
      tapAvg: this.latencies.length ? avg(this.latencies) : null,
      tapMax: this.latencies.length ? Math.max(...this.latencies) : null,
      inputLast: this.inputDelays.at(-1) ?? null,
      taps: this.latencies.length,
    };
  }

  text() {
    const s = this.stats();
    const ms = (v) => (v === null ? "-" : `${v.toFixed(0)}ms`);
    return [
      `${s.fps.toFixed(0)} fps  ${s.frameMs.toFixed(1)}ms  worst ${s.worstMs.toFixed(0)}ms`,
      `tap->draw ${ms(s.tapLast)}  avg ${ms(s.tapAvg)}  max ${ms(s.tapMax)}`,
      `input delay ${ms(s.inputLast)}`,
    ].join("\n");
  }
}

/** A small text box in a corner of the stage that shows the meter a few times a second. */
export class PerfOverlay {
  constructor(parent, meter) {
    this.meter = meter;
    this.last = 0;
    this.el = document.createElement("div");
    this.el.className = "perf";
    this.el.setAttribute("aria-hidden", "true");
    parent.append(this.el);
  }

  update(now) {
    if (now - this.last < 250) return;
    this.last = now;
    this.el.textContent = this.meter.text();
  }
}
