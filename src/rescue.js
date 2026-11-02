// Rescue mode: caged birds, power-ups and a growing zoo of enemies drift in from the right. Flying
// into a cage frees the bird, an enemy costs time, an hourglass gives time back. The field only
// moves things and detects touches; what happens next is up to the Game (onRescue, onHit ...).

import * as C from "./config.js";
import {
  bossWall,
  ENEMIES,
  enemyHit,
  guardBalloon,
  moveEnemy,
  wallGapY,
} from "./enemies.js";

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const BOSSES = [
  { style: "tree", text: "Giant tree!" },
  { style: "castle", text: "Castle wall!" },
];

const pickup = (kind, x, y) => ({
  kind,
  x,
  y,
  baseY: y,
  amp: 5,
  freq: 3,
  phase: rand(0, TAU),
});

export class RescueField {
  constructor() {
    this.reset();
  }

  reset() {
    // { kind: "cage" | "hourglass" | "feather" | "magnet" | an enemy kind, x, y, baseY, amp, ... }
    this.items = [];
    this.since = C.RESCUE_SPACING; // so the first wave appears right away
    this.lastY = C.H / 2 - 40;
    this.nextY = null;
    this.seen = new Set(); // enemy types met in this run (the first sighting is announced)
    this.nextBoss = C.BOSS_EVERY; // rescue count of the next boss wave
    this.bosses = 0;
  }

  /** 0 (plenty of time) .. 1 (nearly out): enemies get faster and more frequent. */
  pressure(game) {
    return clamp(
      (C.RESCUE_PRESSURE_FROM - game.timeLeft) / C.RESCUE_PRESSURE_FROM,
      0,
      1,
    );
  }

  /** A cage height that is never too far from `from`, so the next cage is always reachable. */
  rollY(from) {
    return rand(
      Math.max(C.RESCUE_Y_MIN, from - C.RESCUE_SHIFT),
      Math.min(C.RESCUE_Y_MAX, from + C.RESCUE_SHIFT),
    );
  }

  cage(game, x, y, golden = false) {
    return {
      kind: "cage",
      x,
      y,
      baseY: y,
      amp: 6,
      freq: 3,
      phase: rand(0, TAU),
      friend: game.pickFriend(),
      golden,
      missed: false,
    };
  }

  spawnWave(game) {
    if (game.rescued >= this.nextBoss) return this.spawnBoss(game);

    const x = C.W + 40;
    const level = game.level();
    const y = this.nextY ?? this.rollY(this.lastY);
    const nextY = this.rollY(y);
    this.nextY = nextY;
    this.lastY = y;

    // A golden cage is worth a lot, but two balloons guard it.
    const golden = level >= C.GOLDEN_FROM && Math.random() < C.GOLDEN_CHANCE;
    this.items.push(this.cage(game, x, y, golden));
    if (golden) {
      this.items.push(guardBalloon(x, y - 58), guardBalloon(x, y + 58));
    }

    // Something between this cage and the next one: usually right on the way.
    const midX = x + C.RESCUE_SPACING / 2;
    const midY = (y + nextY) / 2;
    const rush = this.pressure(game);
    if (game.freeze <= 0 && Math.random() < C.HOURGLASS_CHANCE) {
      this.items.push(
        pickup(
          "hourglass",
          midX,
          clamp(midY + rand(-50, 50), C.RESCUE_Y_MIN, C.RESCUE_Y_MAX),
        ),
      );
    } else if (Math.random() < C.POWER_CHANCE) {
      const kind = Math.random() < 0.5 ? "feather" : "magnet";
      this.items.push(
        pickup(
          kind,
          midX,
          clamp(midY + rand(-50, 50), C.RESCUE_Y_MIN, C.RESCUE_Y_MAX),
        ),
      );
    } else if (
      !golden &&
      Math.random() < Math.min(0.7, 0.3 + level * 0.02) + 0.15 * rush
    ) {
      this.spawnEnemy(game, midX, midY, level);
    }
  }

  /** Picks among the unlocked enemies; types not met yet in this run are favoured. */
  spawnEnemy(game, x, y, level) {
    const pool = ENEMIES.filter((e) => e.from <= level);
    if (!pool.length) return;
    const weights = pool.map((e) => e.weight * (this.seen.has(e.id) ? 1 : 4));
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    let def = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll < 0) {
        def = pool[i];
        break;
      }
    }
    def.spawn(this, game, x, y, level);
    if (!this.seen.has(def.id)) {
      this.seen.add(def.id);
      game.onEnemySeen(def);
    }
  }

  /** A wall with one narrow opening; the golden cage waits in the opening. */
  spawnBoss(game) {
    const boss = BOSSES[this.bosses % BOSSES.length];
    this.bosses++;
    this.nextBoss += C.BOSS_EVERY;

    const x = C.W + 40 + C.WALL_W / 2;
    const y = wallGapY(this.rollY(this.lastY));
    this.lastY = y;
    this.nextY = null;

    this.items.push(bossWall(boss.style, x, y));
    this.items.push(this.cage(game, x, y, true));
    game.onBoss(boss.text);
  }

  update(game, dt, speed) {
    this.since += speed * dt;
    if (this.since >= C.RESCUE_SPACING) {
      this.since -= C.RESCUE_SPACING;
      this.spawnWave(game);
    }

    const boost = 1 + C.RESCUE_PRESSURE_BOOST * this.pressure(game);
    const b = game.bird;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.enemy) {
        moveEnemy(it, game, dt, speed, boost);
      } else {
        it.x -= speed * dt;
        if (it.kind === "cage" && game.magnet > 0) this.pull(it, b, dt);
        it.y = it.baseY + Math.sin(game.time * it.freq + it.phase) * it.amp;
      }
      if (it.x < -50 || it.y < -60 || it.y > C.H + 60) {
        this.items.splice(i, 1);
        continue;
      }

      if (it.enemy) {
        if (game.invuln > 0 || game.ghost > 0) continue; // fly right through
        if (enemyHit(it, C.BIRD_X, b.y, C.BIRD_HIT_R)) {
          if (it.kind === "wall") {
            it.spent = true; // the wall stays, but hurts only once
            game.onHit({ ...it, x: C.BIRD_X, y: b.y });
          } else {
            this.items.splice(i, 1);
            game.onHit(it);
          }
        }
        continue;
      }

      const r = it.kind === "cage" ? C.RESCUE_CAGE_R : C.ITEM_R + 4;
      const dx = it.x - C.BIRD_X;
      const dy = it.y - b.y;
      const reach = r + C.BIRD_HIT_R;
      if (dx * dx + dy * dy < reach * reach) {
        this.items.splice(i, 1);
        if (it.kind === "cage") game.onRescue(it);
        else if (it.kind === "feather") game.grabFeather(it.x, it.y);
        else if (it.kind === "magnet") game.grabMagnet(it.x, it.y);
        else game.grabHourglass(it.x, it.y);
      } else if (
        it.kind === "cage" &&
        !it.missed &&
        it.x + C.RESCUE_CAGE_R < C.BIRD_X - C.BIRD_R
      ) {
        it.missed = true;
        game.onMiss(it);
      }
    }
  }

  /** Cage magnet: a cage within reach slides towards the bird. */
  pull(it, bird, dt) {
    const dx = C.BIRD_X - it.x;
    const dy = bird.y - it.baseY;
    const d = Math.hypot(dx, dy);
    if (d > C.CAGE_MAGNET_R || d < 1) return;
    const step = Math.min(d, C.CAGE_MAGNET_PULL * dt);
    it.x += (dx / d) * step;
    it.baseY += (dy / d) * step;
  }
}
