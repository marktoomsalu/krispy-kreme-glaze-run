import { CFG, COLORS, FLAVOURS } from '../config.js';
import { state, score } from '../state.js';
import { ctx, W, GY, roundRect, groundShadow } from '../renderer.js';
import { rnd, pick, TAU } from '../util.js';
import { drawDoughnut } from '../doughnut.js';

const O = CFG.obstacles;

export function updateObstacles(dt) {
  state.nextObstacle -= state.speed * dt;
  if (state.nextObstacle <= 0) {
    spawn();
    state.nextObstacle = rnd(O.minGap, O.maxGap) + state.speed * O.gapPerSpeed;
  }

  for (const o of state.obstacles) {
    o.x -= state.speed * dt;
    if (o.type === 'box') {
      o.wing += dt * 16;
      o.top = GY - O.boxHeight + Math.sin(state.time * 3 + o.x * 0.01) * 7;
    }
  }
  state.obstacles = state.obstacles.filter((o) => !o.dead && o.x > -200);
}

function spawn() {
  const r = Math.random();
  const s = score();

  if (r < 0.28) {
    state.obstacles.push({ type: 'cup', x: W + 40, w: 36, h: Math.random() < 0.5 ? 52 : 66 });
  } else if (r < 0.58) {
    const n = 1 + ((Math.random() * (s > 500 ? 3 : 2)) | 0);
    state.obstacles.push({
      type: 'stack',
      x: W + 40,
      n,
      w: 46,
      h: n * 22 + 8,
      flavour: pick(FLAVOURS)
    });
  } else if (r < 0.78 || s < O.boxAfterScore) {
    state.obstacles.push({ type: 'puddle', x: W + 40, w: rnd(74, 118), h: 20 });
  } else {
    state.obstacles.push({ type: 'box', x: W + 40, w: 66, h: 40, top: GY - O.boxHeight, wing: 0 });
  }

  // sometimes send a twin right behind it
  if (Math.random() < O.twinChance && s > O.twinAfterScore) {
    const last = state.obstacles[state.obstacles.length - 1];
    if (last.type !== 'box') {
      state.obstacles.push({ ...last, x: last.x + last.w + rnd(78, 106) });
    }
  }
}

export function obstacleBox(o) {
  if (o.type === 'puddle') return { x: o.x + 6, y: GY - 12, w: o.w - 12, h: 12 };
  if (o.type === 'box') return { x: o.x + 8, y: o.top + 6, w: o.w - 16, h: o.h - 10 };
  return { x: o.x + 6, y: GY - o.h, w: o.w - 12, h: o.h - 4 };
}

export function obstacleCentre(o) {
  return o.type === 'box'
    ? { x: o.x + o.w / 2, y: o.top + 20 }
    : { x: o.x + o.w / 2, y: GY - o.h / 2 };
}

export function drawObstacles() {
  for (const o of state.obstacles) {
    groundShadow(o.x + o.w / 2, o.w * 0.5);
    if (o.type === 'cup') drawCup(o);
    else if (o.type === 'stack') drawStack(o);
    else if (o.type === 'puddle') drawPuddle(o);
    else drawFlyingBox(o);
  }
}

function drawCup(o) {
  const { x, w, h } = o;
  const y = GY - h;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 8);
  ctx.lineTo(x + w - 4, y + 8);
  ctx.lineTo(x + w - 9, GY);
  ctx.lineTo(x + 9, GY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.green;
  ctx.beginPath();
  ctx.moveTo(x + 5.5, y + h * 0.36);
  ctx.lineTo(x + w - 5.5, y + h * 0.36);
  ctx.lineTo(x + w - 7.5, y + h * 0.74);
  ctx.lineTo(x + 7.5, y + h * 0.74);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.red;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.55, 5, 0, TAU);
  ctx.fill();

  ctx.fillStyle = COLORS.greenDark;
  roundRect(x, y, w, 11, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,.65)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const ox = x + w / 2 + (i ? 9 : -9);
    const phase = state.time * 3 + i;
    ctx.beginPath();
    ctx.moveTo(ox + Math.sin(phase) * 3, y - 6);
    ctx.quadraticCurveTo(ox + Math.sin(phase + 1) * 8, y - 15, ox + Math.sin(phase + 2) * 3, y - 24);
    ctx.stroke();
  }
}

function drawStack(o) {
  for (let i = 0; i < o.n; i++) {
    drawDoughnut(o.x + o.w / 2 + (i % 2 ? 3 : -3), GY - 15 - i * 22, 22, 0, {
      glaze: o.flavour.glaze,
      dough: o.flavour.dough,
      drizzle: o.flavour.drizzle
    });
  }
}

function drawPuddle(o) {
  ctx.fillStyle = COLORS.glaze;
  ctx.beginPath();
  ctx.ellipse(o.x + o.w / 2, GY - 3, o.w / 2, 11, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(o.x + o.w * 0.32, GY - 10, o.w * 0.2, 8, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(200,150,80,.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(o.x + o.w / 2, GY - 3, o.w / 2, 11, 0, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(o.x + o.w * 0.36, GY - 11, o.w * 0.1, 3, -0.3, 0, TAU);
  ctx.fill();
}

function drawFlyingBox(o) {
  const { x, w, h, top: y } = o;
  const flap = Math.sin(o.wing) * 10;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(x - 8, y + 14, 17, 8, -0.5 + flap * 0.04, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w + 8, y + 14, 17, 8, 0.5 - flap * 0.04, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,96,58,.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = COLORS.greenDark;
  ctx.lineWidth = 2.5;
  roundRect(x, y, w, h, 5);
  ctx.stroke();

  ctx.fillStyle = COLORS.green;
  roundRect(x + 1.5, y + 1.5, w - 3, 14, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.red;
  ctx.fillRect(x + 2, y + h - 13, w - 4, 5);

  // a dozen inside, in two rows
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const cx = x + 14 + i * 13;
      const cy = y + 24 + row * 8;
      ctx.fillStyle = COLORS.dough;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.6, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.7, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
