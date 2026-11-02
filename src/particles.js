const MAX_PARTICLES = 250;
const rand = (a, b) => a + Math.random() * (b - a);

/** Draws a small particle shape ("dot", "star", "heart" or a square) centered at x, y. */
export function drawShape(ctx, shape, x, y, size, rot = 0) {
  if (shape === "dot") {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "star") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? size : size * 0.35;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (shape === "heart") {
    const s = size * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 1.1);
    ctx.bezierCurveTo(
      x - s * 2,
      y - s * 0.2,
      x - s * 0.8,
      y - s * 1.6,
      x,
      y - s * 0.5,
    );
    ctx.bezierCurveTo(
      x + s * 0.8,
      y - s * 1.6,
      x + s * 2,
      y - s * 0.2,
      x,
      y + s * 1.1,
    );
    ctx.fill();
  } else {
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
}

export class Particles {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  add(p) {
    if (this.items.length < MAX_PARTICLES) this.items.push(p);
  }

  feathers(x, y, n, color = "#fff3b0") {
    for (let i = 0; i < n; i++) {
      const life = rand(0.5, 0.9);
      this.add({
        shape: "feather",
        x,
        y,
        vx: rand(-140, -30),
        vy: rand(-50, 70),
        g: 220,
        life,
        max: life,
        size: rand(3, 5),
        rot: rand(0, 6.28),
        vr: rand(-10, 10),
        color,
      });
    }
  }

  burst(x, y, n, colors, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(speed * 0.3, speed);
      const life = rand(0.35, 0.8);
      this.add({
        shape: "spark",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        g: 400,
        life,
        max: life,
        size: rand(2, 4.5),
        rot: 0,
        vr: 0,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  /** One particle of a bird trail. It stays where it was emitted, so the world scrolls past it. */
  trail(x, y, style, speed) {
    let color;
    if (style.rainbow) {
      this.hue = ((this.hue || 0) + 28) % 360;
      color = `hsl(${this.hue},95%,60%)`;
    } else {
      color = style.colors[(Math.random() * style.colors.length) | 0];
    }
    const life = rand(0.45, 0.75);
    this.add({
      shape: style.shape,
      x: x + rand(-2, 2),
      y: y + rand(-4, 4),
      vx: -speed * rand(0.85, 1),
      vy: -(style.rise || 0) + rand(-12, 12),
      g: 0,
      life,
      max: life,
      size: rand(3.5, 6),
      rot: rand(0, 6.28),
      vr: rand(-4, 4),
      color,
    });
  }

  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        items[i] = items[items.length - 1];
        items.pop();
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
      ctx.fillStyle = p.color;
      if (p.shape === "feather") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        drawShape(ctx, p.shape, p.x, p.y, p.size, p.rot);
      }
    }
    ctx.globalAlpha = 1;
  }
}
