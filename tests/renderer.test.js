import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as C from "../src/config.js";
import { ENEMIES, bossWall } from "../src/enemies.js";
import { Game, State } from "../src/game.js";
import { Renderer } from "../src/renderer.js";

// A canvas context that accepts every call; enough to catch typos and undefined variables.
function fakeContext() {
  const target = { measureText: () => ({ width: 10 }) };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === "createLinearGradient" || prop === "createRadialGradient")
        return () => ({ addColorStop() {} });
      return () => {};
    },
    set(t, prop, value) {
      t[prop] = value;
      return true;
    },
  });
}

function fakeCanvas() {
  const ctx = fakeContext();
  return { width: 0, height: 0, style: {}, getContext: () => ctx };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  });
  vi.stubGlobal("window", { devicePixelRatio: 2 });
  vi.stubGlobal("document", { createElement: () => fakeCanvas() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("renderer", () => {
  it("draws every screen without throwing", () => {
    const game = new Game();
    const renderer = new Renderer(fakeCanvas(), {
      clientWidth: 360,
      clientHeight: 640,
    });
    game.save.coins = 1000;
    for (const mode of ["casual", "classic", "rescue", "rush"]) {
      game.setMode(mode);
      renderer.draw(game); // ready

      game.queueFlap();
      for (let i = 0; i < 600; i++) {
        game.update(C.STEP);
        if (i % 3 === 0) game.queueFlap();
        if (i === 200) {
          game.wind = { state: "warn", t: 1, dir: -1, time: 0 };
          game.toast("Achievement: Test", "+10 coins");
          game.popup("Perfect x3", 100, 100);
          game.collect("gem", 200, 200);
          game.collect("gold", 200, 200);
        }
        if (i === 250 && mode === "rescue") {
          for (const id of ["owl", "parrot", "penguin"])
            game.onRescue({ x: 200, y: 200, friend: id });
          game.onHit({ x: 200, y: 200 });
          game.grabHourglass(200, 200);
        }
        if (i === 300) game.wind = { state: "blow", t: 1, dir: 1, time: 1 };
        if (i % 5 === 0) renderer.draw(game);
      }
      if (game.state !== State.DEAD) game.die();
      game.rank = 2;
      renderer.draw(game); // game over (rank)
      game.endReason = "time";
      renderer.draw(game);
      game.endReason = "quit";
      renderer.draw(game);
      game.reset();
    }
    expect(game.state).toBe(State.READY);
  });

  it("draws every Rescue enemy, pickup and power-up state", () => {
    const game = new Game();
    const renderer = new Renderer(fakeCanvas(), {
      clientWidth: 360,
      clientHeight: 640,
    });
    game.setMode("rescue");
    game.queueFlap();
    for (let i = 0; i < 30; i++) game.update(C.STEP);
    game.level = () => 40;
    const f = game.field;
    f.items.length = 0;
    f.nextBoss = Infinity;
    for (const e of ENEMIES) e.spawn(f, game, 250, 300, 40);
    for (const kind of ["hourglass", "feather", "magnet"])
      f.items.push({
        kind,
        x: 200,
        y: 250,
        baseY: 250,
        amp: 0,
        freq: 1,
        phase: 0,
      });
    f.items.push(f.cage(game, 150, 300, true), f.cage(game, 250, 200, false));
    game.ghost = 3;
    game.magnet = 3;
    for (const state of ["sit", "crouch", "jump", "landed", "warn", "fly"]) {
      for (const it of f.items) {
        if (it.kind === "cat" || it.kind === "dive") {
          it.state = state;
          it.vx = -300;
          it.vy = 200;
        }
      }
      renderer.draw(game);
    }
    f.items.length = 0;
    game.rescued = C.BOSS_EVERY;
    f.nextBoss = C.BOSS_EVERY;
    f.spawnWave(game);
    renderer.draw(game);
    expect(f.items.some((i) => i.kind === "wall")).toBe(true);
    for (const style of ["tree", "castle"]) {
      f.items.length = 0;
      f.items.push(bossWall(style, 250, 300));
      renderer.draw(game);
    }
  });

  it("draws with every trail, pipe style, world and skin equipped", () => {
    const game = new Game();
    const renderer = new Renderer(fakeCanvas(), {
      clientWidth: 360,
      clientHeight: 640,
    });
    const cats = ["skin", "world", "pipe", "trail"];
    for (const kind of cats) {
      const items = {
        skin: ["classic", "robot", "wizard"],
        world: ["meadow", "space"],
        pipe: ["auto", "gold", "neon"],
        trail: ["none", "spark", "hearts", "stars", "rainbow"],
      }[kind];
      for (const id of items) {
        game.save.owned[kind].push(id);
        game.equip(kind, id);
        game.queueFlap();
        for (let i = 0; i < 60; i++) game.update(C.STEP);
        renderer.draw(game);
        game.reset();
      }
    }
  });
});
