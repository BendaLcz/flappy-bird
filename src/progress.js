// Statistics, missions, achievements and the local leaderboard.
//
// The game reports what happens with add(stat, n) (counters that only go up, e.g. "pipes") and
// max(stat, value) (records, e.g. the best streak of a run). Everything else - missions,
// achievements, the stats screen - is derived from those numbers.

import { FRIENDS } from "./friends.js";
import { MODES } from "./modes.js";

const SUM_STATS = [
  "runs",
  "deaths",
  "pipes",
  "coins", // coins picked up (not their value)
  "gold",
  "gems",
  "powerups",
  "flaps",
  "close",
  "purchases",
  "missions",
  "playTime", // seconds
  "rescued", // caged birds freed (Rescue mode)
  ...MODES.map((m) => `runs_${m.id}`),
];
const MAX_STATS = [
  "runScore",
  "runCoins",
  "streak",
  "species", // different kinds of birds freed so far
  ...MODES.map((m) => `score_${m.id}`),
];
export const STAT_KEYS = [...SUM_STATS, ...MAX_STATS];

export const MISSION_COUNT = 3;
export const LEADERBOARD_SIZE = 5;

// ---- Missions ----
// `kind: "sum"` counts up from when the mission was given; "max" needs a single run to reach it.
export const MISSION_TEMPLATES = [
  {
    id: "score",
    stat: "runScore",
    kind: "max",
    targets: [8, 12, 18, 25, 35],
    text: (n) => `Score ${n} in a single run`,
  },
  {
    id: "pipes",
    stat: "pipes",
    kind: "sum",
    targets: [15, 30, 60, 100],
    text: (n) => `Pass ${n} pipes`,
  },
  {
    id: "coins",
    stat: "coins",
    kind: "sum",
    targets: [5, 10, 20, 35],
    text: (n) => `Collect ${n} coins`,
  },
  {
    id: "runCoins",
    stat: "runCoins",
    kind: "max",
    targets: [3, 5, 8, 12],
    text: (n) => `Collect ${n} coins in one run`,
  },
  {
    id: "close",
    stat: "close",
    kind: "sum",
    targets: [2, 4, 8],
    text: (n) => `Make ${n} close calls`,
  },
  {
    id: "streak",
    stat: "streak",
    kind: "max",
    targets: [3, 5, 8, 12],
    text: (n) => `Fly through ${n} gaps dead center in a row`,
  },
  {
    id: "powerups",
    stat: "powerups",
    kind: "sum",
    targets: [2, 4, 6],
    text: (n) => `Collect ${n} power-ups`,
  },
  {
    id: "gold",
    stat: "gold",
    kind: "sum",
    targets: [1, 2, 3],
    text: (n) => `Collect ${n} gold ${n === 1 ? "coin" : "coins"}`,
  },
  {
    id: "classic",
    stat: "score_classic",
    kind: "max",
    targets: [5, 10, 15],
    text: (n) => `Score ${n} in Classic mode`,
  },
  {
    id: "rescue",
    stat: "rescued",
    kind: "sum",
    targets: [5, 10, 20, 30],
    text: (n) => `Free ${n} caged birds`,
  },
  {
    id: "rush",
    stat: "runs_rush",
    kind: "sum",
    targets: [1, 2],
    text: (n) => `Finish ${n} Coin Rush ${n === 1 ? "run" : "runs"}`,
  },
  {
    id: "flaps",
    stat: "flaps",
    kind: "sum",
    targets: [50, 100, 200],
    text: (n) => `Flap ${n} times`,
  },
];
const TEMPLATE_BY_ID = new Map(MISSION_TEMPLATES.map((t) => [t.id, t]));

export const missionReward = (tier) => 10 * (tier + 1);

export function missionText(m) {
  return TEMPLATE_BY_ID.get(m.id)?.text(m.target) ?? m.id;
}

/** A random mission whose template is not in `exclude`. */
export function newMission(rng = Math.random, exclude = []) {
  const pool = MISSION_TEMPLATES.filter((t) => !exclude.includes(t.id));
  const t = pool[Math.floor(rng() * pool.length)];
  const tier = Math.floor(rng() * t.targets.length);
  return {
    id: t.id,
    target: t.targets[tier],
    reward: missionReward(tier),
    progress: 0,
  };
}

/** Tops the list up to MISSION_COUNT missions (in place). */
export function fillMissions(missions, rng = Math.random) {
  while (missions.length < MISSION_COUNT) {
    missions.push(
      newMission(
        rng,
        missions.map((m) => m.id),
      ),
    );
  }
  return missions;
}

// ---- Achievements ----
export const ACHIEVEMENTS = [
  {
    id: "first",
    name: "First Flight",
    desc: "Finish your first run",
    stat: "runs",
    target: 1,
    reward: 5,
  },
  {
    id: "flaps1000",
    name: "Flap Happy",
    desc: "Flap 1000 times",
    stat: "flaps",
    target: 1000,
    reward: 30,
  },
  {
    id: "pipes100",
    name: "Pipe Dreamer",
    desc: "Pass 100 pipes",
    stat: "pipes",
    target: 100,
    reward: 20,
  },
  {
    id: "pipes1000",
    name: "Pipe Master",
    desc: "Pass 1000 pipes",
    stat: "pipes",
    target: 1000,
    reward: 100,
  },
  {
    id: "coins100",
    name: "Coin Collector",
    desc: "Collect 100 coins",
    stat: "coins",
    target: 100,
    reward: 20,
  },
  {
    id: "coins1000",
    name: "Gold Rush",
    desc: "Collect 1000 coins",
    stat: "coins",
    target: 1000,
    reward: 100,
  },
  {
    id: "gem",
    name: "Gem Hunter",
    desc: "Find a diamond",
    stat: "gems",
    target: 1,
    reward: 30,
  },
  {
    id: "close25",
    name: "Daredevil",
    desc: "Make 25 close calls",
    stat: "close",
    target: 25,
    reward: 25,
  },
  {
    id: "streak10",
    name: "Dead Center",
    desc: "Fly through 10 gaps dead center in a row",
    stat: "streak",
    target: 10,
    reward: 25,
  },
  {
    id: "score25",
    name: "Flying High",
    desc: "Score 25 in a run",
    stat: "runScore",
    target: 25,
    reward: 20,
  },
  {
    id: "score50",
    name: "Sky Lord",
    desc: "Score 50 in a run",
    stat: "runScore",
    target: 50,
    reward: 75,
  },
  {
    id: "classic20",
    name: "Fearless",
    desc: "Score 20 in Classic mode",
    stat: "score_classic",
    target: 20,
    reward: 40,
  },
  {
    id: "rescue20",
    name: "Bird Whisperer",
    desc: "Free 20 birds in one Rescue run",
    stat: "score_rescue",
    target: 20,
    reward: 40,
  },
  {
    id: "rescued100",
    name: "Hero of the Flock",
    desc: "Free 100 caged birds",
    stat: "rescued",
    target: 100,
    reward: 50,
  },
  {
    id: "species",
    name: "Bird Collector",
    desc: `Meet all ${FRIENDS.length} kinds of birds`,
    stat: "species",
    target: FRIENDS.length,
    reward: 60,
  },
  {
    id: "rush5",
    name: "Gold Fever",
    desc: "Finish 5 Coin Rush runs",
    stat: "runs_rush",
    target: 5,
    reward: 25,
  },
  {
    id: "shop5",
    name: "Shopaholic",
    desc: "Buy 5 things in the shop",
    stat: "purchases",
    target: 5,
    reward: 20,
  },
  {
    id: "missions10",
    name: "On a Mission",
    desc: "Complete 10 missions",
    stat: "missions",
    target: 10,
    reward: 50,
  },
];

// ---- Loading / sanitizing (used by storage.js) ----
const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export function sanitizeProgress(d = {}) {
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = num(d.stats?.[k]);

  const missions = [];
  if (Array.isArray(d.missions)) {
    for (const m of d.missions) {
      const t = TEMPLATE_BY_ID.get(m?.id);
      const target = Math.floor(num(m?.target));
      if (!t || target < 1 || missions.some((x) => x.id === m.id)) continue;
      missions.push({
        id: m.id,
        target,
        reward: Math.floor(num(m.reward)) || missionReward(0),
        progress: Math.min(target - 1, num(m.progress)),
      });
    }
  }
  const filled = fillMissions(missions.slice(0, MISSION_COUNT));

  const known = new Set(ACHIEVEMENTS.map((a) => a.id));
  const achievements = Array.isArray(d.achievements)
    ? [...new Set(d.achievements.filter((id) => known.has(id)))]
    : [];

  const scores = {};
  const bests = {};
  for (const mode of MODES) {
    const list = Array.isArray(d.scores?.[mode.id]) ? d.scores[mode.id] : [];
    scores[mode.id] = list
      .map((e) => ({ score: Math.floor(num(e?.score)), date: num(e?.date) }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
    bests[mode.id] = Math.floor(num(d.bests?.[mode.id]));
  }
  const friends = {};
  for (const f of FRIENDS) {
    const n = Math.floor(num(d.friends?.[f.id]));
    if (n > 0) friends[f.id] = n;
  }
  return { stats, missions: filled, achievements, scores, bests, friends };
}

/** Tracks stats, completes missions and unlocks achievements for one save file. */
export class Progress {
  /**
   * @param save the save object (changed in place)
   * @param onReward called as ({ kind: "mission" | "achievement", title, coins }) after the coins were added
   */
  constructor(save, onReward = () => {}, rng = Math.random) {
    this.save = save;
    this.onReward = onReward;
    this.rng = rng;
    // Missions handed out during a run start counting at the next run (so a "score 8" mission
    // does not complete instantly when you already have 12 points).
    this.fresh = new Set();
  }

  /** Call when a run (re)starts. */
  startRun() {
    this.fresh.clear();
  }

  add(stat, n = 1) {
    this.save.stats[stat] = (this.save.stats[stat] || 0) + n;
    this.update(stat, n);
  }

  max(stat, value) {
    if (value > (this.save.stats[stat] || 0)) this.save.stats[stat] = value;
    this.update(stat, value);
  }

  update(stat, value) {
    const save = this.save;
    // missions
    for (let i = 0; i < save.missions.length; i++) {
      const m = save.missions[i];
      const t = TEMPLATE_BY_ID.get(m.id);
      if (!t || t.stat !== stat) continue;
      if (t.kind === "max") {
        if (this.fresh.has(m)) continue;
        m.progress = Math.max(m.progress, value);
      } else {
        m.progress += value;
      }
      if (m.progress >= m.target) this.completeMission(i);
    }
    // achievements
    for (const a of ACHIEVEMENTS) {
      if (a.stat !== stat || save.achievements.includes(a.id)) continue;
      if ((save.stats[stat] || 0) >= a.target) {
        save.achievements.push(a.id);
        save.coins += a.reward;
        this.onReward({ kind: "achievement", title: a.name, coins: a.reward });
      }
    }
  }

  completeMission(index) {
    const save = this.save;
    const m = save.missions[index];
    save.coins += m.reward;
    this.onReward({ kind: "mission", title: missionText(m), coins: m.reward });
    const next = newMission(
      this.rng,
      save.missions.map((x) => x.id),
    );
    save.missions[index] = next;
    this.fresh.add(next);
    this.add("missions", 1); // may chain into an achievement
  }

  /**
   * Records a finished run: counters, personal best and leaderboard.
   * Returns { newBest, rank } (rank is 1-5 when the run made the top 5, otherwise 0).
   */
  endRun(modeId, score, seconds = 0) {
    const save = this.save;
    this.add("runs", 1);
    this.add(`runs_${modeId}`, 1);
    this.add("playTime", seconds);
    this.max(`score_${modeId}`, score);
    this.max("runScore", score);

    const newBest = score > 0 && score > (save.bests[modeId] || 0);
    if (newBest) save.bests[modeId] = score;

    let rank = 0;
    const list = save.scores[modeId];
    if (score > 0) {
      const entry = { score, date: Date.now() };
      let at = list.findIndex((e) => score > e.score);
      if (at === -1) at = list.length;
      if (at < LEADERBOARD_SIZE) {
        list.splice(at, 0, entry);
        list.length = Math.min(list.length, LEADERBOARD_SIZE);
        rank = at + 1;
      }
    }
    return { newBest, rank };
  }
}
