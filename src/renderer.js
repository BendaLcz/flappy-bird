import { findItem } from "./catalog.js";
import * as C from "./config.js";
import { State, itemPos } from "./game.js";
import { hint } from "./input.js";
import {
  BIRD_H,
  BIRD_W,
  CAGE_H,
  CAGE_W,
  FRIEND_H,
  FRIEND_W,
  ITEM_SIZE,
  SPIDER_H,
  SPIDER_W,
  WALL_CAP_H,
  WALL_TILE_H,
  buildSprites,
} from "./sprites.js";
import { VERSION } from "./version.js";

const TAU = Math.PI * 2;
const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class Renderer {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.sprites = null;
    this.scale = 1;
    this.skin = null;
    this.world = null;
    this.pipeItem = null;
    this.resize();
  }

  /** Fit the logical W x H area into the stage, keep the aspect ratio, and render at device resolution. */
  resize() {
    const sw = this.stage.clientWidth;
    const sh = this.stage.clientHeight;
    if (!sw || !sh) return;
    const fit = Math.min(sw / C.W, sh / C.H);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = Math.floor(C.W * fit);
    const cssH = Math.floor(C.H * fit);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(
      this.canvas.width / C.W,
      0,
      0,
      this.canvas.height / C.H,
      0,
      0,
    );
    this.scale = this.canvas.width / C.W;
    this.sprites = null; // rebuilt at the start of the next frame
  }

  /** Rebuilds the sprites when the screen size or the equipped bird / world / pipes changed. */
  syncLook(g) {
    const skin = findItem("skin", g.save.equipped.skin);
    const world = findItem("world", g.save.equipped.world);
    const pipeItem = findItem("pipe", g.save.equipped.pipe);
    if (
      !this.sprites ||
      skin !== this.skin ||
      world !== this.world ||
      pipeItem !== this.pipeItem
    ) {
      this.skin = skin;
      this.world = world;
      this.pipeItem = pipeItem;
      this.sprites = buildSprites(
        this.scale,
        skin,
        pipeItem.colors ?? world.pipe,
      );
    }
  }

  // ---- helpers ----
  blit(sprite, x, y, w = sprite.w, h = sprite.h) {
    this.ctx.drawImage(sprite.canvas, x, y, w, h);
  }

  text(str, x, y, size, o = {}) {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = o.align || "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size / 8);
    ctx.strokeStyle = o.stroke || "#000";
    ctx.fillStyle = o.fill || "#fff";
    if (o.stroke !== "none") ctx.strokeText(str, x, y);
    ctx.fillText(str, x, y);
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  star(cx, cy, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ---- frame ----
  draw(g) {
    const ctx = this.ctx;
    this.syncLook(g);
    ctx.save();
    if (g.shake > 0 && !g.reduceMotion) {
      const m = (8 * g.shake) / 0.45;
      ctx.translate(
        (Math.random() - 0.5) * 2 * m,
        (Math.random() - 0.5) * 2 * m,
      );
    }
    this.drawSky(g);
    this.drawStars(g);
    this.drawClouds(g);
    this.drawHills(g);
    this.drawPipes(g);
    this.drawItems(g);
    this.drawRescue(g);
    this.drawGround(g);
    g.particles.draw(ctx);
    this.drawFlock(g);
    this.drawBird(g);
    this.drawWind(g);
    ctx.restore();

    this.drawHud(g);
    if (g.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${g.flash * (g.reduceMotion ? 0.25 : 0.7)})`;
      ctx.fillRect(0, 0, C.W, C.H);
    }
  }

  drawSky(g) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, C.GROUND_Y);
    grad.addColorStop(0, g.theme.css("skyTop"));
    grad.addColorStop(1, g.theme.css("skyBottom"));
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, C.W + 40, C.H + 40);
  }

  drawStars(g) {
    const a = g.theme.cur.stars;
    if (a < 0.02) return;
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    for (const s of g.stars) {
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(g.clock * 2 + s.t));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  drawClouds(g) {
    const ctx = this.ctx;
    ctx.fillStyle = g.theme.css("cloud");
    ctx.globalAlpha = 0.9;
    for (const c of g.clouds) {
      const s = c.s;
      ctx.beginPath();
      for (const [dx, dy, r] of [
        [0, 0, 14],
        [16, -8, 18],
        [34, 0, 14],
        [17, 6, 14],
      ]) {
        ctx.moveTo(c.x + dx * s + r * s, c.y + dy * s);
        ctx.arc(c.x + dx * s, c.y + dy * s, r * s, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  hillLayer(offset, base, amp, freq, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-20, C.GROUND_Y + 2);
    for (let x = -20; x <= C.W + 20; x += 6) {
      const t = (x + offset) * freq;
      ctx.lineTo(
        x,
        base - (Math.sin(t) * amp + Math.sin(t * 2.3 + 1) * amp * 0.4),
      );
    }
    ctx.lineTo(C.W + 20, C.GROUND_Y + 2);
    ctx.closePath();
    ctx.fill();
  }

  drawHills(g) {
    this.hillLayer(
      g.scroll.hillFar,
      C.GROUND_Y - 50,
      30,
      0.012,
      g.theme.css("hillFar"),
    );
    this.hillLayer(
      g.scroll.hillNear,
      C.GROUND_Y - 14,
      22,
      0.02,
      g.theme.css("hillNear"),
    );
  }

  drawPipes(g) {
    const s = this.sprites;
    const capW = C.PIPE_W + C.PIPE_CAP_OVERHANG * 2;
    for (const p of g.pipes) {
      const topBodyH = p.top - C.PIPE_CAP_H;
      if (topBodyH > 0) this.blit(s.pipeBody, p.x, 0, C.PIPE_W, topBodyH);
      this.blit(
        s.pipeCap,
        p.x - C.PIPE_CAP_OVERHANG,
        p.top - C.PIPE_CAP_H,
        capW,
        C.PIPE_CAP_H,
      );

      const by = p.top + p.gap;
      this.blit(s.pipeCap, p.x - C.PIPE_CAP_OVERHANG, by, capW, C.PIPE_CAP_H);
      this.blit(
        s.pipeBody,
        p.x,
        by + C.PIPE_CAP_H,
        C.PIPE_W,
        C.H - by - C.PIPE_CAP_H + 20,
      );
    }
  }

  drawItems(g) {
    const ctx = this.ctx;
    for (const p of g.pipes) {
      if (!p.item || p.item.taken) continue;
      const pos = itemPos(p, g.time);
      if (p.item.type === "gem") {
        // a soft pulsing glow so the rare diamond stands out
        ctx.fillStyle = `rgba(125,243,255,${0.22 + 0.14 * Math.sin(g.clock * 6)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 17, 0, TAU);
        ctx.fill();
      }
      this.blit(
        this.sprites[p.item.type],
        pos.x - ITEM_SIZE / 2,
        pos.y - ITEM_SIZE / 2,
      );
    }
  }

  /** Rescue mode: caged birds, enemies and pickups. */
  drawRescue(g) {
    if (!g.mode.rescue) return;
    const ctx = this.ctx;
    const s = this.sprites;
    const center = (sprite, x, y) =>
      this.blit(sprite, x - sprite.w / 2, y - sprite.h / 2);
    // Enemies on top of the cages and pickups.
    for (const it of g.field.items) if (!it.enemy) this.drawRescueItem(g, it);
    for (const it of g.field.items) {
      switch (it.kind) {
        case "balloon":
          center(s.balloon, it.x, it.y);
          break;
        case "wasp":
          center(
            s.wasp[Math.floor(g.clock * 30 + it.phase * 5) % 2],
            it.x,
            it.y,
          );
          break;
        case "hawk":
          center(s.hawk[Math.floor(g.clock * 8 + it.phase) % 2], it.x, it.y);
          break;
        case "cactus":
          this.drawCactus(it);
          break;
        case "spider":
          this.drawSpider(it);
          break;
        case "wall":
          this.drawWall(it);
          break;
        case "dive":
          if (it.state === "warn") this.drawDiveWarning(g, it);
          else {
            ctx.save();
            ctx.translate(it.x, it.y);
            ctx.rotate(Math.atan2(it.vy, it.vx) - Math.PI);
            center(s.hawk[Math.floor(g.clock * 14) % 2], 0, 0);
            ctx.restore();
          }
          break;
        case "cat": {
          const jumping = it.state === "jump";
          const shake =
            it.state === "crouch" ? Math.sin(g.clock * 70) * 1.5 : 0;
          center(s.cat[jumping ? 1 : 0], it.x + shake, it.y);
          if (it.state === "crouch") {
            this.text("!", it.x, it.y - 26, 20, { fill: "#ffe45c" });
          }
          break;
        }
        default:
      }
    }
  }

  drawRescueItem(g, it) {
    const ctx = this.ctx;
    const s = this.sprites;
    if (it.kind === "cage") {
      if (it.golden) {
        const r = 28 + 3 * Math.sin(g.clock * 5);
        ctx.fillStyle = `rgba(255,210,63,${0.22 + 0.1 * Math.sin(g.clock * 5)})`;
        ctx.beginPath();
        ctx.arc(it.x, it.y, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff1a8";
        for (let k = 0; k < 3; k++) {
          const a = g.clock * 2 + (k * TAU) / 3;
          ctx.beginPath();
          ctx.arc(it.x + Math.cos(a) * 26, it.y + Math.sin(a) * 26, 2, 0, TAU);
          ctx.fill();
        }
      }
      const set = it.golden ? s.cageGold : s.cage;
      this.blit(set[it.friend], it.x - CAGE_W / 2, it.y - CAGE_H / 2);
      return;
    }
    const glow = {
      hourglass: "79,208,232",
      feather: "155,232,192",
      magnet: "232,67,63",
    }[it.kind];
    ctx.fillStyle = `rgba(${glow},${0.22 + 0.14 * Math.sin(g.clock * 6)})`;
    ctx.beginPath();
    ctx.arc(it.x, it.y, 17, 0, TAU);
    ctx.fill();
    this.blit(s[it.kind], it.x - ITEM_SIZE / 2, it.y - ITEM_SIZE / 2);
  }

  /** A cactus growing from the ground up to it.y; arms depend on how tall it is. */
  drawCactus(it) {
    const ctx = this.ctx;
    const x = it.x;
    const top = it.y;
    const base = C.GROUND_Y + 4;
    const len = base - top;
    const arms = [];
    if (len > 90) arms.push({ s: -1, y: top + len * 0.45 });
    if (len > 130) arms.push({ s: 1, y: top + len * 0.3 });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const paint = (color, trunk, arm) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = trunk;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, base);
      ctx.stroke();
      ctx.lineWidth = arm;
      for (const a of arms) {
        ctx.beginPath();
        ctx.moveTo(x, a.y);
        ctx.lineTo(x + a.s * 15, a.y);
        ctx.lineTo(x + a.s * 15, a.y - 22);
        ctx.stroke();
      }
    };
    paint("#1f5a2a", 20, 12);
    paint("#4aa84f", 16, 8);
    ctx.strokeStyle = "#7fd07f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, top + 3);
    ctx.lineTo(x - 4, base);
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let d = top + 14; d < C.GROUND_Y - 6; d += 20) {
      ctx.moveTo(x - 6, d);
      ctx.lineTo(x - 11, d - 2);
      ctx.moveTo(x + 6, d + 8);
      ctx.lineTo(x + 11, d + 6);
    }
    ctx.stroke();
    ctx.fillStyle = "#ff6fa8";
    ctx.beginPath();
    ctx.arc(x, top - 9, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffe45c";
    ctx.beginPath();
    ctx.arc(x, top - 9, 1.8, 0, TAU);
    ctx.fill();
  }

  /** A spider dangling from the top edge on a thread. */
  drawSpider(it) {
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(it.x, 0);
    ctx.lineTo(it.x, it.y - 9);
    ctx.stroke();
    this.blit(this.sprites.spider, it.x - SPIDER_W / 2, it.y - SPIDER_H / 2);
  }

  /** A boss wall: floor to ceiling, with one narrow opening between two rims. */
  drawWall(it) {
    const { body, cap } = this.sprites.wall[it.style];
    const x = it.x - it.w / 2;
    const top = it.y - it.gap / 2;
    const bottom = it.y + it.gap / 2;
    for (
      let y = top - WALL_CAP_H - WALL_TILE_H;
      y > -WALL_TILE_H;
      y -= WALL_TILE_H
    )
      this.blit(body, x + 4, y);
    this.blit(cap, x, top - WALL_CAP_H);
    this.blit(cap, x, bottom);
    for (let y = bottom + WALL_CAP_H; y < C.H; y += WALL_TILE_H)
      this.blit(body, x + 4, y);
  }

  /** Warning marker at the screen edge plus the dotted path the hawk will take. */
  drawDiveWarning(g, it) {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(g.clock * 16);
    const x0 = C.W + 24;
    const t = (x0 + 30) / C.DIVE_VX;
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(255,90,80,${0.25 + 0.3 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(x0, it.y);
    ctx.lineTo(-30, it.y + it.dir * C.DIVE_VY * t);
    ctx.stroke();
    ctx.restore();
    const r = 15 + 3 * pulse;
    ctx.fillStyle = "#ff4d4d";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(it.x, it.y - r);
    ctx.lineTo(it.x + r, it.y + r * 0.8);
    ctx.lineTo(it.x - r, it.y + r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this.text("!", it.x, it.y + r * 0.6, 18, { stroke: "none" });
  }

  /** The freed birds follow your bird's path, a little behind each other. */
  drawFlock(g) {
    if (!g.mode.rescue || g.state !== State.PLAYING) return;
    const n = g.flock.length;
    g.flock.forEach((f, k) => {
      const slot = n - 1 - k; // the newest friend flies closest to you
      const sx = C.BIRD_X - 28 * (slot + 1) - 4;
      const sy = g.hist[g.hist.length - 1 - (slot + 1) * 9] ?? g.bird.y;
      const e = clamp01(f.t / 0.5);
      const k2 = e * e * (3 - 2 * e);
      const x = f.fx + (sx - f.fx) * k2;
      const y = f.fy + (sy - f.fy) * k2;
      const frame = [0, 1, 2, 1][Math.floor(g.clock * 12 + slot) % 4];
      this.blit(
        this.sprites.friend[f.id][frame],
        x - FRIEND_W / 2,
        y - FRIEND_H / 2,
      );
    });
  }

  /** Streaks and a label while a gust is coming / blowing. */
  drawWind(g) {
    const w = g.wind;
    if (w.state === "idle" || g.state !== State.PLAYING) return;
    const blowing = w.state === "blow";
    const ctx = this.ctx;
    const lines = g.reduceMotion ? 6 : 16;
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.globalAlpha = blowing ? 0.45 : 0.12 + 0.1 * Math.sin(g.clock * 14);
    const span = C.GROUND_Y;
    for (let i = 0; i < lines; i++) {
      const x = (i * 47 + 20) % C.W;
      const len = 26 + (i % 3) * 10;
      const speed = blowing ? 560 : 0;
      const y0 = (((i * 131 + g.clock * speed * w.dir) % span) + span) % span;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 - w.dir * len);
      ctx.stroke();
    }
    ctx.restore();
    const arrow = w.dir < 0 ? "\u25B2" : "\u25BC";
    this.text(`${arrow} ${w.dir < 0 ? "Updraft" : "Downdraft"}`, 12, 62, 16, {
      align: "left",
      fill: blowing ? "#fff" : "#ffe08a",
    });
  }

  drawGround(g) {
    const ctx = this.ctx;
    const ground = this.world.ground;
    ctx.fillStyle = ground.base;
    ctx.fillRect(-20, C.GROUND_Y, C.W + 40, C.GROUND_H + 20);
    ctx.fillStyle = ground.top;
    ctx.fillRect(-20, C.GROUND_Y, C.W + 40, 12);
    ctx.fillStyle = ground.dots;
    for (let x = -g.scroll.ground - 24; x < C.W + 20; x += 24) {
      ctx.fillRect(x, C.GROUND_Y + 12, 12, 4);
    }
  }

  drawBird(g) {
    const ctx = this.ctx;
    const b = g.bird;
    let frame = 1;
    if (g.state === State.READY)
      frame = [0, 1, 2, 1][Math.floor(g.clock * 14) % 4];
    else if (b.flapAnim > 0)
      frame = [0, 1, 2, 1][
        Math.min(3, Math.floor(((0.25 - b.flapAnim) / 0.25) * 4))
      ];

    ctx.save();
    if (g.invuln > 0 && Math.floor(g.clock * 16) % 2 === 0)
      ctx.globalAlpha = 0.4;
    else if (g.ghost > 0 && (g.ghost > 1 || Math.floor(g.clock * 8) % 2 === 0))
      ctx.globalAlpha = 0.5;
    ctx.translate(C.BIRD_X, b.y);
    ctx.rotate(b.rot);
    this.blit(this.sprites.bird[frame], -BIRD_W / 2, -BIRD_H / 2);
    ctx.restore();

    if (g.shield) {
      ctx.save();
      ctx.fillStyle = "rgba(120,190,255,0.25)";
      ctx.strokeStyle = "rgba(160,210,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(C.BIRD_X, b.y, 23 + Math.sin(g.clock * 6) * 1.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---- HUD & overlays ----
  drawHud(g) {
    const ctx = this.ctx;

    // total coins (top-left)
    this.blit(this.sprites.coin, 12, 12);
    this.text(String(g.save.coins), 40, 30, 20, { align: "left" });

    if (g.state === State.PLAYING) {
      // Rescue keeps the middle of the screen free: the big number is replaced by a small count
      // in the corner and the clock sits at the very top (cages never go above y = 70).
      if (g.mode.rescue) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        this.text(`Rescued ${g.score}`, 12, 58, 18, {
          align: "left",
          fill: "#fff",
        });
        ctx.restore();
      } else this.text(String(g.score), C.W / 2, 90, 52);
      if (g.mode.time) this.drawTimer(g);
      this.drawPowerups(g);
    } else if (g.state === State.READY) {
      this.drawReady(g);
    } else {
      this.drawGameOver(g);
    }

    this.drawPopups(g);
    this.drawToasts(g);

    if (g.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, C.W, C.H);
      this.text("Paused", C.W / 2, C.H / 2 - 10, 46);
      this.text(hint("resume"), C.W / 2, C.H / 2 + 34, 20);
    } else if (g.countdown > 0) {
      const n = Math.ceil(g.countdown / 0.8);
      const frac = (g.countdown / 0.8) % 1 || 1;
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.6 * frac;
      this.text(String(n), C.W / 2, C.H / 2, 40 + 60 * frac);
      ctx.restore();
    }
  }

  drawTimer(g) {
    const t = Math.ceil(g.timeLeft);
    const frozen = g.freeze > 0;
    const low = t <= 10 && !frozen;
    const pulse = low && Math.floor(g.clock * 4) % 2 === 0;
    this.text(`${t}s`, C.W / 2, g.mode.rescue ? 34 : 124, low ? 28 : 24, {
      fill: frozen
        ? "#7df3ff"
        : pulse
          ? "#ff8a80"
          : low
            ? "#ffb3a0"
            : "#9fe8ff",
    });
  }

  drawPopups(g) {
    const ctx = this.ctx;
    for (const p of g.popups) {
      ctx.save();
      ctx.globalAlpha = clamp01((p.life / p.max) * 2);
      this.text(p.text, p.x, p.y, p.size, { fill: p.color });
      ctx.restore();
    }
  }

  drawToasts(g) {
    const ctx = this.ctx;
    if (g.state === State.PLAYING) return this.drawToastChips(g);
    g.toasts.forEach((t, i) => {
      const a = clamp01(Math.min(t.life / 0.4, (3.2 - t.life) / 0.2));
      const y = 506 - i * 52;
      ctx.save();
      ctx.globalAlpha = a;
      this.roundRect(30, y, C.W - 60, 46, 12);
      ctx.fillStyle = "rgba(20,24,31,0.88)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffd23f";
      ctx.stroke();
      this.text(
        t.title,
        C.W / 2,
        y + (t.sub ? 20 : 29),
        this.fit(t.title, 15),
        {
          stroke: "none",
          fill: "#ffd23f",
        },
      );
      if (t.sub) {
        this.text(t.sub, C.W / 2, y + 38, this.fit(t.sub, 13), {
          stroke: "none",
        });
      }
      ctx.restore();
    });
  }
  /**
   * While playing, messages are small one-line chips in the top-right corner, so they never
   * cover the bird, cages or pipes. (The big cards are only used on the ready / game over screens.)
   */
  drawToastChips(g) {
    const ctx = this.ctx;
    const shown = g.toasts.slice(-2).reverse(); // newest first
    const maxW = C.W - 110;
    let y = 8;
    shown.forEach((t) => {
      const a = clamp01(Math.min(t.life / 0.4, (3.2 - t.life) / 0.2));
      // One line if it fits, otherwise the title and the details on their own (wrapped) lines.
      const label = t.sub ? `${t.title}  ${t.sub}` : t.title;
      let lines = this.wrapText(label, 12, maxW - 22);
      if (lines.length > 1 && t.sub) {
        lines = [
          ...this.wrapText(t.title, 12, maxW - 22),
          ...this.wrapText(t.sub, 12, maxW - 22),
        ];
      }
      this.ctx.font = `bold 12px ${FONT}`;
      const w = Math.min(
        maxW,
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22,
      );
      const h = 8 + lines.length * 14; // 22 for one line; equal padding above and below
      const x = C.W - 8 - w;
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      this.roundRect(x, y, w, h, Math.min(11, h / 2));
      ctx.fillStyle = "rgba(20,24,31,0.8)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffd23f";
      ctx.stroke();
      lines.forEach((line, k) => {
        this.text(line, x + w / 2, y + 15.5 + k * 14, 12, {
          stroke: "none",
          fill: "#ffd23f",
        });
      });
      ctx.restore();
      y += h + 4;
    });
  }

  /** The font size (at most `size`) at which `str` fits into a toast card. */
  fit(str, size) {
    this.ctx.font = `bold ${size}px ${FONT}`;
    const w = this.ctx.measureText(str).width;
    const room = C.W - 60 - 24;
    return w > room ? Math.max(9, (size * room) / w) : size;
  }

  /** Splits `str` at spaces into lines that are at most `maxW` wide (long words are kept whole). */
  wrapText(str, size, maxW) {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px ${FONT}`;
    const lines = [];
    let line = "";
    for (const word of str.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  drawPowerups(g) {
    const ctx = this.ctx;
    // Rescue: a compact column in the top-left corner, clear of the cages and the bird.
    const rescue = g.mode.rescue;
    const x0 = rescue ? 12 : C.W / 2 - 44;
    const bx = x0 + 28;
    const bw = rescue ? 44 : 60;
    let y = rescue ? 68 : g.mode.time ? 142 : 112;
    if (g.freeze > 0) {
      this.blit(this.sprites.hourglass, x0, y);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      this.roundRect(bx, y + 6, bw, 10, 5);
      ctx.fill();
      72;
      ctx.fillStyle = "#4fd0e8";
      this.roundRect(
        bx,
        y + 6,
        Math.max(4, (bw * g.freeze) / C.HOURGLASS_FREEZE),
        10,
        5,
      );
      ctx.fill();
      y += 28;
    }
    if (g.shield) {
      this.blit(this.sprites.shield, x0, y);
      this.text("Shield", bx, y + 17, 15, { align: "left" });
      y += 28;
    }
    for (const [sprite, left, total, color] of [
      [this.sprites.feather, g.ghost, C.GHOST_TIME, "#9be8c0"],
      [this.sprites.magnet, g.magnet, C.CAGE_MAGNET_TIME, "#e8433f"],
    ]) {
      if (left <= 0) continue;
      this.blit(sprite, x0, y);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      this.roundRect(bx, y + 6, bw, 10, 5);
      ctx.fill();
      ctx.fillStyle = color;
      this.roundRect(bx, y + 6, Math.max(4, (bw * left) / total), 10, 5);
      ctx.fill();
      y += 28;
    }
    // Blink while the slow-mo is easing out so the player sees it coming
    const fading = g.slow > 0 && g.slow < C.SLOWMO_RAMP;
    if (g.slow > 0 && (!fading || Math.floor(g.slow * 6) % 2 === 0)) {
      this.blit(this.sprites.slow, x0, y);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      this.roundRect(bx, y + 6, bw, 10, 5);
      ctx.fill();
      ctx.fillStyle = "#b57edc";
      this.roundRect(
        bx,
        y + 6,
        Math.max(4, (bw * g.slow) / C.SLOWMO_TIME),
        10,
        5,
      );
      ctx.fill();
    }
  }

  drawReady(g) {
    const ctx = this.ctx;
    this.text("Flappy Bird", C.W / 2, 160, 44);
    if (g.best > 0) this.text(`Best: ${g.best}`, C.W / 2, 200, 22);
    ctx.save();
    ctx.globalAlpha = 0.6;
    this.text("© 2026 Libor Benda", 6, C.H - 6, 10, {
      align: "left",
      stroke: "none",
    });
    this.text(`v${VERSION}`, C.W - 6, C.H - 6, 10, {
      align: "right",
      stroke: "none",
    });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.clock * 4);
    this.text(hint("flap"), C.W / 2, 400, 22);
    ctx.restore();
    this.text(
      g.mode.hint ?? "Grab coins, shields and slow-mo",
      C.W / 2,
      440,
      14,
    );
    this.text("Spend your coins in the shop (top right)", C.W / 2, 462, 14);
    this.text(g.mode.desc, C.W / 2, 494, 15, { fill: "#ffe08a" });
  }

  drawGameOver(g) {
    const ctx = this.ctx;
    const a = clamp01((g.stateTime - 0.25) / 0.35);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, (1 - a) * 30);

    this.text(
      { time: "Time's Up!", quit: "Run Over" }[g.endReason] ?? "Game Over",
      C.W / 2,
      125,
      42,
    );

    // panel
    this.roundRect(40, 150, 280, 240, 16);
    ctx.fillStyle = "#f5ecc0";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#5a4a1a";
    ctx.stroke();
    this.text(g.mode.name.toUpperCase(), C.W / 2, 178, 13, {
      fill: "#a0561c",
      stroke: "none",
    });

    // medal
    const medal = C.MEDALS.find((m) => g.score >= m.score);
    const mx = 100;
    const my = 270;
    if (medal) {
      ctx.fillStyle = medal.color;
      ctx.strokeStyle = medal.dark;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(mx, my, 34, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = medal.dark;
      this.star(mx, my, 20);
      ctx.fill();
      this.text(medal.name, mx, my + 62, 16, {
        fill: "#5a4a1a",
        stroke: "none",
      });
    } else {
      ctx.strokeStyle = "#b9ad7a";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(mx, my, 34, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      this.text("10 for a medal", mx, my + 62, 14, {
        fill: "#8a7a3a",
        stroke: "none",
      });
    }

    // numbers
    const lab = { fill: "#a0561c", stroke: "none" };
    this.text(g.mode.rescue ? "FREED" : "SCORE", 235, 200, 15, lab);
    this.text(String(g.score), 235, 245, 44, { stroke: "#5a4a1a" });
    this.text("BEST", 235, 290, 15, lab);
    this.text(String(g.best), 235, 335, 44, { stroke: "#5a4a1a" });
    if (g.runCoins > 0)
      this.text(`+${g.runCoins} coins`, 235, 372, 14, {
        fill: "#8a6a00",
        stroke: "none",
      });
    if (g.rank > 0 && !g.newBest)
      this.text(`Leaderboard: #${g.rank}`, C.W / 2, 414, 16, {
        fill: "#ffd23f",
      });

    // "new best" ribbon
    if (g.newBest) {
      const pulse = 1 + Math.sin(g.clock * 8) * 0.04;
      ctx.save();
      ctx.translate(C.W / 2, 150);
      ctx.scale(pulse, pulse);
      this.roundRect(-62, -14, 124, 28, 8);
      ctx.fillStyle = "#e8402a";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#7a1c0f";
      ctx.stroke();
      this.text("NEW BEST!", 0, 6, 17, { stroke: "none" });
      ctx.restore();
    }

    // restart hint
    ctx.globalAlpha =
      a *
      (g.stateTime > C.RESTART_DELAY ? 0.6 + 0.4 * Math.sin(g.clock * 4) : 0.3);
    this.text(hint("restart"), C.W / 2, 440, 22);
    ctx.restore();
  }
}
