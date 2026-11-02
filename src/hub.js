// The "hub" overlay: missions, high scores, statistics / achievements and friends.

import { audio } from "./audio.js";
import { Dialog, el } from "./dialog.js";
import { FRIENDS } from "./friends.js";
import { MODES } from "./modes.js";
import { ACHIEVEMENTS, missionText } from "./progress.js";
import { renderBirdPreview } from "./sprites.js";

const TABS = [
  { id: "missions", label: "Missions" },
  { id: "scores", label: "Scores" },
  { id: "stats", label: "Stats" },
  { id: "friends", label: "Friends" },
];

const STAT_ROWS = [
  ["Runs played", "runs"],
  ["Pipes passed", "pipes"],
  ["Coins collected", "coins"],
  ["Gold coins", "gold"],
  ["Diamonds found", "gems"],
  ["Birds rescued", "rescued"],
  ["Power-ups", "powerups"],
  ["Close calls", "close"],
  ["Flaps", "flaps"],
  ["Best dead-center streak", "streak"],
  ["Missions completed", "missions"],
  ["Shop purchases", "purchases"],
];

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export class Hub extends Dialog {
  /** @param game the Game */
  constructor(game) {
    super(document.getElementById("hub"), document.getElementById("hub-close"));
    this.game = game;
    this.tabsEl = document.getElementById("hub-tabs");
    this.bodyEl = document.getElementById("hub-body");
    this.kind = TABS[0].id;

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

  onOpen() {
    this.render();
  }

  setTab(kind) {
    if (kind === this.kind) return;
    this.kind = kind;
    audio.play("click");
    this.render();
  }

  render() {
    for (const [id, b] of this.tabButtons) {
      const selected = id === this.kind;
      b.setAttribute("aria-selected", String(selected));
      b.classList.toggle("selected", selected);
    }
    const build = {
      missions: () => this.missions(),
      scores: () => this.scores(),
      stats: () => this.stats(),
      friends: () => this.friends(),
    }[this.kind];
    this.bodyEl.replaceChildren(build());
    this.bodyEl.scrollTop = 0;
  }

  // ---- Missions ----
  missions() {
    const wrap = el("div", "hub-section");
    wrap.append(
      el(
        "p",
        "hub-note",
        "Finish a mission to earn coins. A new one appears right away.",
      ),
    );
    for (const m of this.game.save.missions) {
      const row = el("div", "mission");
      const top = el("div", "mission-top");
      top.append(
        el("span", "mission-text", missionText(m)),
        el("span", "mission-reward", `+${m.reward}`),
      );
      const bar = el("div", "bar");
      const fill = el("div", "bar-fill");
      fill.style.width = `${Math.min(100, (m.progress / m.target) * 100)}%`;
      bar.append(fill);
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", String(m.target));
      bar.setAttribute("aria-valuenow", String(Math.floor(m.progress)));
      row.append(
        top,
        bar,
        el("div", "mission-count", `${Math.floor(m.progress)} / ${m.target}`),
      );
      wrap.append(row);
    }
    return wrap;
  }

  // ---- Scores ----
  scores() {
    const save = this.game.save;
    const wrap = el("div", "hub-section");
    for (const mode of MODES) {
      const block = el("div", "score-block");
      block.append(el("h3", "", mode.name));
      const list = save.scores[mode.id];
      if (!list.length) {
        block.append(el("p", "hub-note", "No scores yet."));
      } else {
        const ol = el("ol", "score-list");
        for (const e of list) {
          const li = el("li");
          li.append(
            el("span", "score-value", String(e.score)),
            el(
              "span",
              "score-date",
              e.date ? new Date(e.date).toLocaleDateString() : "",
            ),
          );
          ol.append(li);
        }
        block.append(ol);
      }
      wrap.append(block);
    }
    return wrap;
  }

  // ---- Stats & achievements ----
  stats() {
    const save = this.game.save;
    const wrap = el("div", "hub-section");

    const dl = el("dl", "stat-grid");
    const row = (label, value) => {
      dl.append(el("dt", "", label), el("dd", "", value));
    };
    for (const [label, key] of STAT_ROWS)
      row(label, Math.floor(save.stats[key] || 0).toLocaleString());
    row("Time played", formatTime(save.stats.playTime || 0));
    wrap.append(dl);

    wrap.append(
      el(
        "h3",
        "",
        `Achievements (${save.achievements.length}/${ACHIEVEMENTS.length})`,
      ),
    );
    const list = el("ul", "achievements");
    for (const a of ACHIEVEMENTS) {
      const done = save.achievements.includes(a.id);
      const li = el("li", done ? "done" : "");
      const value = Math.min(a.target, save.stats[a.stat] || 0);
      const body = el("div", "ach-body");
      body.append(
        el("div", "ach-name", a.name),
        el(
          "div",
          "ach-desc",
          done ? a.desc : `${a.desc} (${Math.floor(value)}/${a.target})`,
        ),
      );
      li.append(
        el("span", "ach-mark", done ? "\u2713" : "\u25CB"),
        body,
        el("span", "mission-reward", `+${a.reward}`),
      );
      list.append(li);
    }
    wrap.append(list);
    return wrap;
  }

  // ---- Friends (birds freed in Rescue mode) ----
  friends() {
    const save = this.game.save;
    const found = FRIENDS.filter((f) => save.friends[f.id]).length;
    const wrap = el("div", "hub-section");
    wrap.append(
      el(
        "p",
        "hub-note",
        `Free caged birds in Rescue mode to meet them all. Met ${found} of ${FRIENDS.length}.`,
      ),
    );
    const grid = el("div", "friend-grid");
    for (const f of FRIENDS) {
      const n = save.friends[f.id] || 0;
      const card = el("div", n ? "friend" : "friend locked");
      const art = el("canvas", "friend-art");
      art.width = 96;
      art.height = 104;
      art.setAttribute("aria-hidden", "true");
      renderBirdPreview(art, f);
      card.append(
        art,
        el("div", "friend-name", n ? f.name : "???"),
        el("div", "friend-count", n ? `Freed ${n}\u00D7` : "Not met yet"),
      );
      grid.append(card);
    }
    wrap.append(grid);
    return wrap;
  }
}
