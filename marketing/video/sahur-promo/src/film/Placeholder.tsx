// Stand-in for an act that isn't built yet, so the whole film renders end to end from day one.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useFilmFrame } from './context';
import { PIXEL } from '../lib/fonts';

export const Placeholder: React.FC<{ name: string; bg?: string }> = ({ name, bg = '#10141f' }) => {
  const f = useFilmFrame();
  return (
    <AbsoluteFill style={{ background: bg, color: '#8b8fa3', fontFamily: PIXEL, fontSize: 40, alignItems: 'center', justifyContent: 'center' }}>
      {name} · f{f}
    </AbsoluteFill>
  );
};
