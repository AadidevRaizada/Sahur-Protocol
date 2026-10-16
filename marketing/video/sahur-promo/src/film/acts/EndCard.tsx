// ACT "endcard" (global 4200-4500, S58). Owner: journey builder. Storyboard section 8: the game's own title
// screen (#titleOv) in DOM, scaled for 1080p: SAHUR PROTOCOL (Press Start 2P, amber), TUNG  TUNG  TUNG
// (magenta), the boxed WAKE UP button, EPISODE 1 and an empty URL slot, over #07090f with 14 amber motes.
// Timings are synced to the choir: its first hit lands at 4263 (the title glow pulse).
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { useFilmFrame, useAspect } from '../context';
import { PRESS, PIXEL } from '../../lib/fonts';
import { PAL } from '../../lib/palette';
import { clamp, hash1, mixHex, easeOut } from '../../rig/util';
import { Grain } from '../../pov/Overlays';

const VERDANA = 'Verdana, "DejaVu Sans", Geneva, sans-serif';
const TITLE = 'SAHUR PROTOCOL';
const T0 = 4235; // first title glyph; 2 f per glyph (14 glyphs incl. the space) -> complete at 4263
const HIT = 4263; // the choir's first hit
const TUNGS = [4287, 4327, 4367];
const outCubic = (t: number) => easeOut(t);

/** 14 amber motes drifting up 0.3 px/f on a slowly drifting, scaling layer (the game's menuDrift) */
const Motes: React.FC<{ f: number; W: number; H: number; k: number }> = ({ f, W, H, k }) => {
  const t = clamp((f - 4200) / 300);
  const tx = -2 + 4 * t, ty = -1 + 2 * t, sc = 1.02 + 0.06 * t;
  return (
    <AbsoluteFill style={{ transform: `translate(${tx}%, ${ty}%) scale(${sc})` }}>
      {Array.from({ length: 14 }, (_, i) => {
        const x = hash1(i, 3) * W;
        const y0 = hash1(i, 7) * H;
        const y = ((y0 - (f - 4200) * 0.3 * k * (0.7 + 0.6 * hash1(i, 9))) % H + H) % H;
        const s = (2 + 2 * hash1(i, 11)) * k;
        const tw = 0.6 + 0.4 * Math.sin(f * 0.07 + i * 1.9);
        return (
          <div key={i} style={{
            position: 'absolute', left: x + Math.sin(f * 0.013 + i) * 6 * k, top: y, width: s, height: s, borderRadius: s,
            background: PAL.real, opacity: 0.2 * tw, boxShadow: `0 0 ${6 * k}px ${PAL.real}`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

export const EndCardAct: React.FC = () => {
  const f = useFilmFrame();
  const { width: W, height: H } = useVideoConfig();
  const v = useAspect() === 'v';
  const k = v ? W / 1080 : H / 1080;
  // the choir's first hit: the title glow 36 -> 72 px and back over 40 f, with a 1% scale bump
  const hitT = f - HIT;
  const pulse = hitT < 0 ? 0 : hitT < 6 ? outCubic(hitT / 6) : 1 - outCubic((hitT - 6) / 34);
  const glow = 36 + 36 * clamp(pulse);
  const titleScale = 1 + 0.01 * clamp(pulse);
  // layout (16:9 storyboard y-centres; 9:16: the stacked column centred at y 900)
  const Y = v
    ? { t1: 640, t2: 762, tung: 905, btn: 1018, ep: 1118, url: 1172 }
    : { t1: 346, t2: 346, tung: 463, btn: 592, ep: 712, url: 774 }; // storyboard s8 layout scaled 1.3x about y 560 (phone legibility)
  const S = v ? 1 : 1.3;
  const titlePx = (v ? 88 : 94) * k;
  const glyph = (ch: string, i: number) => {
    const at = T0 + 2 * i;
    if (f < at) return <span key={i} style={{ opacity: 0 }}>{ch === ' ' ? ' ' : ch}</span>;
    const age = f - at;
    const white = age === 0;
    return (
      <span key={i} style={{
        color: white ? '#ffffff' : PAL.real,
        textShadow: white ? `0 0 ${24 * k}px #ffffff, 0 0 ${48 * k}px rgba(255,181,71,0.8)` : `0 0 ${glow * k}px rgba(255,181,71,${0.45 + 0.25 * clamp(pulse)})`,
      }}>{ch === ' ' ? ' ' : ch}</span>
    );
  };
  const titleStyle: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: PRESS, fontSize: titlePx, letterSpacing: '0.12em',
    lineHeight: 1.6, whiteSpace: 'nowrap', transform: `translateY(-50%) scale(${titleScale})`, paddingLeft: '0.12em',
  };
  // TUNG  TUNG  TUNG: each word snaps in 110% -> 100% over 6 f with a magenta glow flash
  const tungPx = (v ? 30 : 34) * k;
  const tungWord = (i: number) => {
    const at = TUNGS[i];
    if (f < at) return <span key={i} style={{ opacity: 0, display: 'inline-block' }}>TUNG</span>;
    const age = f - at;
    const s = age < 6 ? 1.1 - 0.1 * outCubic(age / 6) : 1;
    const flash = clamp(1 - age / 14);
    return (
      <span key={i} style={{
        display: 'inline-block', transform: `scale(${s})`, color: mixHex(PAL.glitch, '#ffffff', 0.45 * flash),
        textShadow: `0 0 ${(10 + 26 * flash) * k}px rgba(255,61,240,${0.35 + 0.6 * flash})`,
      }}>TUNG</span>
    );
  };
  // WAKE UP: fades in and rises 12 px (4385-4409), then takes the game's focus state (4436-4448)
  const btnIn = outCubic(clamp((f - 4385) / 24));
  const focus = clamp((f - 4436) / 12);
  const focusE = focus * focus * (3 - 2 * focus);
  const btnPx = (v ? 34 : 38) * k;
  const epIn = clamp((f - 4409) / 24);
  const vig = `radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.6) 100%)`;
  return (
    <AbsoluteFill style={{ background: PAL.ink, overflow: 'hidden' }}>
      <Motes f={f} W={W} H={H} k={k} />
      <AbsoluteFill style={{ background: vig }} />
      {/* SAHUR PROTOCOL (two lines in 9:16) */}
      {v ? (
        <>
          <div style={{ ...titleStyle, top: Y.t1 * k }}>{'SAHUR'.split('').map((c, i) => glyph(c, i))}</div>
          <div style={{ ...titleStyle, top: Y.t2 * k }}>{'PROTOCOL'.split('').map((c, i) => glyph(c, i + 6))}</div>
        </>
      ) : (
        <div style={{ ...titleStyle, top: Y.t1 * k }}>{TITLE.split('').map((c, i) => glyph(c, i))}</div>
      )}
      {/* TUNG  TUNG  TUNG (two spaces between the words, as in the game) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: Y.tung * k, transform: 'translateY(-50%)', textAlign: 'center',
        fontFamily: VERDANA, fontWeight: 600, fontSize: tungPx, letterSpacing: '0.5em', paddingLeft: '0.5em', whiteSpace: 'pre',
      }}>
        {tungWord(0)}{'  '}{tungWord(1)}{'  '}{tungWord(2)}
      </div>
      {/* the WAKE UP button: the box reads as the brackets of [ WAKE UP ] */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: Y.btn * k, display: 'flex', justifyContent: 'center', transform: `translateY(calc(-50% + ${(1 - btnIn) * 12 * k}px))`, opacity: btnIn }}>
        <div style={{
          border: `${2 * S * k}px solid ${mixHex(PAL.line, PAL.real, focusE)}`, background: PAL.panel, color: mixHex(PAL.text, PAL.real, focusE),
          fontFamily: VERDANA, fontWeight: 700, fontSize: btnPx, letterSpacing: '0.12em', padding: `${22 * S * k}px ${64 * S * k}px ${22 * S * k}px ${(64 * S + 4.5) * k}px`,
          boxShadow: focusE > 0 ? `0 0 ${18 * k * focusE}px rgba(255,181,71,${0.25 * focusE}), inset 0 0 ${10 * k * focusE}px rgba(255,181,71,${0.12 * focusE})` : 'none',
          textShadow: focusE > 0 ? `0 0 ${10 * k * focusE}px rgba(255,181,71,${0.5 * focusE})` : 'none', lineHeight: 1,
        }}>WAKE UP</div>
      </div>
      {/* EPISODE 1 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: Y.ep * k, transform: 'translateY(-50%)', textAlign: 'center', opacity: epIn,
        fontFamily: PIXEL, fontSize: (v ? 26 : 28) * k, color: PAL.dim, letterSpacing: '0.3em', paddingLeft: '0.3em',
      }}>EPISODE 1</div>
      {/* the URL slot: reserved, empty by default */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: Y.url * k, height: 24 * S * k, transform: 'translateY(-50%)', textAlign: 'center', fontFamily: VERDANA, fontSize: (v ? 24 : 26) * k, color: PAL.dim }} />
      <Grain amount={0.03} seed={58} />
    </AbsoluteFill>
  );
};
