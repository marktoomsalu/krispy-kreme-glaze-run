import { CFG } from '../config.js';
import { state, player } from '../state.js';
import { W, GY } from '../renderer.js';
import { rnd } from '../util.js';
import { drawDoughnutHole } from '../doughnut.js';

const HOLES = CFG.holes;

export function updateHoles(dt) {
  state.nextHoles -= state.speed * dt;
  if (state.nextHoles <= 0) {
    spawnRun();
    state.nextHoles = rnd(HOLES.minGap, HOLES.maxGap);
  }

  const R = CFG.rush;
  for (const h of state.holes) {
    h.x -= state.speed * dt;

    // hot light pulls them in
    if (player.rush > 0) {
      const dx = player.x - h.x;
      const dy = player.y - 28 - h.y;
      const dist = Math.hypot(dx, dy);
      if (dist < R.magnetRange && dist > 0) {
        h.x += (dx / dist) * R.magnetPull * dt;
        h.y += (dy / dist) * R.magnetPull * dt;
      }
    }
  }
  state.holes = state.holes.filter((h) => !h.dead && h.x > -60);
}

function spawnRun() {
  const count = 3 + ((Math.random() * 4) | 0);
  const asArc = Math.random() < 0.5;
  const baseY = asArc ? GY - 40 : rnd(GY - 150, GY - 62);

  for (let i = 0; i < count; i++) {
    state.holes.push({
      x: W + 40 + i * 44,
      y: asArc ? baseY - Math.sin(((i + 1) / (count + 1)) * Math.PI) * 108 : baseY,
      seed: rnd(0, Math.PI * 2)
    });
  }
}

export function drawHoles() {
  for (const h of state.holes) {
    drawDoughnutHole(h.x, h.y + Math.sin(state.time * 4 + h.seed) * 3, 11, Math.sin(state.time * 3 + h.seed));
  }
}
