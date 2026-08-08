import { CFG, COLORS } from './config.js';
import { state } from './state.js';
import { ctx, W, H, GY } from './renderer.js';
import { mix, rnd, TAU } from './util.js';
import { drawDoughnut } from './doughnut.js';

const clouds = Array.from({ length: 9 }, () => ({
  x: rnd(0, W),
  y: rnd(40, 320),
  scale: rnd(0.55, 1.1)
}));

// A dense, layered Tallinn Old Town silhouette. Two layers for depth: a
// hazier, lighter, slower-moving `skylineFar` row behind everything, and
// the main `skyline` row in front, packed close enough that buildings
// nearly touch (real Old Town rooflines don't have gaps between them).
// Both use a fixed repeating pattern (not per-building random) so the two
// "landmark" shapes — the tall thin Oleviste-style spire and the TV
// Tower's mast-and-deck — show up on a predictable rhythm rather than
// rarely by chance. Everything is decided once at creation (window
// positions, which are lit, tone variant), never per-frame, so packing it
// tighter adds visual richness without adding flicker or fast motion —
// the parallax speeds are still slow on purpose.
const SKYLINE_TONES = ['#007947', '#00693D', '#00925C'];
const SKYLINE_PATTERN = [
  'gable', 'tower', 'stepgable', 'dome', 'oleviste', 'stepgable',
  'gable', 'tvtower', 'tower', 'stepgable', 'gable', 'dome'
];
const SKYLINE_SPACING = 100;

function makeWindows(w, h, type) {
  if (type === 'oleviste' || type === 'tvtower') return [];
  const cols = w > 70 ? 3 : 2;
  const wallTop = type === 'gable' || type === 'stepgable' ? h * 0.42 : h * 0.12;
  const rows = Math.max(1, Math.floor((h - wallTop) / 26));
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < 0.25) continue; // skip a few so it's not a perfect grid
      out.push({
        rx: (c + 0.5) / cols,
        ry: (wallTop + r * 26 + 14) / h,
        lit: Math.random() < 0.45
      });
    }
  }
  return out;
}

function makeBuilding(i, spacing, tallScale) {
  const type = SKYLINE_PATTERN[i % SKYLINE_PATTERN.length];
  const tall = type === 'oleviste' || type === 'tvtower';
  const w = (tall ? rnd(50, 62) : type === 'gable' || type === 'stepgable' ? rnd(70, 104) : rnd(52, 82)) * tallScale;
  const h = (tall ? rnd(260, 300) : type === 'gable' || type === 'stepgable' ? rnd(100, 165) : rnd(120, 200)) * tallScale;
  return {
    x: i * spacing + rnd(-8, 8),
    w,
    h,
    type,
    tone: SKYLINE_TONES[i % SKYLINE_TONES.length],
    windows: makeWindows(w, h, type)
  };
}

const skyline = Array.from({ length: 30 }, (_, i) => makeBuilding(i, SKYLINE_SPACING, 1));
const skylineFar = Array.from({ length: 34 }, (_, i) => makeBuilding(i + 3, SKYLINE_SPACING * 0.72, 0.62));

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

function drawBuildingShape(b, x, top) {
  if (b.type === 'oleviste') {
    // St. Olaf's-style spire — very tall and thin, the tallest thing on
    // the skyline, with a red beacon at the tip (the one bit of brand red
    // up here).
    const bodyH = b.h * 0.34;
    const bodyW = b.w * 0.62;
    const bodyX = x + (b.w - bodyW) / 2;
    ctx.fillRect(bodyX, top + b.h - bodyH, bodyW, bodyH);
    ctx.beginPath();
    ctx.moveTo(bodyX, top + b.h - bodyH);
    ctx.lineTo(x + b.w / 2, top);
    ctx.lineTo(bodyX + bodyW, top + b.h - bodyH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.arc(x + b.w / 2, top - 1, 2.4, 0, TAU);
    ctx.fill();
  } else if (b.type === 'tvtower') {
    // Tallinn TV Tower — thin mast, a wide observation-deck disc partway
    // up, mast continuing thinner above it.
    const deckY = top + b.h * 0.4;
    const mastW = b.w * 0.16;
    const mastX = x + b.w / 2 - mastW / 2;
    ctx.fillRect(mastX, top, mastW, b.h);
    ctx.beginPath();
    ctx.ellipse(x + b.w / 2, deckY, b.w * 0.4, b.h * 0.035, 0, 0, TAU);
    ctx.fill();
  } else if (b.type === 'dome') {
    // squat round city-wall tower with a conical cap
    const domeR = b.w / 2;
    ctx.fillRect(x, top + domeR, b.w, b.h - domeR);
    ctx.beginPath();
    ctx.arc(x + domeR, top + domeR, domeR, Math.PI, 0);
    ctx.fill();
  } else if (b.type === 'gable') {
    // plain merchant-house gable — wide and blunt, unlike the needle-thin
    // oleviste spire
    const capH = Math.min(b.h * 0.4, 42);
    ctx.fillRect(x, top + capH, b.w, b.h - capH);
    ctx.beginPath();
    ctx.moveTo(x, top + capH);
    ctx.lineTo(x + b.w / 2, top);
    ctx.lineTo(x + b.w, top + capH);
    ctx.closePath();
    ctx.fill();
  } else if (b.type === 'stepgable') {
    // crow-stepped Hanseatic gable — the staircase roofline all over the
    // real Old Town, and the clearest "this is definitely Tallinn" cue
    // besides the two landmarks.
    const wallH = b.h * 0.55;
    const wallTop = top + b.h - wallH;
    ctx.fillRect(x, wallTop, b.w, wallH);

    const steps = 3;
    const stepH = (b.h - wallH) / (steps + 1);
    const stepW = b.w / (steps * 2);

    ctx.beginPath();
    ctx.moveTo(x, wallTop);
    for (let s = 0; s < steps; s++) {
      ctx.lineTo(x + s * stepW, wallTop - s * stepH);
      ctx.lineTo(x + (s + 1) * stepW, wallTop - s * stepH);
      ctx.lineTo(x + (s + 1) * stepW, wallTop - (s + 1) * stepH);
    }
    ctx.lineTo(x + b.w / 2, top);
    for (let s = steps - 1; s >= 0; s--) {
      ctx.lineTo(x + b.w - (s + 1) * stepW, wallTop - (s + 1) * stepH);
      ctx.lineTo(x + b.w - (s + 1) * stepW, wallTop - s * stepH);
      ctx.lineTo(x + b.w - s * stepW, wallTop - s * stepH);
    }
    ctx.lineTo(x + b.w, wallTop);
    ctx.closePath();
    ctx.fill();
  } else {
    // plain crenellated city-wall tower
    ctx.fillRect(x, top, b.w, b.h);
    for (let cx = x + 4; cx < x + b.w - 4; cx += 12) {
      ctx.fillRect(cx, top - 5, 6, 6);
    }
  }
}

function drawSkylineLayer(buildings, spacing, parallax, { alpha, detail }) {
  const offset = (state.distance * parallax) % spacing;
  const night = state.night;

  ctx.globalAlpha = alpha;
  for (const b of buildings) {
    const x = b.x - offset - spacing;
    if (x > W + 60 || x < -220) continue;
    const top = GY - b.h;

    // mix() returns an rgb(...) string, not hex — feeding that back into a
    // second mix() call breaks its hex parser, so each building's brand-
    // green tone is blended toward night just once, from its literal hex.
    ctx.fillStyle = mix(b.tone, '#04140F', night * 0.85);
    drawBuildingShape(b, x, top);

    if (detail) {
      for (const win of b.windows) {
        ctx.fillStyle = win.lit && night > 0.3 ? 'rgba(255,214,120,.85)' : 'rgba(255,255,255,.3)';
        ctx.fillRect(x + b.w * win.rx - 2, top + b.h * win.ry - 3, 4, 6);
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** Dense, layered Old Town skyline — a hazier distant row behind a denser
 *  near row, both slow-parallax and fully static per-building (nothing
 *  decided per-frame, so packing it tighter adds detail, not flicker). */
export function drawSkyline() {
  drawSkylineLayer(skylineFar, SKYLINE_SPACING * 0.72, 0.035, { alpha: 0.45, detail: false });
  drawSkylineLayer(skyline, SKYLINE_SPACING, 0.07, { alpha: 1, detail: true });
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
