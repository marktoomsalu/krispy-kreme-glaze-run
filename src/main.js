import { setupCanvas } from './renderer.js';
import { initInput } from './input.js';
import { initUI } from './ui.js';
import { toggleMute } from './audio.js';
import { loadBest } from './storage.js';
import { state } from './state.js';
import { press, togglePause, pauseIfPlaying, update, draw } from './game.js';

setupCanvas();
state.best = loadBest();

initInput({
  onPress: press,
  onPause: togglePause,
  onBlur: pauseIfPlaying
});

initUI();

const muteButton = document.getElementById('mute');
muteButton.addEventListener('click', () => {
  const muted = toggleMute();
  muteButton.textContent = `Heli: ${muted ? 'väljas' : 'sees'}`;
  muteButton.blur();
});

let last = performance.now();

function frame(now) {
  // clamp to a sane range so tab switches (or a clock jump) can't teleport you
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
