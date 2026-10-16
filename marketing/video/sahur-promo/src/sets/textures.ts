// Procedural CanvasTextures for the sets. Cached at module level, deterministic (seeded).
import * as THREE from 'three';
import { prng, rgba, noise2 } from '../rig/util';

const cache = new Map<string, THREE.Texture>();
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c: HTMLCanvasElement, srgb = true, rep: [number, number] = [1, 1]) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8;
  return t;
};
const once = <T extends THREE.Texture>(k: string, f: () => T): T => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) as T; };

/** painted plaster: soft mottling + faint stains */
export const plasterTex = () => once('plaster', () => {
  const s = 512, c = mk(s, s), g = c.getContext('2d')!, R = prng(5);
  g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, s, s);
  const img = g.getImageData(0, 0, s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const n = noise2(x / 60, y / 60, 3) * 0.5 + noise2(x / 13, y / 13, 4) * 0.25 + (R() - 0.5) * 0.12;
    const i = (y * s + x) * 4;
    img.data[i] += n * 14; img.data[i + 1] += n * 14; img.data[i + 2] += n * 13;
  }
  g.putImageData(img, 0, 0);
  return tex(c, true, [2, 2]);
});

/** wooden floor planks (u across planks) */
export const planksTex = () => once('planks', () => {
  const w = 1024, h = 1024, c = mk(w, h), g = c.getContext('2d')!, R = prng(9);
  const pw = w / 8;
  for (let i = 0; i < 8; i++) {
    const base = ['#6e4a2e', '#7a5233', '#654229', '#73502f'][i % 4];
    g.fillStyle = base; g.fillRect(i * pw, 0, pw, h);
    for (let l = 0; l < 26; l++) {
      g.strokeStyle = rgba('#3d2614', 0.1 + R() * 0.25); g.lineWidth = 0.6 + R() * 1.6;
      const x0 = i * pw + R() * pw; g.beginPath();
      for (let y = 0; y <= h; y += 16) g.lineTo(x0 + Math.sin(y * 0.01 + l) * 3, y);
      g.stroke();
    }
    // plank end joints
    const j = R() * h; g.fillStyle = 'rgba(25,14,6,0.8)'; g.fillRect(i * pw, j, pw, 3);
    g.fillStyle = 'rgba(20,12,6,0.9)'; g.fillRect(i * pw, 0, 3, h);
  }
  return tex(c, true, [2, 2]);
});

/** duvet: soft muted check with a quilting seam */
export const duvetTex = () => once('duvet', () => {
  const s = 512, c = mk(s, s), g = c.getContext('2d')!;
  g.fillStyle = '#8b97b0'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(i * 64, 0, 28, s); g.fillRect(0, i * 64, s, 28);
    g.fillStyle = 'rgba(40,50,80,0.12)'; g.fillRect(i * 64 + 40, 0, 6, s); g.fillRect(0, i * 64 + 40, s, 6);
  }
  const img = g.getImageData(0, 0, s, s); const R = prng(3);
  for (let i = 0; i < img.data.length; i += 4) { const n = (R() - 0.5) * 16; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return tex(c, true, [3, 3]);
});

export const sheetTex = () => once('sheet', () => {
  const s = 256, c = mk(s, s), g = c.getContext('2d')!, R = prng(4);
  g.fillStyle = '#d8d4cb'; g.fillRect(0, 0, s, s);
  const img = g.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) { const n = (R() - 0.5) * 10; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return tex(c, true, [4, 4]);
});

export const rugTex = () => once('rug', () => {
  const s = 512, c = mk(s, s), g = c.getContext('2d')!;
  g.fillStyle = '#5a2e2a'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#c99a5b'; g.lineWidth = 10; g.strokeRect(30, 30, s - 60, s - 60);
  g.strokeStyle = '#2b3550'; g.lineWidth = 18; g.strokeRect(60, 60, s - 120, s - 120);
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#c99a5b' : '#2b3550'; g.beginPath(); g.moveTo(s / 2, 120 + i * 30); g.lineTo(s / 2 + 60 - i * 8, s / 2); g.lineTo(s / 2, s - 120 - i * 30); g.lineTo(s / 2 - 60 + i * 8, s / 2); g.closePath(); g.fill(); }
  const img = g.getImageData(0, 0, s, s); const R = prng(8);
  for (let i = 0; i < img.data.length; i += 4) { const n = (R() - 0.5) * 30; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return tex(c);
});

/** posters: graphic shapes only (no legible text) */
export const posterTex = (k: number) => once('poster' + k, () => {
  const w = 300, h = 420, c = mk(w, h), g = c.getContext('2d')!;
  if (k === 0) {
    // a game poster: a pixel log hero under a big sun
    g.fillStyle = '#1b1430'; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, 150, 10, w / 2, 150, 130); gr.addColorStop(0, '#ffb547'); gr.addColorStop(1, 'rgba(255,90,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff7a3d'; g.beginPath(); g.arc(w / 2, 150, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0d0a18'; g.fillRect(0, 260, w, 160);
    g.fillStyle = '#b0743a'; g.fillRect(130, 200, 40, 90); g.fillStyle = '#2a1608'; g.fillRect(138, 215, 8, 8); g.fillRect(154, 215, 8, 8);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(232,228,216,0.75)'; g.fillRect(40, 330 + i * 16, 220 - i * 40, 7); }
  } else if (k === 1) {
    // a band poster: stacked colour bars and a circle
    g.fillStyle = '#e8e4d8'; g.fillRect(0, 0, w, h);
    ['#35e8ff', '#ff3df0', '#3dff9d', '#ffb547'].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, 60 + i * 60, w, 34); });
    g.fillStyle = '#07090f'; g.beginPath(); g.arc(w / 2, 300, 60, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#07090f'; g.fillRect(40, 380, 220, 10);
  } else {
    // a map / mountain print
    g.fillStyle = '#20324a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8e2ee'; g.beginPath(); g.moveTo(0, 330); g.lineTo(90, 180); g.lineTo(150, 260); g.lineTo(220, 120); g.lineTo(w, 300); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(220, 80, 22, 0, Math.PI * 2); g.fill();
  }
  // paper edge + tape
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  g.fillStyle = 'rgba(235,230,200,0.75)'; g.fillRect(w / 2 - 30, -4, 60, 20);
  return tex(c);
});

/** THE POST: one identical feed card on every screen (magenta-pink image, avatar, heart, 3-block like counter) */
export function drawPost(g: CanvasRenderingContext2D, w: number, h: number, likes: number, flash: number) {
  g.fillStyle = '#d8cfe6'; g.fillRect(0, 0, w, h);
  // header: avatar + two bars
  g.fillStyle = '#ff3df0'; g.beginPath(); g.arc(w * 0.12, h * 0.08, h * 0.045, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c9c3d8'; g.fillRect(w * 0.22, h * 0.06, w * 0.4, h * 0.022); g.fillRect(w * 0.22, h * 0.095, w * 0.25, h * 0.016);
  // the image: magenta-pink gradient with a glossy blob
  const gr = g.createLinearGradient(0, h * 0.15, 0, h * 0.75);
  gr.addColorStop(0, '#ff3df0'); gr.addColorStop(1, '#ffb3f2');
  g.fillStyle = gr; g.fillRect(w * 0.05, h * 0.15, w * 0.9, h * 0.6);
  const bl = g.createRadialGradient(w * 0.42, h * 0.38, 2, w * 0.5, h * 0.45, w * 0.32);
  bl.addColorStop(0, '#ffffff'); bl.addColorStop(0.5, '#ffd6fb'); bl.addColorStop(1, 'rgba(143,123,255,0.9)');
  g.fillStyle = bl; g.beginPath(); g.arc(w * 0.5, h * 0.45, w * 0.26, 0, Math.PI * 2); g.fill();
  // heart + 3-block like counter
  g.fillStyle = '#ff3d5e'; g.beginPath(); const hx = w * 0.12, hy = h * 0.83, hs = h * 0.06;
  g.moveTo(hx, hy + hs * 0.3); g.bezierCurveTo(hx, hy, hx - hs * 0.5, hy, hx - hs * 0.5, hy + hs * 0.3); g.bezierCurveTo(hx - hs * 0.5, hy + hs * 0.6, hx, hy + hs * 0.8, hx, hy + hs);
  g.bezierCurveTo(hx, hy + hs * 0.8, hx + hs * 0.5, hy + hs * 0.6, hx + hs * 0.5, hy + hs * 0.3); g.bezierCurveTo(hx + hs * 0.5, hy, hx, hy, hx, hy + hs * 0.3); g.fill();
  for (let i = 0; i < 3; i++) { g.fillStyle = i < likes ? '#ff3d5e' : '#d9d3e6'; g.fillRect(w * (0.24 + i * 0.13), h * 0.845, w * 0.1, h * 0.035); }
  g.fillStyle = '#c9c3d8'; g.fillRect(w * 0.08, h * 0.92, w * 0.7, h * 0.02);
  if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, w, h); }
}

/** building facade windows (u across, v up). lit = fraction of lit windows */
export const facadeTex = (seed: number, warm: boolean) => once(`facade:${seed}:${warm}`, () => {
  const w = 128, h = 256, c = mk(w, h), g = c.getContext('2d')!, R = prng(seed);
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let y = 8; y < h - 8; y += 14) for (let x = 6; x < w - 6; x += 12) {
    const r = R();
    if (r < (warm ? 0.32 : 0.18)) { g.fillStyle = warm ? (R() < 0.6 ? '#ffcf8a' : '#ffe9c4') : (R() < 0.7 ? '#8fb0ff' : '#c9d6ff'); g.globalAlpha = 0.5 + R() * 0.5; g.fillRect(x, y, 7, 9); g.globalAlpha = 1; }
  }
  return tex(c, true, [1, 1]);
});

/** soft cloud noise for floor fog / beams (alpha in red) */
export const cloudTex = () => once('cloud', () => {
  const s = 256, c = mk(s, s), g = c.getContext('2d')!;
  const img = g.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    // tileable-ish fbm
    let v = 0, a = 0.5, f = 1 / 48;
    for (let o = 0; o < 4; o++) { v += a * (noise2(x * f, y * f, 21 + o) * 0.5 + 0.5); a *= 0.5; f *= 2; }
    const i = (y * s + x) * 4; const b = Math.max(0, Math.min(255, (v - 0.25) * 400));
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = b;
  }
  g.putImageData(img, 0, 0);
  return tex(c, false);
});

/** round soft sprite for dust motes */
export const dotTex = () => once('dot', () => {
  const s = 64, c = mk(s, s), g = c.getContext('2d')!;
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return tex(c, false);
});
