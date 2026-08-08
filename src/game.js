import { CFG, COLORS } from './config.js';
import { state, player, score, resetRun } from './state.js';
import { ctx, W, H } from './renderer.js';
import { clamp, rnd, overlaps } from './util.js';
import { saveBest } from './storage.js';
import { sfx } from './audio.js';
import { startRun, submitScore, getNickname } from './leaderboard.js';

import { jump, updatePlayer, drawPlayer, playerBox } from './entities/player.js';
import {
  updateObstacles,
  drawObstacles,
  obstacleBox,
  obstacleCentre
} from './entities/obstacles.js';
import { updateHoles, drawHoles } from './entities/collectibles.js';
import { burst, updateParticles, fadeParticles, drawParticles } from './entities/particles.js';
import {
  updateScenery,
  drawSky,
  drawSkyline,
  drawConveyor,
  drawGlazeCurtain
} from './scenery.js';
import { drawHUD } from './hud.js';

/* ---------------------------------------------------------------- input */

export function press() {
  if (state.mode === 'ready' || state.mode === 'over') {
    if (state.mode === 'over' && state.deathTimer > 0) return; // brief lockout
    resetRun();
    sfx.start();

    const seq = state.runSeq;
    startRun().then((r) => {
      if (!r || state.runSeq !== seq) return; // run already ended/restarted — drop it
      state.runId = r.runId;
      state.runToken = r.token;
    });
    return;
  }
  if (state.mode === 'paused') {
    state.mode = 'playing';
    return;
  }
  jump();
}

export function togglePause() {
  if (state.mode === 'playing') state.mode = 'paused';
  else if (state.mode === 'paused') state.mode = 'playing';
}

export function pauseIfPlaying() {
  if (state.mode === 'playing') state.mode = 'paused';
}

/* --------------------------------------------------------------- update */

export function update(dt) {
  state.time += dt;
  updateScenery(dt, state.mode === 'playing');

  if (state.mode !== 'playing') {
    if (state.deathTimer > 0) state.deathTimer -= dt;
    fadeParticles(dt);
    return;
  }

  state.speed = CFG.speed.base + Math.min(CFG.speed.maxGain, state.distance * CFG.speed.gainPerPixel);
  state.distance += state.speed * dt;
  state.night = (Math.sin(state.distance / CFG.dayNight.cycleLength - Math.PI / 2) + 1) / 2;

  updatePlayer(dt);
  updateObstacles(dt);
  updateHoles(dt);
  checkCollisions();
  updateParticles(dt, state.speed * 0.35);

  if (state.shake > 0) state.shake -= dt * 26;
  if (state.flash > 0) state.flash -= dt;
}

function checkCollisions() {
  const box = playerBox();

  for (const o of state.obstacles) {
    if (!overlaps(box, obstacleBox(o))) continue;
    if (player.rush > 0) smash(o);
    else return gameOver();
  }

  for (const h of state.holes) {
    if (Math.hypot(h.x - player.x, h.y - (player.y - 26)) > 40) continue;
    collect(h);
  }
}

function smash(o) {
  o.dead = true;
  state.bonus += CFG.rush.smashValue;
  state.smashes++;
  state.flash = 0.18;
  const c = obstacleCentre(o);
  burst(c.x, c.y, 14, [COLORS.glaze, '#FFE9B0', COLORS.red, COLORS.green], 1.4);
  sfx.smash();
}

function collect(h) {
  h.dead = true;
  state.bonus += CFG.holes.value;
  state.holesCollected++;
  burst(h.x, h.y, 5, [COLORS.glaze, COLORS.dough, '#FFE9B0'], 0.7);
  sfx.collect(player.meter);

  if (player.rush > 0) return; // the box is already full while the light is on
  player.meter++;
  if (player.meter >= CFG.holes.perDozen) turnOnHotLight();
}

function turnOnHotLight() {
  player.meter = 0;
  state.dozens++;
  player.rush = CFG.rush.duration;
  player.vy = -320;
  state.flash = 0.34;
  sfx.hotLightOn();
}

function gameOver() {
  state.mode = 'over';
  state.deathTimer = 0.55;
  state.shake = 12;
  burst(player.x, player.y - 26, 22, [COLORS.dough, COLORS.glaze, '#FFE9B0', COLORS.doughDark], 1.6);
  sfx.splat();

  if (score() > state.best) {
    state.best = score();
    saveBest(state.best);
  }

  submitCurrentRun();
}

async function submitCurrentRun() {
  if (state.submitted) return;
  if (!state.runId || !state.runToken) {
    state.lastResult = { status: 'no-token' };
    return;
  }
  state.submitted = true;
  state.lastResult = { status: 'pending' };

  const seq = state.runSeq;
  const result = await submitScore({
    runId: state.runId,
    token: state.runToken,
    distance: state.distance,
    bonus: state.bonus,
    dozens: state.dozens,
    holes: state.holesCollected,
    smashes: state.smashes,
    nickname: getNickname()
  });
  if (state.runSeq !== seq) return; // player already started a new run
  state.lastResult = result;
}

/* ----------------------------------------------------------------- draw */

export function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(rnd(-state.shake, state.shake) * 0.4, rnd(-state.shake, state.shake) * 0.4);
  }

  drawSky();
  drawSkyline();
  drawConveyor();
  drawGlazeCurtain();

  drawHoles();
  drawObstacles();
  if (state.mode !== 'over' || state.deathTimer > 0.2) drawPlayer();
  drawParticles();

  if (player.rush > 0) {
    ctx.fillStyle = `rgba(210,16,63,${0.06 + 0.04 * Math.sin(state.time * 10)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(state.flash, 0, 1) * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawHUD();
  ctx.restore();
}
