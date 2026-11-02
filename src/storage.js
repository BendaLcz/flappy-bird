import {
  CATEGORIES,
  DEFAULT_EQUIPPED,
  UPGRADES,
  upgradeMax,
} from "./catalog.js";
import { findMode } from "./modes.js";
import { sanitizeProgress } from "./progress.js";

const KEY = "flappy-bird:v1";

const clamp01 = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
};

function freeOwned() {
  const owned = {};
  for (const cat of CATEGORIES) {
    owned[cat.id] = cat.items.filter((i) => i.price === 0).map((i) => i.id);
  }
  return owned;
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function prefersReducedMotion() {
  try {
    return !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")
      ?.matches;
  } catch {
    return false;
  }
}

/** Turns whatever was stored (old saves, hand-edited or corrupt data) into a valid save. */
export function sanitizeSave(d) {
  d = d && typeof d === "object" ? d : {};
  const progress = sanitizeProgress(d);

  const save = {
    coins: Math.max(0, Math.floor(Number(d.coins) || 0)),
    muted: !!d.muted,
    mode: findMode(d.mode).id,
    owned: freeOwned(),
    equipped: { ...DEFAULT_EQUIPPED },
    upgrades: {},
    settings: {
      musicVolume: clamp01(d.settings?.musicVolume, 1),
      sfxVolume: clamp01(d.settings?.sfxVolume, 1),
      reduceMotion:
        typeof d.settings?.reduceMotion === "boolean"
          ? d.settings.reduceMotion
          : prefersReducedMotion(),
      controlsLeft: !!d.settings?.controlsLeft,
      tapAnywhere: !!d.settings?.tapAnywhere,
    },
    ...progress,
  };

  for (const cat of CATEGORIES) {
    const valid = new Set(cat.items.map((i) => i.id));
    const owned = new Set(save.owned[cat.id]);
    const saved = d.owned?.[cat.id];
    if (Array.isArray(saved))
      for (const id of saved) if (valid.has(id)) owned.add(id);
    save.owned[cat.id] = [...owned];

    const eq = d.equipped?.[cat.id];
    if (owned.has(eq)) save.equipped[cat.id] = eq;
  }

  for (const u of UPGRADES) {
    const level = Math.floor(Number(d.upgrades?.[u.id]) || 0);
    save.upgrades[u.id] = Math.max(0, Math.min(upgradeMax(u), level));
  }
  return save;
}

export function loadSave() {
  return sanitizeSave(readJson(KEY));
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage may be unavailable (private mode, quota); the game still works.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
