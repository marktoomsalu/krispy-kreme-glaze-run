import { ctx } from './renderer.js';
import { TAU } from './util.js';
import { COLORS } from './config.js';

/**
 * The shared doughnut. Used for the player, the stacks, the sun and the moon.
 * The hole is a real hole — the ring is stroked, not filled — so scenery shows through.
 */
export function drawDoughnut(cx, cy, radius, roll, { glaze, dough, drizzle = false }) {
  const hole = radius * 0.34;
  const band = (radius + hole) / 2;
  const thickness = radius - hole;

  ctx.save();
  ctx.translate(cx, cy);

  // fried dough
  ctx.beginPath();
  ctx.arc(0, 0, band, 0, TAU);
  ctx.lineWidth = thickness;
  ctx.strokeStyle = dough;
  ctx.stroke();

  // browner outer edge
  ctx.beginPath();
  ctx.arc(0, 0, band + thickness * 0.3, 0, TAU);
  ctx.lineWidth = thickness * 0.34;
  ctx.strokeStyle = 'rgba(160,95,35,.32)';
  ctx.stroke();

  // glaze coat, rotates with the roll
  ctx.save();
  ctx.rotate(roll);
  ctx.beginPath();
  ctx.arc(0, -radius * 0.05, band, 0, TAU);
  ctx.lineWidth = thickness * 0.8;
  ctx.strokeStyle = glaze;
  ctx.stroke();

  // uneven drips around the rim
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.2;
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * radius * 0.9,
      Math.sin(a) * radius * 0.9 - radius * 0.05,
      radius * (0.12 + (i % 3) * 0.025),
      0,
      TAU
    );
    ctx.fillStyle = glaze;
    ctx.fill();
  }

  if (drizzle) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = radius * 0.07;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * hole * 1.15, Math.sin(a) * hole * 1.15);
      ctx.lineTo(Math.cos(a + 0.35) * radius * 0.92, Math.sin(a + 0.35) * radius * 0.92);
      ctx.stroke();
    }
  }
  ctx.restore();

  // wet sheen, drifts slower than the roll so the glaze looks glossy
  ctx.save();
  ctx.rotate(roll * 0.5);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = radius * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -radius * 0.05, band, Math.PI * 1.05, Math.PI * 1.42);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/** A glazed doughnut hole — the collectible. */
export function drawDoughnutHole(x, y, r, wobble) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wobble * 0.4);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = COLORS.dough;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -r * 0.18, r * 0.86, Math.PI * 0.98, Math.PI * 2.02);
  ctx.fillStyle = COLORS.glaze;
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-r * 0.7 + i * r * 0.47, -r * 0.1 + (i % 2 ? r * 0.1 : 0), r * 0.22, 0, TAU);
    ctx.fillStyle = COLORS.glaze;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.42, r * 0.2, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fill();

  ctx.restore();
}
