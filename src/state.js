import { CFG } from './config.js';

/** Everything mutable about the current run. */
export const state = {
  mode: 'ready',     // ready | playing | paused | over
  time: 0,           // seconds since load, used for animation phases
  distance: 0,       // pixels travelled
  bonus: 0,          // points from holes and smashes
  speed: CFG.speed.base,
  night: 0,          // 0 = midday, 1 = midnight
  shake: 0,
  flash: 0,
  deathTimer: 0,     // brief lockout so you can't insta-restart
  dozens: 0,
  best: 0,
  nextObstacle: 560,
  nextHoles: 620,
  obstacles: [],
  holes: [],
  particles: []
};

export const player = {
  x: CFG.player.x,
  y: CFG.groundY,
  vy: 0,
  jumps: 0,
  ducking: false,
  roll: 0,       // rotation of the doughnut
  squash: 1,     // 1 = round, <1 = stretched, >1 = squashed
  rush: 0,       // seconds of hot light left
  meter: 0       // holes collected toward the next dozen
};

export const score = () =>
  Math.floor(state.distance / CFG.scoring.pixelsPerMetre) + state.bonus;

export function resetRun() {
  state.mode = 'playing';
  state.distance = 0;
  state.bonus = 0;
  state.speed = CFG.speed.base;
  state.night = 0;
  state.shake = 0;
  state.flash = 0;
  state.deathTimer = 0;
  state.dozens = 0;
  state.nextObstacle = 560;
  state.nextHoles = 620;
  state.obstacles.length = 0;
  state.holes.length = 0;
  state.particles.length = 0;

  player.y = CFG.groundY;
  player.vy = 0;
  player.jumps = 0;
  player.ducking = false;
  player.roll = 0;
  player.squash = 1;
  player.rush = 0;
  player.meter = 0;
}
