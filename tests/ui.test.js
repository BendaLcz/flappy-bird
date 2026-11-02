// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Game, State } from "../src/game.js";
import { Hub } from "../src/hub.js";
import { SettingsDialog } from "../src/settings.js";
import { Shop } from "../src/shop.js";

const ctx = new Proxy(
  {},
  {
    get: (t, p) =>
      p === "createLinearGradient"
        ? () => ({ addColorStop() {} })
        : (t[p] ?? (() => {})),
    set: (t, p, v) => ((t[p] = v), true),
  },
);

let game;

beforeEach(() => {
  const html = readFileSync("index.html", "utf8");
  document.body.innerHTML = html.slice(
    html.indexOf("<body>") + 6,
    html.indexOf("<noscript>"),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
  localStorage.clear();
  game = new Game();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const click = (node) =>
  node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

describe("shop", () => {
  it("opens, shows every tab and closes", () => {
    const shop = new Shop(game);
    shop.open();
    expect(shop.isOpen).toBe(true);
    const tabs = [...document.querySelectorAll("#shop-tabs .shop-tab")];
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Boosts",
      "Birds",
      "Worlds",
      "Pipes",
      "Trails",
      "Music",
    ]);
    for (const tab of tabs) {
      click(tab);
      expect(
        document.querySelectorAll("#shop-list .card").length,
        tab.textContent,
      ).toBeGreaterThan(0);
    }
    shop.close();
    expect(shop.isOpen).toBe(false);
  });

  it("buys a boost and a trail through the buttons", () => {
    game.save.coins = 500;
    const shop = new Shop(game);
    shop.open();
    click(document.querySelector('#shop-list [data-id="magnet"] .card-btn'));
    expect(game.upgradeLevel("magnet")).toBe(1);
    expect(document.getElementById("shop-coins").textContent).toBe(
      String(game.save.coins),
    );

    click(
      [...document.querySelectorAll("#shop-tabs .shop-tab")].find(
        (t) => t.textContent === "Trails",
      ),
    );
    click(document.querySelector('#shop-list [data-id="spark"] .card-btn'));
    expect(game.owns("trail", "spark")).toBe(true);
    expect(game.save.equipped.trail).toBe("spark");
  });
});

describe("hub", () => {
  it("shows missions, scores, stats and friends", () => {
    const hub = new Hub(game);
    hub.open();
    expect(document.querySelectorAll("#hub-body .mission")).toHaveLength(3);
    const tab = (name) =>
      [...document.querySelectorAll("#hub-tabs .shop-tab")].find(
        (t) => t.textContent === name,
      );
    click(tab("Scores"));
    expect(document.querySelectorAll("#hub-body .score-block")).toHaveLength(4);
    click(tab("Stats"));
    expect(
      document.querySelectorAll("#hub-body .achievements li").length,
    ).toBeGreaterThan(5);
    click(tab("Friends"));
    expect(document.querySelectorAll("#hub-body .friend")).toHaveLength(8);
    expect(document.querySelectorAll("#hub-body .friend.locked")).toHaveLength(
      8,
    );
    game.save.friends.owl = 2;
    click(tab("Stats"));
    click(tab("Friends"));
    expect(document.querySelectorAll("#hub-body .friend.locked")).toHaveLength(
      7,
    );
    expect(tab("Settings")).toBeUndefined();
  });
});

describe("settings", () => {
  it("lists sound, volumes and toggles", () => {
    const settings = new SettingsDialog(game, () => {});
    settings.open();
    expect(settings.isOpen).toBe(true);
    expect(document.querySelectorAll("#settings-body .setting")).toHaveLength(
      6,
    );
    settings.close();
    expect(settings.isOpen).toBe(false);
  });

  it("changes settings and saves them", () => {
    const onSettings = vi.fn();
    const settings = new SettingsDialog(game, onSettings);
    settings.open();
    const box = document.querySelectorAll(
      '#settings-body input[type="checkbox"]',
    )[1]; // tap anywhere
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(game.save.settings.tapAnywhere).toBe(true);
    expect(onSettings).toHaveBeenCalled();
    expect(
      JSON.parse(localStorage.getItem("flappy-bird:v1")).settings.tapAnywhere,
    ).toBe(true);
  });

  it("turns the sound on and off", () => {
    const settings = new SettingsDialog(game, () => {});
    settings.open();
    const box = document.querySelector('#settings-body input[type="checkbox"]');
    expect(box.checked).toBe(true);
    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(game.save.muted).toBe(true);
    expect(JSON.parse(localStorage.getItem("flappy-bird:v1")).muted).toBe(true);
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(game.save.muted).toBe(false);
  });

  it("asks before resetting progress", () => {
    game.save.coins = 77;
    const settings = new SettingsDialog(game, () => {});
    settings.open();
    click(document.querySelector(".danger-btn"));
    expect(game.save.coins).toBe(77); // not yet
    click(document.querySelector(".danger-cancel"));
    expect(game.save.coins).toBe(77);
    click(document.querySelector(".danger-btn"));
    click(document.querySelector(".danger-row .danger-btn"));
    expect(game.save.coins).toBe(0);
  });

  it("hides the reset button during a run", () => {
    const settings = new SettingsDialog(game, () => {});
    game.state = State.PLAYING;
    game.paused = true;
    settings.open();
    expect(document.querySelectorAll("#settings-body .setting")).toHaveLength(
      6,
    );
    expect(document.querySelector(".danger-btn")).toBeNull();
  });
});
