// Rescue mode enemies. Each type has a difficulty level it appears from (so they are introduced one
// at a time), a spawner, and the shared move / hit helpers below. Tune the numbers here.

import * as C from "./config.js";

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const CAT_G = 900; // px/s^2
const CAT_CROUCH = 0.45; // seconds the cat shakes before it jumps
const CAT_R = 15;
const HAWK_TURN = 90; // px/s a hawk adjusts its height while still far away

const enemy = (kind, x, y, extra) => ({
  kind,
  enemy: true,
  x,
  y,
  baseY: y,
  amp: 0,
  freq: 1,
  phase: rand(0, TAU),
  vx: 0, // extra leftward speed on top of the scrolling
  ...extra,
});

/** Centre of a boss wall opening: as close to `target` as keeps the whole opening on screen. */
export const wallGapY = (target) =>
  clamp(target, C.RESCUE_Y_MIN, C.GROUND_Y - C.WALL_GAP / 2 - 10);

export const ENEMIES = [
  {
    id: "balloon",
    name: "Net balloon",
    from: 3,
    weight: 3,
    spawn(field, game, x, y, level) {
      const amp = Math.min(40, (level - 3) * 2);
      const by = clamp(
        y + rand(-35, 35),
        C.RESCUE_Y_MIN + amp,
        C.RESCUE_Y_MAX - amp,
      );
      field.items.push(
        enemy("balloon", x, by, { r: 17, penalty: 3, amp, freq: rand(1.2, 2) }),
      );
    },
  },
  {
    id: "wasp",
    name: "Wasp",
    from: 6,
    weight: 3,
    spawn(field, game, x, y) {
      const amp = rand(35, 55);
      const by = clamp(
        y + rand(-30, 30),
        C.RESCUE_Y_MIN + amp,
        C.RESCUE_Y_MAX - amp,
      );
      field.items.push(
        enemy("wasp", x, by, {
          r: 9,
          penalty: 2,
          amp,
          freq: rand(4, 5),
          vx: 60,
        }),
      );
    },
  },
  {
    id: "hawk",
    name: "Hawk",
    from: 9,
    weight: 2,
    spawn(field, game, x) {
      const by = clamp(
        game.bird.y + rand(-40, 40),
        C.RESCUE_Y_MIN,
        C.RESCUE_Y_MAX,
      );
      field.items.push(
        enemy("hawk", x, by, { r: 14, penalty: 3, vx: 80, homing: true }),
      );
    },
  },
  {
    id: "cactus",
    name: "Cactus",
    from: 12,
    weight: 2,
    spawn(field, game, x) {
      // r is the rounded top, stemR the half width of the trunk down to the ground.
      field.items.push(
        enemy("cactus", x, C.GROUND_Y - rand(70, 190), {
          r: 10,
          penalty: 3,
          stemY: C.GROUND_Y,
          stemR: 10,
        }),
      );
    },
  },
  {
    id: "spider",
    name: "Spider",
    from: 14,
    weight: 2,
    spawn(field, game, x) {
      // Dangles from the top edge on a thread and bobs up and down.
      field.items.push(
        enemy("spider", x, rand(110, 220), {
          r: 11,
          penalty: 3,
          stemY: 0,
          stemR: 3,
          amp: 14,
          freq: rand(1.5, 2.5),
        }),
      );
    },
  },
  {
    id: "dive",
    name: "Hawk dive",
    from: 15,
    weight: 2,
    spawn(field, game, x, y) {
      // Aim the diagonal so that it crosses the bird's height when it reaches the bird.
      const target = clamp(
        game.bird.y + rand(-40, 40),
        C.RESCUE_Y_MIN,
        C.RESCUE_Y_MAX,
      );
      const dir = target < C.H / 2 ? -1 : 1; // -1: rises, 1: falls
      const arrive = (C.W + 24 - C.BIRD_X) / C.DIVE_VX;
      const sy = clamp(
        target - dir * C.DIVE_VY * arrive,
        C.RESCUE_Y_MIN,
        C.RESCUE_Y_MAX,
      );
      field.items.push(
        enemy("dive", C.W - 24, sy, {
          r: 15,
          penalty: 3,
          state: "warn",
          t: C.DIVE_WARN,
          dir,
        }),
      );
    },
  },
  {
    id: "cat",
    name: "Cat",
    from: 18,
    weight: 2,
    spawn(field, game, x) {
      const height = rand(120, 230);
      const v = Math.sqrt(2 * CAT_G * height);
      const y = C.GROUND_Y - 17;
      field.items.push(
        enemy("cat", x, y, {
          r: CAT_R,
          penalty: 3,
          state: "sit",
          jumpV: v,
          vy: 0,
          t: 0,
        }),
      );
    },
  },
  {
    id: "swarm",
    name: "Wasp swarm",
    from: 22,
    weight: 2,
    spawn(field, game, x, y) {
      const by = clamp(
        y + rand(-30, 30),
        C.RESCUE_Y_MIN + 45,
        C.RESCUE_Y_MAX - 45,
      );
      for (let i = 0; i < 4; i++) {
        field.items.push(
          enemy("wasp", x + (i - 1.5) * 16, by, {
            r: 9,
            penalty: 2,
            amp: rand(25, 45),
            freq: rand(3.5, 4.5),
            phase: i * 1.6 + rand(0, 0.8),
            vx: 60,
          }),
        );
      }
    },
  },
];

/** A boss wall: floor to ceiling, with one opening of WALL_GAP centred on y. */
export function bossWall(style, x, y) {
  return enemy("wall", x, y, {
    r: 0,
    penalty: 3,
    style,
    w: C.WALL_W,
    gap: C.WALL_GAP,
    spent: false, // a wall hurts once; it stays in the way visually
  });
}

export function guardBalloon(x, y) {
  return enemy("balloon", x, y, { r: 17, penalty: 3 });
}

/** Advances one enemy. `boost` (>= 1) is the time pressure speed-up. */
export function moveEnemy(it, game, dt, speed, boost) {
  if (it.kind === "dive") return moveDive(it, dt, boost);
  it.x -= (speed + it.vx * boost) * dt;

  if (it.kind === "cat") return moveCat(it, dt, speed, boost);
  if (it.homing && it.x > C.BIRD_X + 150) {
    const dy = game.bird.y - it.baseY;
    it.baseY += Math.sign(dy) * Math.min(Math.abs(dy), HAWK_TURN * boost * dt);
  }
  it.y = it.baseY + Math.sin(game.time * it.freq + it.phase) * it.amp;
}

function moveDive(it, dt, boost) {
  if (it.state === "warn") {
    it.t -= dt;
    if (it.t <= 0) {
      it.state = "fly";
      it.x = C.W + 24;
      it.vx = -C.DIVE_VX * boost;
      it.vy = it.dir * C.DIVE_VY * boost;
    }
    return;
  }
  it.x += it.vx * dt;
  it.y += it.vy * dt;
}

function moveCat(it, dt, speed, boost) {
  const ground = C.GROUND_Y - 17;
  if (it.state === "sit") {
    // Starts shaking, then jumps so that it is at the top of its arc right above the bird.
    const lead = it.jumpV / CAT_G;
    if (it.x - C.BIRD_X <= speed * (lead + CAT_CROUCH)) {
      it.state = "crouch";
      it.t = CAT_CROUCH / boost;
    }
  } else if (it.state === "crouch") {
    it.t -= dt;
    if (it.t <= 0) {
      it.state = "jump";
      it.vy = -it.jumpV;
    }
  } else if (it.state === "jump") {
    it.vy += CAT_G * dt;
    it.baseY += it.vy * dt;
    if (it.baseY >= ground) {
      it.baseY = ground;
      it.state = "landed";
    }
  }
  it.y = it.baseY;
}

/** Does the enemy touch a bird circle at (bx, by)? */
export function enemyHit(it, bx, by, br) {
  if (it.kind === "dive" && it.state === "warn") return false;
  if (it.kind === "wall") {
    if (it.spent || Math.abs(it.x - bx) >= it.w / 2 + br) return false;
    return by - br < it.y - it.gap / 2 || by + br > it.y + it.gap / 2;
  }
  const rr = it.r + br;
  const dx = it.x - bx;
  const dy = it.y - by;
  if (dx * dx + dy * dy < rr * rr) return true;
  if (it.stemY != null) {
    const sy = clamp(by, Math.min(it.y, it.stemY), Math.max(it.y, it.stemY));
    const sr = it.stemR + br;
    return dx * dx + (sy - by) * (sy - by) < sr * sr;
  }
  return false;
}
