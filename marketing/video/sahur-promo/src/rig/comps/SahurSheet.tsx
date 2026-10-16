// SahurSheet: turnaround, expressions and poses on a neutral grey-blue studio with 3-point light.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps } from '../Sahur';
import { Cyclorama, StudioLights } from '../../sets/Studio';
import { StaticCamera } from '../../pov/PovCamera';
import { Post } from '../../pov/Post';
import { PIXEL, SANS, PRESS } from '../../lib/fonts';
import { PAL } from '../../lib/palette';

type Item = { label: string; s: SahurProps; seat?: boolean };

const Row: React.FC<{ h: number; items: Item[]; spacing: number; camY: number; viewH: number; title: string; head?: boolean; shift?: number }> = ({ h, items, spacing, camY, viewH, title, head, shift = 0 }) => {
  const W = 1920;
  const dist = 60;
  const fov = (2 * Math.atan(viewH / 2 / dist) * 180) / Math.PI;
  const x0 = -((items.length - 1) * spacing) / 2 + shift;
  const aspect = W / h;
  const viewW = viewH * aspect;
  return (
    <div style={{ position: 'relative', width: W, height: h }}>
      <ThreeCanvas width={W} height={h} shadows="soft" camera={{ fov, position: [0, camY, dist] }}>
        <StaticCamera position={[0, camY, dist]} target={[0, camY, 0]} fov={fov} near={10} far={120} />
        <color attach="background" args={['#56637d']} />
        <Cyclorama color="#5d6b86" />
        <StudioLights target={[0, head ? 2.3 : 1.5, 0]} spread={Math.max(6, (items.length * spacing) / 2 + 2)} key={3.4} rim={3.4} />
        {items.map((it, i) => (
          <group key={i}>
            <Sahur {...it.s} position={[x0 + i * spacing, 0, 0]} />
            {it.seat && (
              <mesh position={[x0 + i * spacing, 0.2, -0.12]} rotation={[0, 0.25, Math.PI / 2]} castShadow receiveShadow>
                <cylinderGeometry args={[0.21, 0.23, 1.4, 24]} />
                <meshStandardMaterial color="#5e4029" roughness={0.9} />
              </mesh>
            )}
          </group>
        ))}
        <Post bloom={0.35} bloomThreshold={0.92} vignette={0} />
      </ThreeCanvas>
      <div style={{ position: 'absolute', left: 22, top: 12, fontFamily: PRESS, fontSize: 13, color: 'rgba(232,228,216,0.75)', letterSpacing: 1 }}>{title}</div>
      {items.map((it, i) => {
        const x = W / 2 + ((x0 + i * spacing) / viewW) * W;
        return (
          <div key={i} style={{ position: 'absolute', left: x, bottom: 8, transform: 'translateX(-50%)', fontFamily: PIXEL, fontSize: 19, color: PAL.real, textShadow: '0 2px 4px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>{it.label}</div>
        );
      })}
    </div>
  );
};

export const SahurSheet: React.FC = () => (
  <AbsoluteFill style={{ background: '#4e5a72' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, display: 'flex', flexDirection: 'column' }}>
      <Row h={430} title="TURNAROUND" spacing={3.6} camY={1.62} viewH={3.75}
        items={[
          { label: 'front', s: { pose: 'idle', expression: 'weary' } },
          { label: '3/4', s: { pose: 'idle', expression: 'weary', turn: 0.62 } },
          { label: 'side', s: { pose: 'idle', expression: 'weary', turn: Math.PI / 2 } },
          { label: 'back', s: { pose: 'idle', expression: 'weary', turn: Math.PI } },
        ]} />
      <Row h={290} title="EXPRESSIONS" spacing={1.2} camY={2.42} viewH={1.56} head
        items={[
          { label: 'weary', s: { pose: 'idle', expression: 'weary', bat: false } },
          { label: 'fierce', s: { pose: 'idle', expression: 'fierce', bat: false } },
          { label: 'warm', s: { pose: 'idle', expression: 'warm', bat: false } },
          { label: 'sad', s: { pose: 'idle', expression: 'sad', bat: false } },
          { label: 'surprised', s: { pose: 'idle', expression: 'surprised', bat: false } },
          { label: 'earnest', s: { pose: 'idle', expression: 'earnest', bat: false } },
          { label: 'smile', s: { pose: 'idle', expression: 'smile', bat: false } },
          { label: 'blink', s: { pose: 'idle', expression: 'calm', blink: 1, bat: false } },
        ]} />
      <Row h={360} title="POSES" spacing={2.42} camY={1.62} viewH={3.9} shift={0.45}
        items={[
          { label: 'idle', s: { pose: 'idle', expression: 'weary', turn: 0.3 } },
          { label: 'batShoulder', s: { pose: 'batShoulder', expression: 'weary', turn: 0.3 } },
          { label: 'batOverhead', s: { pose: 'batOverhead', expression: 'fierce', turn: 0.2 } },
          { label: 'swing 0.55', s: { swing: 0.55, expression: 'tung', turn: 0.9 } },
          { label: 'offerHand', s: { pose: 'offerHand', expression: 'warm', turn: 0.45 } },
          { label: 'kneelOffer', s: { pose: 'kneelOffer', expression: 'earnest', turn: 1.05 } },
          { label: 'sitting', s: { pose: 'sitting', expression: 'calm', turn: 0.3 }, seat: true },
          { label: 'glitch', s: { pose: 'lookHand', expression: 'sad', glitch: 0.9, seed: 8, look: [-0.12, 0.02], turn: 0.35 }, seat: true },
        ]} />
    </div>
    <div style={{ position: 'absolute', right: 24, top: 10, textAlign: 'right' }}>
      <div style={{ fontFamily: PRESS, fontSize: 18, color: PAL.real, letterSpacing: 1 }}>TUNG TUNG TUNG SAHUR</div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: 'rgba(232,228,216,0.7)', marginTop: 6 }}>3D rig · carved log, peg limbs, mitten hands, bat · Sahur Protocol promo</div>
    </div>
  </AbsoluteFill>
);
