// Sahur's in-world text: Pixelify Sans, amber #ffb547, big enough to read on a phone (cap height about
// 48 px at 1080p), typed on letter by letter (3 f per character), each letter pops 120% -> 100% over 4 f,
// ±1 px jitter re-seeded every 3 f, a soft dark halo. Anchored beside his face with sahurLabelAnchor().
import React from 'react';
import * as THREE from 'three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { PIXEL } from '../lib/fonts';
import { PAL } from '../lib/palette';
import { hash1, clamp } from '../rig/util';
import { sahurPoint, SahurProps } from '../rig/Sahur';
import { DIM } from '../rig/pose';
import { CamState, projectToScreen } from '../pov/camera';

export type LabelPause = { after: number; frames: number };

/** frame at which each character appears; `tok` marks letters that get a wooden tok (no spaces/punctuation) */
export function charTimes(text: string, start: number, fpc = 3, pauses: LabelPause[] = []) {
  const out: { ch: string; at: number; tok: boolean }[] = [];
  let f = start;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out.push({ ch, at: f, tok: /[a-z0-9]/i.test(ch) });
    f += fpc;
    for (const p of pauses) if (p.after === i) f += p.frames;
  }
  return out;
}

export const LABEL_PX = { horizontal: 68, vertical: 76 };

/**
 * Screen anchor for Sahur's label. 16:9: just screen-right of his face at eye height (never over the
 * face); if it would not fit, it goes screen-left. 9:16: centred above his head.
 * `labelW` is the expected label width in px (for the fit test).
 */
export function sahurLabelAnchor(s: SahurProps, cam: CamState, width: number, height: number, labelW = 360) {
  const vertical = height > width;
  const scale = s.scale ?? 1;
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  right.y = 0; right.normalize();
  if (vertical) {
    const head = sahurPoint(s, 'headTop');
    const sc = projectToScreen(head.clone().add(new THREE.Vector3(0, 0.08 * scale + 0.03, 0)), cam, width, height);
    return { x: clamp(sc.x, labelW / 2 + 60, width - labelW / 2 - 60), y: clamp(sc.y, 240 * (height / 1920), height * 0.7), align: 'center' as const };
  }
  const eyes = sahurPoint(s, 'eyes');
  const rFace = (DIM.rTop + 0.02) * scale;
  const c = projectToScreen(eyes, cam, width, height);
  const r = projectToScreen(eyes.clone().addScaledVector(right, rFace), cam, width, height);
  const l = projectToScreen(eyes.clone().addScaledVector(right, -rFace), cam, width, height);
  const margin = 28 * (width / 1920);
  const y = clamp(c.y, 120 * (height / 1080), 880 * (height / 1080));
  if (r.x + margin + labelW < width - 40) return { x: Math.max(r.x + margin, 60), y, align: 'left' as const };
  return { x: Math.min(l.x - margin, width - 60), y, align: 'right' as const };
}

export type SpeechLabelProps = {
  text: string;
  /** first character frame */
  start: number;
  fpc?: number;
  pauses?: LabelPause[];
  /** character indices rendered as line breaks (e.g. the space between two phrases) */
  breaks?: number[];
  /** frame the fade-out starts (omit to hold) */
  end?: number;
  fade?: number;
  x: number;
  y: number;
  align?: 'left' | 'right' | 'center';
  /** px at 1080p (16:9 default 68; 9:16 default 76) */
  size?: number;
  seed?: number;
};

export const SpeechLabel: React.FC<SpeechLabelProps> = ({ text, start, fpc = 3, pauses = [], breaks = [], end, fade = 10, x, y, align = 'left', size, seed = 11 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const k = vertical ? width / 1080 : height / 1080;
  const px = (size ?? (vertical ? LABEL_PX.vertical : LABEL_PX.horizontal)) * k;
  const chars = charTimes(text, start, fpc, pauses);
  if (frame < start) return null;
  const out = end !== undefined ? clamp(1 - (frame - end) / fade) : 1;
  if (out <= 0) return null;
  const j = Math.floor(frame / 3);
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  const ty = align === 'center' ? '-100%' : '-50%';
  // Keep the whole block inside the safe zone (9:16: below the Reels/TikTok top UI at y 240 of 1920).
  const blockH = (breaks.length + 1) * px * 1.08;
  const safeTop = vertical ? 240 * (height / 1920) : 60 * (height / 1080);
  const yTop = align === 'center' ? y - blockH : y - blockH / 2;
  const ySafe = yTop < safeTop ? y + (safeTop - yTop) : y;
  return (
    <div style={{
      position: 'absolute', left: x, top: ySafe, transform: `translate(${tx}, ${ty})`, textAlign: align,
      fontFamily: PIXEL, fontWeight: 500, fontSize: px, color: PAL.real, whiteSpace: 'pre', opacity: out, lineHeight: 1.08,
      textShadow: `0 0 ${22 * k}px rgba(7,9,15,0.92), 0 0 ${7 * k}px rgba(7,9,15,0.85), 0 0 ${16 * k}px rgba(255,181,71,0.45), 0 ${3 * k}px 0 #07090f`,
      letterSpacing: 1 * k,
    }}>
      {chars.map((c, i) => {
        if (breaks.includes(i)) return <br key={i} />;
        const hidden = frame < c.at;
        const age = frame - c.at;
        const pop = !hidden && age < 4 ? 1.2 - 0.05 * age : 1;
        const jx = (hash1(j * 31 + i, seed) - 0.5) * 2 * k, jy = (hash1(j * 17 + i, seed + 5) - 0.5) * 2 * k;
        return (
          <span key={i} style={{ display: 'inline-block', opacity: hidden ? 0 : 1, transform: `translate(${jx}px, ${jy}px) scale(${pop})`, transformOrigin: '50% 70%' }}>
            {c.ch === ' ' ? ' ' : c.ch}
          </span>
        );
      })}
    </div>
  );
};
