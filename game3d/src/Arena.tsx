// The Bubble fight in 3D: the promo's neon-toy models placed on the 2.5D floor and driven by the game state.
import * as THREE from 'three';
import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { AIBubble, bubblePopFlash } from '../../marketing/video/sahur-promo/src/enemies/AIBubble';
import { Slopling } from '../../marketing/video/sahur-promo/src/enemies/Slopling';
import { Drone } from '../../marketing/video/sahur-promo/src/enemies/Drone';
import { Wraith } from '../../marketing/video/sahur-promo/src/enemies/Wraith';
import { YesMan } from '../../marketing/video/sahur-promo/src/enemies/YesMan';
import { ScraperHand } from '../../marketing/video/sahur-promo/src/enemies/ScraperHand';
import { PivotGolem } from '../../marketing/video/sahur-promo/src/enemies/PivotGolem';
import { Sahur } from '../../marketing/video/sahur-promo/src/rig/Sahur';
import { FloorGlow, Post } from '../../marketing/video/sahur-promo/src/enemies/lib/scene';
import { useToy } from '../../marketing/video/sahur-promo/src/enemies/lib/toy';
import { GridFloor } from '../../marketing/video/sahur-promo/src/enemies/sheets/common';
import { TungWave } from '../../marketing/video/sahur-promo/src/fx/TungWave';
import { Shards } from '../../marketing/video/sahur-promo/src/fx/Shards';
import { Motes } from '../../marketing/video/sahur-promo/src/fx/Motes';
import { PAL } from '../../marketing/video/sahur-promo/src/lib/palette';
import type { ArenaInput, EnemyView } from './track';
import type { CamSpec } from './camera';

export type Quality = 'high' | 'low';
export const CORE_BG = '#eceaf6';
const SAHUR_SCALE = 0.72; // 3.04 model units -> about 2.2 m, the 92 px sprite at 40 px/m

// ---------------- camera ----------------
const CamCtl: React.FC<{ spec: CamSpec; shake: [number, number] }> = ({ spec, shake }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = spec.fov;
    camera.near = 0.1;
    camera.far = 200;
    camera.position.copy(spec.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(spec.target);
    camera.position.x += shake[0];
    camera.position.y += shake[1];
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

// ---------------- arena edge ----------------
const ArenaEdge: React.FC = () => {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8f7bff', transparent: true, opacity: 0.55, depthWrite: false }), []);
  useEffect(() => () => m.dispose(), [m]);
  const t = 0.07;
  return (
    <group position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh material={m} position={[0, 6.75, 0]}><planeGeometry args={[24 + t, t]} /></mesh>
      <mesh material={m} position={[0, -6.75, 0]}><planeGeometry args={[24 + t, t]} /></mesh>
      <mesh material={m} position={[-12, 0, 0]}><planeGeometry args={[t, 13.5]} /></mesh>
      <mesh material={m} position={[12, 0, 0]}><planeGeometry args={[t, 13.5]} /></mesh>
    </group>
  );
};

// ---------------- the player: the cream blob from the game ----------------
const PlayerBlob: React.FC<{ p: ArenaInput['player']; frame: number }> = ({ p, frame }) => {
  const body = useToy({ color: '#e8e4d8', deep: '#b9b3a3', fill: 1, rimStrength: 0.5, spec: 0.7, gloss: 24, glow: 0.05, opacity: p.blink ? 0.45 : 1 }, { transparent: true });
  const ink = useMemo(() => new THREE.MeshBasicMaterial({ color: '#07090f', side: THREE.BackSide }), []);
  const eye = useMemo(() => new THREE.MeshBasicMaterial({ color: '#07090f' }), []);
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  // a ring at the feet drawn over everything, so the blob is never lost inside a slopling or behind Sahur
  const mark = useMemo(() => new THREE.MeshBasicMaterial({ color: '#07090f', transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(() => () => { ink.dispose(); eye.dispose(); ring.dispose(); mark.dispose(); }, [ink, eye, ring, mark]);
  ring.color.set(p.swingCol);
  ring.opacity = p.swing * 0.9;
  const bob = 0.03 * Math.sin(frame / 9);
  return (
    <group position={[p.X, 0, p.Z]}>
      <FloorGlow color="#000000" radius={0.6} intensity={0} shadow={0.42} />
      <mesh material={mark} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={20}>
        <ringGeometry args={[0.5, 0.56, 48]} />
      </mesh>
      <group rotation={[0, p.yaw, 0]} position={[0, 0.42 + bob, 0]} scale={[1, 0.92, 1]}>
        <mesh material={body}><sphereGeometry args={[0.42, 32, 20]} /></mesh>
        {!p.blink && <mesh material={ink} scale={1.07}><sphereGeometry args={[0.42, 24, 14]} /></mesh>}
        <mesh material={eye} position={[-0.12, 0.08, 0.38]}><boxGeometry args={[0.07, 0.11, 0.05]} /></mesh>
        <mesh material={eye} position={[0.12, 0.08, 0.38]}><boxGeometry args={[0.07, 0.11, 0.05]} /></mesh>
      </group>
      {p.swing > 0.01 && (
        <mesh material={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.9, 2.02, 72]} />
        </mesh>
      )}
    </group>
  );
};

// ---------------- enemies ----------------
const Enemy: React.FC<{ v: EnemyView; frame: number }> = ({ v, frame }) => {
  const common = { frame, hit: v.hit, death: v.death, seed: v.seed };
  let body: React.ReactNode = null;
  switch (v.type) {
    case 'slopling': body = <Slopling {...common} agitation={0.6} />; break;
    case 'drone': body = <Drone {...common} fire={v.fire} />; break;
    case 'yesman': body = <YesMan {...common} />; break;
    case 'hand': body = <ScraperHand {...common} windup={v.windup} grab={v.grab} grabDist={0} />; break;
    case 'golem': body = <PivotGolem {...common} death={0} split={v.death} />; break;
    case 'wraith':
      return (
        <group position={[v.X, 0, v.Z]} scale={v.scale}>
          <Wraith {...common} lunge={v.lunge} lungeYaw={v.lungeYaw} lungeDist={0} />
        </group>
      );
    default: body = <Slopling {...common} />;
  }
  return (
    <group position={[v.X, 0, v.Z]} rotation={[0, v.yaw, 0]} scale={v.scale}>
      {body}
    </group>
  );
};

// ---------------- bullets, particles (instanced) ----------------
const MAX_B = 320;
const Bullets: React.FC<{ list: ArenaInput['bullets'] }> = ({ list }) => {
  const parts = useMemo(() => {
    const sphere = new THREE.SphereGeometry(1, 14, 10);
    const disc = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    const core = new THREE.MeshBasicMaterial({ toneMapped: false });
    const halo = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false });
    const shadow = new THREE.MeshBasicMaterial({ color: '#2a2150', transparent: true, opacity: 0.16, depthWrite: false });
    const mk = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const im = new THREE.InstancedMesh(g, m, MAX_B);
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_B * 3), 3);
      return im;
    };
    return { sphere, disc, core, halo, shadow, a: mk(sphere, core), b: mk(sphere, halo), c: mk(disc, shadow) };
  }, []);
  useEffect(() => () => { parts.sphere.dispose(); parts.disc.dispose(); parts.core.dispose(); parts.halo.dispose(); parts.shadow.dispose(); }, [parts]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const n = Math.min(MAX_B, list.length);
  for (let i = 0; i < n; i++) {
    const bl = list[i];
    const r = bl.snipe ? 0.2 : 0.16;
    c.set(bl.snipe ? PAL.danger : PAL.glitch);
    m.makeScale(r, r, r).setPosition(bl.X, 0.85, bl.Z);
    parts.a.setMatrixAt(i, m);
    parts.a.setColorAt(i, c.clone().multiplyScalar(2.2));
    m.makeScale(r * 1.9, r * 1.9, r * 1.9).setPosition(bl.X, 0.85, bl.Z);
    parts.b.setMatrixAt(i, m);
    parts.b.setColorAt(i, c);
    m.makeScale(r * 1.2, 1, r * 1.2).setPosition(bl.X, 0.012, bl.Z);
    parts.c.setMatrixAt(i, m);
  }
  for (const im of [parts.a, parts.b, parts.c]) {
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
  return (
    <>
      <primitive object={parts.c} />
      <primitive object={parts.b} />
      <primitive object={parts.a} />
    </>
  );
};

const MAX_P = 500;
const Particles: React.FC<{ list: ArenaInput['parts']; step: number }> = ({ list, step }) => {
  const im = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const mesh = new THREE.InstancedMesh(g, mat, MAX_P);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_P * 3), 3);
    return mesh;
  }, []);
  useEffect(() => () => { im.geometry.dispose(); (im.material as THREE.Material).dispose(); }, [im]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const c = useMemo(() => new THREE.Color(), []);
  let n = 0;
  for (let i = 0; i < list.length && n < MAX_P; i += step) {
    const pt = list[i];
    const s = 0.11 * pt.a;
    m.makeRotationY(i * 0.7).scale(new THREE.Vector3(s, s, s)).setPosition(pt.X, pt.h, pt.Z);
    im.setMatrixAt(n, m);
    im.setColorAt(n, c.set(pt.col).multiplyScalar(1.4));
    n++;
  }
  im.count = n;
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return <primitive object={im} />;
};

// ---------------- telegraphs: spawn rings, shots meant for Sahur ----------------
const SpawnRing: React.FC<{ X: number; Z: number; r: number; col: string; pulse: number }> = ({ X, Z, r, col, pulse }) => {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), []);
  useEffect(() => () => m.dispose(), [m]);
  m.color.set(col).multiplyScalar(1.6);
  m.opacity = 0.35 + 0.5 * pulse;
  const s = 1 + 0.25 * pulse;
  return (
    <group position={[X, 0.02, Z]}>
      <mesh material={m} rotation={[-Math.PI / 2, 0, 0]} scale={s}><ringGeometry args={[r, r + 0.09, 40]} /></mesh>
      <mesh material={m} position={[0, 0.9, 0]} scale={[0.03, 1.8 * pulse, 0.03]}><boxGeometry args={[1, 1, 1]} /></mesh>
    </group>
  );
};

const BEAM_VERT = /* glsl */ `
varying float vZ;
void main(){ vZ = position.z + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BEAM_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uLen; uniform float uT; uniform float uA;
varying float vZ;
void main(){
  float dash = step(0.42, fract(vZ * uLen / 0.45 - uT));
  gl_FragColor = vec4(uCol, uA * dash);
}`;
const SnipeBeam: React.FC<{ from: THREE.Vector3; to: THREE.Vector3; k: number; frame: number }> = ({ from, to, k, frame }) => {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color('#e8203a') }, uLen: { value: 1 }, uT: { value: 0 }, uA: { value: 1 } },
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => m.dispose(), [m]);
  const len = from.distanceTo(to);
  m.uniforms.uLen.value = len;
  m.uniforms.uT.value = frame / 8;
  m.uniforms.uA.value = 0.45 + 0.5 * k;
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), to.clone().sub(from).normalize());
  const w = 0.06 + 0.1 * k;
  return (
    <mesh material={m} position={mid} quaternion={q} scale={[w, w, len]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
};

// ---------------- Sahur, his TUNG and his help ring ----------------
const HelpRing: React.FC<{ r: number; k: number; frame: number }> = ({ r, k, frame }) => {
  const base = useMemo(() => new THREE.MeshBasicMaterial({ color: PAL.real, transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  const fill = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.real).multiplyScalar(1.5), toneMapped: false, transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(() => () => { base.dispose(); fill.dispose(); }, [base, fill]);
  base.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 9.6));
  const kq = Math.round(k * 48) / 48;
  return (
    <group position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh material={base}><ringGeometry args={[r - 0.05, r, 72]} /></mesh>
      {kq > 0 && (
        <mesh material={fill} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.62, 0.8, 48, 1, 0, kq * Math.PI * 2]} />
        </mesh>
      )}
    </group>
  );
};

const SahurActor: React.FC<{ s: ArenaInput['sahur']; frame: number; q: Quality }> = ({ s, frame, q }) => (
  <group position={[s.X, 0, s.Z]}>
    {s.visible && (
      <group>
        <FloorGlow color={PAL.real} radius={0.85} intensity={0.25} shadow={0.4} />
        <Sahur
          scale={SAHUR_SCALE}
          turn={s.turn}
          pose={s.down ? 'dropKnee' : 'idle'}
          swing={s.down ? undefined : s.swing}
          swingMix={s.swingMix}
          walk={s.walk}
          walkAmount={s.walkAmount}
          breathe={(frame / 60) * 0.35}
          expression={s.expression as any}
          look={s.look}
          blink={frame % 220 < 7 ? 1 : 0}
          bat
          batHand="R"
          cracks={s.cracks}
          innerLight={s.innerLight}
          glitch={s.glitch}
          seed={3}
          castShadow={false}
        />
      </group>
    )}
    {s.ring >= 0 && <TungWave progress={s.ring} radius={s.ringR} chips={q === 'high'} flash={0.25} />}
    {s.help >= 0 && <HelpRing r={s.helpR} k={s.help} frame={frame} />}
    {s.shards >= 0 && (
      <>
        <Shards progress={s.shards} color={PAL.wood} count={q === 'high' ? 60 : 28} origin={[0, 1.2, 0]} radius={0.5} power={2.2} size={1.4} />
        <Shards progress={s.shards} color={PAL.real} count={q === 'high' ? 30 : 14} origin={[0, 1.4, 0]} radius={0.4} power={1.6} size={1} glow={1.5} seed={7} />
      </>
    )}
  </group>
);

// ---------------- the scene ----------------
export type ArenaProps = {
  input: ArenaInput;
  cam: CamSpec;
  shake: [number, number];
  quality: Quality;
  reduced: boolean;
};

export const Arena: React.FC<ArenaProps> = ({ input, cam, shake, quality, reduced }) => {
  const f = input.frame;
  const b = input.bubble;
  const sa = input.sahur;
  const bubbleCenter = b ? new THREE.Vector3(b.X, b.Y, b.Z) : null;
  const sahurChest = new THREE.Vector3(sa.X, 1.35, sa.Z);
  // the face turns toward the camera above it, and a little toward you
  const faceDir: [number, number] = b ? [-0.62, Math.max(-0.5, Math.min(0.5, (input.player.X - b.X) * 0.05))] : [0, 0];
  const popFlash = b ? bubblePopFlash(b.pop) : 0;
  return (
    <>
      <color attach="background" args={[CORE_BG]} />
      <fog attach="fog" args={[CORE_BG, 26, 60]} />
      <CamCtl spec={cam} shake={shake} />
      <hemisphereLight args={['#f4f2ff', '#bdb5e0', 0.6]} />
      <directionalLight position={[5, 22, 12]} color="#f3e9ff" intensity={2.3} />
      <directionalLight position={[-8, 6, -4]} color="#ffc4f2" intensity={0.6} />
      <GridFloor base={CORE_BG} line="#b9b2e6" major={0.32} minor={0.1} fade={0.025} />
      <ArenaEdge />
      {quality === 'high' && !reduced && (
        <Motes frame={f} count={110} box={[26, 5, 15]} center={[0, 2.6, 0]} vel={[0, 0.1, 0]} size={0.05} color="#b8b0e8" color2="#ffb3f2" opacity={0.5} additive={false} square />
      )}

      {input.pending.map((pd, i) => <SpawnRing key={'p' + i} {...pd} />)}
      {input.enemies.map((v) => <Enemy key={v.id} v={v} frame={f} />)}

      {b && b.pop < 0.3 && <group position={[b.X, 0, b.Z]}><FloorGlow color={PAL.glitch} radius={2.3 * (1 - b.pop * 3)} intensity={0.3} shadow={0.22} /></group>}
      {b && (
        <group position={[b.X, b.Y, b.Z]}>
          <AIBubble
            frame={f}
            radius={1.42}
            inflate={b.inflate}
            dent={b.dent}
            dentAmp={b.dentAmp}
            leak={b.leak}
            seam={b.seam}
            shed={b.shed}
            pop={b.pop}
            hit={b.hit}
            opacity={b.opacity}
            gaze={b.gaze}
            smileFlat={b.smileFlat}
            faceWarp={b.faceWarp}
            faceDir={faceDir}
            ringTilt={[-0.5, 0, 0.3]}
            ringSpeed={reduced ? 0.6 : b.ringSpeed}
            env="core"
          />
        </group>
      )}
      {b && bubbleCenter && sa.visible && input.snipes.map((k, i) => <SnipeBeam key={'s' + i} from={bubbleCenter} to={sahurChest} k={k} frame={f} />)}

      <SahurActor s={sa} frame={f} q={quality} />
      <PlayerBlob p={input.player} frame={f} />
      <Bullets list={input.bullets} />
      <Particles list={input.parts} step={quality === 'high' ? 1 : 2} />

      {quality === 'high' && <Post bloom={0.8} threshold={1.1} radius={0.55} vignette={0.28} chroma={reduced ? 0 : popFlash * 3} />}
    </>
  );
};
