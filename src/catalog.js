// Everything that can be bought in the shop. Items with price 0 are owned from the start.
// Add an entry here to add something new; the shop and the save file pick it up automatically.
// (A new music track also needs a composition with the same id in music.js.)

import { WORLDS } from "./worlds.js";

const bird = (body, tail, belly, wing, beak, outline) => ({
  body,
  tail,
  belly,
  wing,
  beak,
  outline,
});

export const SKINS = [
  {
    id: "classic",
    name: "Classic",
    price: 0,
    colors: bird(
      "#f7d21e",
      "#e6b800",
      "#fff3b0",
      "#f0b400",
      "#f2641f",
      "#3a2b00",
    ),
  },
  {
    id: "ruby",
    name: "Ruby",
    price: 20,
    colors: bird(
      "#e8453c",
      "#c0322b",
      "#ffd5c8",
      "#c0322b",
      "#ffb020",
      "#4a0f0b",
    ),
  },
  {
    id: "sky",
    name: "Sky",
    price: 20,
    colors: bird(
      "#4fa6f0",
      "#2f86d0",
      "#d6ecff",
      "#2f86d0",
      "#ffa33a",
      "#0f2f52",
    ),
  },
  {
    id: "mint",
    name: "Mint",
    price: 30,
    colors: bird(
      "#58d68d",
      "#2fb26a",
      "#e0ffe9",
      "#2fb26a",
      "#ff8a3d",
      "#0e3d22",
    ),
  },
  {
    id: "sunset",
    name: "Sunset",
    price: 30,
    colors: bird(
      "#ff9a4d",
      "#e8683a",
      "#ffe0c4",
      "#ff6f91",
      "#ffd23f",
      "#5a1f0a",
    ),
  },
  {
    id: "plum",
    name: "Plum",
    price: 40,
    colors: bird(
      "#a56de2",
      "#7e48c0",
      "#eddcff",
      "#7e48c0",
      "#ffcf3d",
      "#2e1458",
    ),
  },
  {
    id: "panda",
    name: "Panda",
    price: 50,
    colors: bird(
      "#fafafa",
      "#2b2b2b",
      "#ffffff",
      "#2b2b2b",
      "#4a4a4a",
      "#111111",
    ),
  },
  {
    id: "ninja",
    name: "Ninja",
    price: 60,
    accessory: "headband",
    colors: bird(
      "#3b3f58",
      "#2a2d42",
      "#8a90b8",
      "#2a2d42",
      "#ff5d73",
      "#0b0c14",
    ),
  },
  {
    id: "robot",
    name: "Robot",
    price: 80,
    accessory: "antenna",
    colors: bird(
      "#9aa7b4",
      "#6c7886",
      "#d3dce4",
      "#6c7886",
      "#ff4d4d",
      "#2a3138",
    ),
  },
  {
    id: "wizard",
    name: "Wizard",
    price: 100,
    accessory: "wizard",
    colors: bird(
      "#6f7be8",
      "#4a55c0",
      "#d9ddff",
      "#4a55c0",
      "#ffcf3d",
      "#1a1f5c",
    ),
  },
  {
    id: "royal",
    name: "Royal",
    price: 120,
    accessory: "crown",
    colors: bird(
      "#f2f2f7",
      "#d6d6e6",
      "#ffffff",
      "#d6d6e6",
      "#ffb000",
      "#44445a",
    ),
  },
];

const pipe = (light, mid, dark, outline) => ({ light, mid, dark, outline });

// "auto" uses the colors of the equipped world.
export const PIPES = [
  { id: "auto", name: "World style", desc: "Matches the world", price: 0 },
  {
    id: "stone",
    name: "Stone",
    price: 30,
    colors: pipe("#c9cdd3", "#9aa0a8", "#656b73", "#3a3f45"),
  },
  {
    id: "bamboo",
    name: "Bamboo",
    price: 40,
    colors: pipe("#c9e08a", "#9cc24f", "#5f8a24", "#3b5a12"),
  },
  {
    id: "neon",
    name: "Neon",
    price: 60,
    colors: pipe("#9bfff0", "#18e0c8", "#08806f", "#043d36"),
  },
  {
    id: "gold",
    name: "Gold",
    price: 90,
    colors: pipe("#fff1a8", "#ffd23f", "#c9921a", "#7a5200"),
  },
];

// Trails follow the bird. `rise` is how fast particles float up (negative = fall).
export const TRAILS = [
  { id: "none", name: "No trail", price: 0 },
  {
    id: "spark",
    name: "Sparks",
    price: 30,
    shape: "square",
    colors: ["#ffd23f", "#fff1a8", "#ffffff"],
    rise: 0,
  },
  {
    id: "bubbles",
    name: "Bubbles",
    price: 40,
    shape: "dot",
    colors: ["#bfeaff", "#8fd3ff", "#ffffff"],
    rise: 40,
  },
  {
    id: "hearts",
    name: "Hearts",
    price: 50,
    shape: "heart",
    colors: ["#ff6f91", "#ff9eb5", "#ffd0dc"],
    rise: 25,
  },
  {
    id: "stars",
    name: "Stardust",
    price: 60,
    shape: "star",
    colors: ["#ffe066", "#ffffff", "#ffb84d"],
    rise: 0,
  },
  {
    id: "fire",
    name: "Flame",
    price: 80,
    shape: "dot",
    colors: ["#ff4d1a", "#ff9a1a", "#ffd23f"],
    rise: 70,
  },
  {
    id: "rainbow",
    name: "Rainbow",
    price: 100,
    shape: "dot",
    rainbow: true,
    rise: 0,
  },
];

export const TRACKS = [
  { id: "sunny", name: "Sunny Hop", desc: "Bouncy and bright", price: 0 },
  { id: "moon", name: "Moonlit Meadow", desc: "Calm and dreamy", price: 40 },
  { id: "arcade", name: "Arcade Rush", desc: "Fast and furious", price: 80 },
];

// Cosmetics you own and equip. Order = order of the shop tabs.
export const CATEGORIES = [
  { id: "skin", label: "Birds", items: SKINS },
  { id: "world", label: "Worlds", items: WORLDS },
  { id: "pipe", label: "Pipes", items: PIPES },
  { id: "trail", label: "Trails", items: TRAILS },
  { id: "track", label: "Music", items: TRACKS },
];

export const DEFAULT_EQUIPPED = {
  skin: "classic",
  world: "meadow",
  pipe: "auto",
  trail: "none",
  track: "sunny",
};

// Upgrades have levels (or, for consumables, a stock that is used up).
// `prices[i]` is the price of level i + 1. Consumables always cost prices[0] and hold at most
// prices.length.
export const UPGRADES = [
  {
    id: "magnet",
    name: "Coin Magnet",
    desc: "Pulls coins and gems towards you",
    prices: [60, 120, 200],
  },
  {
    id: "headstart",
    name: "Head Start",
    desc: "Start every run with a shield",
    prices: [100],
  },
  {
    id: "revive",
    name: "Second Wind",
    desc: "Revives you once when you crash",
    prices: [30, 30, 30],
    consumable: true,
  },
];

/** Magnet reach (in game pixels) per upgrade level. */
export const MAGNET_RADIUS = [0, 70, 105, 140];

export function findUpgrade(id) {
  return UPGRADES.find((u) => u.id === id);
}

export const upgradeMax = (u) => u.prices.length;

/** Price of the next level / unit, or null when maxed out. */
export function upgradePrice(u, level) {
  if (level >= u.prices.length) return null;
  return u.consumable ? u.prices[0] : u.prices[level];
}

export function findItem(kind, id) {
  const cat = CATEGORIES.find((c) => c.id === kind);
  return cat?.items.find((i) => i.id === id) ?? cat?.items[0];
}
