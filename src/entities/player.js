import { CFG, COLORS } from '../config.js';
import { state, player } from '../state.js';
import { keys } from '../input.js';
import { ctx, GY, roundRect, groundShadow } from '../renderer.js';
import { clamp, mix, TAU } from '../util.js';
import { drawDoughnut } from '../doughnut.js';
import { burst, trail } from './particles.js';
import { sfx } from '../audio.js';

const P = CFG.player;

export function jump() {
  if (player.rush > 0) return; // during hot light you fly instead
  if (player.jumps >= P.maxJumps) return;
  player.vy = player.jumps === 0 ? P.jumpVelocity : P.doubleJumpVelocity;
  player.jumps++;
  player.ducking = false;
  player.squash = 0.78;
  (player.jumps === 1 ? sfx.jump : sfx.doubleJump)();
}

export function updatePlayer(dt) {
  if (player.rush > 0) {
    flightStep(dt);
  } else {
    groundStep(dt);
  }
  player.squash += (1 - player.squash) * Math.min(1, dt * 11);
  player.roll += (state.speed / 27) * dt;
}

function flightStep(dt) {
  const R = CFG.rush;
  player.rush -= dt;
  player.vy += (keys.jump ? R.lift : R.sink) * dt;
  player.vy = clamp(player.vy, -R.maxSpeed, R.maxSpeed);
  player.y = clamp(player.y + player.vy * dt, R.ceiling, GY);
  if (player.y >= GY) player.vy = Math.min(player.vy, 0);
  player.ducking = false;

  if (Math.random() < 0.55) {
    trail(player.x - 14, player.y - 28 + (Math.random() * 28 - 14), [
      COLORS.glaze,
      '#FFE9B0',
      COLORS.red
    ]);
  }
  if (player.rush <= 0) sfx.hotLightOff();
}

function groundStep(dt) {
  const gravity = player.vy < 0 && !keys.jump ? P.releaseGravity : P.gravity;
  player.vy += gravity * dt;
  if (keys.duck && player.y < GY) player.vy += P.fastFall * dt;

  player.y += player.vy * dt;

  if (player.y >= GY) {
    if (player.vy > 260) {
      burst(player.x - 6, GY, 5, [COLORS.glaze, '#FFE9C9'], 0.5);
      player.squash = 1.24;
    }
    player.y = GY;
    player.vy = 0;
    player.jumps = 0;
  }
  player.ducking = keys.duck && player.y >= GY;
}

export function playerBox() {
  return player.ducking
    ? { x: player.x - 30, y: player.y - 30, w: 58, h: 26 }
    : { x: player.x - 22, y: player.y - 52, w: 44, h: 48 };
}

export function drawPlayer() {
  const R = P.radius;
  const lift = clamp(1 - (GY - player.y) / 260, 0.3, 1);
  groundShadow(player.x, 26 * lift, 6 * lift, 0.18);

  ctx.save();
  ctx.translate(player.x, player.y - (player.ducking ? 17 : 28));

  if (player.rush > 0) {
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 28;
    ctx.rotate(clamp(player.vy / 1400, -0.35, 0.35));
  }
  if (player.ducking) ctx.scale(1.3, 0.62);
  else ctx.scale(1 / player.squash, player.squash);

  drawDoughnut(0, 0, R, player.roll, {
    glaze:
      player.rush > 0
        ? mix(COLORS.glaze, '#FFD36B', (Math.sin(state.time * 14) + 1) / 2)
        : COLORS.glaze,
    dough: COLORS.dough
  });
  ctx.shadowBlur = 0;

  drawFace(R);
  drawCrewHat(R);
  ctx.restore();
}

function drawFace(R) {
  const ex = R * 0.46;
  const ey = -R * 0.42;
  const er = R * 0.19;
  const look = clamp(player.vy / 900, -0.5, 0.5);

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-ex, ey, er, 0, TAU);
  ctx.arc(ex, ey, er, 0, TAU);
  ctx.fill();

  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(-ex + er * 0.3, ey + er * 0.3 + look * er, er * 0.52, 0, TAU);
  ctx.arc(ex + er * 0.3, ey + er * 0.3 + look * er, er * 0.52, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = R * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, R * 0.5, R * 0.26, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawCrewHat(R) {
  ctx.save();
  ctx.translate(0, -R * 0.92);
  ctx.rotate(-0.12);

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-R * 0.72, 0);
  ctx.quadraticCurveTo(-R * 0.6, -R * 0.62, 0, -R * 0.5);
  ctx.quadraticCurveTo(R * 0.6, -R * 0.62, R * 0.72, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.green;
  roundRect(-R * 0.78, -R * 0.06, R * 1.56, R * 0.24, R * 0.1);
  ctx.fill();

  ctx.fillStyle = COLORS.red;
  ctx.beginPath();
  ctx.arc(R * 0.34, R * 0.06, R * 0.08, 0, TAU);
  ctx.fill();
  ctx.restore();
}
