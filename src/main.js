import { audio } from "./audio.js";
import { STEP } from "./config.js";
import { Game, State } from "./game.js";
import { Hub } from "./hub.js";
import { installInputDetection } from "./input.js";
import { music } from "./music.js";
import { PerfMeter, PerfOverlay, perfEnabled } from "./perf.js";
import { Renderer } from "./renderer.js";
import { SettingsDialog } from "./settings.js";
import { Shop } from "./shop.js";
import { writeSave } from "./storage.js";

const canvas = document.getElementById("game");
const stage = document.getElementById("stage");
const btnShop = document.getElementById("btn-shop");
const btnHub = document.getElementById("btn-hub");
const btnMode = document.getElementById("btn-mode");
const btnEnd = document.getElementById("btn-end");
const btnPause = document.getElementById("btn-pause");
const btnSettings = document.getElementById("btn-settings");
const btnFs = document.getElementById("btn-fs");

const game = new Game();
const shop = new Shop(game);
const hub = new Hub(game);
const settings = new SettingsDialog(game, applySettings);
const renderer = new Renderer(canvas, stage);
const perf = perfEnabled() ? new PerfMeter() : null;
const perfView = perf && new PerfOverlay(stage, perf);
audio.installAutoUnlock();
installInputDetection();

/** Applies the saved settings to the audio engine and the page layout. */
function applySettings() {
  const s = game.save.settings;
  audio.setMuted(game.save.muted);
  audio.setMusicVolume(s.musicVolume);
  audio.setSfxVolume(s.sfxVolume);
  document.body.classList.toggle("controls-left", s.controlsLeft);
}
applySettings();

const dialogs = [shop, hub, settings];
const openDialog = () => dialogs.find((d) => d.isOpen);

// ---- Responsive canvas ----
new ResizeObserver(() => renderer.resize()).observe(stage);
window.addEventListener("resize", () => renderer.resize()); // also fires on browser zoom (DPR change)

// ---- Buttons ----
const SVG = (inner) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
const STROKE =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  shop: SVG(
    `<path d="M5 8h14l-1 12H6L5 8z" ${STROKE}/><path d="M9 8V7a3 3 0 016 0v1" ${STROKE}/>`,
  ),
  hub: SVG(
    `<path d="M8 4h8v5a4 4 0 01-8 0V4z" ${STROKE}/><path d="M8 6H5v2a3 3 0 003 3M16 6h3v2a3 3 0 01-3 3M12 13v4M8 20h8M10 17h4" ${STROKE}/>`,
  ),
  pause: SVG('<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'),
  play: SVG('<path d="M8 5v14l11-7z"/>'),
  gear: SVG(
    `<path d="M9.69 4.45L10.02 1.79L13.98 1.79L14.31 4.45A7.9 7.9 0 0 1 17.39 6.22L19.85 5.18L21.83 8.61L19.7 10.22A7.9 7.9 0 0 1 19.7 13.78L21.83 15.39L19.85 18.82L17.39 17.78A7.9 7.9 0 0 1 14.31 19.55L13.98 22.21L10.02 22.21L9.69 19.55A7.9 7.9 0 0 1 6.61 17.78L4.15 18.82L2.17 15.39L4.3 13.78A7.9 7.9 0 0 1 4.3 10.22L2.17 8.61L4.15 5.18L6.61 6.22A7.9 7.9 0 0 1 9.69 4.45Z" ${STROKE} stroke-width="1.8"/><circle cx="12" cy="12" r="3.4" ${STROKE} stroke-width="1.8"/>`,
  ),
  fsEnter: SVG(`<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" ${STROKE}/>`),
  fsExit: SVG(`<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" ${STROKE}/>`),
};

const iconCache = new WeakMap();
function setIcon(btn, key) {
  if (iconCache.get(btn) === key) return;
  iconCache.set(btn, key);
  btn.innerHTML = ICONS[key];
}

function syncButtons() {
  // Only the buttons that can be used right now are shown.
  const idle = game.state !== State.PLAYING; // waiting to start, or the run ended
  setIcon(btnShop, "shop");
  btnShop.hidden = !idle;
  btnShop.classList.toggle("badge", idle && game.canAffordSomething());
  setIcon(btnHub, "hub");
  btnHub.hidden = !idle;
  setIcon(btnSettings, "gear");
  btnSettings.hidden = !(idle || game.paused);
  const modeText = `Mode: ${game.mode.name}`;
  if (btnMode.textContent !== modeText) {
    btnMode.textContent = modeText;
    btnMode.setAttribute(
      "aria-label",
      `${modeText}. ${game.mode.desc} Press to change.`,
    );
  }
  btnMode.hidden = !(game.state === State.READY && !game.paused);
  btnEnd.hidden = !(game.state === State.PLAYING && game.paused);
  setIcon(btnPause, game.paused ? "play" : "pause");
  btnPause.hidden = game.state !== State.PLAYING;
  setIcon(btnFs, document.fullscreenElement ? "fsExit" : "fsEnter");
}

btnShop.addEventListener("click", () => {
  audio.unlock();
  shop.open();
});

btnHub.addEventListener("click", () => {
  audio.unlock();
  hub.open();
});

btnSettings.addEventListener("click", () => {
  audio.unlock();
  settings.open();
});

btnMode.addEventListener("click", () => {
  audio.unlock();
  game.cycleMode();
  audio.play("click");
  btnMode.blur();
});

btnPause.addEventListener("click", () => {
  audio.unlock();
  game.togglePause();
  btnPause.blur();
});

btnEnd.addEventListener("click", () => {
  audio.unlock();
  game.endRun();
  btnEnd.blur();
});

function toggleMute() {
  audio.unlock();
  game.save.muted = !game.save.muted;
  audio.setMuted(game.save.muted);
  writeSave(game.save);
  audio.play("click");
}

// Fullscreen is not available everywhere (e.g. iPhone Safari) and pointless in an installed app.
const standalone = window.matchMedia(
  "(display-mode: standalone), (display-mode: fullscreen)",
).matches;
if (
  !standalone &&
  (document.fullscreenEnabled || document.webkitFullscreenEnabled)
) {
  btnFs.hidden = false;
  btnFs.addEventListener("click", async () => {
    btnFs.blur();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
        await screen.orientation?.lock?.("portrait").catch(() => {});
      }
    } catch {
      // Request denied - ignore.
    }
  });
}

// ---- Input (mouse, touch and pen share one path) ----
function onFlapInput(e) {
  audio.unlock();
  if (game.paused) {
    game.resume();
    return;
  }
  game.queueFlap();
  perf?.tap(e?.timeStamp, performance.now());
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  onFlapInput(e);
});
// Some browsers only treat pointerup/touchend as an audio-unlocking gesture.
canvas.addEventListener("pointerup", () => audio.unlock());
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
// Optional: tap anywhere on the page (not only on the game) to flap.
stage.addEventListener("pointerdown", (e) => {
  if (!game.save.settings.tapAnywhere || e.target === canvas) return;
  if (e.target.closest("button, input, label, .shop")) return;
  onFlapInput(e);
});
// Stop iOS rubber-banding / pull-to-refresh while playing (but let the dialogs scroll and sliders drag).
document.addEventListener(
  "touchmove",
  (e) => {
    if (!e.target.closest?.(".shop-list, .hub-body, input")) e.preventDefault();
  },
  { passive: false },
);

window.addEventListener("keydown", (e) => {
  const dialog = openDialog();
  if (dialog) {
    if (e.code === "Escape") {
      e.preventDefault();
      dialog.close();
    } else if (e.code === "Tab") {
      dialog.trapTab(e);
    }
    return; // no flapping / pausing while a dialog is open
  }
  switch (e.code) {
    case "KeyS":
      if (!btnShop.hidden) btnShop.click();
      break;
    case "KeyH":
      if (!btnHub.hidden) btnHub.click();
      break;
    case "KeyG":
      if (!btnSettings.hidden) btnSettings.click();
      break;
    case "KeyN":
      if (!btnMode.hidden) btnMode.click();
      break;
    case "KeyE":
      if (!btnEnd.hidden) btnEnd.click();
      break;
    case "Space":
    case "ArrowUp":
    case "KeyW":
      e.preventDefault();
      if (!e.repeat) onFlapInput(e);
      break;
    case "KeyP":
    case "Escape":
      if (!e.repeat && !document.fullscreenElement) {
        audio.unlock();
        game.togglePause();
      }
      break;
    case "KeyM":
      toggleMute();
      break;
    case "KeyF":
      if (!btnFs.hidden) btnFs.click();
      break;
  }
});

// ---- Auto-pause when the player leaves ----
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.pause();
    writeSave(game.save);
  }
});
window.addEventListener("blur", () => game.pause());

// ---- Main loop: fixed-step physics, render once per display frame ----
let last = performance.now();
let acc = 0;
function frame(now) {
  perf?.frame(now);
  acc += Math.min((now - last) / 1000, 0.1);
  last = now;
  while (acc >= STEP) {
    game.update(STEP);
    acc -= STEP;
  }
  music.update({
    playing: (game.state === State.PLAYING && !game.paused) || shop.previewing,
    calm: (game.paused || game.state === State.DEAD) && !shop.previewing,
    theme: game.theme.index,
    track: shop.previewTrack ?? game.save.equipped.track,
  });
  renderer.draw(game);
  perf?.drawn(performance.now(), game.flapQueued);
  perfView?.update(now);
  syncButtons();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy in the browser console during development, e.g. flappy.game.save.coins += 500
if (import.meta.env.DEV) window.flappy = { game, shop, hub, settings };

// ---- PWA: offline support (production builds only) ----
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      // Make sure everything this page loaded is available offline right after the first visit.
      const ready = await navigator.serviceWorker.ready;
      const urls = performance.getEntriesByType("resource").map((r) => r.name);
      (ready.active || reg.active)?.postMessage({ type: "CACHE_URLS", urls });
    } catch {
      // Service workers unavailable (e.g. insecure origin) - the game still works online.
    }
  });
}
