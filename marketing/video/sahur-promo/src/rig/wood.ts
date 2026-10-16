// Procedural wood textures on CanvasTexture. Built once per seed and cached at module level
// (a THREE.Texture can be shared by several WebGL renderers, so every ThreeCanvas reuses these).
import * as THREE from 'three';
import { PAL } from '../lib/palette';
import { prng, fbm1, rgba } from './util';

type WoodSet = { map: THREE.CanvasTexture; bump: THREE.CanvasTexture };
const cache = new Map<string, any>();

const mkCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
const toTex = (c: HTMLCanvasElement, srgb: boolean, repeatS = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = repeatS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

/**
 * Side grain for a log or limb. u wraps around (seam at u=0, which the lathe puts at the back),
 * v runs along the length. Draws colour and a matching bump (dark = groove).
 */
export function woodSide(opts: { seed?: number; w?: number; h?: number; lines?: number; knots?: number; faceSafe?: boolean; base?: string; endDark?: number } = {}): WoodSet {
  const { seed = 7, w = 1024, h = 1024, lines = 170, knots = 3, faceSafe = true, base = PAL.woodMid, endDark = 0.035 } = opts;
  const key = `side:${seed}:${w}:${h}:${lines}:${knots}:${faceSafe}:${base}:${endDark}`;
  if (cache.has(key)) return cache.get(key);
  const R = prng(seed);
  const cc = mkCanvas(w, h), bc = mkCanvas(w, h);
  const c = cc.getContext('2d')!, b = bc.getContext('2d')!;
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  b.fillStyle = '#8a8a8a'; b.fillRect(0, 0, w, h);

  // broad tonal streaks (soft)
  c.save(); c.filter = `blur(${Math.round(w / 90)}px)`;
  for (let i = 0; i < 46; i++) {
    const x0 = R() * w, bw = (0.01 + R() * 0.07) * w;
    const light = R() > 0.5;
    c.fillStyle = light ? rgba(PAL.woodLight, 0.12 + R() * 0.22) : rgba(PAL.woodDark, 0.08 + R() * 0.16);
    for (const dx of [-w, 0, w]) {
      c.beginPath();
      const ph = R() * 10;
      for (let y = -40; y <= h + 40; y += 24) c.lineTo(x0 + dx + fbm1(y / 260 + ph, seed + i) * 26, y);
      for (let y = h + 40; y >= -40; y -= 24) c.lineTo(x0 + dx + bw + fbm1(y / 260 + ph + 3, seed + i) * 26, y);
      c.closePath(); c.fill();
    }
  }
  c.restore();

  // knots (avoid the face zone: u 0.3..0.7, upper part)
  const knotList: { x: number; y: number; rx: number; ry: number }[] = [];
  for (let k = 0; k < knots; k++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 40; tries++) {
      x = R() * w; y = (0.12 + R() * 0.8) * h;
      const inFace = faceSafe && x > 0.28 * w && x < 0.72 * w && y < 0.55 * h;
      if (!inFace) break;
    }
    knotList.push({ x, y, rx: (0.008 + R() * 0.008) * w, ry: (0.018 + R() * 0.016) * h });
  }
  const deflect = (x: number, y: number) => {
    let dx = 0;
    for (const k of knotList) {
      const ny = (y - k.y) / (k.ry * 3.2);
      const nx = (x - k.x) / (k.rx * 5);
      const g = Math.exp(-(ny * ny) - nx * nx * 0.5);
      dx += Math.sign(x - k.x || 1) * g * k.rx * 2.6;
    }
    return dx;
  };

  // grain lines
  for (let i = 0; i < lines; i++) {
    const x0 = R() * w;
    const amp = 2 + R() * 7, fr = 0.002 + R() * 0.006, ph = R() * 6.28;
    const dark = R() < 0.72;
    const width = (0.5 + R() * R() * 2.6) * (w / 1024);
    const alpha = dark ? 0.18 + R() * 0.5 : 0.12 + R() * 0.22;
    const col = dark ? (R() > 0.45 ? PAL.woodGrain : PAL.woodDark) : PAL.woodLight;
    // lines sometimes start/stop (cathedral grain feel)
    const y0 = R() < 0.25 ? R() * h * 0.6 : -20;
    const y1 = R() < 0.25 ? y0 + (0.3 + R() * 0.6) * h : h + 20;
    for (const dx of [-w, 0, w]) {
      if (x0 + dx < -60 || x0 + dx > w + 60) continue;
      const path = new Path2D();
      for (let y = y0; y <= y1; y += 6) {
        const xx = x0 + dx + amp * Math.sin(y * fr + ph) + fbm1(y / 90 + i, seed) * 3.2 + deflect(x0 + dx, y);
        if (y === y0) path.moveTo(xx, y); else path.lineTo(xx, y);
      }
      c.strokeStyle = rgba(col, alpha); c.lineWidth = width; c.stroke(path);
      if (dark) { b.strokeStyle = `rgba(20,20,20,${Math.min(1, alpha * 1.3)})`; b.lineWidth = width * 1.2; b.stroke(path); }
    }
  }

  // knot bodies with rings
  for (const k of knotList) {
    for (let r = 5; r >= 1; r--) {
      c.beginPath(); c.ellipse(k.x, k.y, k.rx * (0.5 + r * 0.45), k.ry * (0.5 + r * 0.45), 0, 0, Math.PI * 2);
      c.strokeStyle = rgba(PAL.woodDark, 0.25 + 0.08 * (5 - r)); c.lineWidth = 1.6 * (w / 1024); c.stroke();
    }
    const g = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.ry * 0.9);
    g.addColorStop(0, rgba('#3a1e0a', 0.95)); g.addColorStop(0.6, rgba(PAL.woodDark, 0.7)); g.addColorStop(1, rgba(PAL.woodDark, 0));
    c.fillStyle = g; c.beginPath(); c.ellipse(k.x, k.y, k.rx * 1.2, k.ry * 0.9, 0, 0, Math.PI * 2); c.fill();
    const gb = b.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.ry);
    gb.addColorStop(0, 'rgba(10,10,10,0.9)'); gb.addColorStop(1, 'rgba(10,10,10,0)');
    b.fillStyle = gb; b.beginPath(); b.ellipse(k.x, k.y, k.rx * 1.4, k.ry, 0, 0, Math.PI * 2); b.fill();
  }

  // pores: short dark dashes
  for (let i = 0; i < 5200 * (w * h) / (1024 * 1024); i++) {
    const x = R() * w, y = R() * h, l = 2 + R() * 9;
    c.fillStyle = rgba(PAL.woodDark, 0.08 + R() * 0.16); c.fillRect(x, y, 1, l);
    if (R() < 0.4) { b.fillStyle = 'rgba(30,30,30,0.35)'; b.fillRect(x, y, 1, l); }
  }

  // seasoning checks (a couple of thin cracks near the ends)
  for (let i = 0; i < 3; i++) {
    const top = i < 2;
    const x = (i === 0 ? 0.12 : i === 1 ? 0.83 : 0.2 + R() * 0.15) * w;
    const yA = top ? 0 : h * (0.75 + R() * 0.1), len = (0.06 + R() * 0.1) * h;
    const p = new Path2D(); p.moveTo(x, yA);
    for (let s = 1; s <= 10; s++) p.lineTo(x + (R() - 0.5) * 3, yA + (len * s) / 10);
    c.strokeStyle = rgba('#2a1406', 0.75); c.lineWidth = 1.6 * (w / 1024); c.stroke(p);
    b.strokeStyle = 'rgba(0,0,0,1)'; b.lineWidth = 2.4 * (w / 1024); b.stroke(p);
  }

  // darker rim at both ends (the bevel region)
  const eg = c.createLinearGradient(0, 0, 0, h);
  eg.addColorStop(0, rgba('#4a2710', 0.75)); eg.addColorStop(endDark, rgba('#4a2710', 0.0));
  eg.addColorStop(1 - endDark, rgba('#4a2710', 0.0)); eg.addColorStop(1, rgba('#4a2710', 0.7));
  c.fillStyle = eg; c.fillRect(0, 0, w, h);

  const res = { map: toTex(cc, true), bump: toTex(bc, false) };
  cache.set(key, res);
  return res;
}

/** End grain: growth rings for the top cap. Planar UV (circle geometry). */
export function woodRings(seed = 11, size = 512): WoodSet {
  const key = `rings:${seed}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const R = prng(seed);
  const cc = mkCanvas(size, size), bc = mkCanvas(size, size);
  const c = cc.getContext('2d')!, b = bc.getContext('2d')!;
  const cx = size / 2 + (R() - 0.5) * size * 0.08, cy = size / 2 + (R() - 0.5) * size * 0.08;
  const rad = size / 2;
  const g = c.createRadialGradient(cx, cy, 0, size / 2, size / 2, rad);
  g.addColorStop(0, '#e6a862'); g.addColorStop(0.55, PAL.woodLight); g.addColorStop(0.86, '#c47d3e'); g.addColorStop(1, PAL.woodMid);
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  b.fillStyle = '#8a8a8a'; b.fillRect(0, 0, size, size);
  let r = 3;
  let i = 0;
  while (r < rad * 1.05) {
    const p = new Path2D();
    const wob = 0.02 + R() * 0.03, ph = R() * 10;
    for (let a = 0; a <= 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const rr = r * (1 + wob * fbm1(ang * 1.7 + ph, seed + i, 2));
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      if (a === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    p.closePath();
    const late = R() < 0.55;
    c.strokeStyle = rgba(late ? PAL.woodGrain : PAL.woodDark, late ? 0.35 + R() * 0.25 : 0.2 + R() * 0.2);
    c.lineWidth = (late ? 1.2 + R() * 2.2 : 0.8) * (size / 512); c.stroke(p);
    b.strokeStyle = 'rgba(30,30,30,0.7)'; b.lineWidth = 1.2 * (size / 512); b.stroke(p);
    r += (4 + R() * 7) * (size / 512) * (1 - (r / rad) * 0.35);
    i++;
  }
  // pith
  c.fillStyle = rgba('#5a2f12', 0.9); c.beginPath(); c.arc(cx, cy, 3 * (size / 512), 0, Math.PI * 2); c.fill();
  // radial checks
  for (let k = 0; k < 3; k++) {
    const ang = R() * Math.PI * 2, len = (0.25 + R() * 0.55) * rad, r0 = (0.1 + R() * 0.4) * rad;
    const p = new Path2D();
    for (let s = 0; s <= 12; s++) {
      const rr = r0 + (len * s) / 12;
      const a2 = ang + (R() - 0.5) * 0.03;
      const x = cx + Math.cos(a2) * rr, y = cy + Math.sin(a2) * rr;
      if (s === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    c.strokeStyle = rgba('#2a1406', 0.8); c.lineWidth = 1.8 * (size / 512); c.stroke(p);
    b.strokeStyle = 'rgba(0,0,0,1)'; b.lineWidth = 3 * (size / 512); b.stroke(p);
  }
  // dark rim
  const rg = c.createRadialGradient(size / 2, size / 2, rad * 0.84, size / 2, size / 2, rad);
  rg.addColorStop(0, rgba('#4a2710', 0)); rg.addColorStop(1, rgba('#4a2710', 0.85));
  c.fillStyle = rg; c.fillRect(0, 0, size, size);
  const res = { map: toTex(cc, true, false), bump: toTex(bc, false, false) };
  cache.set(key, res);
  return res;
}

/** Bat: light ash with fine straight grain. */
export function batWood(seed = 23): WoodSet {
  const key = `bat:${seed}`;
  if (cache.has(key)) return cache.get(key);
  const res = woodSide({ seed, w: 512, h: 1024, lines: 120, knots: 0, faceSafe: false, base: '#d9a466', endDark: 0.01 });
  cache.set(key, res);
  return res;
}

/** Grip wrap: dark leather with diagonal tape seams. */
export function gripTexture(): THREE.CanvasTexture {
  const key = 'grip';
  if (cache.has(key)) return cache.get(key);
  const w = 256, h = 512;
  const cc = mkCanvas(w, h); const c = cc.getContext('2d')!;
  c.fillStyle = '#3b2213'; c.fillRect(0, 0, w, h);
  for (let y = -w; y < h + w; y += 26) {
    c.strokeStyle = 'rgba(15,6,2,0.85)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + w * 0.45); c.stroke();
    c.strokeStyle = 'rgba(120,70,40,0.35)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, y + 5); c.lineTo(w, y + 5 + w * 0.45); c.stroke();
  }
  const t = toTex(cc, true);
  cache.set(key, t);
  return t;
}
