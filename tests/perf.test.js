import { describe, expect, it } from "vitest";
import { PerfMeter } from "../src/perf.js";

describe("PerfMeter", () => {
  it("works out the frame rate and the worst frame", () => {
    const m = new PerfMeter();
    for (let i = 0; i < 30; i++) m.frame(i * 16.667);
    m.frame(30 * 16.667 + 50); // one long frame
    const s = m.stats();
    expect(s.fps).toBeGreaterThan(50);
    expect(s.fps).toBeLessThan(60);
    expect(s.worstMs).toBeGreaterThan(60);
  });

  it("measures from the tap to the frame that shows it", () => {
    const m = new PerfMeter();
    m.tap(100, 106); // the browser got it at 100, our handler ran at 106
    m.drawn(130);
    const s = m.stats();
    expect(s.inputLast).toBe(6);
    expect(s.tapLast).toBe(30);
    expect(s.taps).toBe(1);
    m.drawn(200); // nothing pending: no second sample
    expect(m.stats().taps).toBe(1);
  });

  it("waits while the flap is still queued, and counts the oldest of several taps", () => {
    const m = new PerfMeter();
    m.tap(100, 101);
    m.tap(110, 111);
    m.drawn(120, true); // game has not applied it yet
    expect(m.stats().taps).toBe(0);
    m.drawn(140, false);
    expect(m.stats().tapLast).toBe(40);
  });

  it("ignores a bogus event timestamp", () => {
    const m = new PerfMeter();
    m.tap(undefined, 500);
    m.tap(Date.now(), 500); // epoch-based stamp from an old browser
    expect(m.stats().inputLast).toBe(0);
    m.drawn(520);
    expect(m.stats().tapLast).toBe(20);
  });

  it("prints a readable summary", () => {
    const m = new PerfMeter();
    expect(m.text()).toContain("tap->draw -");
    m.tap(0, 2);
    m.frame(0);
    m.frame(16);
    m.drawn(25);
    expect(m.text()).toContain("tap->draw 25ms");
  });
});
