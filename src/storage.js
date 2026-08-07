const KEY = 'glaze-runner:best';

export function loadBest() {
  try {
    return parseInt(localStorage.getItem(KEY), 10) || 0;
  } catch (err) {
    return 0;
  }
}

export function saveBest(value) {
  try {
    localStorage.setItem(KEY, String(value));
  } catch (err) {
    /* private browsing, file:// — not worth interrupting the game over */
  }
}
