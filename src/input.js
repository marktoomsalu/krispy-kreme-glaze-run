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

  // Top half of the canvas jumps, bottom half ducks (both instant + held-
  // continuous, matching the keyboard exactly, see .zone-hint in index.html
  // for the on-screen label) — a timing-based tap-vs-hold split doesn't
  // work here since holding jump already means something (variable jump
  // height, and "hold to climb" mid-flight), so a delayed duck-on-hold
  // would fire a jump first, then yank it down.
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    if (relY > 0.5) {
      keys.duck = true;
    } else {
      keys.jump = true;
      onPress();
    }
  });
  addEventListener('pointerup', () => {
    keys.jump = false;
    keys.duck = false;
  });

  addEventListener('blur', onBlur);
}

function isTypingTarget(el) {
  return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA';
}
