/** Tiny WebAudio beeps. No files to load. */
let audio = null;
let muted = false;

export const isMuted = () => muted;

export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone(freq, duration, { type = 'square', volume = 0.05, slide = 0 } = {}) {
  if (muted) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, freq + slide),
        audio.currentTime + duration
      );
    }
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch (err) {
    /* audio blocked until first gesture — fine, the next one will play */
  }
}

export const sfx = {
  start: () => tone(440, 0.09, { type: 'triangle', slide: 260 }),
  jump: () => tone(520, 0.1, { slide: 220, volume: 0.045 }),
  doubleJump: () => tone(660, 0.1, { slide: 220, volume: 0.045 }),
  collect: (step = 0) => tone(760 + step * 26, 0.07, { type: 'triangle', volume: 0.04 }),
  smash: () => tone(880, 0.09, { slide: -300 }),
  hotLightOn: () =>
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone(f, 0.12, { type: 'triangle' }), i * 70)
    ),
  hotLightOff: () => tone(300, 0.18, { type: 'sine', slide: -140 }),
  splat: () => tone(180, 0.3, { type: 'sawtooth', volume: 0.06, slide: -110 })
};
