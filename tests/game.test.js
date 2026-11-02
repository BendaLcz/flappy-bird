import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as C from "../src/config.js";
import { ENEMIES, bossWall, enemyHit } from "../src/enemies.js";
import { FRIENDS } from "../src/friends.js";
import { Game, State } from "../src/game.js";

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

let game;

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeStorage());
  game = new Game();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Runs the simulation for `seconds`, calling `each` before every step. */
function run(seconds, each) {
  for (let t = 0; t < seconds; t += C.STEP) {
    each?.();
    game.update(C.STEP);
  }
}

describe("shop", () => {
  it("refuses purchases without enough coins", () => {
    expect(game.buy("skin", "robot")).toBe("poor");
    expect(game.owns("skin", "robot")).toBe(false);
  });

  it("buys an item once and takes the coins", () => {
    game.save.coins = 500;
    expect(game.buy("trail", "spark")).toBe("ok");
    expect(game.owns("trail", "spark")).toBe(true);
    expect(game.save.coins).toBeLessThan(500);
    expect(game.buy("trail", "spark")).toBe("owned");
    expect(game.save.stats.purchases).toBe(1);
    expect(game.equip("trail", "spark")).toBe(true);
    expect(game.equip("trail", "fire")).toBe(false); // not owned
  });

  it("levels up upgrades until they are maxed", () => {
    game.save.coins = 10000;
    expect(game.buyUpgrade("magnet")).toBe("ok");
    expect(game.buyUpgrade("magnet")).toBe("ok");
    expect(game.buyUpgrade("magnet")).toBe("ok");
    expect(game.buyUpgrade("magnet")).toBe("max");
    expect(game.upgradeLevel("magnet")).toBe(3);
    expect(game.buyUpgrade("nope")).toBe("unknown");
  });

  it("gives a shield right away when Head Start is bought on the title screen", () => {
    game.save.coins = 1000;
    expect(game.shield).toBe(false);
    game.buyUpgrade("headstart");
    expect(game.shield).toBe(true);
    game.reset();
    expect(game.shield).toBe(true);
  });

  it("does not count revives as something to save up for", () => {
    game.save.coins = 30;
    expect(game.canAffordSomething()).toBe(true); // something cheap in the shop
    game.save.coins = 0;
    expect(game.canAffordSomething()).toBe(false);
  });
});

describe("coins", () => {
  it("pays 1 / 5 / 25 coins for coin, gold coin and diamond", () => {
    game.collect("coin", 100, 100);
    expect(game.runCoins).toBe(1);
    game.collect("gold", 100, 100);
    expect(game.runCoins).toBe(6);
    game.collect("gem", 100, 100);
    expect(game.runCoins).toBe(6 + C.GEM_VALUE);
    expect(game.save.coins).toBeGreaterThanOrEqual(6 + C.GEM_VALUE);
    expect(game.save.stats).toMatchObject({ coins: 1, gold: 1, gems: 1 });
    expect(C.GOLD_VALUE).toBe(5);
    expect(C.GEM_VALUE).toBe(25);
  });

  it("an hourglass adds time and stops the clock for a few seconds", () => {
    game.setMode("rush");
    const before = game.timeLeft;
    game.collect("hourglass", 100, 100);
    expect(game.timeLeft).toBe(before + C.HOURGLASS_BONUS);
    expect(game.freeze).toBe(C.HOURGLASS_FREEZE);
    expect(game.save.stats.powerups).toBe(1);

    const safe = () => (game.invuln = 5); // no crash penalties while measuring the clock
    game.queueFlap();
    run(0.05, safe);
    const t = game.timeLeft;
    run(1, safe);
    expect(game.timeLeft).toBe(t); // frozen
    run(C.HOURGLASS_FREEZE, safe);
    expect(game.timeLeft).toBeLessThan(t); // running again
    expect(game.freeze).toBe(0);
  });

  it("only offers hourglasses in modes with a clock", () => {
    const types = (id) => {
      game.setMode(id);
      const seen = new Set();
      for (let i = 0; i < 400; i++) seen.add(game.rollItem()?.type);
      return seen;
    };
    expect(types("classic").has("hourglass")).toBe(false);
    expect(types("rush").has("hourglass")).toBe(true);
  });

  it("applies power-ups", () => {
    game.collect("shield", 0, 0);
    expect(game.shield).toBe(true);
    game.collect("slow", 0, 0);
    expect(game.slow).toBeGreaterThan(0);
    expect(game.save.stats.powerups).toBe(2);
  });

  it("eases back to normal speed instead of snapping when slow-mo ends", () => {
    game.slow = C.SLOWMO_TIME;
    expect(game.timeScale()).toBeCloseTo(C.SLOWMO_SCALE);
    game.slow = C.SLOWMO_RAMP; // ramp starts here, still full slow-mo
    expect(game.timeScale()).toBeCloseTo(C.SLOWMO_SCALE);

    let prev = game.timeScale();
    let maxJump = 0;
    for (let s = C.SLOWMO_RAMP; s > 0; s -= C.STEP) {
      game.slow = s;
      const now = game.timeScale();
      expect(now).toBeGreaterThanOrEqual(prev - 1e-9); // monotonic
      maxJump = Math.max(maxJump, now - prev);
      prev = now;
    }
    expect(maxJump).toBeLessThan(0.01); // tiny steps, no sudden jump
    game.slow = 0;
    expect(game.timeScale()).toBe(1);
  });

  it("eases out of the close-call slow-mo too", () => {
    game.bullet = C.CLOSE_SLOW_TIME;
    expect(game.timeScale()).toBeCloseTo(C.CLOSE_SLOW_SCALE);
    game.bullet = C.CLOSE_SLOW_RAMP / 2;
    const mid = game.timeScale();
    expect(mid).toBeGreaterThan(C.CLOSE_SLOW_SCALE);
    expect(mid).toBeLessThan(1);
  });
});

describe("a run", () => {
  it("starts on the first flap and ends in a crash when left alone", () => {
    expect(game.state).toBe(State.READY);
    game.queueFlap();
    run(0.1);
    expect(game.state).toBe(State.PLAYING);
    run(5);
    expect(game.state).toBe(State.DEAD);
    expect(game.endReason).toBe("crash");
    expect(game.save.stats.runs).toBe(1);
    expect(game.save.stats.deaths).toBe(1);
  });

  it("records the score in the best list and leaderboard", () => {
    game.queueFlap();
    run(0.05);
    game.score = 7;
    game.die();
    expect(game.best).toBe(7);
    expect(game.newBest).toBe(true);
    expect(game.rank).toBe(1);
    expect(game.save.scores.classic[0].score).toBe(7);
  });

  it("restarts after the delay", () => {
    game.queueFlap();
    run(0.05);
    game.die();
    expect(game.state).toBe(State.DEAD);
    game.queueFlap();
    run(0.05);
    expect(game.state).toBe(State.DEAD); // too soon
    run(C.RESTART_DELAY);
    game.queueFlap();
    run(0.05);
    expect(game.state).toBe(State.READY);
  });

  it("gets harder with the score", () => {
    const start = { gap: game.gap(), speed: game.speed() };
    game.score = 30;
    expect(game.gap()).toBeLessThan(start.gap);
    expect(game.speed()).toBeGreaterThan(start.speed);
  });

  it("Casual has wider gaps, no wind and a slower ramp than Classic", () => {
    const sample = (id) => {
      game.reset();
      game.setMode(id);
      game.score = 30;
      game.wind = { state: "blow", t: 2, dir: 1, time: 1 };
      return {
        gap: game.gap(),
        speed: game.speed(),
        wind: Math.abs(game.windForce()),
        level: game.level(),
      };
    };
    const casual = sample("casual");
    const classic = sample("classic");
    expect(casual.gap).toBeGreaterThan(classic.gap);
    expect(casual.speed).toBeLessThan(classic.speed);
    expect(casual.wind).toBe(0);
    expect(classic.wind).toBeGreaterThan(0);
    expect(casual.level).toBeLessThan(classic.level);
    // even at the tightest, Casual stays wider than Classic's tightest
    const tightest = (id) => {
      game.reset();
      game.setMode(id);
      game.score = 500;
      return game.gap();
    };
    expect(tightest("casual")).toBeGreaterThan(tightest("classic"));
  });

  it("Casual never starts a wind gust", () => {
    game.setMode("casual");
    game.score = 500;
    game.state = State.PLAYING;
    for (let i = 0; i < 60 / C.STEP; i++) game.updatePlaying(C.STEP);
    expect(game.wind.state).toBe("idle");
  });

  it("cycles through the modes and keeps their scores separate", () => {
    const seen = [];
    for (let i = 0; i < 4; i++) {
      seen.push(game.mode.id);
      game.cycleMode();
    }
    expect(seen).toContain("casual");
    expect(game.mode.id).toBe(seen[0]);
    game.setMode("casual");
    game.score = 4;
    game.state = State.PLAYING;
    game.die();
    expect(game.save.bests.casual).toBe(4);
    expect(game.save.bests.classic).toBe(0);
  });

  it("keeps modes' best scores apart", () => {
    game.score = 5;
    game.state = State.PLAYING;
    game.die();
    game.reset();
    game.setMode("casual");
    expect(game.best).toBe(0);
  });
});

describe("surviving", () => {
  it("lets a shield absorb one hit", () => {
    game.shield = true;
    game.state = State.PLAYING;
    expect(game.hitObstacle()).toBe(false);
    expect(game.shield).toBe(false);
    expect(game.invuln).toBeGreaterThan(0);
    game.invuln = 0;
    expect(game.hitObstacle()).toBe(true);
    expect(game.state).toBe(State.DEAD);
  });

  it("revives once with Second Wind", () => {
    game.save.upgrades.revive = 2;
    game.state = State.PLAYING;
    expect(game.die()).toBe(false);
    expect(game.state).toBe(State.PLAYING);
    expect(game.save.upgrades.revive).toBe(1);
    game.invuln = 0;
    expect(game.die()).toBe(true); // only one revive per run
    expect(game.save.upgrades.revive).toBe(1);
  });

  it("cannot die in Coin Rush, but crashes eat the clock until time is up", () => {
    game.setMode("rush");
    game.queueFlap();
    run(0.1);
    run(30); // never flapping: bounces along the ground, losing time
    expect(game.state).toBe(State.DEAD);
    expect(game.endReason).toBe("time");
    expect(game.runTime).toBeLessThan(30); // a calm run would last the full 60s
  });

  it("lets the player end a run from the pause menu and keeps the score", () => {
    game.queueFlap();
    run(0.1);
    game.score = 6;
    game.save.upgrades.revive = 1;

    expect(game.endRun()).toBe(false); // only while paused
    expect(game.state).toBe(State.PLAYING);

    game.pause();
    expect(game.endRun()).toBe(true);
    expect(game.state).toBe(State.DEAD);
    expect(game.endReason).toBe("quit");
    expect(game.paused).toBe(false);
    expect(game.best).toBe(6);
    expect(game.save.scores.classic[0].score).toBe(6);
    expect(game.save.stats.runs).toBe(1);
    expect(game.save.stats.deaths).toBe(0); // not a crash
    expect(game.save.upgrades.revive).toBe(1); // Second Wind is not used up

    // and a new run can start after the usual delay
    run(C.RESTART_DELAY + 0.1);
    game.queueFlap();
    run(0.05);
    expect(game.state).toBe(State.READY);
  });

  it("ending a Rescue run early still pays the birds' thank-you", () => {
    // park the random missions and get the one-time first-run achievements out of the way
    const parked = () => ({ id: "flaps", target: 1e9, reward: 0, progress: 0 });
    game.save.missions.splice(0, 3, parked(), parked(), parked());
    game.setMode("rescue");
    game.queueFlap();
    run(0.1);
    game.pause();
    game.endRun();
    game.reset();

    game.queueFlap();
    run(0.1);
    game.rescued = 9;
    const coins = game.save.coins;
    game.pause();
    game.endRun();
    expect(game.save.coins - coins).toBe(Math.floor(9 / C.RESCUE_COINS_PER));
  });

  it("ends Rescue when the clock runs out", () => {
    game.setMode("rescue");
    game.queueFlap();
    run(0.05);
    game.timeLeft = 0.05;
    run(0.2);
    expect(game.state).toBe(State.DEAD);
    expect(game.endReason).toBe("time");
  });
});

describe("rescue mode", () => {
  /** Starts a run and clears the field so a test can place its own things. */
  function start() {
    // Missions are random and pay coins; park them on goals that cannot finish here,
    // so the exact coin amounts below stay deterministic.
    const parked = () => ({ id: "flaps", target: 1e9, reward: 0, progress: 0 });
    game.save.missions.splice(
      0,
      game.save.missions.length,
      parked(),
      parked(),
      parked(),
    );
    game.setMode("rescue");
    game.queueFlap();
    run(0.05);
    game.field.items.length = 0;
  }
  const cage = (friend = "parrot") => ({
    kind: "cage",
    x: C.BIRD_X + 4,
    y: game.bird.y,
    baseY: game.bird.y,
    amp: 0,
    freq: 1,
    phase: 0,
    friend,
    missed: false,
  });

  /** An enemy sitting right on the bird. */
  const foe = (kind = "balloon", extra = {}) => ({
    kind,
    enemy: true,
    x: C.BIRD_X + 4,
    y: game.bird.y,
    baseY: game.bird.y,
    amp: 0,
    freq: 1,
    phase: 0,
    vx: 0,
    r: 17,
    penalty: C.HIT_PENALTY,
    ...extra,
  });

  it("has no pipes and the bird cannot die", () => {
    start();
    run(12); // never flapping: bumps along the ground
    expect(game.state).toBe(State.PLAYING);
    expect(game.pipes).toHaveLength(0);
    expect(game.field.items.length).toBeGreaterThan(0);
  });

  it("frees a cage the bird touches", () => {
    start();
    game.field.items.push(cage("parrot"));
    const coins = game.save.coins;
    game.update(C.STEP);
    expect(game.rescued).toBe(1);
    expect(game.score).toBe(1);
    expect(game.combo).toBe(1);
    expect(game.flock.map((f) => f.id)).toEqual(["parrot"]);
    expect(game.save.friends.parrot).toBe(1);
    expect(game.save.stats.rescued).toBe(1);
    expect(game.save.coins).toBe(coins + C.FRIEND_FIRST_BONUS); // first time
    expect(game.field.items).toHaveLength(0);

    game.field.items.push(cage("parrot"));
    game.update(C.STEP);
    expect(game.save.friends.parrot).toBe(2);
    expect(game.save.coins).toBe(coins + C.FRIEND_FIRST_BONUS); // no bonus again
  });

  it("counts the kinds of birds met", () => {
    start();
    game.onRescue(cage("owl"));
    game.onRescue(cage("owl"));
    game.onRescue(cage("toucan"));
    expect(game.save.stats.species).toBe(2);
  });

  it("keeps only the latest friends in the flock", () => {
    start();
    for (let i = 0; i < C.FLOCK_MAX + 3; i++) game.onRescue(cage("duckling"));
    expect(game.flock).toHaveLength(C.FLOCK_MAX);
    expect(game.rescued).toBe(C.FLOCK_MAX + 3);
  });

  it("gives time for a long chain and loses the chain on a miss", () => {
    start();
    const before = game.timeLeft;
    for (let i = 0; i < C.RESCUE_COMBO_EVERY; i++) game.onRescue(cage("owl"));
    expect(game.combo).toBe(C.RESCUE_COMBO_EVERY);
    expect(game.timeLeft).toBe(before + C.RESCUE_COMBO_TIME);
    game.onMiss();
    expect(game.combo).toBe(0);
  });

  it("counts a cage that flies past as missed", () => {
    start();
    game.combo = 4;
    const c = cage();
    c.x = C.BIRD_X - 80;
    c.y = 40; // far above the bird
    c.baseY = 40;
    game.field.items.push(c);
    game.update(C.STEP);
    expect(c.missed).toBe(true);
    expect(game.combo).toBe(0);
    expect(game.rescued).toBe(0);
  });

  it("an enemy costs time but never the run", () => {
    start();
    const t = game.timeLeft;
    game.field.items.push(foe());
    game.update(C.STEP);
    expect(game.timeLeft).toBeLessThan(t - C.HIT_PENALTY + 0.1);
    expect(game.timeLeft).toBeGreaterThan(t - C.HIT_PENALTY - 0.1);
    expect(game.invuln).toBeGreaterThan(0);
    expect(game.state).toBe(State.PLAYING);

    // while protected, the next enemy passes harmlessly
    const left = game.timeLeft;
    game.field.items.push(foe());
    game.update(C.STEP);
    expect(game.timeLeft).toBeGreaterThan(left - 0.1);
    expect(game.field.items).toHaveLength(1);
  });

  it("weak enemies cost less time", () => {
    start();
    const t = game.timeLeft;
    game.field.items.push(foe("wasp", { r: 9, penalty: 2 }));
    game.update(C.STEP);
    expect(game.timeLeft).toBeLessThan(t - 2 + 0.1);
    expect(game.timeLeft).toBeGreaterThan(t - 2 - 0.1);
  });

  it("a boss wall hurts once and stays in the way", () => {
    start();
    const t = game.timeLeft;
    const wall = bossWall("castle", C.BIRD_X, game.bird.y - C.WALL_GAP);
    game.field.items.push(wall);
    game.update(C.STEP);
    expect(game.timeLeft).toBeLessThan(t - C.HIT_PENALTY + 0.1);
    expect(wall.spent).toBe(true);
    expect(game.field.items).toContain(wall);
  });

  it("a feather lets the bird fly through enemies", () => {
    start();
    game.field.items.push({ ...cage(), kind: "feather" });
    game.update(C.STEP);
    expect(game.ghost).toBeGreaterThan(C.GHOST_TIME - 0.1);
    const t = game.timeLeft;
    game.field.items.push(foe("hawk", { r: 14 }));
    game.update(C.STEP);
    expect(game.timeLeft).toBeGreaterThan(t - 0.1);
    expect(game.field.items).toHaveLength(1); // still there, just ignored
    run(C.GHOST_TIME + 0.2);
    expect(game.ghost).toBe(0);
  });

  it("a magnet pulls cages in", () => {
    start();
    game.field.items.push({ ...cage(), kind: "magnet" });
    game.update(C.STEP);
    expect(game.magnet).toBeGreaterThan(C.CAGE_MAGNET_TIME - 0.1);

    const c = cage();
    c.x = C.BIRD_X + 120;
    c.y = game.bird.y - 60;
    c.baseY = c.y;
    const far = { ...cage(), x: C.BIRD_X + 400 };
    game.field.items.push(c, far);
    run(0.15);
    expect(c.missed).toBe(false);
    const moved = C.BIRD_X + 120 - c.x;
    const scrolled = C.BIRD_X + 400 - far.x;
    expect(moved).toBeGreaterThan(scrolled + 10);
  });

  it("a golden cage gives extra time and coins", () => {
    start();
    game.save.friends.owl = 1; // no first-time bonus
    const t = game.timeLeft;
    const coins = game.save.coins;
    game.onRescue({ ...cage("owl"), golden: true });
    expect(game.timeLeft).toBe(t + C.GOLDEN_TIME);
    expect(game.save.coins - coins).toBe(C.GOLDEN_COINS);
    expect(game.rescued).toBe(1);
  });

  it("guards a golden cage with balloons", () => {
    start();
    game.level = () => 10;
    vi.spyOn(Math, "random").mockReturnValue(0); // always golden
    game.field.spawnWave(game);
    const items = game.field.items;
    const gold = items.find((i) => i.kind === "cage");
    expect(gold.golden).toBe(true);
    const guards = items.filter((i) => i.kind === "balloon");
    expect(guards).toHaveLength(2);
    expect(guards.every((g) => g.x === gold.x)).toBe(true);
    expect(guards.map((g) => g.y).sort((a, b) => a - b)).toEqual([
      gold.y - 58,
      gold.y + 58,
    ]);
  });

  it("hitting the ground costs time and breaks the chain, but not the run", () => {
    start();
    game.combo = 4;
    game.invuln = 0;
    const t = game.timeLeft;
    game.bird.y = C.GROUND_Y;
    game.update(C.STEP);
    expect(game.timeLeft).toBeLessThan(t - game.mode.crashPenalty + 0.1);
    expect(game.timeLeft).toBeGreaterThan(t - game.mode.crashPenalty - 0.1);
    expect(game.combo).toBe(0);
    expect(game.state).toBe(State.PLAYING);
    expect(game.bird.vy).toBeLessThan(0); // bounced back up

    // the bounce protects for a moment: no second charge on the same landing
    const left = game.timeLeft;
    game.bird.y = C.GROUND_Y;
    game.update(C.STEP);
    expect(game.timeLeft).toBeGreaterThan(left - 0.1);
  });

  it("a shield saves you from the ground penalty", () => {
    start();
    game.shield = true;
    game.invuln = 0;
    const t = game.timeLeft;
    game.bird.y = C.GROUND_Y;
    game.update(C.STEP);
    expect(game.shield).toBe(false);
    expect(game.timeLeft).toBeGreaterThan(t - 0.1);
  });

  it("Coin Rush: ground and pipe hits cost time, not the run", () => {
    game.setMode("rush");
    game.queueFlap();
    run(0.05);
    game.invuln = 0;
    const t = game.timeLeft;
    game.bird.y = C.GROUND_Y;
    game.update(C.STEP);
    expect(game.timeLeft).toBeLessThan(t - 3 + 0.1);
    expect(game.timeLeft).toBeGreaterThan(t - 3 - 0.1);
    expect(game.state).toBe(State.PLAYING);

    game.invuln = 0;
    const t2 = game.timeLeft;
    expect(game.hitObstacle()).toBe(false);
    expect(game.timeLeft).toBe(t2 - 3);
    expect(game.invuln).toBeGreaterThan(0);

    game.invuln = 0;
    game.shield = true; // a shield saves the time as well
    const t3 = game.timeLeft;
    game.hitObstacle();
    expect(game.timeLeft).toBe(t3);
  });

  it("a shield soaks up an enemy hit", () => {
    start();
    game.shield = true;
    const t = game.timeLeft;
    game.onHit({ x: 100, y: 100 });
    expect(game.shield).toBe(false);
    expect(game.timeLeft).toBe(t);
  });

  it("an hourglass in the field gives time", () => {
    start();
    const t = game.timeLeft;
    game.field.items.push({ ...cage(), kind: "hourglass" });
    game.update(C.STEP);
    expect(game.timeLeft).toBeGreaterThan(t + C.HOURGLASS_BONUS - 0.1);
    expect(game.freeze).toBeGreaterThan(0);
  });

  it("pays a small, capped reward when the time is up", () => {
    // a first run on its own pays a one-time achievement; get that out of the way
    start();
    game.timeLeft = 0.01;
    run(0.1);
    game.reset();

    start();
    game.rescued = 600;
    const coins = game.save.coins;
    game.timeLeft = 0.01;
    run(0.1);
    expect(game.state).toBe(State.DEAD);
    expect(game.save.coins - coins).toBe(C.RESCUE_COIN_CAP);

    game.reset();
    start();
    game.rescued = 7;
    const before = game.save.coins;
    game.timeLeft = 0.01;
    run(0.1);
    expect(game.save.coins - before).toBe(Math.floor(7 / C.RESCUE_COINS_PER));
  });

  it("keeps the score of Rescue apart from the other modes", () => {
    start();
    game.onRescue(cage());
    game.onRescue(cage());
    game.timeLeft = 0.01;
    run(0.1);
    expect(game.save.bests.rescue).toBe(2);
    expect(game.save.bests.classic).toBe(0);
  });

  it("places every cage within reach of the one before", () => {
    start();
    const f = game.field;
    f.reset();
    for (let i = 0; i < 300; i++) f.spawnWave(game);
    const cages = f.items.filter((i) => i.kind === "cage");
    expect(cages).toHaveLength(300);
    for (let i = 0; i < cages.length; i++) {
      expect(cages[i].baseY).toBeGreaterThanOrEqual(70);
      expect(cages[i].baseY).toBeLessThanOrEqual(C.GROUND_Y - 50);
      if (i > 0)
        expect(
          Math.abs(cages[i].baseY - cages[i - 1].baseY),
        ).toBeLessThanOrEqual(C.RESCUE_SHIFT + 1e-6);
    }
  });

  it("introduces the enemies one at a time", () => {
    start();
    const f = game.field;
    const kinds = (id) => (id === "swarm" ? "wasp" : id);
    for (const level of [2, 4, 7, 10, 13, 16, 19, 25]) {
      game.level = () => level;
      f.reset();
      f.nextBoss = Infinity;
      for (let i = 0; i < 300; i++) f.spawnWave(game);
      const allowed = new Set(
        ENEMIES.filter((e) => e.from <= level).map((e) => kinds(e.id)),
      );
      const met = new Set(f.items.filter((i) => i.enemy).map((i) => i.kind));
      for (const k of met) expect(allowed.has(k)).toBe(true);
      for (const k of allowed) expect(met.has(k)).toBe(true);
    }
  });

  it("announces each enemy type once per run", () => {
    start();
    game.level = () => 30;
    const f = game.field;
    f.reset();
    f.nextBoss = Infinity;
    const seen = vi.spyOn(game, "onEnemySeen");
    for (let i = 0; i < 300; i++) f.spawnWave(game);
    expect(seen).toHaveBeenCalledTimes(ENEMIES.length);
  });

  it("sends a boss wall with one opening and a golden cage in it", () => {
    start();
    const f = game.field;
    f.reset();
    game.level = () => 30;
    const styles = [];
    for (let round = 0; round < 6; round++) {
      f.items.length = 0;
      game.rescued = C.BOSS_EVERY * (round + 1);
      f.spawnWave(game);
      const gold = f.items.find((i) => i.kind === "cage");
      expect(gold.golden).toBe(true);
      const walls = f.items.filter((i) => i.enemy);
      expect(walls).toHaveLength(1);
      const [wall] = walls;
      styles.push(wall.style);
      expect(wall.kind).toBe("wall");
      expect(wall.y - wall.gap / 2).toBeGreaterThan(0);
      expect(wall.y + wall.gap / 2).toBeLessThan(C.GROUND_Y);
      // the cage sits in the middle of the opening, where the bird does not get hurt
      expect(Math.abs(gold.baseY - wall.y)).toBeLessThan(1e-6);
      expect(Math.abs(gold.x - wall.x)).toBeLessThan(1e-6);
      expect(enemyHit(wall, wall.x, gold.baseY, C.BIRD_HIT_R)).toBe(false);
    }
    expect(new Set(styles).size).toBe(2);
    expect(styles[0]).not.toBe(styles[1]);
    expect(f.nextBoss).toBe(C.BOSS_EVERY * 7);
  });

  it("puts enemies under pressure when the clock runs low", () => {
    start();
    const f = game.field;
    game.timeLeft = C.RESCUE_PRESSURE_FROM + 5;
    expect(f.pressure(game)).toBe(0);
    game.timeLeft = C.RESCUE_PRESSURE_FROM / 2;
    expect(f.pressure(game)).toBeCloseTo(0.5);
    game.timeLeft = 0;
    expect(f.pressure(game)).toBe(1);
  });

  it("is more likely to put new kinds of birds in the cages", () => {
    start();
    for (const f of FRIENDS) game.save.friends[f.id] = 1;
    delete game.save.friends.flamingo;
    let hits = 0;
    for (let i = 0; i < 400; i++) if (game.pickFriend() === "flamingo") hits++;
    expect(hits).toBeGreaterThan(400 * 0.4);
  });
});

describe("magnet", () => {
  function pipeWithCoin(type) {
    const gap = 160;
    const y = 280;
    return {
      x: C.BIRD_X + 90 - C.PIPE_W / 2,
      baseTop: y - gap / 2,
      top: y - gap / 2,
      baseGap: gap,
      gap,
      amp: 0,
      freq: 1,
      phase: 0,
      sq: 0,
      sf: 1,
      sp: 0,
      scored: false,
      centered: false,
      perfect: false,
      minClear: Infinity,
      item: { type, taken: false, ox: 0, oy: 0 },
    };
  }

  it("pulls items in only when the upgrade is owned", () => {
    for (const [level, expectedPickup] of [
      [0, false],
      [3, true],
    ]) {
      game = new Game();
      game.save.upgrades.magnet = level;
      game.state = State.PLAYING;
      const p = pipeWithCoin("gold");
      game.pipes = [p];
      // keep the bird level with the item for a short while
      run(0.3, () => {
        game.bird.y = 280;
        game.bird.vy = 0;
        game.pipes = [p, ...game.pipes.slice(1)];
      });
      // without the magnet the pipe has not reached the bird yet; the coin is still far away
      expect(p.item.taken, `level ${level}`).toBe(expectedPickup);
    }
  });
});

describe("resetProgress", () => {
  it("wipes progress but keeps settings", () => {
    game.save.coins = 99;
    game.save.settings.tapAnywhere = true;
    game.save.muted = true;
    game.save.upgrades.magnet = 2;
    game.save.stats.pipes = 50;
    const save = game.save;
    game.resetProgress();
    expect(game.save).toBe(save); // same object, other modules keep their reference
    expect(game.save.coins).toBe(0);
    expect(game.save.upgrades.magnet).toBe(0);
    expect(game.save.stats.pipes).toBe(0);
    expect(game.save.settings.tapAnywhere).toBe(true);
    expect(game.save.muted).toBe(true);
    expect(game.state).toBe(State.READY);
  });
});

describe("persistence", () => {
  it("saves coins and loads them in a new game", () => {
    game.collect("gem", 0, 0);
    const coins = game.save.coins;
    const again = new Game();
    expect(again.save.coins).toBe(coins);
    expect(coins).toBeGreaterThanOrEqual(C.GEM_VALUE);
  });
});
