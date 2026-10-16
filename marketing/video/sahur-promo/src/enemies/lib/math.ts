// Pure, deterministic helpers. Everything animated in src/enemies and src/fx is a function of
// (frame | t, props) only: no clocks, no Math.random at render time.

export const TAU = Math.PI * 2;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
/** smoothstep(a, b, x) */
export const smooth = (a: number, b: number, x: number) => {
  const t = invLerp(a, b, x);
  return t * t * (3 - 2 * t);
};
export const fract = (x: number) => x - Math.floor(x);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp(t), 3);
export const easeInOutCubic = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const easeOutBack = (t: number, s = 1.70158) => {
  t = clamp(t) - 1;
  return t * t * ((s + 1) * t + s) + 1;
};
/** 0 -> 1 -> 0 bump over [a, b] */
export const bump = (a: number, b: number, x: number) => {
  const t = invLerp(a, b, x);
  return Math.sin(t * Math.PI);
};

/** Seeded PRNG (mulberry32). Call once per seed in useMemo, never per frame with a changing seed unless intended. */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stateless hash: same inputs -> same value in [0,1). */
export const hash = (n: number, seed = 0) => fract(Math.sin(n * 127.1 + seed * 311.7) * 43758.5453123);

/** Smooth 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
};

/** Deterministic per-frame jitter (for shakes). Integer frame -> stable value. */
export const jitter = (frame: number, seed: number) => hash(Math.floor(frame), seed) * 2 - 1;

/** Random unit vector from a PRNG. */
export const randDir = (rnd: () => number): [number, number, number] => {
  const u = rnd() * 2 - 1;
  const th = rnd() * TAU;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(th), u, s * Math.sin(th)];
};

/** Distance travelled under linear drag k with initial speed v after time t. */
export const dragDist = (v: number, k: number, t: number) => (k <= 0 ? v * t : (v * (1 - Math.exp(-k * t))) / k);
