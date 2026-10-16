// The player's lines: bottom centre, lowercase, Montserrat 500, soft white, with a soft dark shadow strong
// enough to read on the white and beige morning. 46 px at y 960 (16:9); 56 px at y 1380 (9:16). Fades 8 f.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SANS } from '../lib/fonts';
import { clamp } from '../rig/util';

export const Subtitle: React.FC<{ text: string; start: number; end: number; fade?: number }> = ({ text, start, end, fade = 8 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const k = vertical ? width / 1080 : height / 1080;
  const op = clamp((frame - start) / fade) * clamp((end - frame) / fade);
  if (op <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: vertical ? 1380 * (height / 1920) : 960 * (height / 1080), transform: 'translate(-50%, -50%)',
      fontFamily: SANS, fontWeight: 500, fontSize: (vertical ? 56 : 46) * k, color: 'rgba(244,241,234,0.95)', opacity: op,
      textShadow: `0 ${2 * k}px ${14 * k}px rgba(0,0,0,.55), 0 0 ${2 * k}px rgba(0,0,0,.4), 0 0 ${28 * k}px rgba(0,0,0,.25)`,
      textAlign: 'center', maxWidth: 1100 * k, whiteSpace: 'nowrap', letterSpacing: 0.3 * k,
    }}>
      {text.toLowerCase()}
    </div>
  );
};
