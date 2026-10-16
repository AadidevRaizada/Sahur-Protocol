// DOM overlays for the POV: eyelids, grain, vignette, flash, white-out, grade and light leak.
// All deterministic in the frame. Sizes scale with the composition height (designed at 1080p).
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { prng, hash1, clamp } from '../rig/util';

/**
 * Curved top and bottom lids with a soft blurred edge, faintly warm inside.
 * open: 1 = fully open, 1.05 = wide, 0 = closed. The bottom lid travels 15% of the top's travel.
 * tint: override the lid colour (e.g. the light-through-eyelids ramp #ffd9c4 -> #c0583c -> #2a0d08).
 */
export const Eyelids: React.FC<{ open: number; tint?: string; feather?: number }> = ({ open, tint, feather = 24 }) => {
  const { width: W, height: H } = useVideoConfig();
  const o = clamp(open, 0, 1.08);
  const meet = 0.94 * H;
  const yTop = meet + (-0.12 * H - meet) * o; // top lid centre
  const yBot = meet + (1.12 * H - meet) * o; // bottom lid centre
  const curv = 0.2 * H * Math.min(1, o * 1.4);
  const k = H / 1080;
  const blur = feather * k;
  const pad = 80 * k;
  const topEdge = yTop - curv;
  const botEdge = yBot + curv * 0.35;
  const base = tint ?? '#1a0f0c';
  if (o >= 1.07) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="lidblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={blur} /></filter>
          <linearGradient id="lidTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tint ?? '#050303'} />
            <stop offset="85%" stopColor={tint ?? '#0b0605'} />
            <stop offset="100%" stopColor={tint ?? '#1c0c08'} />
          </linearGradient>
          <linearGradient id="lidBot" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={tint ?? '#050303'} />
            <stop offset="85%" stopColor={tint ?? '#0b0605'} />
            <stop offset="100%" stopColor={tint ?? '#1a0b08'} />
          </linearGradient>
        </defs>
        <g filter="url(#lidblur)">
          <path d={`M ${-pad} ${-pad} L ${W + pad} ${-pad} L ${W + pad} ${topEdge} Q ${W / 2} ${2 * yTop - topEdge} ${-pad} ${topEdge} Z`} fill="url(#lidTop)" />
          <path d={`M ${-pad} ${H + pad} L ${W + pad} ${H + pad} L ${W + pad} ${botEdge} Q ${W / 2} ${2 * yBot - botEdge} ${-pad} ${botEdge} Z`} fill="url(#lidBot)" />
          {o < 0.03 && <rect x={-pad} y={-pad} width={W + 2 * pad} height={H + 2 * pad} fill={base} />}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** film grain: seeded noise tiles, overlay-blended. amount ~0.04-0.1 */
export const Grain: React.FC<{ amount?: number; seed?: number }> = ({ amount = 0.06, seed = 1 }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const tiles = useMemo(() => {
    const out: string[] = [];
    for (let t = 0; t < 6; t++) {
      const s = 256, c = document.createElement('canvas'); c.width = s; c.height = s;
      const g = c.getContext('2d')!; const img = g.createImageData(s, s); const R = prng(seed * 97 + t);
      for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0); out.push(c.toDataURL());
    }
    return out;
  }, [seed]);
  const i = frame % tiles.length;
  const ox = Math.floor(hash1(frame, seed) * 256), oy = Math.floor(hash1(frame, seed + 9) * 256);
  const px = Math.round(256 * Math.max(1, height / 1080));
  return (
    <AbsoluteFill style={{ backgroundImage: `url(${tiles[i]})`, backgroundSize: `${px}px ${px}px`, backgroundPosition: `${ox}px ${oy}px`, mixBlendMode: 'overlay', opacity: clamp(amount * 4.5), pointerEvents: 'none', imageRendering: 'pixelated' }} />
  );
};

/** radial vignette. offset 0..1 = where darkening starts, darkness 0..1 */
export const Vignette: React.FC<{ darkness?: number; offset?: number; color?: string }> = ({ darkness = 0.6, offset = 0.3, color = '0,0,0' }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(${color},0) ${Math.round(offset * 100)}%, rgba(${color},${darkness}) 100%)`, pointerEvents: 'none' }} />
);

/** full-frame flash (white, red, amber...). blend: screen by default */
export const Flash: React.FC<{ color?: string; opacity: number; blend?: React.CSSProperties['mixBlendMode'] }> = ({ color = '#ffffff', opacity, blend = 'screen' }) =>
  opacity <= 0 ? null : <AbsoluteFill style={{ background: color, opacity: clamp(opacity), mixBlendMode: blend, pointerEvents: 'none' }} />;

/** white-out with a hot core */
export const WhiteOut: React.FC<{ amount: number; color?: string }> = ({ amount, color = '#ffffff' }) =>
  amount <= 0 ? null : (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${color} ${Math.round(amount * 70)}%, rgba(255,255,255,${clamp(amount * 1.4 - 0.2)}) 100%)`, opacity: clamp(amount * 1.6) }} />
      <AbsoluteFill style={{ background: color, opacity: clamp((amount - 0.5) * 2) }} />
    </AbsoluteFill>
  );

/** grade: lift (screen flat colour), gain (multiply flat colour), tint (soft-light) */
export const Grade: React.FC<{ lift?: string; liftAmt?: number; gain?: string; gainAmt?: number; tint?: string; tintAmt?: number }> = ({ lift, liftAmt = 0.08, gain, gainAmt = 1, tint, tintAmt = 0.2 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    {gain && <AbsoluteFill style={{ background: gain, mixBlendMode: 'multiply', opacity: gainAmt }} />}
    {lift && <AbsoluteFill style={{ background: lift, mixBlendMode: 'screen', opacity: liftAmt }} />}
    {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: 'soft-light', opacity: tintAmt }} />}
  </AbsoluteFill>
);

/** radial light leak centred on a screen point (px) */
export const LightLeak: React.FC<{ x: number; y: number; radius: number; opacity: number; inner?: string; outer?: string; blend?: React.CSSProperties['mixBlendMode'] }> = ({ x, y, radius, opacity, inner = '#ffb547', outer = '#ff8a2a', blend = 'screen' }) =>
  opacity <= 0 ? null : (
    <AbsoluteFill style={{ background: `radial-gradient(circle ${Math.round(radius)}px at ${x}px ${y}px, ${inner} 0%, ${outer} 35%, rgba(0,0,0,0) 100%)`, opacity: clamp(opacity), mixBlendMode: blend, pointerEvents: 'none' }} />
  );
