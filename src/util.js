export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

export const rnd = (min, max) => min + Math.random() * (max - min);

export const pick = (list) => list[(Math.random() * list.length) | 0];

/** Blend two hex colours. k = 0 gives a, k = 1 gives b. */
export function mix(a, b, k) {
  const parse = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
  const from = parse(a);
  const to = parse(b);
  const out = from.map((v, i) => Math.round(v + (to[i] - v) * k));
  return `rgb(${out.join(',')})`;
}

export const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
