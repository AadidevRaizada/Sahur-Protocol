// DOM overlays for the fights: the slop splat on the lens, the feathered white flood, coloured washes.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { prng } from '../../rig/util';
import { clamp, invLerp, lerp, inQuad, outCubic } from './kit';

/**
 * A magenta slop splat stuck on the lens (storyboard S27): lands at `at`, slides down and fades.
 * Drawn as a glossy, slightly defocused SVG blob with drips. cx, cy, r in px.
 */
export const LensSplat: React.FC<{ f: number; at: number; end: number; cx: number; cy: number; r: number; seed?: number }> = ({ f, at, end, cx, cy, r, seed = 4 }) => {
  const shape = useMemo(() => {
    const R = prng(seed * 31 + 7);
    const N = 40;
    const lobes = Array.from({ length: 7 }, () => ({ a: R() * Math.PI * 2, w: 0.25 + R() * 0.35, h: 0.12 + R() * 0.38 }));
    const pts: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      let k = 0.78 + 0.08 * Math.sin(a * 3 + R() * 0.3);
      for (const l of lobes) {
        let d = Math.abs(a - l.a); d = Math.min(d, Math.PI * 2 - d);
        k += l.h * Math.exp(-(d * d) / (l.w * l.w * 0.2));
      }
      pts.push([Math.cos(a) * k, Math.sin(a) * k]);
    }
    const drips = Array.from({ length: 5 }, (_, i) => ({ x: -0.6 + i * 0.3 + (R() - 0.5) * 0.15, w: 0.07 + R() * 0.08, len: 0.4 + R() * 0.9, sp: 0.6 + R() * 0.8 }));
    const flecks = Array.from({ length: 9 }, () => ({ a: R() * Math.PI * 2, d: 1.25 + R() * 0.8, s: 0.05 + R() * 0.1 }));
    return { pts, drips, flecks };
  }, [seed]);
  if (f < at || f >= end) return null;
  const t = invLerp(at, end, f);
  const land = outCubic(invLerp(at, at + 3, f));
  const slide = inQuad(t) * r * 1.6;
  const fade = 1 - invLerp(0.55, 1, t);
  const scale = lerp(0.6, 1, land) * (1 + 0.06 * (1 - land));
  const path = (k: number) => shape.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * k).toFixed(3)},${(y * k * (1 + 0.25 * t)).toFixed(3)}`).join(' ') + 'Z';
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <radialGradient id="slopG" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ff9cf6" />
            <stop offset="35%" stopColor="#ff3df0" />
            <stop offset="80%" stopColor="#a3129a" />
            <stop offset="100%" stopColor="#4a0646" />
          </radialGradient>
          <filter id="slopBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={2.2 + 2 * t} /></filter>
          <filter id="slopGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={18} /></filter>
        </defs>
        <g transform={`translate(${cx},${cy + slide}) scale(${r * scale})`} opacity={fade} filter="url(#slopBlur)">
          {/* glow on the glass */}
          <path d={path(1.25)} fill="#ff3df0" opacity={0.35} filter="url(#slopGlow)" />
          {shape.drips.map((d, i) => {
            const L = d.len * outCubic(clamp(t * d.sp * 1.6)) + 0.2;
            return (
              <g key={i}>
                <rect x={d.x - d.w / 2} y={0.2} width={d.w} height={0.6 + L} rx={d.w / 2} fill="url(#slopG)" />
                <circle cx={d.x} cy={0.8 + L} r={d.w * 0.75} fill="#ff3df0" />
              </g>
            );
          })}
          <path d={path(1)} fill="url(#slopG)" opacity={0.92} />
          {/* translucent thinner rim where the goo spreads */}
          <path d={path(1.12)} fill="#ff3df0" opacity={0.28} />
          {/* specular smears (the lens is lit from the top-left) */}
          <ellipse cx={-0.32} cy={-0.38} rx={0.26} ry={0.1} transform="rotate(-28 -0.32 -0.38)" fill="#fff" opacity={0.75} />
          <ellipse cx={0.18} cy={-0.5} rx={0.07} ry={0.04} fill="#fff" opacity={0.6} />
          <ellipse cx={0.35} cy={0.3} rx={0.12} ry={0.05} transform="rotate(30 0.35 0.3)" fill="#ffd2fa" opacity={0.35} />
          {/* two dead pixel eyes, smeared */}
          <rect x={-0.2} y={-0.06} width={0.11} height={0.13} fill="#14010f" opacity={0.75 * (1 - t)} />
          <rect x={0.1} y={-0.08} width={0.11} height={0.13} fill="#14010f" opacity={0.75 * (1 - t)} />
          {shape.flecks.map((k, i) => (
            <circle key={i} cx={Math.cos(k.a) * k.d} cy={Math.sin(k.a) * k.d + 0.4 * t} r={k.s} fill="#ff3df0" opacity={0.8} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** white floods in from the right with a feathered edge (storyboard S44: 30% feather, 12 f) */
export const WhiteWipe: React.FC<{ p: number; feather?: number; color?: string }> = ({ p, feather = 0.3, color = '#ffffff' }) => {
  if (p <= 0) return null;
  const e = lerp(100 + feather * 100, -feather * 100, clamp(p)); // edge position in % from left (soft side)
  const a = e, b = e + feather * 100;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', background: `linear-gradient(to right, rgba(255,255,255,0) ${a}%, ${color} ${b}%)` }} />
  );
};

/** flat full-frame wash with a blend mode */
export const Wash: React.FC<{ color: string; opacity: number; blend?: React.CSSProperties['mixBlendMode'] }> = ({ color, opacity, blend = 'screen' }) =>
  opacity <= 0.001 ? null : <AbsoluteFill style={{ background: color, opacity: clamp(opacity), mixBlendMode: blend, pointerEvents: 'none' }} />;
