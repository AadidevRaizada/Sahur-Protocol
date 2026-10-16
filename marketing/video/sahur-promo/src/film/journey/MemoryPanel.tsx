// MemoryPanel (light state L3m): a full-bleed painted memory from the game's cutscenes (public/art/bg_*.jpg)
// with a Ken Burns push, a warm (or cool) soft-light grade, a light-leak sweep, film-burn edges re-seeded
// every 4 f, edge blur, grain and dissolves. Pure function of the global frame `f`.
// The painted hooded kid must stay a small back-view silhouette or be cropped out: choose the crops so.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { Grain } from '../../pov/Overlays';
import { clamp, lerp, invLerp } from '../../rig/util';

const IMG_W = 960, IMG_H = 600;

export type KenBurns = {
  /** scale at the start and the end (1 = cover) */
  s: [number, number];
  /** the image point (0..1) held at the frame centre, start and end */
  x: [number, number];
  y: [number, number];
  /** 9:16 crop centre x (0..1) override, start and end */
  vx?: [number, number];
};

export type MemoryPanelProps = {
  f: number;
  src: string;
  start: number;
  end: number;
  kb: KenBurns;
  /** frames of dissolve in / out (0 = hard cut) */
  fadeIn?: number;
  fadeOut?: number;
  /** grade: soft-light tint colour and amount */
  tint?: string;
  tintAmt?: number;
  /** light-leak sweep: from which edge, its colours and peak opacity */
  leak?: 'left' | 'right' | null;
  leakAmt?: number;
  leakColor?: [string, string];
  /** film-burn edge strength (0..1) */
  burn?: number;
  /** a sun flare (screen) at an image point */
  flare?: { x: number; y: number; amt: number };
  /** glitch tears: [frame, duration, offset px] */
  tears?: [number, number, number][];
  /** extra css filter for the image */
  filter?: string;
  grain?: number;
  seed?: number;
};

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));

/** the panel's image rectangle (px) at progress t */
function imageRect(W: number, H: number, kb: KenBurns, t: number, vertical: boolean) {
  const cover = Math.max(W / IMG_W, H / IMG_H);
  const s = lerp(kb.s[0], kb.s[1], t) * cover;
  const w = IMG_W * s, h = IMG_H * s;
  const cx = vertical && kb.vx ? lerp(kb.vx[0], kb.vx[1], t) : lerp(kb.x[0], kb.x[1], t);
  const cy = lerp(kb.y[0], kb.y[1], t);
  let left = W / 2 - cx * w, top = H / 2 - cy * h;
  left = Math.min(0, Math.max(W - w, left));
  top = Math.min(0, Math.max(H - h, top));
  return { left, top, w, h };
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  f, src, start, end, kb, fadeIn = 8, fadeOut = 6, tint = '#ffb547', tintAmt = 0.22, leak = 'right', leakAmt = 0.5,
  leakColor = ['#ffb547', '#ff8a2a'], burn = 1, flare, tears = [], filter, grain = 0.055, seed = 1,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const vertical = H > W;
  if (f < start - 1 || f >= end + (fadeOut > 0 ? 0 : 0)) return null;
  const t = invLerp(start, end, f);
  const op = (fadeIn > 0 ? clamp((f - start + 1) / fadeIn) : 1) * (fadeOut > 0 ? clamp((end - f) / fadeOut) : 1);
  if (op <= 0) return null;
  const r = imageRect(W, H, kb, t, vertical);
  const k = H / 1080;
  // tears: a horizontal slice offset for a couple of frames
  const tear = tears.find(([at, dur]) => f >= at && f < at + dur);
  const url = staticFile(src);
  // film burn: turbulence re-seeded every 4 frames, masked to the edges
  const burnSeed = Math.floor(f / 4) + seed * 31;
  const leakT = ease(invLerp(start, end, f));
  const leakX = leak === 'left' ? lerp(-0.35, 1.2, leakT) : lerp(1.35, -0.2, leakT);
  const leakA = leakAmt * Math.sin(Math.PI * clamp(leakT));
  const img = (extra: React.CSSProperties = {}) => (
    <Img src={url} style={{ position: 'absolute', left: r.left, top: r.top, width: r.w, height: r.h, filter, ...extra }} />
  );
  return (
    <AbsoluteFill style={{ opacity: op, overflow: 'hidden', background: '#000' }}>
      {img()}
      {/* edge blur: a blurred copy masked to the edges */}
      <AbsoluteFill style={{ WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 95%)', maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 95%)' }}>
        {img({ filter: `${filter ?? ''} blur(${6 * k}px)` })}
      </AbsoluteFill>
      {tear && (
        <AbsoluteFill style={{ clipPath: `inset(${(0.38 + 0.2 * ((tear[0] * 7) % 3) / 3) * 100}% 0 ${(0.5 - 0.2 * ((tear[0] * 7) % 3) / 3) * 100}% 0)`, transform: `translateX(${tear[2] * k}px)` }}>
          {img({ filter: `${filter ?? ''} hue-rotate(10deg) saturate(1.4)` })}
        </AbsoluteFill>
      )}
      {/* grade */}
      <AbsoluteFill style={{ background: tint, mixBlendMode: 'soft-light', opacity: tintAmt }} />
      {/* sun flare */}
      {flare && flare.amt > 0 && (
        <AbsoluteFill style={{
          background: `radial-gradient(circle ${Math.round(W * 0.35)}px at ${r.left + flare.x * r.w}px ${r.top + flare.y * r.h}px, #fff1cf 0%, rgba(255,226,170,0.5) 30%, rgba(0,0,0,0) 100%)`,
          mixBlendMode: 'screen', opacity: flare.amt,
        }} />
      )}
      {/* light-leak sweep */}
      {leak && leakA > 0.002 && (
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse ${Math.round(W * 0.45)}px ${Math.round(H * 0.9)}px at ${leakX * W}px ${H * 0.45}px, ${leakColor[0]} 0%, ${leakColor[1]} 35%, rgba(0,0,0,0) 100%)`,
          mixBlendMode: 'screen', opacity: leakA,
        }} />
      )}
      {/* film-burn edges: multiply a dark umber through a seeded turbulence, masked to the frame edges */}
      {burn > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.8 * burn }}>
          <defs>
            <filter id={`burn${seed}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency={0.006 / k} numOctaves={3} seed={burnSeed} result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.227  0 0 0 0 0.078  0 0 0 0 0.024  0 0 0 -2.2 1.6" />
            </filter>
            <radialGradient id={`burnMask${seed}`} cx="50%" cy="50%" r="72%">
              <stop offset="55%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#fff" stopOpacity="1" />
            </radialGradient>
            <mask id={`burnM${seed}`}><rect width={W} height={H} fill={`url(#burnMask${seed})`} /></mask>
          </defs>
          <rect width={W} height={H} filter={`url(#burn${seed})`} mask={`url(#burnM${seed})`} />
        </svg>
      )}
      {/* a hot orange rim inside the burn */}
      {burn > 0 && (
        <AbsoluteFill style={{ boxShadow: `inset 0 0 ${120 * k}px ${30 * k}px rgba(255,120,40,${0.18 * burn})`, mixBlendMode: 'screen' }} />
      )}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)' }} />
      <Grain amount={grain} seed={seed + 40} />
    </AbsoluteFill>
  );
};
