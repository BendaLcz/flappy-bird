import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  DEFAULT_EQUIPPED,
  MAGNET_RADIUS,
  UPGRADES,
  findItem,
  upgradeMax,
  upgradePrice,
} from "../src/catalog.js";
import { MODES, findMode } from "../src/modes.js";
import { TRACKS as COMPOSITIONS } from "../src/music.js";

describe("catalog", () => {
  it("has unique ids inside every category", () => {
    for (const cat of CATEGORIES) {
      const ids = cat.items.map((i) => i.id);
      expect(new Set(ids).size, cat.id).toBe(ids.length);
    }
  });

  it("gives every item a name and a non-negative integer price", () => {
    for (const cat of CATEGORIES) {
      for (const item of cat.items) {
        expect(item.name, `${cat.id}/${item.id}`).toBeTruthy();
        expect(Number.isInteger(item.price), `${cat.id}/${item.id}`).toBe(true);
        expect(item.price).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("equips free items by default", () => {
    for (const cat of CATEGORIES) {
      const item = cat.items.find((i) => i.id === DEFAULT_EQUIPPED[cat.id]);
      expect(item, cat.id).toBeDefined();
      expect(item.price).toBe(0);
    }
  });

  it("has a composition for every music track", () => {
    const tracks = CATEGORIES.find((c) => c.id === "track").items;
    for (const t of tracks) expect(COMPOSITIONS[t.id], t.id).toBeDefined();
  });

  it("gives every world four themes and pipe colors", () => {
    const worlds = CATEGORIES.find((c) => c.id === "world").items;
    for (const w of worlds) {
      expect(w.themes).toHaveLength(4);
      expect(w.pipe.mid).toBeTruthy();
    }
  });

  it("gives colored pipe styles a full palette and trails a shape", () => {
    for (const p of CATEGORIES.find((c) => c.id === "pipe").items) {
      if (p.price > 0)
        expect(Object.keys(p.colors).sort()).toEqual([
          "dark",
          "light",
          "mid",
          "outline",
        ]);
    }
    for (const t of CATEGORIES.find((c) => c.id === "trail").items) {
      if (t.price > 0) expect(t.shape, t.id).toBeTruthy();
    }
  });

  it("falls back to the first item for unknown ids", () => {
    expect(findItem("skin", "nope").id).toBe("classic");
  });
});

describe("upgrades", () => {
  it("prices levels in order and returns null when maxed", () => {
    const magnet = UPGRADES.find((u) => u.id === "magnet");
    expect(upgradePrice(magnet, 0)).toBe(magnet.prices[0]);
    expect(upgradePrice(magnet, 2)).toBe(magnet.prices[2]);
    expect(upgradePrice(magnet, upgradeMax(magnet))).toBeNull();
  });

  it("charges the same price for every consumable", () => {
    const revive = UPGRADES.find((u) => u.consumable);
    expect(upgradePrice(revive, 0)).toBe(upgradePrice(revive, 2));
  });

  it("has a magnet radius for every level", () => {
    const magnet = UPGRADES.find((u) => u.id === "magnet");
    expect(MAGNET_RADIUS).toHaveLength(upgradeMax(magnet) + 1);
  });
});

describe("modes", () => {
  it("falls back to classic", () => {
    expect(findMode("???").id).toBe("classic");
  });

  it("has unique ids and the timed modes cannot kill you", () => {
    expect(new Set(MODES.map((m) => m.id)).size).toBe(MODES.length);
    expect(MODES.map((m) => m.id)).toEqual([
      "casual",
      "classic",
      "rush",
      "rescue",
    ]);
    for (const id of ["rescue", "rush"]) {
      expect(findMode(id).deadly).toBe(false);
      expect(findMode(id).crashPenalty).toBeGreaterThan(0);
    }
  });
});
