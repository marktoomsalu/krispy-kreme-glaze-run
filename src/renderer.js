import { CFG } from './config.js';
import { TAU } from './util.js';

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');

export const W = CFG.width;
export const H = CFG.height;
export const GY = CFG.groundY;

/** Scales the canvas for retina screens so nothing looks fuzzy. */
export function setupCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The soft shadow every prop casts on the belt. */
export function groundShadow(x, radiusX, radiusY = 5, alpha = 0.16) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, GY + 3, radiusX, radiusY, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
