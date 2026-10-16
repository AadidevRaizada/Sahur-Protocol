// BUZZWORD DRONE (#35e8ff): keeps its distance, fires jargon. A faceted cyan diamond (octahedron)
// with glowing edges, a spinning rotor bar on a mast, one dark lens eye with a white glint, and a
// thruster glow. `fire` 0..1 runs one shot; <JargonBolt> is the glowing glyph projectile.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';
import { useToy, useGlowMat } from './lib/toy';
import { FloorGlow, GlowSprite, useCanvasTexture, useSpriteMaterial } from './lib/scene';
import { F_PRESS, font, useEnemyFonts } from './lib/fonts';
import { bump, clamp, invLerp } from './lib/math';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

export type DroneProps = EnemyBase & {
  /** 0..1 one firing cycle: 0-0.2 charge, 0.2 shot + recoil, 0.2-1 the bolt travels */
  fire?: number;
  /** where the bolt goes, in the drone's local space (default straight ahead, toward +z) */
  boltTarget?: [number, number, number];
  glyph?: string;
  /** hover height of the body centre */
  hover?: number;
  /** body yaw (look direction), radians */
  yaw?: number;
};

const RX = 0.42; // equatorial radius
const RY = 0.53; // half height

const EDGE_PAIRS = (() => {
  const top: [number, number, number] = [0, RY, 0];
  const bot: [number, number, number] = [0, -RY, 0];
  const eq: [number, number, number][] = [
    [RX, 0, 0],
    [0, 0, RX],
    [-RX, 0, 0],
    [0, 0, -RX],
  ];
  const pairs: [[number, number, number], [number, number, number]][] = [];
  for (let i = 0; i < 4; i++) {
    pairs.push([top, eq[i]], [bot, eq[i]], [eq[i], eq[(i + 1) % 4]]);
  }
  return pairs;
})();

const Edge: React.FC<{ a: [number, number, number]; b: [number, number, number]; mat: THREE.Material; r?: number }> = ({ a, b, mat, r = 0.011 }) => {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const dir = vb.clone().sub(va);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: mid, quat: q, len: dir.length() };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} material={mat}>
      <cylinderGeometry args={[r, r, len, 6]} />
    </mesh>
  );
};

const ROTOR_FRAG = /* glsl */ `
uniform float uAng; uniform vec3 uCol; uniform float uAmt;
varying vec2 vUv;
void main(){
  vec2 q = vUv - 0.5;
  float r = length(q) * 2.0;
  float a = atan(q.y, q.x);
  float blade = pow(fract((a - uAng) / 3.14159265), 5.0);
  float ring = smoothstep(0.12, 0.25, r) * (1.0 - smoothstep(0.92, 1.0, r));
  float alpha = ring * (0.05 + 0.32 * blade) * uAmt;
  gl_FragColor = vec4(uCol * alpha, alpha);
  #include <colorspace_fragment>
}`;
const ROTOR_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** A glowing jargon glyph with a streak trail, flying from `from` to `to` as progress goes 0..1. */
export const JargonBolt: React.FC<{
  progress: number;
  from: [number, number, number];
  to: [number, number, number];
  glyph?: string;
  color?: string;
  size?: number;
}> = ({ progress, from, to, glyph = 'KPI', color = PAL.drone, size = 0.5 }) => {
  const ready = useEnemyFonts();
  const tex = useCanvasTexture(
    ready,
    256,
    128,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = font(F_PRESS, 44);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.fillText(glyph, w / 2, h / 2 + 3);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(glyph, w / 2, h / 2 + 3);
    },
    [glyph, color],
  );
  const mat = useSpriteMaterial(
    /* glsl */ `void main(){ vec4 t = texture2D(uMap, vUv); vec3 c = t.rgb * uIntensity; gl_FragColor = vec4(c * t.a * uOpacity, t.a * uOpacity);
    #include <colorspace_fragment>
    }`,
    true,
  );
  const trail = useGlowMat(color, 2.2, 0.85);
  const core = useGlowMat('#ffffff', 2.5, 0.9);
  const p = clamp(progress);
  if (p <= 0 || p >= 1 || !tex) return null;
  const e = p; // constant speed
  const head = new THREE.Vector3(...from).lerp(new THREE.Vector3(...to), e);
  const tailT = Math.max(0, e - 0.22);
  const tail = new THREE.Vector3(...from).lerp(new THREE.Vector3(...to), tailT);
  const dir = head.clone().sub(tail);
  const len = Math.max(0.001, dir.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const mid = head.clone().add(tail).multiplyScalar(0.5);
  mat.uniforms.uMap.value = tex;
  (mat.uniforms.uSize.value as THREE.Vector2).set(size * 2, size);
  mat.uniforms.uIntensity.value = 2.2;
  mat.uniforms.uOpacity.value = 1 - invLerp(0.9, 1, p);
  return (
    <group>
      <mesh position={mid} quaternion={q} material={trail} renderOrder={6}>
        <cylinderGeometry args={[0.045, 0.005, len, 10, 1, true]} />
      </mesh>
      <mesh position={mid} quaternion={q} material={core} renderOrder={6}>
        <cylinderGeometry args={[0.014, 0.002, len, 8, 1, true]} />
      </mesh>
      <GlowSprite color={color} size={0.7} intensity={1.6} position={[head.x, head.y, head.z]} renderOrder={6} />
      <mesh position={head} material={mat} renderOrder={7} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};

export const Drone: React.FC<DroneProps> = ({
  frame,
  hit = 0,
  death = 0,
  scale = 1,
  seed = 1,
  floor = true,
  fire = 0,
  boltTarget = [0, -0.2, 3.5],
  glyph = 'KPI',
  hover = 1.15,
  yaw = 0,
}) => {
  const t = frame / 60 + seed * 2.1;
  const dead = clamp(death);
  const charge = invLerp(0, 0.2, fire) * (fire < 0.2 ? 1 : 1 - invLerp(0.2, 0.35, fire));
  const recoil = fire > 0.2 ? Math.exp(-(fire - 0.2) * 14) * Math.sin(Math.min(1, (fire - 0.2) * 10) * Math.PI * 0.5 + 0.0) : 0;
  const muzzle = bump(0.19, 0.34, fire);
  const flash = Math.max(hit, bump(0, 0.12, dead));
  const dissolve = invLerp(0.05, 0.6, dead);

  const bob = 0.07 * Math.sin(t * 2.3) + 0.02 * Math.sin(t * 5.1);
  const sway = 0.07 * Math.sin(t * 1.3);
  const lookYaw = yaw + 0.22 * Math.sin(t * 0.7);
  const rotorAng = frame * 0.55 + seed;

  const body = useToy(
    { color: PAL.drone, deep: '#03151c', fill: 0.78, rimStrength: 1.3, rimPower: 2.0, spec: 1.1, gloss: 60, glow: 0.08 + charge * 0.5, flash, dissolve, edge: PAL.drone },
    { flat: true },
  );
  const lens = useToy({ color: '#05080d', deep: '#000000', fill: 1, rim: PAL.drone, rimStrength: 0.6 + charge * 2.5, spec: 2.2, gloss: 160, glow: charge * 0.8, flash: flash * 0.3, dissolve });
  const metal = useToy({ color: '#1b2a33', deep: '#05080b', fill: 1, rim: PAL.drone, rimStrength: 0.8, spec: 1.2, gloss: 70, flash, dissolve });
  const edgeMat = useGlowMat('#bff8ff', 2.0 * (1 - dissolve), 1);
  const bezel = useToy({ color: PAL.drone, fill: 1, glow: 0.9 + charge * 1.5, rimStrength: 0.8, spec: 0.5, flash, dissolve });
  const bar = useToy({ color: '#c9f9ff', deep: '#0b3540', fill: 1, glow: 0.5, rim: PAL.drone, rimStrength: 1.2, spec: 1, flash, dissolve });

  const rotorMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uAng: { value: 0 }, uCol: { value: new THREE.Color(PAL.drone) }, uAmt: { value: 1 } },
        vertexShader: ROTOR_VERT,
        fragmentShader: ROTOR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  rotorMat.uniforms.uAng.value = rotorAng;
  rotorMat.uniforms.uAmt.value = 1 - dissolve;

  const lensWorldZ = 0.43;
  const alive = dead < 0.999;
  const y = hover + bob;
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={PAL.drone} radius={0.9} intensity={0.35 * (1 - dissolve)} shadow={0.35 * (1 - dissolve)} />}
      {alive && (
        <group position={[0, y, -recoil * 0.16]} rotation={[0.08 - recoil * 0.25, lookYaw, sway]}>
          {/* faceted diamond body */}
          <mesh material={body} scale={[1, RY / RX, 1]}>
            <octahedronGeometry args={[RX, 0]} />
          </mesh>
          {EDGE_PAIRS.map(([a, b], i) => (
            <Edge key={i} a={a} b={b} mat={edgeMat} />
          ))}
          {/* lens eye on the front vertex */}
          <mesh material={lens} position={[0, 0, 0.33]}>
            <sphereGeometry args={[0.13, 32, 24]} />
          </mesh>
          <mesh material={bezel} position={[0, 0, 0.36]}>
            <torusGeometry args={[0.135, 0.018, 10, 40]} />
          </mesh>
          <GlowSprite color="#ffffff" size={0.08} intensity={3} position={[-0.035, 0.04, lensWorldZ + 0.04]} renderOrder={6} />
          {charge > 0.01 && <GlowSprite color={PAL.drone} size={0.6 * charge + 0.1} intensity={2 * charge} position={[0, 0, lensWorldZ + 0.05]} />}
          {muzzle > 0.01 && <GlowSprite color="#ffffff" size={0.9 * muzzle} intensity={3 * muzzle} position={[0, 0, lensWorldZ + 0.12]} />}
          {/* rotor mast + bar + motion disc */}
          <mesh material={metal} position={[0, RY + 0.05, 0]}>
            <cylinderGeometry args={[0.022, 0.03, 0.14, 10]} />
          </mesh>
          <mesh material={metal} position={[0, RY + 0.13, 0]}>
            <sphereGeometry args={[0.042, 16, 12]} />
          </mesh>
          <group position={[0, RY + 0.13, 0]} rotation={[0, rotorAng, 0]}>
            <mesh material={bar}>
              <boxGeometry args={[1.22, 0.022, 0.07]} />
            </mesh>
          </group>
          <mesh material={rotorMat} position={[0, RY + 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.32, 1.32]} />
          </mesh>
          {/* thruster */}
          <GlowSprite color={PAL.drone} size={0.42} intensity={1.4 * (1 - dissolve)} position={[0, -RY - 0.06, 0]} />
        </group>
      )}
      {fire > 0.2 && fire < 1 && (
        <JargonBolt
          progress={invLerp(0.2, 1, fire)}
          from={[0, y, lensWorldZ + 0.1]}
          to={[boltTarget[0], hover + boltTarget[1], boltTarget[2]]}
          glyph={glyph}
        />
      )}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.drone} origin={[0, y, 0]} seed={seed + 4} count={40} radius={0.4} />}
    </group>
  );
};
