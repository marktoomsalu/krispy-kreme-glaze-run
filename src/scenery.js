import { CFG, COLORS } from './config.js';
import { state, player } from './state.js';
import { ctx, W, H, GY, roundRect } from './renderer.js';
import { mix, rnd, TAU } from './util.js';
import { drawDoughnut } from './doughnut.js';

const clouds = Array.from({ length: 6 }, () => ({
  x: rnd(0, W),
  y: rnd(24, 104),
  scale: rnd(0.55, 1.1)
}));

const shops = Array.from({ length: 22 }, (_, i) => ({
  x: i * 96 + rnd(-8, 8),
  w: rnd(66, 92),
  h: rnd(56, 120),
  awning: Math.random() < 0.55
}));

const stars = Array.from({ length: 44 }, () => ({
  x: rnd(0, W),
  y: rnd(8, 150),
  r: rnd(0.6, 1.7),
  twinkle: rnd(0, TAU)
}));

export function updateScenery(dt, moving) {
  for (const c of clouds) {
    c.x -= (10 + c.scale * 14) * dt * (moving ? 1 : 0.3);
    if (c.x < -90) {
      c.x = W + 60;
      c.y = rnd(24, 104);
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
  drawDoughnut(786, 70, 33, -state.time * 0.3, {
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

export function drawShopfronts() {
  const offset = (state.distance * 0.18) % 96;
  const night = state.night;
  const wall = mix(COLORS.green, '#0C2B33', night);

  for (const b of shops) {
    const x = b.x - offset - 96;
    if (x > W + 40 || x < -140) continue;

    ctx.fillStyle = wall;
    ctx.fillRect(x, GY - b.h, b.w, b.h);
    ctx.fillStyle = mix(COLORS.greenDark, '#081E24', night);
    ctx.fillRect(x, GY - b.h, b.w, 6);

    // lit window with trays of doughnuts inside
    ctx.fillStyle = night > 0.35 ? 'rgba(255,214,120,.88)' : 'rgba(255,247,239,.92)';
    ctx.fillRect(x + 10, GY - b.h + 18, b.w - 20, b.h - 34);

    ctx.fillStyle = mix('#D8A86A', '#9A6E38', night * 0.5);
    const rows = Math.max(1, Math.floor((b.h - 46) / 20));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < Math.floor((b.w - 24) / 16); c++) {
        const cx = x + 18 + c * 16;
        const cy = GY - b.h + 32 + r * 20;
        if (cy > GY - 20) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.8, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    if (b.awning) drawAwning(x - 4, GY - b.h + 12, b.w + 8, night);
  }
}

function drawAwning(x, y, width, night) {
  const stripe = 13;
  for (let i = 0; i < Math.ceil(width / stripe); i++) {
    ctx.fillStyle = i % 2 ? '#FFFFFF' : mix(COLORS.red, '#5C1226', night);
    const sx = x + i * stripe;
    const ex = Math.min(sx + stripe, x + width);
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(ex, y);
    ctx.lineTo(ex - 2, y + 16);
    ctx.lineTo(sx - 2, y + 16);
    ctx.closePath();
    ctx.fill();
  }
}

/** The HOT NOW sign. Glows steadily, blazes during a rush. */
export function drawHotLightSign() {
  const lit = player.rush > 0 || Math.sin(state.time * 1.3) > -0.25;
  const night = state.night;

  ctx.save();
  ctx.translate(112, 112);

  ctx.strokeStyle = mix(COLORS.greenDark, '#0A2A20', night);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.lineTo(0, 100);
  ctx.stroke();

  ctx.fillStyle = mix(COLORS.greenDark, '#0A2A20', night);
  roundRect(-62, -30, 124, 60, 9);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  roundRect(-57, -25, 114, 50, 6);
  ctx.fill();

  ctx.fillStyle = lit ? COLORS.red : '#E9D3D8';
  if (lit) {
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = player.rush > 0 ? 34 : 16;
  }
  ctx.beginPath();
  ctx.arc(-36, -2, 11, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'left';
  ctx.font = '700 18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = lit ? COLORS.red : '#E9D3D8';
  ctx.fillText('HOT', -19, 1);
  ctx.font = '700 13px "Trebuchet MS", sans-serif';
  ctx.fillStyle = lit ? COLORS.green : '#CFE0D6';
  ctx.fillText('NOW', -19, 17);
  ctx.restore();
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
