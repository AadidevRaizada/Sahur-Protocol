// Deterministic math helpers shared by the rig, the POV kit and the sets.
// Everything here is pure: no Math.random, no clocks.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
export const smoother = (t: number) => { const x = clamp(t); return x * x * x * (x * (x * 6 - 15) + 10); };
export const easeIn = (t: number) => { const x = clamp(t); return x * x * x; };
export const easeOut = (t: number) => { const x = clamp(t); return 1 - Math.pow(1 - x, 3); };
export const easeInOut = (t: number) => { const x = clamp(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/** remap frame range to 0..1 with smoothstep */
export const ramp = (f: number, a: number, b: number, ease: (t: number) => number = smooth) => ease(invLerp(a, b, f));
export const lerp3 = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as [number, number, number];

/** mulberry32 seeded PRNG */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** integer hash -> [0,1) */
export function hash1(n: number, seed = 0) {
  let h = Math.imul((n | 0) ^ Math.imul(seed | 0, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** smooth 1D value noise in [-1,1] */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x); const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i, seed) * 2 - 1, hash1(i + 1, seed) * 2 - 1, u);
}
/** fractal 1D noise in about [-1,1] */
export function fbm1(x: number, seed = 0, oct = 3) {
  let s = 0, a = 0.5, fr = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += a * noise1(x * fr, seed + o * 101); n += a; a *= 0.5; fr *= 2.03; }
  return s / n;
}
/** 2D value noise in [-1,1] */
export function noise2(x: number, y: number, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y); const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash1(a * 374761 + b * 668265, seed) * 2 - 1;
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
}

export const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mixHex = (a: string, b: string, t: number) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], t)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};
export const rgba = (hex: string, a: number) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

/** keyframe interpolation over [{t, v}] with smoothstep between keys */
export function keys(t: number, k: { t: number; v: number }[], ease: (x: number) => number = smooth) {
  if (t <= k[0].t) return k[0].v;
  for (let i = 0; i < k.length - 1; i++) {
    if (t <= k[i + 1].t) return lerp(k[i].v, k[i + 1].v, ease((t - k[i].t) / (k[i + 1].t - k[i].t)));
  }
  return k[k.length - 1].v;
}
