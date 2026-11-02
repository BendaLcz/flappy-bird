import * as C from "./config.js";
import { FRIENDS } from "./friends.js";

// Sprites are drawn procedurally into offscreen canvases at the current device resolution
// (so they stay crisp on HiDPI screens) and blitted every frame. To use real artwork instead,
// replace these builders with image loading; the renderer only relies on { canvas, w, h }.

function make(w, h, scale, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * scale));
  canvas.height = Math.max(1, Math.ceil(h * scale));
  const g = canvas.getContext("2d");
  g.scale(canvas.width / w, canvas.height / h);
  draw(g);
  return { canvas, w, h };
}

export const BIRD_W = 48;
export const BIRD_H = 52; // extra headroom so accessories (crown) fit
export const ITEM_SIZE = 22;
export const CAGE_W = 38;
export const CAGE_H = 42;
export const BALLOON_W = 40;
export const BALLOON_H = 54;
export const WASP_W = 28;
export const WASP_H = 22;
export const HAWK_W = 58;
export const HAWK_H = 38;
export const SPIDER_W = 28;
export const SPIDER_H = 26;
export const WALL_TILE_H = 64; // repeating part of a boss wall
export const WALL_CAP_H = 20; // rim at the opening of a boss wall
export const CAT_W = 46;
export const CAT_H = 38;
export const FRIEND_SCALE = 0.6; // freed birds are drawn smaller than yours
export const FRIEND_W = BIRD_W * FRIEND_SCALE;
export const FRIEND_H = BIRD_H * FRIEND_SCALE;

function drawBird(g, wing, skin) {
  // wing: 0 = up, 1 = middle, 2 = down
  const k = skin.colors;
  const cx = BIRD_W / 2;
  const cy = BIRD_H / 2;
  g.lineJoin = "round";
  g.lineCap = "butt";
  g.strokeStyle = k.outline;

  // tail
  g.fillStyle = k.tail;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx - 11, cy - 2);
  g.lineTo(cx - 22, cy - 7);
  g.lineTo(cx - 20, cy + 4);
  g.closePath();
  g.fill();
  g.stroke();

  // body
  g.fillStyle = k.body;
  g.beginPath();
  g.arc(cx, cy, C.BIRD_R, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // belly
  g.fillStyle = k.belly;
  g.beginPath();
  g.ellipse(cx + 3, cy + 7, 8, 4, 0, 0, Math.PI * 2);
  g.fill();

  // headband (ninja)
  if (skin.accessory === "headband") {
    g.strokeStyle = "#e53935";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(cx, cy, 12.5, -2.5, -0.55);
    g.stroke();
    const kx = cx + 12.5 * Math.cos(-2.5);
    const ky = cy + 12.5 * Math.sin(-2.5);
    g.lineWidth = 3;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(kx, ky);
    g.lineTo(kx - 9, ky - 3);
    g.moveTo(kx, ky);
    g.lineTo(kx - 8, ky + 3);
    g.stroke();
    g.lineCap = "butt";
    g.strokeStyle = k.outline;
  }

  // eye
  g.fillStyle = "#fff";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx + 6, cy - 4, 5, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(cx + 8, cy - 4, 2, 0, Math.PI * 2);
  g.fill();

  // beak
  g.fillStyle = k.beak;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx + 10, cy + 1);
  g.lineTo(cx + 21, cy + 3);
  g.lineTo(cx + 10, cy + 8);
  g.closePath();
  g.fill();
  g.stroke();

  // wing
  const dy = [-5, 0, 5][wing];
  const rot = [-0.7, 0, 0.5][wing];
  g.fillStyle = k.wing;
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(cx - 6, cy + 3 + dy, 8.5, 5.5, rot, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // crown (royal)
  if (skin.accessory === "crown") {
    g.fillStyle = "#ffd23f";
    g.strokeStyle = "#7a5200";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - 6, cy - 11);
    g.lineTo(cx - 7, cy - 19);
    g.lineTo(cx - 3, cy - 14.5);
    g.lineTo(cx + 1, cy - 21);
    g.lineTo(cx + 5, cy - 14.5);
    g.lineTo(cx + 9, cy - 19);
    g.lineTo(cx + 8, cy - 11);
    g.closePath();
    g.fill();
    g.stroke();
  }

  // antenna (robot)
  if (skin.accessory === "antenna") {
    g.strokeStyle = k.outline;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx - 1, cy - 12);
    g.lineTo(cx - 1, cy - 21);
    g.stroke();
    g.fillStyle = "#ff3b3b";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(cx - 1, cy - 23, 3, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  // pointy hat (wizard)
  if (skin.accessory === "wizard") {
    g.fillStyle = "#3b2a8c";
    g.strokeStyle = "#14093d";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - 9, cy - 11);
    g.lineTo(cx + 2, cy - 24);
    g.lineTo(cx + 9, cy - 11);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(cx, cy - 11, 12, 3, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = "#ffd23f";
    g.beginPath();
    g.arc(cx + 1, cy - 16, 1.6, 0, Math.PI * 2);
    g.fill();
  }
}

/** Draws a bird (wing in the middle position) filling the given canvas; used by the shop. */
export function renderBirdPreview(canvas, skin) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.save();
  g.scale(canvas.width / BIRD_W, canvas.height / BIRD_H);
  drawBird(g, 1, skin);
  g.restore();
}

function pipeGradient(g, w, p) {
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, p.dark);
  grad.addColorStop(0.15, p.light);
  grad.addColorStop(0.55, p.mid);
  grad.addColorStop(1, p.dark);
  return grad;
}

function drawCoin(g) {
  const c = ITEM_SIZE / 2;
  g.fillStyle = "#ffd23f";
  g.strokeStyle = "#a8760a";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, 9, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.strokeStyle = "#e0a800";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(c, c, 5, 0, Math.PI * 2);
  g.stroke();
}

// Gold coin: worth 5.
function drawGold(g) {
  const c = ITEM_SIZE / 2;
  g.fillStyle = "#ffb020";
  g.strokeStyle = "#8a4a00";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, 10, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#fff1a8";
  g.strokeStyle = "#b86a00";
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 6 : 2.6;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = c + Math.cos(a) * r;
    const py = c + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  g.stroke();
}

// Diamond: worth 25.
function drawGem(g) {
  g.lineJoin = "round";
  g.strokeStyle = "#0b6a8a";
  g.lineWidth = 1.6;
  g.fillStyle = "#5ee6ff";
  g.beginPath();
  g.moveTo(5, 3);
  g.lineTo(17, 3);
  g.lineTo(21, 9);
  g.lineTo(11, 20);
  g.lineTo(1, 9);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = "#c8fbff";
  g.beginPath();
  g.moveTo(5, 3);
  g.lineTo(9, 9);
  g.lineTo(1, 9);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(17, 3);
  g.lineTo(21, 9);
  g.lineTo(13, 9);
  g.closePath();
  g.fillStyle = "#2fb6e0";
  g.fill();
  g.strokeStyle = "#0b6a8a";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(1, 9);
  g.lineTo(21, 9);
  g.moveTo(9, 9);
  g.lineTo(11, 20);
  g.lineTo(13, 9);
  g.stroke();
}

function drawShield(g) {
  const c = ITEM_SIZE / 2;
  g.fillStyle = "rgba(90,170,255,0.45)";
  g.strokeStyle = "#2b6fd6";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, 10, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#fff";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(11, 4.5);
  g.lineTo(16.5, 6.5);
  g.lineTo(16.5, 11);
  g.quadraticCurveTo(16.5, 16, 11, 18);
  g.quadraticCurveTo(5.5, 16, 5.5, 11);
  g.lineTo(5.5, 6.5);
  g.closePath();
  g.fill();
  g.stroke();
}

function drawSlow(g) {
  const c = ITEM_SIZE / 2;
  g.fillStyle = "#b57edc";
  g.strokeStyle = "#6a2fa0";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, 10, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#fff";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(c, c, 6.5, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(c, c - 4.5);
  g.lineTo(c, c);
  g.lineTo(c + 3.5, c);
  g.stroke();
}

// Hourglass power-up: more time, and the clock stops for a moment.
function drawHourglass(g) {
  const c = ITEM_SIZE / 2;
  g.lineJoin = "round";
  g.fillStyle = "#4fd0e8";
  g.strokeStyle = "#17788a";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, 10, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#fff";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(6.5, 5.5);
  g.lineTo(15.5, 5.5);
  g.lineTo(11, 11);
  g.lineTo(15.5, 16.5);
  g.lineTo(6.5, 16.5);
  g.lineTo(11, 11);
  g.closePath();
  g.fill();
  g.stroke();
}

// A bird in a cage (Rescue mode). The bird is drawn with the regular bird painter.
function drawCage(g, friend, gold = false) {
  const w = CAGE_W;
  g.save();
  g.translate(w / 2, 18);
  g.scale(0.55, 0.55);
  g.translate(-BIRD_W / 2, -BIRD_H / 2);
  drawBird(g, 1, friend);
  g.restore();

  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = gold ? "#c98a0a" : "#6f7684";
  g.lineWidth = 2;
  const r = w / 2 - 4;
  g.beginPath();
  g.moveTo(4, 32);
  g.lineTo(4, 19);
  g.arc(w / 2, 19, r, Math.PI, 0);
  g.lineTo(w - 4, 32);
  g.stroke();
  for (const dx of [-8, 0, 8]) {
    g.beginPath();
    g.moveTo(w / 2 + dx, 19 - Math.sqrt(r * r - dx * dx));
    g.lineTo(w / 2 + dx, 32);
    g.stroke();
  }
  g.beginPath();
  g.arc(w / 2, 2.5, 2.2, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = gold ? "#ffe27a" : "#c9ced8";
  g.lineWidth = 1.8;
  g.beginPath();
  g.rect(2, 32, w - 4, 7);
  g.fill();
  g.stroke();
}

// Net balloon (Rescue mode): a drifting balloon with a net hanging from it.
function drawBalloon(g) {
  const cx = BALLOON_W / 2;
  g.lineJoin = "round";
  g.lineCap = "round";
  // ropes
  g.strokeStyle = "#5a3a1a";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx - 3, 39);
  g.lineTo(cx - 10, 44);
  g.moveTo(cx + 3, 39);
  g.lineTo(cx + 10, 44);
  g.moveTo(cx, 39);
  g.lineTo(cx, 44);
  g.stroke();
  // net bag
  g.fillStyle = "rgba(210,190,140,0.35)";
  g.strokeStyle = "#7a5a2a";
  g.beginPath();
  g.moveTo(cx - 11, 44);
  g.lineTo(cx + 11, 44);
  g.quadraticCurveTo(cx + 12, 52, cx, 53.5);
  g.quadraticCurveTo(cx - 12, 52, cx - 11, 44);
  g.closePath();
  g.fill();
  g.stroke();
  g.lineWidth = 1;
  g.beginPath();
  for (const dx of [-6, 0, 6]) {
    g.moveTo(cx + dx, 44);
    g.lineTo(cx + dx * 0.4, 52.5);
  }
  for (const y of [47.5, 50.5]) {
    g.moveTo(cx - 10, y);
    g.lineTo(cx + 10, y);
  }
  g.stroke();
  // balloon
  const body = () => {
    g.beginPath();
    g.ellipse(cx, 19, 15, 17, 0, 0, Math.PI * 2);
  };
  g.save();
  body();
  g.clip();
  g.fillStyle = "#e8433f";
  g.fillRect(0, 0, BALLOON_W, 40);
  g.fillStyle = "#fff1d6";
  g.fillRect(cx - 9, 0, 6, 40);
  g.fillRect(cx + 3, 0, 6, 40);
  g.restore();
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath();
  g.ellipse(cx - 6, 11, 3.5, 6, 0.5, 0, Math.PI * 2);
  g.fill();
  body();
  g.strokeStyle = "#7a1d1a";
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = "#b02e2a";
  g.beginPath();
  g.moveTo(cx, 35);
  g.lineTo(cx - 4, 39.5);
  g.lineTo(cx + 4, 39.5);
  g.closePath();
  g.fill();
  g.stroke();
}

// Wasp (Rescue mode): small, fast, zigzags. Faces left.
function drawWasp(g, wing) {
  const tau = Math.PI * 2;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.fillStyle = "rgba(230,245,255,0.75)";
  g.strokeStyle = "rgba(90,120,150,0.9)";
  g.lineWidth = 1;
  const wy = wing === 0 ? 5.5 : 8.5;
  const rot = wing === 0 ? -0.5 : 0.1;
  g.beginPath();
  g.ellipse(13, wy, 7, 3.2, rot, 0, tau);
  g.fill();
  g.stroke();
  g.beginPath();
  g.ellipse(17, wy + 1, 6, 2.8, rot + 0.3, 0, tau);
  g.fill();
  g.stroke();
  const body = () => {
    g.beginPath();
    g.ellipse(14, 14, 9, 5.5, 0, 0, tau);
  };
  g.save();
  body();
  g.clip();
  g.fillStyle = "#ffd23f";
  g.fillRect(0, 0, WASP_W, WASP_H);
  g.fillStyle = "#222";
  g.fillRect(11, 0, 3, WASP_H);
  g.fillRect(17, 0, 3, WASP_H);
  g.restore();
  body();
  g.strokeStyle = "#222";
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = "#2a2a2a";
  g.beginPath();
  g.arc(5.5, 13, 4, 0, tau);
  g.fill();
  g.fillStyle = "#ff5252";
  g.beginPath();
  g.arc(4.2, 12, 1.4, 0, tau);
  g.fill();
  g.fillStyle = "#222";
  g.beginPath();
  g.moveTo(22.5, 12.5);
  g.lineTo(27.5, 14);
  g.lineTo(22.5, 16);
  g.closePath();
  g.fill();
  g.strokeStyle = "#222";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(4, 10);
  g.lineTo(1.5, 6.5);
  g.stroke();
}

// Hawk (Rescue mode): faces left, wings up or down.
function drawHawk(g, wing) {
  const tau = Math.PI * 2;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = "#2a160a";
  g.lineWidth = 1.8;
  // tail
  g.fillStyle = "#8a5a34";
  g.beginPath();
  g.moveTo(40, 17);
  g.lineTo(56, 14);
  g.lineTo(55, 21);
  g.lineTo(56, 27);
  g.lineTo(40, 24);
  g.closePath();
  g.fill();
  g.stroke();
  g.strokeStyle = "#5a3418";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(47, 16);
  g.lineTo(47, 26);
  g.moveTo(52, 15.5);
  g.lineTo(52, 26);
  g.stroke();
  // body
  g.strokeStyle = "#2a160a";
  g.lineWidth = 1.8;
  g.fillStyle = "#6b4226";
  g.beginPath();
  g.ellipse(29, 20.5, 15, 8, 0, 0, tau);
  g.fill();
  g.stroke();
  g.fillStyle = "#e2c79a";
  g.beginPath();
  g.ellipse(26, 24.5, 9, 3.6, 0, 0, tau);
  g.fill();
  // head
  g.fillStyle = "#7a5230";
  g.beginPath();
  g.arc(14, 18, 8, 0, tau);
  g.fill();
  g.stroke();
  g.fillStyle = "#f2e6cc";
  g.beginPath();
  g.ellipse(13, 22, 5, 3, 0, 0, tau);
  g.fill();
  g.fillStyle = "#ffc02e";
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(8, 16);
  g.quadraticCurveTo(1, 17, 1, 21);
  g.lineTo(3.5, 22.5);
  g.lineTo(8, 21);
  g.closePath();
  g.fill();
  g.stroke();
  // angry eye
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(11, 16.5, 3, 0, tau);
  g.fill();
  g.fillStyle = "#111";
  g.beginPath();
  g.arc(10, 17, 1.5, 0, tau);
  g.fill();
  g.strokeStyle = "#2a160a";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(6.5, 11.5);
  g.lineTo(14, 14.5);
  g.stroke();
  // wing
  g.fillStyle = "#553219";
  g.strokeStyle = "#2a160a";
  g.lineWidth = 1.8;
  const up = wing === 0;
  const pts = [
    [24, 17],
    [20, 3],
    [26, 6],
    [30, 1],
    [35, 6],
    [41, 4],
    [38, 17],
  ];
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const py = up ? y : 38 - y + 1;
    if (i === 0) g.moveTo(x, py);
    else g.lineTo(x, py);
  });
  g.closePath();
  g.fill();
  g.stroke();
}

// Spider (Rescue mode): dangles from the top; the thread is drawn by the renderer.
function drawSpider(g) {
  const tau = Math.PI * 2;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = "#1d1428";
  g.lineWidth = 1.8;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(14 + s * 4, 12 + i * 2);
      g.lineTo(14 + s * (10 + (i % 2) * 1.5), 3 + i * 4.5);
      g.lineTo(14 + s * 12.5, 8 + i * 5);
      g.stroke();
    }
  }
  g.fillStyle = "#4a3260";
  g.lineWidth = 1.6;
  g.beginPath();
  g.ellipse(14, 17, 7, 7.5, 0, 0, tau);
  g.fill();
  g.stroke();
  g.fillStyle = "#e8433f";
  g.beginPath();
  g.moveTo(14, 13.5);
  g.lineTo(16.5, 17);
  g.lineTo(14, 20.5);
  g.lineTo(11.5, 17);
  g.closePath();
  g.fill();
  g.fillStyle = "#5d4079";
  g.beginPath();
  g.arc(14, 9, 5.2, 0, tau);
  g.fill();
  g.stroke();
  for (const s of [-1, 1]) {
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(14 + s * 2.4, 8.2, 2.2, 0, tau);
    g.fill();
    g.fillStyle = "#111";
    g.beginPath();
    g.arc(14 + s * 2.4, 8.8, 1, 0, tau);
    g.fill();
  }
}

// Boss walls (Rescue mode): a giant tree and a castle wall. The body repeats vertically.
function drawWallBody(g, style) {
  const w = C.WALL_W - 8;
  const h = WALL_TILE_H;
  if (style === "tree") {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#5a361a");
    grad.addColorStop(0.3, "#8a5a30");
    grad.addColorStop(0.65, "#7b4f2a");
    grad.addColorStop(1, "#4e2f16");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3d2410";
    g.lineWidth = 2;
    g.lineCap = "round";
    for (const x of [8, 17, 28, 36]) {
      g.beginPath();
      for (let y = 0; y <= h; y += 4) {
        const px = x + Math.sin((y / h) * Math.PI * 4 + x) * 1.6;
        if (y === 0) g.moveTo(px, y);
        else g.lineTo(px, y);
      }
      g.stroke();
    }
    for (const [x, y, rx, ry] of [
      [14, 22, 5, 7],
      [31, 50, 4, 5.5],
    ]) {
      g.fillStyle = "#4a2c14";
      g.strokeStyle = "#2e1a0b";
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = "#6b4326";
      g.beginPath();
      g.ellipse(x, y, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    const shades = ["#a4adbf", "#9aa3b5", "#adb5c6"];
    g.lineWidth = 1.5;
    for (let r = 0; r < h / 16; r++) {
      const off = r % 2 ? 11 : 0;
      for (let c = -1; c < 3; c++) {
        const x = c * 22 + off;
        g.fillStyle = shades[(r * 2 + c + 2) % 3];
        g.fillRect(x, r * 16, 22, 16);
        g.fillStyle = "rgba(255,255,255,0.22)";
        g.fillRect(x, r * 16, 22, 2);
        g.strokeStyle = "#6b7488";
        g.strokeRect(x, r * 16, 22, 16);
      }
    }
    g.restore();
  }
  g.strokeStyle = style === "tree" ? "#2a160a" : "#3d4456";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(1, 0);
  g.lineTo(1, h);
  g.moveTo(w - 1, 0);
  g.lineTo(w - 1, h);
  g.stroke();
}

function drawWallCap(g, style) {
  const w = C.WALL_W;
  const h = WALL_CAP_H;
  g.lineJoin = "round";
  g.lineWidth = 2;
  const rr = (r) => {
    g.beginPath();
    g.moveTo(1 + r, 1);
    g.arcTo(w - 1, 1, w - 1, h - 1, r);
    g.arcTo(w - 1, h - 1, 1, h - 1, r);
    g.arcTo(1, h - 1, 1, 1, r);
    g.arcTo(1, 1, w - 1, 1, r);
    g.closePath();
  };
  if (style === "tree") {
    g.fillStyle = "#6b4326";
    g.strokeStyle = "#2a160a";
    rr(7);
    g.fill();
    g.stroke();
    g.fillStyle = "rgba(255,220,170,0.25)";
    g.fillRect(8, 6, w - 16, 3);
    g.fillStyle = "#4caf50";
    for (const [x, y] of [
      [9, 3.5],
      [22, 2.5],
      [36, 3.5],
      [45, 2.5],
      [14, 16.5],
      [29, 17.5],
      [42, 16.5],
    ]) {
      g.beginPath();
      g.ellipse(x, y, 5, 3, 0.3, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.fillStyle = "#6d768a";
    g.strokeStyle = "#2f3646";
    rr(4);
    g.fill();
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.2)";
    g.fillRect(4, 3, w - 8, 3);
    g.strokeStyle = "#4d566a";
    g.lineWidth = 1.5;
    g.beginPath();
    for (const x of [13, 26, 39]) {
      g.moveTo(x, 2);
      g.lineTo(x, h - 2);
    }
    g.stroke();
  }
}

// Cat (Rescue mode): sits on the ground, then leaps. Faces left.
function drawCat(g, jump) {
  const tau = Math.PI * 2;
  const fur = "#f08a2e";
  const line = "#4a2308";
  g.lineJoin = "round";
  g.lineCap = "round";
  const tail = () => {
    g.beginPath();
    if (jump) {
      g.moveTo(34, 22);
      g.quadraticCurveTo(42, 21, 44, 13);
    } else {
      g.moveTo(34, 28);
      g.quadraticCurveTo(45, 29, 41, 13);
    }
  };
  g.strokeStyle = line;
  g.lineWidth = 6.5;
  tail();
  g.stroke();
  g.strokeStyle = fur;
  g.lineWidth = 3.5;
  tail();
  g.stroke();
  // legs
  const leg = (x1, y1, x2, y2) => {
    g.strokeStyle = line;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.strokeStyle = fur;
    g.lineWidth = 3;
    g.stroke();
  };
  if (jump) {
    leg(14, 24, 4, 28);
    leg(18, 26, 8, 32);
    leg(32, 26, 42, 30);
    leg(28, 27, 38, 33);
  } else {
    leg(14, 30, 13, 35);
    leg(32, 30, 33, 35);
  }
  // body
  g.fillStyle = fur;
  g.strokeStyle = line;
  g.lineWidth = 1.8;
  g.beginPath();
  if (jump) g.ellipse(24, 25, 14, 6.5, -0.12, 0, tau);
  else g.ellipse(24, 27, 12, 9, 0, 0, tau);
  g.fill();
  g.stroke();
  g.strokeStyle = "#a85412";
  g.lineWidth = 1.6;
  g.beginPath();
  for (const x of [20, 25, 30]) {
    g.moveTo(x, jump ? 20 : 20);
    g.lineTo(x + 1, jump ? 24 : 25);
  }
  g.stroke();
  // head
  const hy = jump ? 20 : 19;
  g.fillStyle = fur;
  g.strokeStyle = line;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(6, hy - 5);
  g.lineTo(6.5, hy - 14);
  g.lineTo(12, hy - 8);
  g.moveTo(14, hy - 8);
  g.lineTo(19, hy - 14);
  g.lineTo(20, hy - 4);
  g.stroke();
  g.fill();
  g.beginPath();
  g.arc(13, hy, 8.5, 0, tau);
  g.fill();
  g.stroke();
  g.fillStyle = "#9bff5a";
  g.beginPath();
  g.ellipse(9.5, hy - 1, 2.2, 2.8, 0, 0, tau);
  g.ellipse(16.5, hy - 1, 2.2, 2.8, 0, 0, tau);
  g.fill();
  g.fillStyle = "#111";
  g.fillRect(9, hy - 3.6, 1.1, 5.4);
  g.fillRect(16, hy - 3.6, 1.1, 5.4);
  g.fillStyle = "#ff8fa8";
  g.beginPath();
  g.moveTo(11.5, hy + 2.5);
  g.lineTo(14.5, hy + 2.5);
  g.lineTo(13, hy + 4);
  g.closePath();
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(8, hy + 3.5);
  g.lineTo(1.5, hy + 2.5);
  g.moveTo(8, hy + 5);
  g.lineTo(2, hy + 6.5);
  g.stroke();
}

// Feather power-up: fly through enemies for a few seconds.
function drawFeather(g) {
  const c = ITEM_SIZE / 2;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.fillStyle = "#9be8c0";
  g.strokeStyle = "#2a8a60";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, 10, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#fff";
  g.lineWidth = 1.3;
  g.beginPath();
  g.ellipse(c, c, 2.8, 7, Math.PI / 4, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(c - 5.5, c + 5.5);
  g.lineTo(c + 5, c - 5);
  g.stroke();
}

// Magnet power-up: cages are pulled in.
function drawMagnet(g) {
  const c = ITEM_SIZE / 2;
  g.lineCap = "butt";
  g.fillStyle = "#dfe6ea";
  g.strokeStyle = "#546e7a";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, 10, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.strokeStyle = "#d32f2f";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(c - 4.5, c - 3);
  g.lineTo(c - 4.5, c + 1);
  g.arc(c, c + 1, 4.5, Math.PI, 0, true);
  g.lineTo(c + 4.5, c - 3);
  g.stroke();
  g.strokeStyle = "#fafafa";
  g.beginPath();
  g.moveTo(c - 4.5, c - 6);
  g.lineTo(c - 4.5, c - 3);
  g.moveTo(c + 4.5, c - 6);
  g.lineTo(c + 4.5, c - 3);
  g.stroke();
}

/** Builds all sprites for the equipped bird skin and pipe colors. */
export function buildSprites(scale, skin, p) {
  const capW = C.PIPE_W + C.PIPE_CAP_OVERHANG * 2;
  return {
    bird: [0, 1, 2].map((wing) =>
      make(BIRD_W, BIRD_H, scale, (g) => drawBird(g, wing, skin)),
    ),
    pipeBody: make(C.PIPE_W, 16, scale, (g) => {
      g.fillStyle = pipeGradient(g, C.PIPE_W, p);
      g.fillRect(0, 0, C.PIPE_W, 16);
      g.strokeStyle = p.outline;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(1, 0);
      g.lineTo(1, 16);
      g.moveTo(C.PIPE_W - 1, 0);
      g.lineTo(C.PIPE_W - 1, 16);
      g.stroke();
    }),
    pipeCap: make(capW, C.PIPE_CAP_H, scale, (g) => {
      g.fillStyle = pipeGradient(g, capW, p);
      g.fillRect(0, 0, capW, C.PIPE_CAP_H);
      g.strokeStyle = p.outline;
      g.lineWidth = 2;
      g.strokeRect(1, 1, capW - 2, C.PIPE_CAP_H - 2);
    }),
    coin: make(ITEM_SIZE, ITEM_SIZE, scale, drawCoin),
    gold: make(ITEM_SIZE, ITEM_SIZE, scale, drawGold),
    gem: make(ITEM_SIZE, ITEM_SIZE, scale, drawGem),
    shield: make(ITEM_SIZE, ITEM_SIZE, scale, drawShield),
    slow: make(ITEM_SIZE, ITEM_SIZE, scale, drawSlow),
    hourglass: make(ITEM_SIZE, ITEM_SIZE, scale, drawHourglass),
    balloon: make(BALLOON_W, BALLOON_H, scale, drawBalloon),
    wasp: [0, 1].map((f) => make(WASP_W, WASP_H, scale, (g) => drawWasp(g, f))),
    hawk: [0, 1].map((f) => make(HAWK_W, HAWK_H, scale, (g) => drawHawk(g, f))),
    spider: make(SPIDER_W, SPIDER_H, scale, drawSpider),
    wall: Object.fromEntries(
      ["tree", "castle"].map((style) => [
        style,
        {
          body: make(C.WALL_W - 8, WALL_TILE_H, scale, (g) =>
            drawWallBody(g, style),
          ),
          cap: make(C.WALL_W, WALL_CAP_H, scale, (g) => drawWallCap(g, style)),
        },
      ]),
    ),
    cat: [false, true].map((j) =>
      make(CAT_W, CAT_H, scale, (g) => drawCat(g, j)),
    ),
    feather: make(ITEM_SIZE, ITEM_SIZE, scale, drawFeather),
    magnet: make(ITEM_SIZE, ITEM_SIZE, scale, drawMagnet),
    cageGold: Object.fromEntries(
      FRIENDS.map((f) => [
        f.id,
        make(CAGE_W, CAGE_H, scale, (g) => drawCage(g, f, true)),
      ]),
    ),
    cage: Object.fromEntries(
      FRIENDS.map((f) => [
        f.id,
        make(CAGE_W, CAGE_H, scale, (g) => drawCage(g, f)),
      ]),
    ),
    friend: Object.fromEntries(
      FRIENDS.map((f) => [
        f.id,
        [0, 1, 2].map((wing) =>
          make(FRIEND_W, FRIEND_H, scale, (g) => {
            g.scale(FRIEND_SCALE, FRIEND_SCALE);
            drawBird(g, wing, f);
          }),
        ),
      ]),
    ),
  };
}
