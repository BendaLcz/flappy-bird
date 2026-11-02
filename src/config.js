// Logical game size. The canvas is scaled to fit any screen.
export const W = 360;
export const H = 640;
export const GROUND_H = 80;
export const GROUND_Y = H - GROUND_H;

// Fixed physics timestep: identical gameplay on 60 Hz, 120 Hz, 144 Hz ... displays.
export const STEP = 1 / 120;

// Bird
export const GRAVITY = 1500;
export const FLAP_VELOCITY = -430;
export const BIRD_X = 100;
export const BIRD_R = 14; // drawn radius
export const BIRD_HIT_R = 11; // collision radius (smaller than the sprite = forgiving)

// Pipes
export const PIPE_W = 60;
export const PIPE_CAP_H = 24;
export const PIPE_CAP_OVERHANG = 4;
export const PIPE_SPACING = 210;
export const MAX_GAP_SHIFT = 170; // max vertical distance between consecutive gaps (keeps it fair)

// Difficulty ramp (per point scored)
export const SPEED_BASE = 140;
export const SPEED_MAX = 230;
export const SPEED_PER_POINT = 2.5;
export const GAP_BASE = 170;
export const GAP_MIN = 125;
export const GAP_SHRINK = 1.5;

// Moving pipes start at this difficulty level (score + mode bonus)
export const MOVING_FROM = 15;
export const MOVE_AMP_MAX = 45;

// Squeezing pipes (the gap opens and closes) and wind gusts start at these levels
export const SQUEEZE_FROM = 30;
export const SQUEEZE_MAX = 24;
export const WIND_FROM = 20;
export const WIND_FORCE = 520; // vertical acceleration while a gust blows
export const WIND_WARN = 1.2; // seconds of warning before a gust
export const WIND_TIME = 2.2; // seconds a gust blows
export const WIND_PAUSE = [6, 11]; // seconds between gusts (min, max)

// Collectibles: chance of the rarer types per pipe that carries an item
export const GOLD_CHANCE = 0.1; // worth 5 coins
export const GEM_CHANCE = 0.025; // worth 25 coins (very rare)
export const GOLD_VALUE = 5;
export const GEM_VALUE = 25;

// Bonuses
export const CLOSE_CALL = 5; // px of clearance that counts as a close call
export const CLOSE_SLOW_TIME = 0.35; // seconds of slow motion after a close call
export const CLOSE_SLOW_SCALE = 0.45;
export const CLOSE_SLOW_RAMP = 0.2; // seconds spent easing back to normal speed
export const PERFECT_ZONE = 0.16; // fraction of the gap (around its middle) that counts as "perfect"
export const PERFECT_BONUS_EVERY = 10; // a perfect streak of this length pays a bonus
export const PERFECT_BONUS = 3; // coins
export const REVIVE_GRACE = 2; // seconds of invulnerability after a revive

// Power-ups
export const ITEM_R = 11;
export const SLOWMO_SCALE = 0.6;
export const SLOWMO_TIME = 6; // seconds (real time)
export const SLOWMO_RAMP = 1.5; // seconds spent easing back to normal speed (also the warning blink)
export const SHIELD_GRACE = 1.2; // seconds of invulnerability after the shield breaks
export const HOURGLASS_BONUS = 5; // seconds added to the clock
export const HOURGLASS_FREEZE = 3; // seconds the clock stands still afterwards
export const HOURGLASS_CHANCE = 0.1; // chance of an hourglass per pipe item / rescue wave (modes with a clock)

// Rescue mode: no pipes, free caged birds before the clock runs out
export const RESCUE_SPACING = 200; // px between waves
export const RESCUE_SHIFT = 150; // max vertical distance between consecutive cages
export const RESCUE_CAGE_R = 18; // cage hit radius (generous)
export const RESCUE_Y_MIN = 70; // highest / lowest centre of a cage or enemy lane
export const RESCUE_Y_MAX = GROUND_Y - 50;
export const HIT_PENALTY = 3; // default seconds lost when an enemy hits the bird
export const HIT_GRACE = 1.2; // seconds of invulnerability after a hit
export const RESCUE_PRESSURE_FROM = 20; // enemies speed up once this few seconds are left
export const RESCUE_PRESSURE_BOOST = 0.3; // max extra enemy speed / spawn rate under pressure
export const GOLDEN_FROM = 5; // golden cages appear from this difficulty level
export const GOLDEN_CHANCE = 0.12; // chance of a (guarded) golden cage per wave
export const GOLDEN_TIME = 3; // seconds added by a golden cage (no more than an enemy hit costs)
export const GOLDEN_COINS = 3; // coins paid immediately by a golden cage
export const BOSS_EVERY = 10; // a boss wave after this many rescues
export const WALL_GAP = 100; // px of the opening in a boss wall (pipes: 125 and up)
export const WALL_W = 52; // px width of a boss wall, including its rim
export const POWER_CHANCE = 0.07; // chance of a feather / cage magnet per wave
export const GHOST_TIME = 3.5; // seconds the feather lets the bird fly through enemies
export const CAGE_MAGNET_TIME = 6; // seconds the magnet pulls cages in
export const CAGE_MAGNET_R = 170; // px reach of the cage magnet
export const CAGE_MAGNET_PULL = 260; // px/s a cage is pulled
export const DIVE_WARN = 1; // seconds a hawk dive is announced
export const DIVE_VX = 300; // px/s horizontal speed of a diving hawk
export const DIVE_VY = 200; // px/s vertical speed of a diving hawk
export const RESCUE_COMBO_EVERY = 5; // a chain of this many rescues gives extra time
export const RESCUE_COMBO_TIME = 2; // seconds
export const FRIEND_FIRST_BONUS = 5; // coins for the first time a species is freed
export const RESCUE_COINS_PER = 3; // rescues per coin paid out when the run ends
export const RESCUE_COIN_CAP = 15; // most coins one run can pay (no coin farming)
export const FLOCK_MAX = 6; // freed birds that fly along with you

// A new palette every N points (day -> dusk -> night -> dawn -> ...)
export const THEME_EVERY = 25;

// Timing
export const RESTART_DELAY = 0.5; // seconds before a tap restarts after dying
export const RESUME_COUNTDOWN = 2.4; // 3-2-1 after un-pausing

export const MEDALS = [
  { score: 40, name: "Platinum", color: "#d8e6f2", dark: "#7d93a8" },
  { score: 30, name: "Gold", color: "#ffd23f", dark: "#a8760a" },
  { score: 20, name: "Silver", color: "#d9dde2", dark: "#7b8590" },
  { score: 10, name: "Bronze", color: "#d98a4a", dark: "#85481b" },
];
