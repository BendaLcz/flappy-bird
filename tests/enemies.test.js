import { describe, expect, it } from "vitest";
import * as C from "../src/config.js";
import {
  ENEMIES,
  bossWall,
  enemyHit,
  moveEnemy,
  wallGapY,
} from "../src/enemies.js";

const def = (id) => ENEMIES.find((e) => e.id === id);
const fakeGame = (y = 300) => ({ bird: { y }, time: 0 });
const DT = C.STEP;

function spawn(id, game = fakeGame(), x = C.W + 100, y = 300) {
  const field = { items: [] };
  def(id).spawn(field, game, x, y, 30);
  return field.items;
}

/** Runs one enemy for `seconds` and returns what happened on the way. */
function fly(it, game, seconds, speed = 150, boost = 1) {
  const path = [];
  for (let t = 0; t < seconds; t += DT) {
    game.time += DT;
    moveEnemy(it, game, DT, speed, boost);
    path.push({ x: it.x, y: it.y, state: it.state });
  }
  return path;
}

describe("enemy spawners", () => {
  it("make well-formed enemies inside the playfield", () => {
    for (const e of ENEMIES) {
      for (let n = 0; n < 50; n++) {
        const items = spawn(e.id);
        expect(items.length).toBeGreaterThan(0);
        for (const it of items) {
          expect(it.enemy).toBe(true);
          expect(it.r).toBeGreaterThan(0);
          expect(it.penalty).toBeGreaterThan(0);
          expect(Number.isFinite(it.y)).toBe(true);
          expect(it.y).toBeGreaterThan(0);
          expect(it.y).toBeLessThan(C.H);
        }
      }
    }
    expect(spawn("swarm")).toHaveLength(4);
  });

  it("introduce the types in a fixed order", () => {
    expect(ENEMIES.map((e) => e.id)).toEqual([
      "balloon",
      "wasp",
      "hawk",
      "cactus",
      "spider",
      "dive",
      "cat",
      "swarm",
    ]);
    const levels = ENEMIES.map((e) => e.from);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });
});

describe("enemy movement", () => {
  it("wasps zigzag", () => {
    const [w] = spawn("wasp");
    const ys = fly(w, fakeGame(), 2).map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40);
  });

  it("hawks outrun the scrolling and steer towards the bird", () => {
    const [h] = spawn("hawk", fakeGame(500));
    h.x = C.BIRD_X + 400;
    h.baseY = 100;
    const path = fly(h, fakeGame(500), 0.5);
    expect(C.BIRD_X + 400 - h.x).toBeGreaterThan(150 * 0.5 + 20);
    expect(h.baseY).toBeGreaterThan(100 + 30);
    expect(path.length).toBeGreaterThan(0);
  });

  it("pressure makes enemies faster", () => {
    const run = (boost) => {
      const [h] = spawn("hawk");
      h.x = 500;
      fly(h, fakeGame(), 1, 150, boost);
      return h.x;
    };
    expect(run(1 + C.RESCUE_PRESSURE_BOOST)).toBeLessThan(run(1) - 10);
  });

  it("a hawk dive is announced, then crosses the bird's height at the bird", () => {
    for (const birdY of [130, 400]) {
      const game = fakeGame(birdY);
      const [d] = spawn("dive", game);
      expect(d.state).toBe("warn");
      expect(d.x).toBeLessThan(C.W); // the marker is on screen

      // harmless while it is only a warning
      expect(enemyHit(d, d.x, d.y, C.BIRD_HIT_R)).toBe(false);
      const warn = fly(d, game, C.DIVE_WARN - 0.05);
      expect(warn.every((p) => p.state === "warn")).toBe(true);
      expect(warn[warn.length - 1].x).toBe(d.x);

      let at = null;
      for (const p of fly(d, game, 3)) {
        if (!at && p.x <= C.BIRD_X) at = p;
      }
      expect(d.state).toBe("fly");
      expect(at).not.toBeNull();
      expect(Math.abs(at.y - birdY)).toBeLessThan(45);
    }
  });

  it("a spider bobs on its thread", () => {
    const [s] = spawn("spider");
    expect(s.stemY).toBe(0);
    const ys = fly(s, fakeGame(), 3).map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(15);
  });

  it("a cat shakes, then leaps so that it is at the top of its jump over the bird", () => {
    const [cat] = spawn("cat");
    const ground = cat.baseY;
    const height = cat.jumpV ** 2 / (2 * 900);
    const states = [];
    let top = { x: Infinity, y: Infinity };
    for (const p of fly(cat, fakeGame(), 6)) {
      if (states[states.length - 1] !== p.state) states.push(p.state);
      if (p.y < top.y) top = p;
    }
    expect(states).toEqual(["sit", "crouch", "jump", "landed"]);
    expect(cat.baseY).toBe(ground);
    expect(Math.abs(ground - top.y - height)).toBeLessThan(4);
    expect(Math.abs(top.x - C.BIRD_X)).toBeLessThan(8);
  });
});

describe("enemy collisions", () => {
  it("use a circle, plus the trunk or thread for cacti and spiders", () => {
    const balloon = { kind: "balloon", x: 200, y: 200, r: 17 };
    expect(
      enemyHit(balloon, 200, 200 + 17 + C.BIRD_HIT_R - 1, C.BIRD_HIT_R),
    ).toBe(true);
    expect(
      enemyHit(balloon, 200, 200 + 17 + C.BIRD_HIT_R + 1, C.BIRD_HIT_R),
    ).toBe(false);

    const spider = {
      kind: "spider",
      x: 200,
      y: 150,
      r: 11,
      stemY: 0,
      stemR: 3,
    };
    expect(enemyHit(spider, 200, 60, C.BIRD_HIT_R)).toBe(true); // on the thread
    expect(enemyHit(spider, 200, 170, C.BIRD_HIT_R)).toBe(true); // on the spider
    expect(enemyHit(spider, 230, 60, C.BIRD_HIT_R)).toBe(false); // beside the thread
    expect(enemyHit(spider, 200, 180, C.BIRD_HIT_R)).toBe(false); // below the spider

    const [cactus] = spawn("cactus");
    cactus.x = 200;
    const tip = cactus.y;
    expect(enemyHit(cactus, 200, tip - 15, C.BIRD_HIT_R)).toBe(true); // top
    expect(enemyHit(cactus, 200, C.GROUND_Y - 20, C.BIRD_HIT_R)).toBe(true); // trunk
    expect(enemyHit(cactus, 240, C.GROUND_Y - 20, C.BIRD_HIT_R)).toBe(false); // beside
    expect(enemyHit(cactus, 200, tip - 40, C.BIRD_HIT_R)).toBe(false); // above
  });
});

describe("boss walls", () => {
  it("keep the opening on screen", () => {
    for (const target of [-100, 0, 70, 300, 600, 900]) {
      const y = wallGapY(target);
      expect(y - C.WALL_GAP / 2).toBeGreaterThan(0);
      expect(y + C.WALL_GAP / 2).toBeLessThan(C.GROUND_Y);
    }
  });

  it("hurt anywhere but in the opening, and only once", () => {
    const wall = bossWall("tree", 200, 300);
    const r = C.BIRD_HIT_R;
    expect(enemyHit(wall, 200, 300, r)).toBe(false); // in the opening
    expect(enemyHit(wall, 200, 300 + C.WALL_GAP / 2 - r - 1, r)).toBe(false);
    expect(enemyHit(wall, 200, 300 + C.WALL_GAP / 2 - r + 1, r)).toBe(true);
    expect(enemyHit(wall, 200, 300 - C.WALL_GAP / 2 + r - 1, r)).toBe(true);
    expect(enemyHit(wall, 200, 20, r)).toBe(true);
    expect(enemyHit(wall, 200, C.GROUND_Y - 20, r)).toBe(true);
    // before and after the wall
    expect(enemyHit(wall, 200 - C.WALL_W / 2 - r - 1, 20, r)).toBe(false);
    expect(enemyHit(wall, 200 + C.WALL_W / 2 + r + 1, 20, r)).toBe(false);
    wall.spent = true;
    expect(enemyHit(wall, 200, 20, r)).toBe(false);
  });

  it("leave a gap the bird fits through with room to spare", () => {
    expect(C.WALL_GAP - 2 * C.BIRD_HIT_R).toBeGreaterThan(60);
  });
});
