// Game modes. `diffBonus` is added to the score when working out how hard the game is (a head
// start on the difficulty ramp; no mode uses it right now).
// `rampMul` scales how quickly the difficulty grows with the score (default 1) and
// `windMul` scales the strength of updrafts/downdrafts (default 1, 0 = no wind at all).
// `crashPenalty` (modes with a clock and no game over): seconds lost for hitting a pipe or the ground.

export const MODES = [
  {
    id: "casual",
    name: "Casual",
    desc: "Relaxed flying. Big gaps, no wind.",
    diffBonus: 0,
    rampMul: 0.4,
    gapMul: 1.4,
    speedMul: 0.82,
    windMul: 0,
    coinMul: 1,
    deadly: true,
    time: 0,
    coinChance: 0.45,
  },
  {
    id: "classic",
    name: "Classic",
    desc: "One life. Beat your best.",
    diffBonus: 0,
    rampMul: 0.6,
    gapMul: 1.22,
    speedMul: 0.9,
    windMul: 0.45,
    coinMul: 1,
    deadly: true,
    time: 0,
    coinChance: 0.4,
  },
  {
    id: "rush",
    name: "Coin Rush",
    desc: "60 seconds. Grab coins - every crash costs 3s!",
    hint: "Grab coins, avoid crashing",
    diffBonus: 0,
    gapMul: 1.2,
    speedMul: 0.85,
    coinMul: 1,
    deadly: false,
    time: 60,
    crashPenalty: 3,
    coinChance: 0.6,
  },
  {
    id: "rescue",
    name: "Rescue",
    desc: "60 seconds. Free the caged birds!",
    hint: "Free caged birds, dodge the dangers",
    rescue: true,
    diffBonus: 0,
    rampMul: 0.8,
    gapMul: 1,
    speedMul: 1,
    coinMul: 1,
    deadly: false,
    time: 60,
    crashPenalty: 2,
    coinChance: 0,
  },
];

export const DEFAULT_MODE = "classic";

export function findMode(id) {
  return (
    MODES.find((m) => m.id === id) ?? MODES.find((m) => m.id === DEFAULT_MODE)
  );
}
