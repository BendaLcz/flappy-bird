import { describe, expect, it } from "vitest";
import { UPGRADES, upgradeMax } from "../src/catalog.js";
import { MISSION_COUNT } from "../src/progress.js";
import { sanitizeSave } from "../src/storage.js";

describe("sanitizeSave", () => {
  it("builds a complete default save from nothing", () => {
    for (const input of [undefined, null, 42, "x", []]) {
      const s = sanitizeSave(input);
      expect(s.coins).toBe(0);
      expect(s.mode).toBe("classic");
      expect(s.owned.skin).toContain("classic");
      expect(s.equipped.pipe).toBe("auto");
      expect(s.missions).toHaveLength(MISSION_COUNT);
      expect(s.settings.musicVolume).toBe(1);
      expect(s.bests.classic).toBe(0);
    }
  });

  it("keeps valid data", () => {
    const s = sanitizeSave({
      coins: 120,
      mode: "rush",
      owned: { skin: ["classic", "robot"] },
      equipped: { skin: "robot" },
      upgrades: { magnet: 2 },
      bests: { rush: 17 },
      settings: { musicVolume: 0.3, tapAnywhere: true },
    });
    expect(s.coins).toBe(120);
    expect(s.mode).toBe("rush");
    expect(s.equipped.skin).toBe("robot");
    expect(s.upgrades.magnet).toBe(2);
    expect(s.bests.rush).toBe(17);
    expect(s.settings.musicVolume).toBe(0.3);
    expect(s.settings.tapAnywhere).toBe(true);
  });

  it("rejects what is not allowed", () => {
    const s = sanitizeSave({
      coins: -5,
      mode: "cheat",
      owned: { skin: ["ghost-skin"] },
      equipped: { skin: "robot", world: "space" }, // not owned
      upgrades: { magnet: 99, revive: -3 },
      settings: { musicVolume: 7, sfxVolume: "loud" },
    });
    expect(s.coins).toBe(0);
    expect(s.mode).toBe("classic");
    expect(s.owned.skin).not.toContain("ghost-skin");
    expect(s.equipped.skin).toBe("classic");
    expect(s.equipped.world).toBe("meadow");
    const magnet = UPGRADES.find((u) => u.id === "magnet");
    expect(s.upgrades.magnet).toBe(upgradeMax(magnet));
    expect(s.upgrades.revive).toBe(0);
    expect(s.settings.musicVolume).toBe(1);
    expect(s.settings.sfxVolume).toBe(1);
  });

  it("only keeps known modes and friends", () => {
    const s = sanitizeSave({
      mode: "hard",
      bests: { hard: 30, zen: 3 },
      friends: { parrot: 3, ghost: 2, owl: -1, toucan: 1.9 },
    });
    expect(s.mode).toBe("classic");
    expect(s.bests.hard).toBeUndefined();
    expect(s.bests.zen).toBeUndefined();
    expect(s.friends).toEqual({ parrot: 3, toucan: 1 });
    expect(sanitizeSave({}).friends).toEqual({});
  });

  it("is idempotent", () => {
    const once = sanitizeSave({ coins: 5, bests: { rush: 3 } });
    expect(sanitizeSave(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });
});
