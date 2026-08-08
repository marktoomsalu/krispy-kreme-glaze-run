import { canvas } from './renderer.js';

export const keys = { jump: false, duck: false };

const JUMP_CODES = ['Space', 'ArrowUp', 'KeyW'];
const DUCK_CODES = ['ArrowDown', 'KeyS'];

/**
 * @param {object} handlers
 * @param {() => void} handlers.onPress  fired once per jump press
 * @param {() => void} handlers.onPause  fired on P
 * @param {() => void} handlers.onBlur   fired when the tab loses focus
 */
export function initInput({ onPress, onPause, onBlur }) {
  addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return; // don't hijack keys while typing a nickname

    if (JUMP_CODES.includes(e.code)) {
      e.preventDefault();
      if (!keys.jump) onPress();
      keys.jump = true;
    }
    if (DUCK_CODES.includes(e.code)) {
      e.preventDefault();
      keys.duck = true;
    }
    if (e.code === 'KeyP') onPause();
  });

  addEventListener('keyup', (e) => {
    if (isTypingTarget(e.target)) return;
    if (JUMP_CODES.includes(e.code)) keys.jump = false;
    if (DUCK_CODES.includes(e.code)) keys.duck = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    keys.jump = true;
    onPress();
  });
  addEventListener('pointerup', () => {
    keys.jump = false;
  });

  bindButton(document.getElementById('btn-jump'), 'jump', onPress);
  bindButton(document.getElementById('btn-duck'), 'duck');

  addEventListener('blur', onBlur);
}

function isTypingTarget(el) {
  return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA';
}

function bindButton(el, key, onPress) {
  if (!el) return;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    keys[key] = true;
    if (onPress) onPress();
  });
  el.addEventListener('pointerup', (e) => {
    e.preventDefault();
    keys[key] = false;
  });
  el.addEventListener('pointerleave', () => {
    keys[key] = false;
  });
}
