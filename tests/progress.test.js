import { describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENTS,
  LEADERBOARD_SIZE,
  MISSION_COUNT,
  MISSION_TEMPLATES,
  Progress,
  fillMissions,
  missionText,
  newMission,
  sanitizeProgress,
} from "../src/progress.js";

function setup(missions) {
  const save = { coins: 0, ...sanitizeProgress({}) };
  if (missions) save.missions = missions;
  const rewards = [];
  const progress = new Progress(save, (r) => rewards.push(r));
  return { save, rewards, progress };
}

const mission = (id, target, reward = 10) => ({
  id,
  target,
  reward,
  progress: 0,
});

describe("missions", () => {
  it("always has MISSION_COUNT distinct missions with readable text", () => {
    const list = fillMissions([]);
    expect(list).toHaveLength(MISSION_COUNT);
    expect(new Set(list.map((m) => m.id)).size).toBe(MISSION_COUNT);
    for (const m of list) expect(missionText(m)).toMatch(/\d/);
  });

  it("can create every template", () => {
    for (const t of MISSION_TEMPLATES) {
      const m = newMission(
        () => 0,
        MISSION_TEMPLATES.filter((x) => x !== t).map((x) => x.id),
      );
      expect(m.id).toBe(t.id);
      expect(m.target).toBe(t.targets[0]);
    }
  });

  it("completes a sum mission, pays the reward and hands out a replacement", () => {
    const { save, rewards, progress } = setup([
      mission("pipes", 3, 20),
      mission("coins", 99),
      mission("flaps", 99),
    ]);
    progress.add("pipes", 2);
    expect(save.missions[0].progress).toBe(2);
    progress.add("pipes", 1);
    expect(save.coins).toBe(20);
    expect(rewards[0]).toMatchObject({ kind: "mission", coins: 20 });
    expect(save.stats.missions).toBe(1);
    expect(save.missions).toHaveLength(MISSION_COUNT);
    expect(save.missions[0].progress).toBe(0);
  });

  it("does not complete a max mission from a score reached before it was handed out", () => {
    const { save, progress } = setup([
      mission("pipes", 1),
      mission("coins", 99),
      mission("flaps", 99),
    ]);
    // Force the replacement to be a "score in one run" mission.
    const spy = vi.spyOn(Math, "random").mockReturnValue(0);
    progress.rng = () => 0;
    progress.max("runScore", 5);
    progress.add("pipes", 1); // completes -> new mission (first template: score 8)
    spy.mockRestore();
    expect(save.missions[0].id).toBe("score");
    const before = save.coins;
    progress.max("runScore", 12); // same run: must not count
    expect(save.missions[0].progress).toBe(0);
    expect(save.coins).toBe(before);
    progress.startRun();
    progress.max("runScore", 12); // next run: counts and completes it
    expect(save.coins).toBe(before + 10);
  });
});

describe("achievements", () => {
  it("unlocks once, pays once and is listed in the save", () => {
    const { save, rewards, progress } = setup();
    const ach = ACHIEVEMENTS.find((a) => a.id === "gem");
    progress.add("gems", 1);
    progress.add("gems", 1);
    expect(save.achievements.filter((id) => id === "gem")).toHaveLength(1);
    expect(
      rewards.filter((r) => r.kind === "achievement" && r.title === ach.name),
    ).toHaveLength(1);
    expect(save.coins).toBeGreaterThanOrEqual(ach.reward);
  });

  it("uses unique ids", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(
      ACHIEVEMENTS.length,
    );
  });
});

describe("endRun", () => {
  it("tracks the best score per mode", () => {
    const { save, progress } = setup();
    expect(progress.endRun("classic", 5, 10).newBest).toBe(true);
    expect(progress.endRun("classic", 3, 10).newBest).toBe(false);
    expect(progress.endRun("casual", 2, 10).newBest).toBe(true);
    expect(save.bests).toMatchObject({ classic: 5, casual: 2 });
    expect(save.stats.runs).toBe(3);
    expect(save.stats.playTime).toBe(30);
  });

  it("keeps a sorted top 5 and reports the rank", () => {
    const { save, progress } = setup();
    for (const s of [10, 4, 8, 6, 2, 12]) progress.endRun("classic", s);
    expect(save.scores.classic.map((e) => e.score)).toEqual([12, 10, 8, 6, 4]);
    expect(save.scores.classic).toHaveLength(LEADERBOARD_SIZE);
    expect(progress.endRun("classic", 9).rank).toBe(3);
    expect(progress.endRun("classic", 1).rank).toBe(0);
  });

  it("ignores zero scores", () => {
    const { save, progress } = setup();
    expect(progress.endRun("classic", 0)).toEqual({ newBest: false, rank: 0 });
    expect(save.scores.classic).toHaveLength(0);
  });
});

describe("sanitizeProgress", () => {
  it("repairs corrupt data", () => {
    const p = sanitizeProgress({
      stats: { pipes: "7", runs: -1, bogus: 5 },
      missions: [
        { id: "pipes", target: 5, progress: 99 },
        { id: "nope", target: 1 },
        null,
      ],
      achievements: ["first", "first", "unknown"],
      scores: { classic: [{ score: 3 }, { score: 9 }, { score: "x" }] },
    });
    expect(p.stats.pipes).toBe(7);
    expect(p.stats.runs).toBe(0);
    expect(p.stats.bogus).toBeUndefined();
    expect(p.missions).toHaveLength(MISSION_COUNT);
    expect(p.missions[0].progress).toBeLessThan(p.missions[0].target);
    expect(p.achievements).toEqual(["first"]);
    expect(p.scores.classic.map((e) => e.score)).toEqual([9, 3]);
  });
});
