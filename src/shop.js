// The coin shop: an HTML overlay (so it scrolls, is keyboard accessible and scales with the page).
// All game state changes go through Game.buy() / buyUpgrade() / equip(); this file only builds the UI.

import { audio } from "./audio.js";
import {
  CATEGORIES,
  MAGNET_RADIUS,
  UPGRADES,
  findItem,
  upgradeMax,
  upgradePrice,
} from "./catalog.js";
import { Dialog, el } from "./dialog.js";
import { drawShape } from "./particles.js";
import { renderBirdPreview } from "./sprites.js";

const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

const BOOSTS_TAB = { id: "boost", label: "Boosts" };
const TABS = [BOOSTS_TAB, ...CATEGORIES];
const BOOST_ICON = {
  magnet: "\u{1F9F2}",
  headstart: "\u{1F6E1}\uFE0F",
  revive: "\u2764\uFE0F",
};

/** Draws one pipe (body + cap) on a preview canvas. */
function previewPipe(g, x, y, w, h, capH, capAtBottom, p) {
  const grad = g.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, p.dark);
  grad.addColorStop(0.2, p.light);
  grad.addColorStop(0.6, p.mid);
  grad.addColorStop(1, p.dark);
  g.fillStyle = grad;
  g.strokeStyle = p.outline;
  g.lineWidth = Math.max(1.5, g.canvas.width / 90);
  g.fillRect(x, y, w, h);
  g.strokeRect(x, y, w, h);
  const capY = capAtBottom ? y + h - capH : y;
  g.fillRect(x - w * 0.08, capY, w * 1.16, capH);
  g.strokeRect(x - w * 0.08, capY, w * 1.16, capH);
}

/** A small preview of a world: sky, hills, ground and a pair of pipes. */
function renderWorldPreview(canvas, world) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const th = world.themes[0];
  const groundH = h * 0.22;
  const groundY = h - groundH;

  const sky = g.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, rgb(th.skyTop));
  sky.addColorStop(1, rgb(th.skyBottom));
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  const hills = (base, amp, freq, phase, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, groundY + 1);
    for (let x = 0; x <= w; x += 4)
      g.lineTo(x, base - amp * Math.sin(x * freq + phase));
    g.lineTo(w, groundY + 1);
    g.closePath();
    g.fill();
  };
  hills(groundY - h * 0.12, h * 0.1, 0.035, 1, rgb(th.hillFar));
  hills(groundY - h * 0.02, h * 0.07, 0.05, 3, rgb(th.hillNear));

  const pw = w * 0.17;
  const px = w * 0.62;
  previewPipe(g, px, -2, pw, h * 0.3, h * 0.1, true, world.pipe);
  previewPipe(
    g,
    px,
    h * 0.6,
    pw,
    groundY - h * 0.6 + 1,
    h * 0.1,
    false,
    world.pipe,
  );

  g.fillStyle = world.ground.base;
  g.fillRect(0, groundY, w, groundH);
  g.fillStyle = world.ground.top;
  g.fillRect(0, groundY, w, groundH * 0.3);
}

/** Pipe style preview on top of the equipped world's sky. */
function renderPipePreview(canvas, colors, world) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const th = world.themes[0];
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, rgb(th.skyTop));
  sky.addColorStop(1, rgb(th.skyBottom));
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const pw = w * 0.2;
  previewPipe(g, w * 0.2, -2, pw, h * 0.34, h * 0.12, true, colors);
  previewPipe(g, w * 0.2, h * 0.66, pw, h * 0.4, h * 0.12, false, colors);
  previewPipe(g, w * 0.6, -2, pw, h * 0.2, h * 0.12, true, colors);
  previewPipe(g, w * 0.6, h * 0.5, pw, h * 0.6, h * 0.12, false, colors);
}

/** A few trail particles fading out behind a point. */
function renderTrailPreview(canvas, trail) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  g.fillStyle = "#2c3a52";
  g.fillRect(0, 0, w, h);
  if (!trail.shape) {
    g.fillStyle = "#8896ad";
    g.font = `bold ${h * 0.4}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("\u2014", w / 2, h / 2);
    return;
  }
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0 = old, 1 = fresh
    g.globalAlpha = 0.25 + 0.75 * t;
    g.fillStyle = trail.rainbow
      ? `hsl(${i * 50},95%,60%)`
      : trail.colors[i % trail.colors.length];
    const wobble =
      Math.sin(i * 1.7) * h * 0.1 - (trail.rise ? (1 - t) * h * 0.12 : 0);
    drawShape(
      g,
      trail.shape,
      w * (0.12 + t * 0.62),
      h / 2 + wobble,
      h * (0.1 + 0.1 * t),
      i,
    );
  }
  g.globalAlpha = 1;
}

export class Shop extends Dialog {
  constructor(game) {
    super(
      document.getElementById("shop"),
      document.getElementById("shop-close"),
    );
    this.game = game;
    this.coinsEl = document.getElementById("shop-coins");
    this.tabsEl = document.getElementById("shop-tabs");
    this.listEl = document.getElementById("shop-list");
    this.hintEl = document.getElementById("shop-hint");

    this.kind = TABS[0].id;
    this.previewTrack = null; // id of the music track being previewed, if any
    this.hintTimer = 0;
    this.defaultHint = this.hintEl.textContent;

    this.tabButtons = new Map();
    for (const tab of TABS) {
      const b = el("button", "shop-tab", tab.label);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => this.setTab(tab.id));
      this.tabsEl.append(b);
      this.tabButtons.set(tab.id, b);
    }
  }

  get previewing() {
    return this.previewTrack !== null;
  }

  onOpen() {
    this.hint(this.defaultHint, true);
    this.render();
  }

  onClose() {
    this.previewTrack = null;
  }

  setTab(kind) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.previewTrack = null;
    audio.play("click");
    this.render();
  }

  hint(text, immediate = false) {
    clearTimeout(this.hintTimer);
    this.hintEl.textContent = text;
    if (!immediate) {
      this.hintTimer = setTimeout(() => {
        this.hintEl.textContent = this.defaultHint;
      }, 2800);
    }
  }

  render(focusId) {
    const game = this.game;
    this.coinsEl.textContent = String(game.save.coins);

    for (const [id, b] of this.tabButtons) {
      const selected = id === this.kind;
      b.setAttribute("aria-selected", String(selected));
      b.classList.toggle("selected", selected);
    }

    const cards =
      this.kind === BOOSTS_TAB.id
        ? UPGRADES.map((u) => this.boostCard(u))
        : CATEGORIES.find((c) => c.id === this.kind).items.map((item) =>
            this.card(this.kind, item),
          );
    this.listEl.replaceChildren(...cards);

    if (focusId) {
      const card = this.listEl.querySelector(`[data-id="${focusId}"]`);
      card?.focus({ preventScroll: true });
    }
  }

  /** The price button shared by all cards. */
  priceButton(label, price, onClick) {
    const btn = el("button", "card-btn primary");
    btn.type = "button";
    btn.append(el("span", "coin-dot"), document.createTextNode(` ${price}`));
    const afford = this.game.save.coins >= price;
    btn.classList.toggle("poor", !afford);
    btn.setAttribute("aria-label", `${label} for ${price} coins`);
    if (!afford) btn.setAttribute("aria-disabled", "true");
    btn.addEventListener("click", onClick);
    return btn;
  }

  boostCard(u) {
    const game = this.game;
    const level = game.upgradeLevel(u.id);
    const max = upgradeMax(u);
    const price = upgradePrice(u, level);

    const card = el("div", "card");
    card.dataset.id = u.id;
    card.tabIndex = -1;

    card.append(el("div", "card-art boost", BOOST_ICON[u.id] ?? "\u2B50"));
    card.append(el("div", "card-name", u.name));
    card.append(el("div", "card-desc", u.desc));

    const pips = "\u25CF".repeat(level) + "\u25CB".repeat(max - level);
    const status = el(
      "div",
      "card-level",
      u.consumable ? `In stock: ${level} / ${max}` : pips,
    );
    if (u.id === "magnet" && level > 0)
      status.textContent += `  (reach ${MAGNET_RADIUS[level]})`;
    card.append(status);

    if (price === null) {
      const btn = el(
        "button",
        "card-btn is-equipped",
        u.consumable ? "Full" : "Maxed",
      );
      btn.type = "button";
      btn.disabled = true;
      card.append(btn);
    } else {
      card.append(
        this.priceButton(`Buy ${u.name}`, price, () => this.buyBoost(u, price)),
      );
    }
    return card;
  }

  buyBoost(u, price) {
    const game = this.game;
    const result = game.buyUpgrade(u.id);
    if (result === "ok") {
      audio.play("power");
      this.hint(
        u.consumable
          ? `${u.name} ready for your next crash!`
          : `${u.name} upgraded!`,
      );
    } else if (result === "poor") {
      this.hint(
        `You need ${price - game.save.coins} more coins for ${u.name}.`,
      );
    }
    this.render(u.id);
  }

  card(kind, item) {
    const game = this.game;
    const owned = game.owns(kind, item.id);
    const equipped = game.save.equipped[kind] === item.id;

    const card = el("div", "card");
    card.dataset.id = item.id;
    card.tabIndex = -1;
    card.classList.toggle("equipped", equipped);

    // artwork
    if (kind === "skin") {
      const art = el("canvas", "card-art bird");
      art.width = 144;
      art.height = 156;
      renderBirdPreview(art, item);
      card.append(art);
    } else if (kind === "world") {
      const art = el("canvas", "card-art world");
      art.width = 192;
      art.height = 112;
      renderWorldPreview(art, item);
      card.append(art);
    } else if (kind === "pipe") {
      const art = el("canvas", "card-art world");
      art.width = 192;
      art.height = 112;
      const world = findItem("world", game.save.equipped.world);
      renderPipePreview(art, item.colors ?? world.pipe, world);
      card.append(art);
    } else if (kind === "trail") {
      const art = el("canvas", "card-art world");
      art.width = 192;
      art.height = 112;
      renderTrailPreview(art, item);
      card.append(art);
    } else {
      const art = el("div", "card-art track", "\u266A");
      if (this.previewTrack === item.id) art.classList.add("playing");
      card.append(art);
    }

    card.append(el("div", "card-name", item.name));
    if (item.desc) card.append(el("div", "card-desc", item.desc));

    // music preview
    if (kind === "track") {
      const previewing = this.previewTrack === item.id;
      const pb = el(
        "button",
        "card-btn ghost",
        previewing ? "Stop" : "Preview",
      );
      pb.type = "button";
      pb.setAttribute("aria-pressed", String(previewing));
      pb.addEventListener("click", () => {
        audio.unlock();
        this.previewTrack = previewing ? null : item.id;
        if (this.previewTrack && audio.muted)
          this.hint("Sound is muted - unmute to hear the preview.");
        this.render(item.id);
      });
      card.append(pb);
    }

    // main action
    if (equipped) {
      const btn = el("button", "card-btn is-equipped", "Equipped");
      btn.type = "button";
      btn.disabled = true;
      card.append(btn);
    } else if (owned) {
      const btn = el("button", "card-btn primary", "Equip");
      btn.type = "button";
      btn.addEventListener("click", () => {
        game.equip(kind, item.id);
        if (kind === "track") this.previewTrack = null;
        audio.play("click");
        this.hint(`${item.name} equipped`);
        this.render(item.id);
      });
      card.append(btn);
    } else {
      card.append(
        this.priceButton(`Buy ${item.name}`, item.price, () =>
          this.buy(kind, item),
        ),
      );
    }
    return card;
  }

  buy(kind, item) {
    const game = this.game;
    const result = game.buy(kind, item.id);
    if (result === "ok") {
      game.equip(kind, item.id);
      if (kind === "track") this.previewTrack = null;
      audio.play("power");
      this.hint(`Unlocked ${item.name}!`);
    } else if (result === "poor") {
      this.hint(
        `You need ${item.price - game.save.coins} more coins for ${item.name}.`,
      );
    }
    this.render(item.id);
  }
}
