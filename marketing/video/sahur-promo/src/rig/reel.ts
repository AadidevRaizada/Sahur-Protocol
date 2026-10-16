// The phone "reel" (storyboard S01): a vertical video of a night bus stop under one sodium lamp,
// a tiny Sahur (the real game sprite) beside the sign pole, hopping 3 cm on each tinny knock while
// the reel camera punches in 6%. Feed UI as glyphs only: no legible text (except the optional 03:00).
// Drawn on a 2D canvas per frame. Assets (sprites + fonts) are loaded under delayRender.
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { SANS } from '../lib/fonts';

export type ReelAssets = { idle: HTMLImageElement[]; attack: HTMLImageElement[] } | null;

let cached: ReelAssets = null;
let pending: Promise<ReelAssets> | null = null;
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function loadAll(): Promise<ReelAssets> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    const [idle, attack] = await Promise.all([
      Promise.all([0, 1, 2].map((i) => loadImg(staticFile(`art/sahur_idle_${i}.png`)))),
      Promise.all([0, 1, 2, 3].map((i) => loadImg(staticFile(`art/sahur_attack_${i}.png`)))),
    ]);
    await document.fonts.load(`600 22px "${SANS}"`).catch(() => undefined);
    cached = { idle, attack };
    return cached;
  })();
  return pending;
}

/** loads sprites + fonts once; holds a delayRender handle until ready */
export function useReelAssets(): ReelAssets {
  const [a, setA] = useState<ReelAssets>(cached);
  const [handle] = useState(() => (cached ? null : delayRender('reel assets')));
  useEffect(() => {
    if (cached) { if (handle !== null) continueRender(handle); return; }
    loadAll().then((r) => { setA(r); if (handle !== null) continueRender(handle); });
  }, []);
  return a;
}

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
};

function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.beginPath();
  c.moveTo(x, y + s * 0.3);
  c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  c.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  c.fill();
}

export type ReelOpts = {
  /** 0..1 progress line; default advances once per 72 f loop */
  progress?: number;
  /** show the diegetic 03:00 in the status bar (default true) */
  clock?: boolean;
  /** 0..1 darken (screen timing out) */
  dim?: number;
  /** frame at which the heart glyph pulses (storyboard S01: 100) */
  heartPulseAt?: number;
};

/** knock times inside the 72 f reel loop (storyboard: local 12, 24, 36) */
export const REEL_LOOP = 72;
export const REEL_KNOCKS = [12, 24, 36];
const knockEnv = (f: number) => {
  const l = ((f % REEL_LOOP) + REEL_LOOP) % REEL_LOOP;
  let e = 0;
  for (const k of REEL_KNOCKS) { const d = l - k; if (d >= 0 && d < 10) e = Math.max(e, 1 - d / 10); }
  return e;
};

export function drawReel(c: CanvasRenderingContext2D, w: number, h: number, frame: number, assets: ReelAssets, o: ReelOpts = {}) {
  const u = w / 540; // design units: 540 x 1170
  const k = knockEnv(frame);
  c.save();
  c.clearRect(0, 0, w, h);
  // --- the video, with the reel camera punching in 6% on each knock ---
  c.save();
  const punch = 1 + 0.06 * k;
  c.translate(w / 2, h * 0.55); c.scale(punch, punch); c.translate(-w / 2, -h * 0.55);
  const sky = c.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, '#070b18'); sky.addColorStop(1, '#161c33');
  c.fillStyle = sky; c.fillRect(-w, -h, w * 3, h * 3);
  // far city silhouette with a few warm windows
  c.fillStyle = '#0d1222';
  for (let i = 0; i < 14; i++) { const bw = (30 + ((i * 37) % 50)) * u, bh = (80 + ((i * 53) % 160)) * u; c.fillRect(i * 42 * u - 20 * u, h * 0.66 - bh, bw, bh); }
  c.fillStyle = 'rgba(255,190,110,0.25)';
  for (let i = 0; i < 40; i++) c.fillRect(((i * 71) % 540) * u, h * 0.66 - ((i * 29) % 200) * u - 10 * u, 3 * u, 4 * u);
  // ground: wet asphalt + kerb
  c.fillStyle = '#10121a'; c.fillRect(-w, h * 0.66, w * 3, h);
  c.fillStyle = '#1f2230'; c.fillRect(-w, h * 0.735, w * 3, 8 * u);
  // sodium lamp: pole, arm, head, cone, pool
  const lx = 140 * u, ly = 300 * u;
  c.fillStyle = '#05070c'; c.fillRect(70 * u, ly - 10 * u, 9 * u, h * 0.74 - ly + 10 * u); c.fillRect(70 * u, ly - 10 * u, lx - 50 * u, 7 * u);
  const cone = c.createLinearGradient(0, ly, 0, h * 0.74);
  cone.addColorStop(0, 'rgba(255,154,74,0.5)'); cone.addColorStop(1, 'rgba(255,154,74,0.04)');
  c.fillStyle = cone; c.beginPath(); c.moveTo(lx - 10 * u, ly); c.lineTo(lx + 22 * u, ly); c.lineTo(lx + 230 * u, h * 0.745); c.lineTo(lx - 150 * u, h * 0.745); c.closePath(); c.fill();
  const pool = c.createRadialGradient(lx + 60 * u, h * 0.745, 5 * u, lx + 60 * u, h * 0.745, 240 * u);
  pool.addColorStop(0, 'rgba(255,160,80,0.55)'); pool.addColorStop(1, 'rgba(255,160,80,0)');
  c.fillStyle = pool; c.beginPath(); c.ellipse(lx + 60 * u, h * 0.745, 250 * u, 46 * u, 0, 0, Math.PI * 2); c.fill();
  const bulb = c.createRadialGradient(lx + 6 * u, ly + 4 * u, 1, lx + 6 * u, ly + 4 * u, 46 * u);
  bulb.addColorStop(0, 'rgba(255,230,180,1)'); bulb.addColorStop(0.25, 'rgba(255,160,80,0.7)'); bulb.addColorStop(1, 'rgba(255,160,80,0)');
  c.fillStyle = bulb; c.fillRect(lx - 60 * u, ly - 60 * u, 130 * u, 130 * u);
  // bus-stop sign: pole + blank disc + blank timetable
  const sx = 375 * u;
  c.fillStyle = '#2a2f3c'; c.fillRect(sx - 4 * u, 360 * u, 8 * u, h * 0.74 - 360 * u);
  c.fillStyle = '#d9dde6'; c.beginPath(); c.arc(sx, 360 * u, 38 * u, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3a6dff'; c.lineWidth = 7 * u; c.stroke();
  c.fillStyle = '#3a6dff'; c.fillRect(sx - 22 * u, 354 * u, 44 * u, 12 * u);
  c.fillStyle = '#9aa1b2'; c.fillRect(sx - 22 * u, 470 * u, 44 * u, 70 * u);
  c.fillStyle = '#6c7386'; for (let i = 0; i < 5; i++) c.fillRect(sx - 16 * u, (480 + i * 11) * u, 32 * u, 4 * u);
  // tiny Sahur beside the pole, hopping on each knock
  if (assets) {
    const img = assets.idle[Math.floor(frame / 12) % 3];
    const size = 380 * u;
    const hop = Math.sin(k * Math.PI * 0.5) * 20 * u;
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath(); c.ellipse(255 * u, h * 0.742, 72 * u * (1 - 0.2 * k), 11 * u, 0, 0, Math.PI * 2); c.fill();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(img, 255 * u - size / 2, h * 0.745 - size * 0.86 - hop, size, size);
  }
  // drizzle
  c.strokeStyle = 'rgba(200,215,255,0.16)'; c.lineWidth = 1.2 * u;
  for (let i = 0; i < 60; i++) { const x = ((i * 97 + frame * 3) % 560) * u, y = ((i * 211 + frame * 22) % 1200) * u; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3 * u, y + 18 * u); c.stroke(); }
  c.restore();

  // --- feed UI glyphs (no legible text) ---
  const cx = w - 52 * u;
  const iconY = [640, 760, 870].map((v) => v * u);
  const pa = o.heartPulseAt;
  const pulse = pa !== undefined && frame >= pa && frame < pa + 12 ? 1 + 0.35 * Math.sin(((frame - pa) / 12) * Math.PI) : 1;
  c.save(); c.translate(cx, iconY[0]); c.scale(pulse, pulse); c.fillStyle = '#ff3d5e'; heart(c, 0, -26 * u, 52 * u); c.restore();
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.beginPath(); c.ellipse(cx, iconY[1] - 4 * u, 26 * u, 22 * u, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(cx - 14 * u, iconY[1] + 12 * u); c.lineTo(cx - 22 * u, iconY[1] + 28 * u); c.lineTo(cx - 2 * u, iconY[1] + 16 * u); c.fill();
  c.beginPath(); c.moveTo(cx + 24 * u, iconY[2]); c.lineTo(cx, iconY[2] - 22 * u); c.lineTo(cx, iconY[2] - 10 * u);
  c.quadraticCurveTo(cx - 26 * u, iconY[2] - 8 * u, cx - 26 * u, iconY[2] + 20 * u); c.quadraticCurveTo(cx - 14 * u, iconY[2] + 6 * u, cx, iconY[2] + 8 * u);
  c.lineTo(cx, iconY[2] + 22 * u); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  for (const y of iconY) c.fillRect(cx - 18 * u, y + 40 * u, 36 * u, 7 * u);
  // avatar + two grey caption bars
  c.fillStyle = '#b0743a'; c.beginPath(); c.arc(52 * u, 1010 * u, 26 * u, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 3 * u; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.85)'; rr(c, 92 * u, 992 * u, 190 * u, 16 * u, 8 * u); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)'; rr(c, 92 * u, 1024 * u, 300 * u, 14 * u, 7 * u); c.fill();
  // progress line, once per loop
  const prog = o.progress ?? (((frame % REEL_LOOP) + REEL_LOOP) % REEL_LOOP) / REEL_LOOP;
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, h - 10 * u, w, 4 * u);
  c.fillStyle = '#fff'; c.fillRect(0, h - 10 * u, w * prog, 4 * u);
  // status bar
  c.fillStyle = '#fff';
  if (o.clock !== false) { c.font = `600 ${22 * u}px "${SANS}"`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('03:00', 34 * u, 40 * u); }
  c.fillRect(w - 78 * u, 31 * u, 36 * u, 18 * u); c.fillRect(w - 41 * u, 36 * u, 3 * u, 8 * u);
  for (let i = 0; i < 4; i++) c.fillRect(w - 128 * u + i * 9 * u, (47 - i * 5) * u, 6 * u, (4 + i * 5) * u);
  if (o.dim) { c.fillStyle = `rgba(0,0,0,${o.dim})`; c.fillRect(0, 0, w, h); }
  c.restore();
}
