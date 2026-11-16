// Particles and floating texts: the juice. One pooled system draws burst
// sparks, pickup glints, ember trails and damage numbers, all in world
// coordinates, and forgets them when their short lives run out.

const MAX_PARTICLES = 420;
const MAX_TEXTS = 48;

export class Particles {
  constructor(rng) {
    this.rng = rng;
    this.items = [];
    this.texts = [];
  }

  burst(x, y, color, count = 10, speed = 190, life = 0.45, size = 3) {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= MAX_PARTICLES) return;
      const angle = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(speed * 0.3, speed);
      this.items.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: this.rng.range(life * 0.5, life),
        maxLife: life,
        size: this.rng.range(size * 0.5, size * 1.4),
        color,
        drag: 3.2,
        gravity: 0,
      });
    }
  }

  trail(x, y, color) {
    if (this.items.length >= MAX_PARTICLES) return;
    this.items.push({
      x: x + this.rng.range(-3, 3),
      y: y + this.rng.range(-3, 3),
      vx: this.rng.range(-16, 16),
      vy: this.rng.range(-30, -8),
      life: this.rng.range(0.25, 0.5),
      maxLife: 0.5,
      size: this.rng.range(1.6, 3.2),
      color,
      drag: 1.2,
      gravity: -30,
    });
  }

  ring(x, y, color) {
    // A quick expanding shockwave, drawn as a stroked circle particle.
    if (this.items.length >= MAX_PARTICLES) return;
    this.items.push({
      x, y, vx: 0, vy: 0, life: 0.32, maxLife: 0.32,
      size: 6, color, drag: 0, gravity: 0, ring: true,
    });
  }

  text(x, y, label, color = '#ffd76a', size = 15) {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x: x + this.rng.range(-6, 6),
      y,
      vy: -56,
      life: 0.85,
      maxLife: 0.85,
      label,
      color,
      size,
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
      const drag = Math.max(0, 1 - p.drag * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.ring) p.size += 260 * dt;
    }
    const texts = this.texts;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.max(0, 1 - 2.4 * dt);
      if (t.life <= 0) texts.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.ring) {
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * a), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.label, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
