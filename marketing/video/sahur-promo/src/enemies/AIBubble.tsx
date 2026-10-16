// THE AI BUBBLE (final boss). A huge iridescent soap-film sphere: glossy, hollow, beautiful, empty.
// Thin-film interference through the Bubble palette, a specular arc, a reflection of the Core, an
// almost-right face (eyes of different sizes drifting apart, a too-wide smile that never follows them),
// orbiting hype-phrase rings, and states for inflate / dent / leak / seam / shed / pop.
// Origin = the bubble's centre. `radius` = world radius at inflate 0.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { FILM_FRAG, FILM_VERT } from './bubble/film';
import { HypeRings, DEFAULT_PHRASES } from './bubble/HypeRings';
import { BubbleBurst } from './bubble/BubbleBurst';
import { useToy } from './lib/toy';
import { GlowSprite, useSpriteMaterial } from './lib/scene';
import { bump, clamp, easeInCubic, easeOutCubic, fract, invLerp, lerp } from './lib/math';

export type AIBubbleProps = {
  frame: number;
  radius?: number;
  /** 0..1: grows to 1.65x, the film thins and its colours intensify, wobble tightens */
  inflate?: number;
  /** 0..1: violet pools and drips from the bottom; the wobble goes unstable and it sags */
  leak?: number;
  /** 0..1: 0-0.15 tear with a bright rim, 0.15-0.6 burst (shreds, droplets, shockwave, flash), 0.6-1 hype letters fall and dissolve */
  pop?: number;
  /** 0..1: a TUNG ring front climbs from the base to the crown, denting the film and glowing amber */
  dent?: number;
  /** dimple depth as a fraction of the radius (0.06 = the big TUNGs; ~0.02 for a small absorbed ripple) */
  dentAmp?: number;
  /** 0..1: a seam rips open across the lower-left front and leaks violet */
  seam?: number;
  /** 0..1: hype letters detach and fall like confetti */
  shed?: number;
  /** extra rotation of the ring system [x, y, z]; for a camera below at elevation e, use [e, 0, 0] so the rings' near side faces it */
  ringTilt?: [number, number, number];
  /** ring radius multiplier (default 1: rings at 1.27, 1.42, 1.57 x radius) */
  ringScale?: number;
  /** ring letter size multiplier */
  ringLetterScale?: number;
  /** ring letters face the Bubble, so the far side reads correctly through the film (use from close up) */
  ringsInward?: boolean;
  /** ring letters nearer to the camera than this (world units) fade out */
  ringNearFade?: number;
  /** ring orbit speed multiplier (the storyboard speeds them up x2.5 while it grows) */
  ringSpeed?: number;
  rings?: boolean;
  ringStyle?: 'corporate' | 'pixel';
  phrases?: [string, string, string];
  face?: boolean;
  /** eyes' look direction, roughly -1..1 in x and y */
  gaze?: [number, number];
  /** smile width multiplier (1 = the default, already too wide) */
  smile?: number;
  /** 0..1 the smile flattens */
  smileFlat?: number;
  /** 0..1 the eyes slide off-axis */
  faceWarp?: number;
  /** extra eye drift apart (added to the slow idle drift) */
  eyeDrift?: number;
  /** rotate where the face sits on the sphere: [pitch, yaw] radians; pitch > 0 turns it down (to look at a camera below), yaw > 0 turns it right */
  faceDir?: [number, number];
  hit?: number;
  /** reflection world: the white Core (default) or a dark set */
  env?: 'core' | 'dark';
  /** optional equirect texture mirrored in the film (e.g. the blue bedroom, the phone reel) */
  reflectionMap?: THREE.Texture | null;
  reflectionAmt?: number;
  /** overall film opacity multiplier */
  opacity?: number;
  seed?: number;
};

const TEAR_DIR = new THREE.Vector3(0.45, -0.3, 0.84).normalize();

const TWINKLE = /* glsl */ `
void main(){
  vec2 q = (vUv - 0.5) * 2.0;
  float r = length(q);
  float rays = exp(-abs(q.x) * 40.0) * exp(-abs(q.y) * 2.2) + exp(-abs(q.y) * 40.0) * exp(-abs(q.x) * 2.2);
  float core = exp(-r * r * 60.0);
  float a = clamp(rays + core, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(uColor * uIntensity * a, a);
  #include <colorspace_fragment>
}`;

const Twinkle: React.FC<{ position: [number, number, number]; size: number; amt: number; color?: string }> = ({ position, size, amt, color = '#ffffff' }) => {
  const m = useSpriteMaterial(TWINKLE, true);
  (m.uniforms.uColor.value as THREE.Color).set(color);
  (m.uniforms.uSize.value as THREE.Vector2).set(size, size);
  m.uniforms.uIntensity.value = 2.5;
  m.uniforms.uOpacity.value = amt;
  if (amt <= 0.01) return null;
  return (
    <mesh material={m} position={position} renderOrder={9} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};

/** Violet drip strand hanging from the bottom pole, with drops falling off it. Local units (radius 1). */
const BubbleDrip: React.FC<{ t: number; leak: number; y: number; S: number }> = ({ t, leak, y, S }) => {
  const mat = useToy({ color: '#8f7bff', deep: '#1b0f55', rim: '#ffb3f2', rimStrength: 1.6, fill: 0.95, spec: 1.8, gloss: 120, glow: 0.3 });
  if (leak <= 0.01) return null;
  const strands = [
    { x: 0.0, z: 0.05, ph: 0, s: 1.35 },
    { x: 0.2, z: 0.12, ph: 0.45, s: 0.95 },
    { x: -0.16, z: 0.14, ph: 0.75, s: 0.85 },
    { x: 0.07, z: -0.16, ph: 0.2, s: 0.7 },
    { x: -0.27, z: -0.02, ph: 0.6, s: 0.6 },
  ];
  return (
    <group position={[0, y, 0]}>
      {strands.map((st, i) => {
        const on = invLerp(i * 0.15, i * 0.15 + 0.3, leak);
        if (on <= 0) return null;
        const u = fract(t / 1.15 + st.ph);
        const grow = easeInCubic(invLerp(0, 0.7, u));
        const fall = invLerp(0.7, 1, u);
        const len = (0.09 + 0.5 * grow * st.s) * on * (1 - 0.6 * easeOutCubic(fall));
        const bulb = (0.05 + 0.055 * grow) * st.s * on;
        const dy = fall > 0 ? -len - 2.2 * fall * fall : 0;
        const lift = S * (1 - Math.sqrt(Math.max(0, 1 - st.x * st.x - st.z * st.z))); // follow the underside
        return (
          <group key={i} position={[st.x * S, lift, st.z * S]}>
            <mesh material={mat} position={[0, -len / 2, 0]}>
              <cylinderGeometry args={[0.024 * st.s + 0.012, 0.055 * st.s + 0.016, len, 16]} />
            </mesh>
            <mesh material={mat} position={[0, fall > 0 ? dy - bulb : -len - bulb * 0.6, 0]} scale={[1, fall > 0 ? 1.3 : 1.15, 1]}>
              <sphereGeometry args={[bulb, 18, 14]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export const AIBubble: React.FC<AIBubbleProps> = ({
  frame,
  radius = 1,
  inflate = 0,
  leak = 0,
  pop = 0,
  dent = 0,
  dentAmp = 0.06,
  seam = 0,
  shed = 0,
  ringSpeed = 1,
  ringTilt = [0, 0, 0],
  ringScale = 1,
  ringLetterScale = 1,
  ringsInward = false,
  ringNearFade = 0,
  rings = true,
  ringStyle = 'corporate',
  phrases = DEFAULT_PHRASES,
  face = true,
  gaze = [0, 0],
  smile = 1,
  smileFlat = 0,
  faceWarp = 0,
  eyeDrift = 0,
  faceDir = [0, 0],
  hit = 0,
  env = 'core',
  reflectionMap = null,
  reflectionAmt = 0,
  opacity = 1,
  seed = 1,
}) => {
  const t = frame / 60 + seed * 3.1;
  const I = clamp(inflate);
  const Lk = clamp(leak);
  const P = clamp(pop);
  const S = 1 + 0.65 * I;
  const tear = Math.pow(invLerp(0, 0.15, P), 1.35);
  // one bright flash cluster at the tear (pop 0.10-0.18): blows out under bloom
  const popFlash = bump(0.095, 0.185, P);

  const geo = useMemo(() => new THREE.SphereGeometry(1, 200, 150), []);
  const [front, back] = useMemo(() => {
    const mk = (isBack: boolean) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWobble: { value: 0.02 },
          uUnstable: { value: 0 },
          uSag: { value: 0 },
          uDent: { value: 0 },
          uDentAmp: { value: 0.06 },
          uDentGlow: { value: 1 },
          uTear: { value: 0 },
          uTearDir: { value: TEAR_DIR.clone() },
          uInflate: { value: 0 },
          uLeak: { value: 0 },
          uSeam: { value: 0 },
          uFace: { value: isBack ? 0 : 1 },
          uBack: { value: isBack ? 1 : 0 },
          uFlash: { value: 0 },
          uDark: { value: 0 },
          uOpacity: { value: 1 },
          uEyeL: { value: new THREE.Vector2() },
          uEyeR: { value: new THREE.Vector2() },
          uEyeRad: { value: new THREE.Vector2() },
          uSmile: { value: new THREE.Vector3() },
          uSmileX: { value: 0 },
          uFaceStretch: { value: 0 },
          uFaceRot: { value: new THREE.Matrix3() },
          uRefl: { value: null },
          uReflAmt: { value: 0 },
        },
        vertexShader: FILM_VERT,
        fragmentShader: FILM_FRAG,
        transparent: true,
        depthWrite: false,
        side: isBack ? THREE.BackSide : THREE.FrontSide,
      });
    return [mk(false), mk(true)];
  }, []);
  useEffect(() => () => { geo.dispose(); front.dispose(); back.dispose(); }, [geo, front, back]);

  // face (in lon/lat radians on the sphere): eyes 1:1.35 drifting apart; the right eye now and then
  // lags 2-3 frames and holds (a frame skip); a thin, too-wide smile that never follows them
  const eyePos = (tt: number) => 0.06 * Math.sin(tt * 0.45) + 0.025 * Math.sin(tt * 1.13) + 0.07 * I + eyeDrift + 0.05 * clamp(tt / 20);
  const lagWin = fract((frame + seed * 37) / 110) < 0.25; // a quarter of the time
  const fR = lagWin ? Math.floor((frame - 2) / 3) * 3 : frame;
  const tR = fR / 60 + seed * 3.1;
  const drift = eyePos(t);
  const driftR = eyePos(tR);
  const fw = clamp(faceWarp);
  const eyeL = new THREE.Vector2(-0.3 - drift + gaze[0] * 0.08 - 0.06 * fw, 0.15 + 0.012 * Math.sin(t * 0.7) + gaze[1] * 0.07 - 0.08 * fw);
  const eyeR = new THREE.Vector2(0.31 + driftR + gaze[0] * 0.08 + 0.07 * fw, 0.21 + 0.01 * Math.sin(tR * 0.6) + gaze[1] * 0.07 + 0.1 * fw);
  const eyeRad = new THREE.Vector2(0.082 * (1 + 0.06 * I), 0.082 * 1.35 * (1 + 0.1 * I));
  const sw = Math.min(0.66 * smile, 1.0);
  const rs = Math.max(0.95 / (1 - 0.7 * clamp(smileFlat)), sw * 1.03);
  const bottom = -0.36;
  const faceRot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-faceDir[0], -faceDir[1], 0, 'YXZ')));

  for (const m of [front, back]) {
    const u = m.uniforms;
    u.uTime.value = t;
    u.uWobble.value = lerp(0.022, 0.01, I) + 0.02 * Lk;
    u.uUnstable.value = 0.035 * Lk + 0.01 * clamp(seam);
    u.uSag.value = Lk;
    u.uDent.value = clamp(dent);
    u.uDentAmp.value = dentAmp;
    u.uTear.value = tear;
    u.uInflate.value = I;
    u.uLeak.value = Lk;
    u.uSeam.value = clamp(seam);
    u.uFlash.value = Math.max(clamp(hit), popFlash * 0.9);
    u.uDark.value = env === 'dark' ? 1 : 0;
    u.uOpacity.value = opacity;
    (u.uEyeL.value as THREE.Vector2).copy(eyeL);
    (u.uEyeR.value as THREE.Vector2).copy(eyeR);
    (u.uEyeRad.value as THREE.Vector2).copy(eyeRad);
    (u.uSmile.value as THREE.Vector3).set(bottom + rs, rs, sw);
    u.uSmileX.value = 0.03 - drift * 0.15;
    u.uFaceStretch.value = tear;
    (u.uFaceRot.value as THREE.Matrix3).copy(faceRot);
    u.uRefl.value = reflectionMap;
    u.uReflAmt.value = reflectionMap ? reflectionAmt : 0;
  }
  front.uniforms.uFace.value = face ? 1 : 0;

  const filmOn = tear < 0.999;
  const glint = (k: number) => clamp(0.55 + 0.45 * Math.sin(t * (2.2 + k) + k * 2)) * (1 - tear);
  const sagY = -(1 + 0.012) * S - Lk * 0.14 * S;
  return (
    <group scale={radius}>
      {rings && (
        <HypeRings
          frame={frame}
          scale={S}
          phrases={phrases}
          style={ringStyle}
          speed={ringSpeed}
          shed={shed}
          pop={P}
          unstable={Lk * 0.6 + clamp(seam) * 0.4}
          stutter={bump(0, 0.5, clamp(dent)) * (dentAmp > 0.03 ? 1 : 0.3)}
          tilt={ringTilt}
          ringScale={ringScale}
          letterScale={ringLetterScale}
          inward={ringsInward}
          nearFade={ringNearFade}
        />
      )}
      {filmOn && (
        <group scale={S}>
          <mesh geometry={geo} material={back} renderOrder={2} />
          <mesh geometry={geo} material={front} renderOrder={3} />
        </group>
      )}
      {filmOn && <BubbleDrip t={t} leak={Lk} y={sagY + 0.02 * S} S={S} />}
      {filmOn && (
        <>
          <Twinkle position={[-0.62 * S, 0.58 * S, 0.55 * S]} size={0.34 * S} amt={glint(0) * 0.9} />
          <Twinkle position={[-0.2 * S, 0.84 * S, 0.5 * S]} size={0.18 * S} amt={glint(1) * 0.7} color="#c8f4ff" />
          <Twinkle position={[0.55 * S, -0.5 * S, 0.66 * S]} size={0.14 * S} amt={glint(2) * 0.6} color="#ffb3f2" />
        </>
      )}
      {P > 0 && <BubbleBurst pop={P} scale={S} tearDir={TEAR_DIR} seed={seed} dark={env === 'dark'} />}
      {P > 0 && P < 0.16 && <GlowSprite color="#ffffff" size={0.9 * S} intensity={2.5 * tear} position={[TEAR_DIR.x * S, TEAR_DIR.y * S, TEAR_DIR.z * S]} renderOrder={9} />}
      {popFlash > 0.01 && <GlowSprite color="#ffffff" size={4.2 * S * (0.6 + 0.4 * popFlash)} intensity={9 * popFlash} renderOrder={10} />}
      {popFlash > 0.01 && <GlowSprite color="#ffe9fb" size={7 * S} intensity={2.5 * popFlash} renderOrder={10} />}
    </group>
  );
};

/** 0..1 how much white a full-frame overlay should add for the pop flash (for DOM overlays). */
export const bubblePopFlash = (pop: number) => bump(0.095, 0.185, pop);
