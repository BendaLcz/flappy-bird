import { audio } from "./audio.js";
import {
  CATEGORIES,
  MAGNET_RADIUS,
  UPGRADES,
  findItem,
  findUpgrade,
  upgradePrice,
} from "./catalog.js";
import * as C from "./config.js";
import { FRIENDS, findFriend } from "./friends.js";
import { MODES, findMode } from "./modes.js";
import { Particles } from "./particles.js";
import { Progress } from "./progress.js";
import { RescueField } from "./rescue.js";
import { clearSave, loadSave, writeSave } from "./storage.js";
import { ThemeBlender } from "./theme.js";

export const State = { READY: 0, PLAYING: 1, DEAD: 2 };

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// What each collectible is worth: coins and score points.
const COLLECTIBLES = {
  coin: { coins: 1, score: 1 },
  gold: { coins: C.GOLD_VALUE, score: 2 },
  gem: { coins: C.GEM_VALUE, score: 5 },
};
const STAT_OF = { coin: "coins", gold: "gold", gem: "gems" };
const COIN_BURST = {
  coin: ["#ffd23f", "#fff1a8", "#e0a800"],
  gold: ["#ffb020", "#ffe08a", "#fff"],
  gem: ["#7df3ff", "#c8fbff", "#ffffff", "#4ac8ff"],
};

function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function vibrate(pattern) {
  try {
    globalThis.navigator?.vibrate?.(pattern);
  } catch {
    // Not supported (e.g. iOS) - ignore.
  }
}

/** World position of the collectible attached to a pipe (the magnet can pull it away). */
export function itemPos(pipe, time) {
  const it = pipe.item;
  return {
    x: pipe.x + C.PIPE_W / 2 + (it?.ox || 0),
    y:
      pipe.top +
      pipe.gap / 2 +
      Math.sin(time * 4 + pipe.phase) * 6 +
      (it?.oy || 0),
  };
}

export class Game {
  constructor() {
    this.save = loadSave();
    this.mode = findMode(this.save.mode);
    this.particles = new Particles();
    this.theme = new ThemeBlender(findItem("world", this.save.equipped.world));
    this.progress = new Progress(this.save, (r) => this.onReward(r));
    this.field = new RescueField();
    this.clock = 0; // real (fixed-step) time, never scaled; used for UI animation
    this.paused = false;
    this.countdown = 0;
    this.toasts = []; // achievement / mission messages, shown over any state
    this.scroll = { ground: 0, hillFar: 0, hillNear: 0 };
    this.clouds = Array.from({ length: 6 }, () => ({
      x: rand(0, C.W),
      y: rand(40, 300),
      s: rand(0.6, 1.3),
    }));
    this.stars = Array.from({ length: 40 }, () => ({
      x: rand(0, C.W),
      y: rand(0, C.GROUND_Y * 0.6),
      r: rand(0.6, 1.6),
      t: rand(0, 6.28),
    }));
    this.reset();
  }

  get best() {
    return this.save.bests[this.mode.id] || 0;
  }

  get reduceMotion() {
    return this.save.settings.reduceMotion;
  }

  reset() {
    this.state = State.READY;
    this.stateTime = 0;
    this.time = 0; // world time (slows down during slow-mo)
    this.bird = { y: C.H / 2 - 40, vy: 0, rot: 0, flapAnim: 0 };
    this.pipes = [];
    this.score = 0;
    this.runCoins = 0; // coins earned this run
    this.runTime = 0;
    this.timeLeft = this.mode.time;
    this.freeze = 0; // seconds the clock stands still (hourglass)
    this.rescued = 0; // Rescue mode: birds freed this run
    this.combo = 0; // Rescue mode: cages freed in a row
    this.flock = []; // freed birds flying along: { id, t, fx, fy }
    this.hist = []; // recent bird heights; the flock follows this trail
    this.field.reset();
    this.newBest = false;
    this.rank = 0;
    this.endReason = "";
    this.shield = this.save.upgrades.headstart > 0;
    this.revived = false;
    this.invuln = 0;
    this.ghost = 0; // Rescue: feather, fly through enemies
    this.magnet = 0; // Rescue: magnet, pulls cages in
    this.slow = 0;
    this.bullet = 0; // close-call slow motion
    this.shake = 0;
    this.flash = 0;
    this.streak = 0; // consecutive gaps flown through dead center
    this.closeCooldown = 0;
    this.trailTimer = 0;
    this.popups = [];
    this.wind = { state: "idle", t: rand(3, 6), dir: 1, time: 0 };
    this.flapQueued = false;
    this.particles.clear();
    this.theme.setScore(0);
    this.progress.startRun();
  }

  // ---- Difficulty ----
  /** Difficulty level: the score (scaled by the mode's ramp) plus the mode's head start. */
  level() {
    return this.score * (this.mode.rampMul ?? 1) + this.mode.diffBonus;
  }

  speed() {
    const base = Math.min(
      C.SPEED_MAX,
      C.SPEED_BASE + C.SPEED_PER_POINT * this.level(),
    );
    return base * this.mode.speedMul;
  }

  gap() {
    const base = Math.max(C.GAP_MIN, C.GAP_BASE - C.GAP_SHRINK * this.level());
    return base * this.mode.gapMul;
  }

  /** Current vertical wind acceleration (negative = up). */
  windForce() {
    const w = this.wind;
    if (w.state !== "blow") return 0;
    const ramp = Math.min(1, w.time / 0.4, w.t / 0.4);
    return w.dir * C.WIND_FORCE * (this.mode.windMul ?? 1) * Math.max(0, ramp);
  }

  // ---- Modes ----
  setMode(id) {
    if (this.state !== State.READY) return;
    this.mode = findMode(id);
    this.save.mode = this.mode.id;
    writeSave(this.save);
    this.reset();
  }

  cycleMode() {
    const i = MODES.findIndex((m) => m.id === this.mode.id);
    this.setMode(MODES[(i + 1) % MODES.length].id);
  }

  // ---- Input ----
  /** Flaps are queued and consumed at the start of the next fixed step, so none are ever dropped. */
  queueFlap() {
    this.flapQueued = true;
  }

  pause() {
    if (this.state === State.PLAYING && !this.paused) {
      this.paused = true;
      this.countdown = 0;
    }
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.countdown = C.RESUME_COUNTDOWN;
    this.flapQueued = false;
    audio.play("click");
  }

  togglePause() {
    if (this.paused) this.resume();
    else this.pause();
  }

  // ---- Shop ----
  owns(kind, id) {
    return this.save.owned[kind]?.includes(id) ?? false;
  }

  /** Returns "ok", "owned", "poor" (not enough coins) or "unknown". */
  buy(kind, id) {
    const item = CATEGORIES.find((c) => c.id === kind)?.items.find(
      (i) => i.id === id,
    );
    if (!item) return "unknown";
    if (this.owns(kind, id)) return "owned";
    if (this.save.coins < item.price) return "poor";
    this.save.coins -= item.price;
    this.save.owned[kind].push(id);
    this.progress.add("purchases", 1);
    writeSave(this.save);
    return "ok";
  }

  equip(kind, id) {
    if (!this.owns(kind, id)) return false;
    this.save.equipped[kind] = id;
    if (kind === "world") this.theme.setWorld(findItem("world", id));
    writeSave(this.save);
    return true;
  }

  upgradeLevel(id) {
    return this.save.upgrades[id] || 0;
  }

  /** Returns "ok", "max", "poor" or "unknown". */
  buyUpgrade(id) {
    const u = findUpgrade(id);
    if (!u) return "unknown";
    const level = this.upgradeLevel(id);
    const price = upgradePrice(u, level);
    if (price === null) return "max";
    if (this.save.coins < price) return "poor";
    this.save.coins -= price;
    this.save.upgrades[id] = level + 1;
    if (id === "headstart" && this.state === State.READY) this.shield = true;
    this.progress.add("purchases", 1);
    writeSave(this.save);
    return "ok";
  }

  canAffordSomething() {
    const cosmetics = CATEGORIES.some((cat) =>
      cat.items.some(
        (i) => !this.owns(cat.id, i.id) && i.price <= this.save.coins,
      ),
    );
    // Consumables (revives) are always for sale, so they do not count.
    const upgrades = UPGRADES.some((u) => {
      if (u.consumable) return false;
      const price = upgradePrice(u, this.upgradeLevel(u.id));
      return price !== null && price <= this.save.coins;
    });
    return cosmetics || upgrades;
  }

  /** Erases coins, unlocks, stats and missions (settings and the sound switch are kept). */
  resetProgress() {
    const { settings, muted } = this.save;
    clearSave();
    const fresh = loadSave();
    fresh.settings = settings;
    fresh.muted = muted;
    for (const k of Object.keys(this.save)) delete this.save[k];
    Object.assign(this.save, fresh);
    this.mode = findMode(this.save.mode);
    this.theme.setWorld(findItem("world", this.save.equipped.world));
    this.toasts.length = 0;
    this.reset();
    writeSave(this.save);
  }

  // ---- Messages ----
  toast(title, sub = "") {
    this.toasts.push({ title, sub, life: 3.2 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  popup(text, x, y, color = "#fff", size = 18) {
    this.popups.push({ text, x, y, color, size, life: 1.1, max: 1.1 });
    if (this.popups.length > 8) this.popups.shift();
  }

  onReward({ kind, title, coins }) {
    this.toast(
      kind === "mission" ? "Mission complete!" : `Achievement: ${title}`,
      kind === "mission" ? `${title}  (+${coins} coins)` : `+${coins} coins`,
    );
    audio.play("power");
    writeSave(this.save);
  }

  doFlap() {
    const b = this.bird;
    if (this.state === State.READY) {
      this.state = State.PLAYING;
      this.stateTime = 0;
      if (!this.mode.rescue) this.spawnPipe(C.W + 40);
    } else if (this.state === State.DEAD) {
      if (this.stateTime > C.RESTART_DELAY) this.reset();
      return;
    }
    b.vy = C.FLAP_VELOCITY;
    b.flapAnim = 0.25;
    this.progress.add("flaps", 1);
    audio.play("flap");
    if (!this.reduceMotion) this.particles.feathers(C.BIRD_X - 8, b.y + 4, 2);
  }

  // ---- Simulation (called with a fixed dt) ----
  update(dt) {
    this.clock += dt;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      if ((this.toasts[i].life -= dt) <= 0) this.toasts.splice(i, 1);
    }
    if (this.paused) return;
    if (this.countdown > 0) {
      this.countdown -= dt;
      this.flapQueued = false;
      return;
    }

    this.stateTime += dt;
    if (this.flapQueued) {
      this.flapQueued = false;
      this.doFlap();
    }

    const sdt = dt * this.timeScale();
    this.time += sdt;
    if (this.slow > 0) this.slow = Math.max(0, this.slow - dt);
    if (this.bullet > 0) this.bullet = Math.max(0, this.bullet - dt);
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.ghost > 0) this.ghost = Math.max(0, this.ghost - dt);
    if (this.magnet > 0) this.magnet = Math.max(0, this.magnet - dt);
    this.closeCooldown = Math.max(0, this.closeCooldown - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.bird.flapAnim = Math.max(0, this.bird.flapAnim - dt);
    this.particles.update(sdt);
    this.theme.update(dt);
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.y -= 34 * dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }

    if (this.state === State.READY) this.updateReady(sdt);
    else if (this.state === State.PLAYING) {
      this.runTime += dt;
      if (this.mode.time) {
        if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
        else this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.timeUp();
          return;
        }
      }
      this.updatePlaying(sdt);
    } else this.updateDead(sdt);
  }

  // World speed multiplier. Slow-mo and close-call slow-mo ease back to 1
  // over their last moments instead of snapping, so the player can re-adapt.
  timeScale() {
    let s = 1;
    if (this.slow > 0) {
      const k = Math.min(1, this.slow / C.SLOWMO_RAMP);
      const e = k * k * (3 - 2 * k); // smoothstep: 0 = normal speed, 1 = full slow-mo
      s *= 1 - (1 - C.SLOWMO_SCALE) * e;
    }
    if (this.bullet > 0) {
      const k = Math.min(1, this.bullet / C.CLOSE_SLOW_RAMP);
      const e = k * k * (3 - 2 * k);
      s *= 1 - (1 - C.CLOSE_SLOW_SCALE) * e;
    }
    return s;
  }

  scrollWorld(dt, speed) {
    this.scroll.ground = (this.scroll.ground + speed * dt) % 24;
    this.scroll.hillFar += speed * 0.15 * dt;
    this.scroll.hillNear += speed * 0.35 * dt;
    for (const c of this.clouds) {
      c.x -= speed * 0.08 * c.s * dt;
      if (c.x < -90) {
        c.x = C.W + 40;
        c.y = rand(40, 300);
      }
    }
  }

  emitTrail(dt, speed) {
    if (this.reduceMotion) return;
    const style = findItem("trail", this.save.equipped.trail);
    if (!style.shape) return;
    this.trailTimer -= dt;
    while (this.trailTimer <= 0) {
      this.trailTimer += 0.035;
      this.particles.trail(C.BIRD_X - 12, this.bird.y + 3, style, speed);
    }
  }

  updateReady(dt) {
    this.scrollWorld(dt, C.SPEED_BASE * 0.7);
    this.bird.y = C.H / 2 - 40 + Math.sin(this.clock * 5) * 8;
    this.bird.rot = 0;
    this.emitTrail(dt, C.SPEED_BASE * 0.7);
  }

  updateDead(dt) {
    const b = this.bird;
    const floor = C.GROUND_Y - C.BIRD_R;
    if (b.y < floor) {
      b.vy += C.GRAVITY * dt;
      b.y = Math.min(b.y + b.vy * dt, floor);
      b.rot = Math.min(Math.PI / 2, b.rot + 6 * dt);
    }
  }

  updateWind(dt) {
    const w = this.wind;
    w.time += dt;
    w.t -= dt;
    if (w.state === "idle") {
      if (w.t <= 0 && this.level() >= C.WIND_FROM) {
        w.state = "warn";
        w.t = C.WIND_WARN;
        w.dir = Math.random() < 0.5 ? -1 : 1;
        w.time = 0;
      } else if (w.t <= 0) {
        w.t = 1; // not windy yet; check again soon
      }
    } else if (w.state === "warn" && w.t <= 0) {
      w.state = "blow";
      w.t = C.WIND_TIME;
      w.time = 0;
    } else if (w.state === "blow" && w.t <= 0) {
      w.state = "idle";
      w.t = rand(C.WIND_PAUSE[0], C.WIND_PAUSE[1]);
    }
  }

  updatePlaying(dt) {
    const b = this.bird;
    if (!this.mode.rescue && this.mode.windMul !== 0) this.updateWind(dt);
    b.vy += (C.GRAVITY + this.windForce()) * dt;
    b.y += b.vy * dt;
    b.rot = clamp(b.vy / 600, -0.5, Math.PI / 2);

    const speed = this.speed();
    this.scrollWorld(dt, speed);
    this.emitTrail(dt, speed);

    if (this.mode.rescue) {
      this.updateRescue(dt, speed);
      this.keepInBounds();
      return;
    }

    const magnet = MAGNET_RADIUS[this.save.upgrades.magnet] || 0;

    for (const p of this.pipes) {
      p.x -= speed * dt;
      const squeeze = p.sq
        ? p.sq * (0.5 + 0.5 * Math.sin(this.time * p.sf + p.sp))
        : 0;
      p.gap = p.baseGap - squeeze;
      p.top =
        p.baseTop +
        Math.sin(this.time * p.freq + p.phase) * p.amp +
        squeeze / 2;
    }
    if (
      this.pipes.length &&
      this.pipes[0].x + C.PIPE_W + C.PIPE_CAP_OVERHANG < 0
    )
      this.pipes.shift();
    const last = this.pipes[this.pipes.length - 1];
    if (!last || last.x + C.PIPE_SPACING <= C.W + 20) {
      this.spawnPipe(last ? last.x + C.PIPE_SPACING : C.W + 40);
    }

    for (const p of this.pipes) {
      const gapBottom = p.top + p.gap;

      // Bonus bookkeeping while the bird is level with the pipe
      const r = C.BIRD_HIT_R;
      if (C.BIRD_X > p.x - r && C.BIRD_X < p.x + C.PIPE_W + r) {
        p.minClear = Math.min(
          p.minClear,
          b.y - r - p.top,
          gapBottom - (b.y + r),
        );
      }
      if (!p.centered && p.x + C.PIPE_W / 2 <= C.BIRD_X) {
        p.centered = true;
        p.perfect =
          Math.abs(b.y - (p.top + p.gap / 2)) < p.gap * C.PERFECT_ZONE;
      }

      // Score
      if (!p.scored && p.x + C.PIPE_W < C.BIRD_X - C.BIRD_R) {
        p.scored = true;
        this.passPipe(p);
      }

      // Collectibles
      if (p.item && !p.item.taken) {
        let pos = itemPos(p, this.time);
        if (magnet) {
          const mdx = C.BIRD_X - pos.x;
          const mdy = b.y - pos.y;
          const d = Math.hypot(mdx, mdy);
          if (d < magnet && d > 1) {
            const pull = Math.min(d, (260 + (magnet - d) * 4) * dt);
            p.item.ox = (p.item.ox || 0) + (mdx / d) * pull;
            p.item.oy = (p.item.oy || 0) + (mdy / d) * pull;
            pos = itemPos(p, this.time);
          }
        }
        const dx = pos.x - C.BIRD_X;
        const dy = pos.y - b.y;
        const reach = C.ITEM_R + C.BIRD_HIT_R + 4;
        if (dx * dx + dy * dy < reach * reach) {
          p.item.taken = true;
          this.collect(p.item.type, pos.x, pos.y);
        }
      }

      // Pipes (the hitbox is the pipe body only, so the cap overhang is forgiving)
      if (
        circleRect(C.BIRD_X, b.y, C.BIRD_HIT_R, p.x, 0, C.PIPE_W, p.top) ||
        circleRect(
          C.BIRD_X,
          b.y,
          C.BIRD_HIT_R,
          p.x,
          gapBottom,
          C.PIPE_W,
          C.H - gapBottom,
        )
      ) {
        if (this.hitObstacle()) return;
      }
    }

    // Ground / ceiling
    this.keepInBounds();
  }

  /** Keeps the bird between the ground and the ceiling. */
  keepInBounds() {
    const b = this.bird;
    const floor = C.GROUND_Y - C.BIRD_R;
    if (b.y >= floor) {
      b.y = floor;
      if (this.hitGround()) return;
    } else if (b.y < C.BIRD_R) {
      b.y = C.BIRD_R;
      if (b.vy < 0) b.vy = 0;
    }
  }

  // ---- Rescue mode ----
  updateRescue(dt, speed) {
    this.hist.push(this.bird.y);
    if (this.hist.length > 90) this.hist.shift();
    for (const f of this.flock) f.t = Math.min(0.5, f.t + dt);
    this.field.update(this, dt, speed);
  }

  /** The kind of bird in the next cage; kinds you have not met yet are a bit more likely. */
  pickFriend() {
    const unseen = FRIENDS.filter((f) => !this.save.friends[f.id]);
    const pool = unseen.length && Math.random() < 0.5 ? unseen : FRIENDS;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  onRescue(cage) {
    const friend = findFriend(cage.friend);
    const b = this.bird;
    this.rescued++;
    this.combo++;
    this.addScore(1);
    this.progress.add("rescued", 1);
    audio.play("score", { rate: 1 + Math.min(this.combo - 1, 8) * 0.05 });
    vibrate(10);
    this.particles.burst(
      cage.x,
      cage.y,
      16,
      [friend.colors.body, "#fff", "#ffd23f", friend.colors.wing],
      220,
    );
    this.popup(friend.name, cage.x, cage.y - 22, "#fff", 16);
    this.flock.push({ id: friend.id, t: 0, fx: cage.x, fy: cage.y });
    if (this.flock.length > C.FLOCK_MAX) this.flock.shift();

    const first = !this.save.friends[friend.id];
    this.save.friends[friend.id] = (this.save.friends[friend.id] || 0) + 1;
    if (first) {
      this.progress.max("species", Object.keys(this.save.friends).length);
      this.giveCoins(C.FRIEND_FIRST_BONUS);
      this.toast(
        `New friend: ${friend.name}!`,
        `+${C.FRIEND_FIRST_BONUS} coins`,
      );
      audio.play("power");
    }

    if (this.combo >= 3) {
      this.popup(`Combo x${this.combo}`, C.BIRD_X + 30, b.y - 30, "#9dffb0");
    }
    if (this.combo % C.RESCUE_COMBO_EVERY === 0) {
      this.timeLeft += C.RESCUE_COMBO_TIME;
      this.popup(`+${C.RESCUE_COMBO_TIME}s`, C.W / 2 + 62, 60, "#9fe8ff", 20);
      audio.play("power");
    }

    if (cage.golden) {
      this.timeLeft += C.GOLDEN_TIME;
      this.giveCoins(C.GOLDEN_COINS);
      this.popup(`+${C.GOLDEN_TIME}s`, C.W / 2 + 62, 60, "#ffd23f", 22);
      this.popup(`+${C.GOLDEN_COINS}`, cage.x, cage.y - 44, "#ffd23f", 20);
      this.particles.burst(
        cage.x,
        cage.y,
        20,
        ["#ffd23f", "#fff1a8", "#ffb020"],
        260,
      );
      audio.play("power");
    }
  }

  /** A caged bird flew past without being freed. */
  onMiss() {
    if (this.combo >= 3)
      this.popup("Combo lost", C.BIRD_X + 30, this.bird.y - 30, "#ffb3a0");
    this.combo = 0;
  }

  /** An enemy hit the bird: it costs time, but never the run. */
  onHit(enemy) {
    if (this.shield) {
      this.breakShield(); // Head Start / shield soaks up the hit
      return;
    }
    const b = this.bird;
    const penalty = enemy.penalty ?? C.HIT_PENALTY;
    this.timeLeft = Math.max(0, this.timeLeft - penalty);
    this.combo = 0;
    this.invuln = C.HIT_GRACE;
    this.shake = 0.25;
    audio.play("hit");
    vibrate(25);
    this.popup(`-${penalty}s`, C.BIRD_X + 30, b.y - 20, "#ff8a80", 24);
    this.particles.burst(
      enemy.x,
      enemy.y,
      14,
      ["#4a5168", "#8a93ad", "#ffe45c"],
      220,
    );
    this.particles.feathers(C.BIRD_X, b.y, 4);
  }

  /** A new enemy type shows up for the first time in this run. */
  onEnemySeen(def) {
    this.toast(`Watch out: ${def.name}!`);
  }

  /** A boss wall is on its way. */
  onBoss(text) {
    this.toast("Warning!", text);
    this.popup(text, C.W / 2, 190, "#ff8a80", 30);
    audio.play("hit");
  }

  /** Feather: fly through enemies for a few seconds. */
  grabFeather(x, y) {
    this.ghost = C.GHOST_TIME;
    this.progress.add("powerups", 1);
    audio.play("power");
    this.popup("Ghost!", C.BIRD_X + 30, this.bird.y - 30, "#c8f6ff", 22);
    this.particles.burst(x, y, 16, ["#ffffff", "#c8f6ff", "#9be8c0"], 200);
  }

  /** Magnet: cages within reach slide towards the bird. */
  grabMagnet(x, y) {
    this.magnet = C.CAGE_MAGNET_TIME;
    this.progress.add("powerups", 1);
    audio.play("power");
    this.popup("Magnet!", C.BIRD_X + 30, this.bird.y - 30, "#ff9d8a", 22);
    this.particles.burst(x, y, 16, ["#e8433f", "#e0e0e0", "#fff"], 200);
  }

  /** Hourglass: more time, and the clock stands still for a few seconds. */
  grabHourglass(x, y) {
    this.timeLeft += C.HOURGLASS_BONUS;
    this.freeze = C.HOURGLASS_FREEZE;
    this.progress.add("powerups", 1);
    audio.play("power");
    this.popup(`+${C.HOURGLASS_BONUS}s`, C.W / 2 + 62, 60, "#9fe8ff", 22);
    this.particles.burst(x, y, 16, ["#4fd0e8", "#c8f6ff", "#fff"], 200);
  }

  /** Called once when the bird has flown past a pipe. */
  passPipe(p) {
    const b = this.bird;
    this.addScore(1);
    this.progress.add("pipes", 1);
    audio.play("score");

    if (p.perfect) {
      this.streak++;
      this.progress.max("streak", this.streak);
      if (this.streak >= 3) {
        this.popup(
          `Perfect x${this.streak}`,
          C.BIRD_X + 30,
          b.y - 26,
          "#9dffb0",
        );
      }
      if (this.streak % C.PERFECT_BONUS_EVERY === 0) {
        this.giveCoins(C.PERFECT_BONUS);
        this.popup(
          `+${C.PERFECT_BONUS} bonus`,
          C.BIRD_X + 30,
          b.y - 50,
          "#ffd23f",
          20,
        );
        audio.play("power");
      }
    } else {
      this.streak = 0;
    }

    if (p.minClear >= 0 && p.minClear < C.CLOSE_CALL) {
      this.progress.add("close", 1);
      if (!this.reduceMotion) this.bullet = C.CLOSE_SLOW_TIME;
      if (this.closeCooldown <= 0) {
        this.popup("Close call!", C.BIRD_X + 30, b.y + 34, "#ffb3a0");
        this.closeCooldown = 1.2;
      }
    }
  }

  spawnPipe(x) {
    const level = this.level();
    const gap = this.gap();
    const amp =
      level >= C.MOVING_FROM && Math.random() < 0.6
        ? Math.min(C.MOVE_AMP_MAX, (level - C.MOVING_FROM + 3) * 3)
        : 0;
    const sq =
      level >= C.SQUEEZE_FROM && Math.random() < 0.35
        ? Math.min(C.SQUEEZE_MAX, 10 + (level - C.SQUEEZE_FROM) * 1.5)
        : 0;
    const margin = 50 + amp;
    let lo = margin;
    let hi = C.GROUND_Y - gap - margin;
    const prev = this.pipes[this.pipes.length - 1];
    if (prev) {
      lo = Math.max(lo, prev.baseTop - C.MAX_GAP_SHIFT);
      hi = Math.min(hi, prev.baseTop + C.MAX_GAP_SHIFT);
    }
    const baseTop = lo + Math.random() * Math.max(0, hi - lo);

    this.pipes.push({
      x,
      baseTop,
      top: baseTop,
      baseGap: gap,
      gap,
      amp,
      freq: rand(1.2, 2),
      phase: rand(0, Math.PI * 2),
      sq,
      sf: rand(1.5, 2.4),
      sp: rand(0, Math.PI * 2),
      scored: false,
      centered: false,
      perfect: false,
      minClear: Infinity,
      item: this.rollItem(),
    });
  }

  rollItem() {
    const mode = this.mode;
    const r = Math.random();
    if (r < mode.coinChance) {
      const k = Math.random();
      let type = "coin";
      if (k < C.GEM_CHANCE) type = "gem";
      else if (k < C.GEM_CHANCE + C.GOLD_CHANCE) type = "gold";
      return { type, taken: false, ox: 0, oy: 0 };
    }
    if (r < mode.coinChance + C.HOURGLASS_CHANCE && mode.time)
      return { type: "hourglass", taken: false };
    if (!mode.deadly) return null; // power-ups are pointless when you cannot crash
    if (r < mode.coinChance + 0.07 && !this.shield)
      return { type: "shield", taken: false };
    if (r < mode.coinChance + 0.14 && this.slow <= 0)
      return { type: "slow", taken: false };
    return null;
  }

  addScore(n) {
    this.score += n;
    this.theme.setScore(this.score);
    this.progress.max("runScore", this.score);
  }

  giveCoins(n) {
    this.save.coins += n;
    this.runCoins += n;
    this.progress.max("runCoins", this.runCoins);
    writeSave(this.save);
  }

  collect(type, x, y) {
    const value = COLLECTIBLES[type];
    if (value) {
      const coins = value.coins * this.mode.coinMul;
      this.giveCoins(coins);
      this.addScore(value.score);
      this.progress.add(STAT_OF[type], 1);
      if (type === "gem") {
        audio.play("gem");
        this.flash = Math.max(this.flash, 0.35);
        this.popup(`+${coins}`, x, y - 10, "#7df3ff", 30);
        this.particles.burst(x, y, 26, COIN_BURST.gem, 280);
        vibrate([20, 30, 20]);
      } else if (type === "gold") {
        audio.play("coin", { rate: 1.3 });
        this.popup(`+${coins}`, x, y - 10, "#ffd23f", 22);
        this.particles.burst(x, y, 16, COIN_BURST.gold, 200);
      } else {
        audio.play("coin");
        if (this.mode.coinMul > 1)
          this.popup(`+${coins}`, x, y - 10, "#ffd23f");
        this.particles.burst(x, y, 10, COIN_BURST.coin, 160);
      }
    } else if (type === "hourglass") {
      this.grabHourglass(x, y);
    } else if (type === "shield") {
      this.shield = true;
      this.progress.add("powerups", 1);
      audio.play("power");
      this.particles.burst(x, y, 14, ["#5aaaff", "#bfe0ff", "#fff"], 180);
    } else if (type === "slow") {
      this.slow = C.SLOWMO_TIME;
      this.progress.add("powerups", 1);
      audio.play("power");
      this.particles.burst(x, y, 14, ["#b57edc", "#e0c4f5", "#fff"], 180);
    }
  }

  /** Returns true if the run ended. */
  hitObstacle() {
    if (this.invuln > 0) return false;
    if (this.shield) {
      this.breakShield();
      return false;
    }
    if (!this.mode.deadly) {
      this.bump();
      return false;
    }
    return this.die();
  }

  /** Returns true if the run ended. */
  hitGround() {
    const b = this.bird;
    const floor = C.GROUND_Y - C.BIRD_R;
    if (this.shield) {
      this.breakShield();
    } else if (this.invuln > 0) {
      // just bounce
    } else if (!this.mode.deadly) {
      this.bump();
    } else if (this.die()) {
      return true;
    }
    b.vy = C.FLAP_VELOCITY;
    b.y = Math.min(b.y, floor - 2);
    return false;
  }

  /** Rescue / Coin Rush: a knock that breaks the streak and costs some of the clock. */
  bump() {
    this.invuln = 0.9;
    this.streak = 0;
    this.combo = 0;
    this.shake = 0.15;
    this.bird.vy = C.FLAP_VELOCITY * 0.8;
    audio.play("hit");
    vibrate(15);
    this.particles.feathers(C.BIRD_X, this.bird.y, 5);
    const penalty = this.mode.crashPenalty;
    if (penalty) {
      this.timeLeft = Math.max(0, this.timeLeft - penalty);
      this.popup(
        `-${penalty}s`,
        C.BIRD_X + 30,
        this.bird.y - 20,
        "#ff8a80",
        24,
      );
    }
  }

  breakShield() {
    this.shield = false;
    this.invuln = C.SHIELD_GRACE;
    this.shake = 0.15;
    audio.play("shieldBreak");
    this.particles.burst(
      C.BIRD_X,
      this.bird.y,
      18,
      ["#5aaaff", "#bfe0ff", "#fff"],
      240,
    );
    vibrate(20);
  }

  /** Uses a Second Wind if the player has one. */
  tryRevive() {
    if (this.revived || this.save.upgrades.revive < 1) return false;
    this.save.upgrades.revive--;
    this.revived = true;
    this.invuln = C.REVIVE_GRACE;
    this.streak = 0;
    this.shake = 0.2;
    const b = this.bird;
    b.vy = C.FLAP_VELOCITY;
    b.y = Math.min(b.y, C.GROUND_Y - 90);
    writeSave(this.save);
    audio.play("power");
    this.popup("Second Wind!", C.BIRD_X + 30, b.y - 30, "#9dffb0", 22);
    this.particles.burst(
      C.BIRD_X,
      b.y,
      22,
      ["#9dffb0", "#fff", "#d6ffe0"],
      260,
    );
    return true;
  }

  /** The bird crashed. Returns true if the run ended (false when a revive saved it). */
  die() {
    if (this.tryRevive()) return false;
    const b = this.bird;
    b.vy = -160;
    this.shake = 0.45;
    this.flash = 1;
    audio.play("hit");
    audio.play("die");
    vibrate([40, 30, 60]);
    this.particles.feathers(C.BIRD_X, b.y, 14);
    this.particles.burst(
      C.BIRD_X,
      b.y,
      12,
      ["#f7d21e", "#fff3b0", "#f2641f"],
      260,
    );
    this.progress.add("deaths", 1);
    this.finishRun("crash");
    return true;
  }

  /** Time-limited modes: the clock ran out. */
  timeUp() {
    audio.play("power");
    this.payRescue();
    this.particles.burst(
      C.BIRD_X,
      this.bird.y,
      20,
      ["#9fe8ff", "#fff", "#ffd23f"],
      240,
    );
    this.bird.vy = 0;
    this.finishRun("time");
  }

  /** Rescue: a small, capped thank-you from the freed birds (this is not a coin farm). */
  payRescue() {
    if (!this.mode.rescue) return;
    const pay = Math.min(
      C.RESCUE_COIN_CAP,
      Math.floor(this.rescued / C.RESCUE_COINS_PER),
    );
    if (pay > 0) this.giveCoins(pay);
  }

  /** The player ends the run from the pause menu. The score still counts; it is not a death. */
  endRun() {
    if (this.state !== State.PLAYING || !this.paused) return false;
    this.paused = false;
    this.countdown = 0;
    this.flapQueued = false;
    audio.play("click");
    this.payRescue();
    this.bird.vy = 0;
    this.finishRun("quit");
    return true;
  }

  finishRun(reason) {
    this.state = State.DEAD;
    this.stateTime = 0;
    this.endReason = reason;
    this.slow = 0;
    this.bullet = 0;
    this.freeze = 0;
    this.invuln = 0;
    this.shield = false;
    this.wind.state = "idle";
    const result = this.progress.endRun(this.mode.id, this.score, this.runTime);
    this.newBest = result.newBest;
    this.rank = result.rank;
    writeSave(this.save);
  }
}
