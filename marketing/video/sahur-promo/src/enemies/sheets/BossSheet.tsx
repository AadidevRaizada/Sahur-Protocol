// BossSheet: Echo, The Scraper and The Valuation, each on a panel in its biome's colours.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { PAL } from '../../lib/palette';
import { PIXEL, PRESS } from '../../lib/fonts';
import { CameraRig, Post } from '../lib/scene';
import { useToy } from '../lib/toy';
import { mulberry32 } from '../lib/math';
import { GridFloor } from './common';
import { Motes } from '../../fx/Motes';
import { Echo } from '../Echo';
import { Scraper } from '../Scraper';
import { Valuation } from '../Valuation';
import { Forest, Wastes, Boardroom } from './biomes';

const H = 1080;

const Panel: React.FC<{
  left: number;
  width: number;
  bg: string;
  accent: string;
  cam: { position: [number, number, number]; target: [number, number, number]; fov: number };
  title: string[];
  biome: string;
  color: string;
  children: React.ReactNode;
}> = ({ left, width, bg, accent, cam, title, biome, color, children }) => (
  <div style={{ position: 'absolute', left, top: 0, width, height: H, overflow: 'hidden', background: bg }}>
    <ThreeCanvas width={width} height={H} camera={{ fov: cam.fov, position: cam.position }}>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 9, 26]} />
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <GridFloor base={bg} line={accent} major={0.16} minor={0.04} fade={0.09} accent={accent} accentAmt={0.03} />
      {children}
      <Post bloom={0.95} threshold={0.9} radius={0.6} vignette={0.6} />
    </ThreeCanvas>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 70, textAlign: 'center' }}>
      {title.map((l, i) => (
        <div key={i} style={{ fontFamily: PRESS, fontSize: i === title.length - 1 ? 24 : 18, color, lineHeight: 1.7, textShadow: `0 0 16px ${color}aa, 0 3px 0 #000` }}>
          {l}
        </div>
      ))}
      <div style={{ fontFamily: PIXEL, fontSize: 18, color: accent, opacity: 0.8, marginTop: 10, letterSpacing: 2 }}>{biome}</div>
    </div>
  </div>
);

export const BossSheet: React.FC = () => {
  const f = useCurrentFrame();
  const W1 = 600, W2 = 600, W3 = 720;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Panel
        left={0}
        width={W1}
        bg={PAL.forestBg}
        accent={PAL.forestAccent}
        cam={{ position: [0, 2.5, 10.6], target: [0, 1.85, 0], fov: 40 }}
        title={['ECHO,', 'THE ENGAGEMENT WRAITH']}
        biome="HYPE CYCLE FOREST"
        color={PAL.echo}
      >
        <Forest f={f} />
        <Motes frame={f} count={120} box={[8, 5, 8]} center={[0, 2.5, -1]} vel={[0.05, 0.2, 0]} size={0.035} color={PAL.forestAccent} intensity={1.6} square />
        <Echo frame={f} />
      </Panel>
      <Panel
        left={W1}
        width={W2}
        bg={PAL.wastesBg}
        accent={PAL.wastesAccent}
        cam={{ position: [0, 2.5, 10.8], target: [0, 2.0, 0], fov: 40 }}
        title={['THE SCRAPER']}
        biome="SERVER FARM WASTES"
        color={PAL.scraper}
      >
        <Wastes f={f} />
        <Motes frame={f} count={260} box={[10, 5, 10]} center={[0, 2.5, -1]} vel={[0.6, 0.05, 0]} wander={0.2} size={0.03} color={PAL.wastesAccent} intensity={0.9} opacity={0.7} />
        <Scraper frame={f} />
      </Panel>
      <Panel
        left={W1 + W2}
        width={W3}
        bg={PAL.boardBg}
        accent={PAL.boardAccent}
        cam={{ position: [0, 2.6, 13.8], target: [0, 2.1, 0], fov: 40 }}
        title={['THE VALUATION']}
        biome="BOARDROOM OF BROKEN PROMISES"
        color={PAL.valuation}
      >
        <Boardroom />
        <Valuation frame={f} />
      </Panel>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: '#000' }} />
      <div style={{ position: 'absolute', left: W1 - 1, top: 0, width: 2, height: H, background: '#000' }} />
      <div style={{ position: 'absolute', left: W1 + W2 - 1, top: 0, width: 2, height: H, background: '#000' }} />
      <div style={{ position: 'absolute', left: 32, top: 28, fontFamily: PRESS, fontSize: 14, color: PAL.text, letterSpacing: 2 }}>
        SAHUR PROTOCOL <span style={{ color: PAL.dim }}>/ BOSSES</span>
      </div>
    </AbsoluteFill>
  );
};
