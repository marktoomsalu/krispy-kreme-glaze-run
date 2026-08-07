import { state } from '../state.js';
import { ctx, roundRect } from '../renderer.js';
import { clamp, rnd, pick } from '../util.js';

export function burst(x, y, count, colors, spread = 1) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x,
      y,
      vx: rnd(-90, 90) * spread - 60,
      vy: rnd(-190, 40) * spread,
      life: rnd(0.3, 0.8),
      maxLife: 0.8,
      color: pick(colors),
      size: rnd(2, 5),
      rot: rnd(0, Math.PI * 2)
    });
  }
}

export function trail(x, y, colors) {
  state.particles.push({
    x,
    y,
    vx: -rnd(80, 220),
    vy: rnd(-40, 40),
    life: 0.4,
    maxLife: 0.4,
    color: pick(colors),
    size: rnd(2, 4),
    rot: 0
  });
}

export function updateParticles(dt, drift = 0) {
  for (const b of state.particles) {
    b.vy += 900 * dt;
    b.x += (b.vx - drift) * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    b.rot += dt * 8;
  }
  state.particles = state.particles.filter((b) => b.life > 0);
}

/** Called on the game over / title screens so debris still settles. */
export function fadeParticles(dt) {
  for (const b of state.particles) b.life -= dt;
  state.particles = state.particles.filter((b) => b.life > 0);
}

export function drawParticles() {
  for (const b of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(b.life / b.maxLife, 0, 1);
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.fillStyle = b.color;
    roundRect(-b.size, -b.size * 0.45, b.size * 2, b.size * 0.9, b.size * 0.45);
    ctx.fill();
    ctx.restore();
  }
}
