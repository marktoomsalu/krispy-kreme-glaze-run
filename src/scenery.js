import { CFG, COLORS } from './config.js';
import { state } from './state.js';
import { ctx, W, H, GY } from './renderer.js';
import { mix, pick, rnd, TAU } from './util.js';
import { drawDoughnut } from './doughnut.js';

const clouds = Array.from({ length: 9 }, () => ({
  x: rnd(0, W),
  y: rnd(40, 320),
  scale: rnd(0.55, 1.1)
}));

// A calm, distant Tallinn Old Town silhouette — spires (Oleviste-ish),
// domes (Alexander Nevsky-ish) and plain city-wall towers, in brand green.
// Sparser and slower-moving than a foreground row of shopfronts on purpose.
const SKYLINE_TYPES = ['spire', 'dome', 'tower'];
const skyline = Array.from({ length: 12 }, (_, i) => ({
  x: i * 160 + rnd(-20, 20),
  w: rnd(46, 76),
  h: rnd(110, 230),
  type: pick(SKYLINE_TYPES),
  lit: Math.random() < 0.4,
  litY: rnd(0.3, 0.75)
}));

const stars = Array.from({ length: 70 }, () => ({
  x: rnd(0, W),
  y: rnd(16, 380),
  r: rnd(0.6, 1.7),
  twinkle: rnd(0, TAU)
}));

export function updateScenery(dt, moving) {
  for (const c of clouds) {
    c.x -= (10 + c.scale * 14) * dt * (moving ? 1 : 0.3);
    if (c.x < -90) {
      c.x = W + 60;
      c.y = rnd(40, 320);
    }
  }
}

export function drawSky() {
  const night = state.night;
  const grad = ctx.createLinearGradient(0, 0, 0, GY);
  grad.addColorStop(0, mix(COLORS.skyTopDay, COLORS.skyTopNight, night));
  grad.addColorStop(1, mix(COLORS.skyBottomDay, COLORS.skyBottomNight, night));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GY + 2);

  if (night > 0.12) {
    ctx.globalAlpha = night;
    for (const s of stars) {
      ctx.fillStyle = '#FFF8D9';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.7 + 0.3 * Math.sin(state.time * 2 + s.twinkle)), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // the sun is a doughnut; so is the moon
  ctx.globalAlpha = 0.95;
  drawDoughnut(756, 130, 48, -state.time * 0.3, {
    glaze: night > 0.5 ? '#EAF0FF' : COLORS.glaze,
    dough: night > 0.5 ? '#C8CEE0' : '#F5C866'
  });
  ctx.globalAlpha = 1;

  for (const c of clouds) {
    ctx.fillStyle = night > 0.5 ? 'rgba(90,120,130,.35)' : 'rgba(255,255,255,.88)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 34 * c.scale, 15 * c.scale, 0, 0, TAU);
    ctx.ellipse(c.x + 24 * c.scale, c.y + 4 * c.scale, 22 * c.scale, 11 * c.scale, 0, 0, TAU);
    ctx.ellipse(c.x - 24 * c.scale, c.y + 5 * c.scale, 18 * c.scale, 9 * c.scale, 0, 0, TAU);
    ctx.fill();
  }
}

/** Distant Old Town skyline — slow parallax, flat silhouette, no per-frame
 *  randomness (window lit/position is decided once at creation, not per
 *  draw, so nothing flickers). */
export function drawSkyline() {
  const offset = (state.distance * 0.07) % 160;
  const night = state.night;
  // mix() returns an rgb(...) string, not hex — feeding that back into a
  // second mix() call breaks its hex parser, so this brand-green-toward-
  // greenDark blend is precomputed as a literal hex value instead.
  const silhouette = mix('#007947', '#04140F', night * 0.85);

  for (const b of skyline) {
    const x = b.x - offset - 160;
    if (x > W + 60 || x < -180) continue;
    const top = GY - b.h;

    ctx.fillStyle = silhouette;
    if (b.type === 'spire') {
      const capH = b.h * 0.32;
      ctx.fillRect(x, top + capH, b.w, b.h - capH);
      ctx.beginPath();
      ctx.moveTo(x, top + capH);
      ctx.lineTo(x + b.w / 2, top);
      ctx.lineTo(x + b.w, top + capH);
      ctx.closePath();
      ctx.fill();
      // a small red beacon at the very tip — the one bit of brand red up here
      ctx.fillStyle = COLORS.red;
      ctx.beginPath();
      ctx.arc(x + b.w / 2, top - 1, 2.4, 0, TAU);
      ctx.fill();
    } else if (b.type === 'dome') {
      const domeR = b.w / 2;
      ctx.fillRect(x, top + domeR, b.w, b.h - domeR);
      ctx.beginPath();
      ctx.arc(x + domeR, top + domeR, domeR, Math.PI, 0);
      ctx.fill();
    } else {
      ctx.fillRect(x, top, b.w, b.h);
      for (let cx = x + 4; cx < x + b.w - 4; cx += 12) {
        ctx.fillRect(cx, top - 5, 6, 6);
      }
    }

    if (b.lit && night > 0.3) {
      ctx.fillStyle = 'rgba(255,214,120,.75)';
      ctx.fillRect(x + b.w * 0.4, top + b.h * b.litY, 3, 5);
    }
  }
}

/** The conveyor belt you run along. */
export function drawConveyor() {
  ctx.fillStyle = COLORS.greenDark;
  ctx.fillRect(0, GY - 5, W, 6);
  ctx.fillStyle = COLORS.beltTop;
  ctx.fillRect(0, GY + 1, W, 26);
  ctx.fillStyle = COLORS.beltBottom;
  ctx.fillRect(0, GY + 27, W, H - GY - 27);

  const offset = state.distance % 44;
  ctx.strokeStyle = COLORS.beltChevron;
  ctx.lineWidth = 4;
  for (let x = -44; x < W + 44; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x - offset, GY + 24);
    ctx.lineTo(x - offset + 12, GY + 4);
    ctx.lineTo(x - offset + 24, GY + 24);
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.green;
  for (let x = -60; x < W + 60; x += 60) {
    ctx.beginPath();
    ctx.arc(x - ((state.distance * 0.8) % 60), GY + 45, 11, 0, TAU);
    ctx.fill();
  }

  // sugar dust on the belt
  ctx.fillStyle = 'rgba(255,253,249,.5)';
  for (let i = 0; i < 16; i++) {
    const x = (i * 137 - state.distance * 1.1) % (W + 40);
    ctx.fillRect(((x + W + 40) % (W + 40)) - 20, GY + 12 + (i % 3) * 5, 4, 2);
  }
}

/** Glaze dripping down over the top edge of the screen. */
export function drawGlazeCurtain() {
  const band = 15;
  ctx.fillStyle = COLORS.glaze;
  ctx.fillRect(0, 0, W, band);

  const offset = (state.distance * 0.5) % 46;
  for (let x = -46; x < W + 46; x += 46) {
    const px = x - offset;
    ctx.beginPath();
    ctx.arc(px + 11, band, 11, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 30, band, 6.5, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 11, band + 16, 5, 8, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.green;
  ctx.fillRect(0, 0, W, 4);
}
