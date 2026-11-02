// The settings overlay (gear button): sound, controls, accessibility and resetting progress.

import { audio } from "./audio.js";
import { Dialog, el } from "./dialog.js";
import { State } from "./game.js";
import { writeSave } from "./storage.js";

export class SettingsDialog extends Dialog {
  /**
   * @param game the Game
   * @param onSettings called whenever a setting changed (apply it to the page / audio)
   */
  constructor(game, onSettings) {
    super(
      document.getElementById("settings"),
      document.getElementById("settings-close"),
    );
    this.game = game;
    this.onSettings = onSettings;
    this.bodyEl = document.getElementById("settings-body");
    this.confirming = false;
  }

  onOpen() {
    this.confirming = false;
    this.render();
  }

  render() {
    this.bodyEl.replaceChildren(this.build());
    this.bodyEl.scrollTop = 0;
  }

  build() {
    const game = this.game;
    const s = game.save.settings;
    const wrap = el("div", "hub-section");

    const changed = () => {
      writeSave(game.save);
      this.onSettings();
    };

    const slider = (label, key, preview) => {
      const row = el("label", "setting");
      row.append(el("span", "", label));
      const input = el("input");
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.value = String(Math.round(s[key] * 100));
      input.addEventListener("input", () => {
        s[key] = Number(input.value) / 100;
        this.onSettings();
      });
      input.addEventListener("change", () => {
        changed();
        audio.unlock();
        preview?.();
      });
      row.append(input);
      return row;
    };

    const toggle = (label, hint, get, set) => {
      const row = el("label", "setting");
      const text = el("span", "");
      text.append(label);
      if (hint) text.append(el("small", "", hint));
      const input = el("input");
      input.type = "checkbox";
      input.checked = get();
      input.addEventListener("change", () => {
        set(input.checked);
        changed();
        audio.unlock();
        audio.play("click");
      });
      row.append(text, input);
      return row;
    };

    const flag = (label, key, hint) =>
      toggle(
        label,
        hint,
        () => !!s[key],
        (on) => (s[key] = on),
      );

    wrap.append(
      toggle(
        "Sound",
        "Turns all sound on or off",
        () => !game.save.muted,
        (on) => (game.save.muted = !on),
      ),
      slider("Music volume", "musicVolume"),
      slider("Effects volume", "sfxVolume", () => audio.play("coin")),
      flag("Tap anywhere to flap", "tapAnywhere", "Not just on the game"),
      flag("Left-handed controls", "controlsLeft", "Buttons on the left"),
      flag("Reduce motion", "reduceMotion", "No shake, flashes or slow-mo"),
    );

    // Resetting is only offered while no run is in progress.
    if (game.state !== State.PLAYING) wrap.append(this.danger());
    return wrap;
  }

  /** Reset progress (asks for confirmation first). */
  danger() {
    const game = this.game;
    const danger = el("div", "danger");
    if (!this.confirming) {
      const btn = el("button", "card-btn danger-btn", "Reset progress");
      btn.type = "button";
      btn.addEventListener("click", () => {
        this.confirming = true;
        audio.play("click");
        this.render();
        this.bodyEl.querySelector(".danger-cancel")?.focus();
        this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
      });
      danger.append(btn);
      return danger;
    }
    danger.append(
      el(
        "p",
        "hub-note",
        "This erases your coins, unlocks, upgrades, scores, stats and missions. Settings are kept. This cannot be undone.",
      ),
    );
    const buttons = el("div", "danger-row");
    const cancel = el("button", "card-btn danger-cancel", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => {
      this.confirming = false;
      audio.play("click");
      this.render();
    });
    const yes = el("button", "card-btn danger-btn", "Yes, erase everything");
    yes.type = "button";
    yes.addEventListener("click", () => {
      game.resetProgress();
      this.confirming = false;
      this.onSettings();
      audio.play("hit");
      this.render();
    });
    buttons.append(cancel, yes);
    danger.append(buttons);
    return danger;
  }
}
