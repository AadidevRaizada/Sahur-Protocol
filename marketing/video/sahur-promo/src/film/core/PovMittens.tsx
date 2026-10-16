// Your mittens in the Core, as the lens sees them from inside your head: large, round, very soft,
// out-of-focus cream shapes. A DOM/SVG layer over the 3D (full control of shape, blur and colour in the
// white world): the S46 swat (motion-blurred), the S47 recoil (raised, trembling) and, from S48, the
// mittens over your ears (cropped by the frame edges, a warm amber rim from Sahur's light, trembling on
// every strike). Pure function of the frame.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { clamp, fbm1, lerp } from '../../rig/util';
import { bumpF, inOutSine, outCubic, seg } from './plan';

// a round mitten paddle in a 100 x 150 box: circular top, soft taper to a thick wrist, a little thumb bump
const PATH =
  'M 22 150 C 16 118 2 98 2 66 C 2 28 24 2 52 2 C 80 2 98 28 98 64 C 98 82 94 96 88 106 C 96 108 100 116 96 124 C 92 132 84 132 80 128 C 78 136 78 144 78 150 Z';

let uid = 0;
const Mitten: React.FC<{
  x: number; // centre x (px)
  y: number; // centre y (px)
  h: number; // height (px)
  rot: number; // degrees
  blur: number; // px
  rim: number; // 0..1 amber rim strength
  rimSide: 1 | -1; // which side faces Sahur's light (1 = the mitten's right)
  opacity?: number;
  stretch?: number; // motion stretch along x
  flip?: boolean; // left hand
}> = ({ x, y, h, rot, blur, rim, rimSide, opacity = 1, stretch = 1, flip = false }) => {
  const id = React.useMemo(() => `mit${uid++}`, []);
  const w = (h * 100) / 150;
  return (
    <svg
      width={w * 1.6}
      height={h * 1.4}
      viewBox="-30 -30 160 210"
      style={{
        position: 'absolute',
        left: x - w * 0.8,
        top: y - h * 0.7,
        transform: `rotate(${rot}deg) scale(${(flip ? -1 : 1) * stretch}, 1)`,
        transformOrigin: '50% 60%',
        opacity,
        overflow: 'visible',
        filter: `blur(${blur.toFixed(1)}px)`,
      }}
    >
      <defs>
        <radialGradient id={`${id}g`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fdfaf2" />
          <stop offset="40%" stopColor="#e8e4d8" />
          <stop offset="78%" stopColor="#c4bdab" />
          <stop offset="100%" stopColor="#9f9886" />
        </radialGradient>
        <linearGradient id={`${id}r`} x1={rimSide > 0 ? '1' : '0'} y1="0.6" x2={rimSide > 0 ? '0.55' : '0.45'} y2="0.5">
          <stop offset="0%" stopColor="#ffb547" stopOpacity={0.95 * rim} />
          <stop offset="100%" stopColor="#ffb547" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={PATH} fill={`url(#${id}g)`} stroke="#2a2420" strokeOpacity={0.55} strokeWidth={2.2} />
      <path d={PATH} fill={`url(#${id}r)`} />
    </svg>
  );
};

/** a mitten over your ear, seen from inside your head: a big soft round shape, cropped by the frame edge */
const EarBlob: React.FC<{ cx: number; cy: number; rx: number; ry: number; blur: number; rim: number; side: 1 | -1; rot: number }> = ({ cx, cy, rx, ry, blur, rim, side, rot }) => {
  const id = React.useMemo(() => `ear${uid++}`, []);
  const pad = 60;
  // gradient centre toward the frame centre (lit by Sahur), shadow toward the edge
  const hx = side > 0 ? '30%' : '70%';
  return (
    <svg
      width={rx * 2 + pad * 2}
      height={ry * 2 + pad * 2}
      style={{ position: 'absolute', left: cx - rx - pad, top: cy - ry - pad, overflow: 'visible', filter: `blur(${blur.toFixed(1)}px)`, transform: `rotate(${rot}deg)`, transformOrigin: '50% 50%' }}
    >
      <defs>
        <radialGradient id={`${id}g`} cx={hx} cy="38%" r="75%">
          <stop offset="0%" stopColor="#f8f4ea" />
          <stop offset="50%" stopColor="#e8e4d8" />
          <stop offset="100%" stopColor="#b9b3a3" />
        </radialGradient>
        <radialGradient id={`${id}r`} cx={side > 0 ? '0%' : '100%'} cy="55%" r="62%">
          <stop offset="70%" stopColor="#ffb547" stopOpacity={0} />
          <stop offset="96%" stopColor="#ffb547" stopOpacity={0.9 * rim} />
          <stop offset="100%" stopColor="#ffcf8a" stopOpacity={0.9 * rim} />
        </radialGradient>
      </defs>
      <ellipse cx={rx + pad} cy={ry + pad} rx={rx} ry={ry} fill={`url(#${id}g)`} stroke="#2a2420" strokeOpacity={0.5} strokeWidth={3} />
      <ellipse cx={rx + pad} cy={ry + pad} rx={rx} ry={ry} fill={`url(#${id}r)`} />
    </svg>
  );
};

export const PovMittens: React.FC<{ f: number; width: number; height: number; amber: number; strikeShake: number }> = ({ f, width: W, height: H, amber, strikeShake }) => {
  const vertical = H > W;
  const k = H / 1080;
  const out: React.ReactNode[] = [];
  const tremble = (s: number, amp: number) => ({ x: amp * fbm1(f * 0.9, s, 2), y: amp * fbm1(f * 0.85, s + 7, 2) });

  // S46 swat (3082-3106): one round mitten swats right to left across the frame, motion-blurred
  if (f >= 3082 && f < 3106) {
    const inT = seg(f, 3082, 3088, outCubic);
    const sw = seg(f, 3088, 3094, (t) => t);
    const outT = seg(f, 3096, 3106, inOutSine);
    const a = lerp(38, -32, sw);
    const speed = f >= 3087 && f < 3095 ? 1 : 0;
    const cx = W * (0.5 + 0.42 * Math.sin((a * Math.PI) / 180)) - outT * W * 0.25;
    const cy = H * (1.02 - 0.32 * Math.cos((a * Math.PI) / 180) * inT) + outT * H * 0.45;
    const h = H * (vertical ? 0.42 : 0.62);
    for (let g = 2; g >= 0; g--) {
      const lag = g * 0.06 * speed;
      out.push(
        <Mitten key={`sw${g}`} x={cx + lag * W * 0.5} y={cy} h={h} rot={-a * 0.9} blur={(3 + 9 * speed) * k} rim={0} rimSide={-1} opacity={g === 0 ? 1 : 0.28 * speed} stretch={1 + 0.25 * speed} />,
      );
    }
  }

  // S47 recoil (3200-3360): both mittens come up, trembling
  // they sink as he comes close, so his hand lands on a clean frame at 3336
  const up = seg(f, 3200, 3216, outCubic) * (1 - seg(f, 3316, 3334, inOutSine));
  if (up > 0.001) {
    const h = H * (vertical ? 0.4 : 0.56);
    const t1 = tremble(11, 6 * k), t2 = tremble(23, 6 * k);
    const y = H * (1.24 - 0.36 * up);
    // a warm rim on the inner edges from Sahur's cracks, more blur so they sit in front of the lens
    out.push(<Mitten key="rR" x={W * (vertical ? 0.84 : 0.8) + t1.x} y={y + t1.y} h={h} rot={-10} blur={7 * k} rim={0.4} rimSide={-1} />);
    out.push(<Mitten key="rL" x={W * (vertical ? 0.16 : 0.2) + t2.x} y={y + t2.y} h={h} rot={10} blur={7 * k} rim={0.4} rimSide={-1} flip />);
  }

  // S48-S51: over your ears; big round soft shapes cropped by the frame edges, ~12-15% of the width showing
  const ears = seg(f, 3436, 3456, outCubic);
  if (ears > 0.001) {
    const ry = H * (vertical ? 0.24 : 0.36);
    const rx = ry * 0.82;
    const show = W * (vertical ? 0.14 : 0.12);
    const inX = -rx + show; // centre x so `show` px of the blob are in frame
    const xL = lerp(-rx - rx * 0.4, inX, ears);
    const amp = (3 + 14 * strikeShake) * k;
    const t1 = tremble(31, amp), t2 = tremble(47, amp);
    const press = 2 * k * Math.sin(f * 0.9);
    const rim = clamp(0.2 + 0.9 * amber);
    const blur = (vertical ? 10 : 12) * k;
    out.push(<EarBlob key="eL" cx={xL + t1.x + press} cy={H * 0.54 + t1.y} rx={rx} ry={ry} blur={blur} rim={rim} side={1} rot={6} />);
    out.push(<EarBlob key="eR" cx={W - xL + t2.x - press} cy={H * 0.54 + t2.y} rx={rx} ry={ry} blur={blur} rim={rim} side={-1} rot={-6} />);
  }
  if (!out.length) return null;
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>{out}</AbsoluteFill>;
};

export { bumpF };
