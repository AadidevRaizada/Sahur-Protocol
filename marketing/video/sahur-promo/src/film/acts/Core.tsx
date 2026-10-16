// ACT "core" (storyboard beats 8-9, S45-S51, global frames 2976-3720): THE CORE. White, silent, weightless.
// The Bubble fills the sky; you can't hurt it; it grows; everything stops; his hand on your shoulder;
// TUNG. TUNG. POP. -> pure white by 3650 (BedroomB opens on white at 3720).
// Owned by the core builder. Helpers live in src/film/core/.
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { useAspect, useFilmFrame, vMatchFov } from '../context';
import { povCamera, projectToScreen } from '../../pov/camera';
import { Eyelids, Grain, LightLeak, Flash } from '../../pov/Overlays';
import { sahurPoint } from '../../rig/Sahur';
import { PAL } from '../../lib/palette';
import { mixHex } from '../../rig/util';
import { CoreScene, sahurProps } from '../core/CoreScene';
import { PovMittens } from '../core/PovMittens';
import { D, WHITE_AT, bubbleAt, cameraAt, lookAt, sahurAt } from '../core/plan';

export const CoreAct: React.FC = () => {
  const f = useFilmFrame();
  const { width, height, fps } = useVideoConfig();
  const vertical = useAspect() === 'v';
  const look = lookAt(f);
  // 3650-3720: pure white. Nothing.
  if (f >= WHITE_AT) return <AbsoluteFill style={{ background: '#ffffff' }} />;

  const cam = povCamera(f, fps, cameraAt(f, vertical, vMatchFov));
  const camLag = povCamera(f - 4, fps, cameraAt(f - 4, vertical, vMatchFov));
  const fovRef = vertical ? vMatchFov(50) : 50;
  const hk = Math.tan((camLag.fov * D) / 2) / Math.tan((fovRef * D) / 2);
  const halfW = Math.tan((camLag.fov * D) / 2) * (width / height);
  const sahur = sahurAt(f);
  const sahurLag = sahurAt(f - 1);
  const bubble = bubbleAt(f);
  // his amber becomes the key light (L6 -> L6A): a warm radial grade from his chest
  const chest = sahurPoint(sahurProps(sahur, f), 'chest');
  const cs = projectToScreen(chest, cam, width, height);
  const strikeShake = [3120, 3500, 3572, 3644].reduce((a, s, i) => a + (f >= s ? (i === 0 ? 0.3 : 1) * Math.exp(-(f - s) / 14) : 0), 0);
  const chroma = Math.max(0, 1 - (f - 3500) / 10) * (f >= 3500 ? 1.4 : 0) + Math.max(0, 1 - (f - 3572) / 12) * (f >= 3572 ? 2 : 0) + (f >= 3644 ? 2.5 : 0);
  return (
    <AbsoluteFill style={{ background: PAL.core }}>
      <AbsoluteFill style={{ filter: `brightness(${look.exposure.toFixed(3)})` }}>
        <CoreScene
          f={f}
          width={width}
          height={height}
          cam={cam}
          camLag={camLag}
          hk={hk}
          halfW={halfW}
          sahur={sahur}
          sahurLag={sahurLag}
          bubble={bubble}
          bloom={look.bloom}
          amberKey={look.amberKey}
          chroma={chroma}
        />
      </AbsoluteFill>
      {look.amberKey > 0.001 && !cs.behind && (
        <>
          <LightLeak x={cs.x} y={cs.y} radius={width * (0.5 + 0.6 * look.amberKey)} opacity={0.45 * look.amberKey} inner={PAL.real} outer="rgba(255,138,42,0.45)" blend="soft-light" />
          <LightLeak x={cs.x} y={cs.y} radius={width * (0.12 + 0.35 * look.amberKey)} opacity={0.55 * look.amberKey} inner="#fff1d6" outer={PAL.real} blend="screen" />
        </>
      )}
      <PovMittens f={f} width={width} height={height} amber={Math.max(look.amberKey, 0.6 * sahur.innerLight)} strikeShake={strikeShake} />
      <Flash color="#ffffff" opacity={look.whiteIn} blend="normal" />
      <Grain amount={0.02} seed={45} />
      {/* squinting into his light: the lids glow warm from the light through them */}
      <Eyelids open={look.lids} tint={look.lids < 0.99 ? mixHex('#3b1a0e', '#b8552f', look.amberKey) : undefined} />
      <Flash color="#ffffff" opacity={look.white} blend="normal" />
    </AbsoluteFill>
  );
};
