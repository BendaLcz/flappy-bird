import { THEME_EVERY } from "./config.js";
import { WORLDS } from "./worlds.js";

const COLOR_KEYS = ["skyTop", "skyBottom", "hillFar", "hillNear", "cloud"];

/** Cross-fades between the sky themes of the equipped world as the score grows. */
export class ThemeBlender {
  constructor(world = WORLDS[0]) {
    this.world = world;
    this.idx = 0;
    this.target = world.themes[0];
    this.cur = { stars: 0 };
    for (const k of COLOR_KEYS) this.cur[k] = [0, 0, 0];
    this.snap();
  }

  /** Jump straight to the target colors (no fade). */
  snap() {
    for (const k of COLOR_KEYS) this.cur[k] = [...this.target[k]];
    this.cur.stars = this.target.stars;
  }

  /** Switch to another world, keeping the current time of day. */
  setWorld(world) {
    this.world = world;
    this.target = world.themes[this.idx];
    this.snap();
  }

  setScore(score) {
    this.idx = Math.floor(score / THEME_EVERY) % this.world.themes.length;
    this.target = this.world.themes[this.idx];
  }

  /** Index of the theme currently being faded to (day, dusk, night, dawn). Also picks the music key. */
  get index() {
    return this.idx;
  }

  update(dt) {
    const k = 1 - Math.exp(-1.2 * dt);
    for (const key of COLOR_KEYS) {
      const c = this.cur[key];
      const t = this.target[key];
      for (let i = 0; i < 3; i++) c[i] += (t[i] - c[i]) * k;
    }
    this.cur.stars += (this.target.stars - this.cur.stars) * k;
  }

  css(key) {
    const c = this.cur[key];
    return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  }
}
