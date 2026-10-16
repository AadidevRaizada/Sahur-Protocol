// TungHeat: screen-space heat ripple riding a TUNG ring. A custom postprocessing Effect that bends UVs
// in a thin elliptical band (the ring's on-screen ellipse, projected from 3D every render).
// Put it INSIDE an <EffectComposer> (before Bloom), with the same centre/progress as the <TungWave>.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import { clamp, invLerp } from '../enemies/lib/math';
import { tungRadius } from './TungWave';

const FRAG = /* glsl */ `
#ifndef SQ_DEF
#define SQ_DEF
float sq(float x){ return x * x; }
#endif
uniform vec2 uCenter;
uniform vec2 uAxisA;
uniform vec2 uAxisB;
uniform float uWidth;
uniform float uStrength;
uniform float uPhase;
void mainUv(inout vec2 uv){
  if (uStrength <= 0.0) return;
  vec2 d = uv - uCenter;
  // express d in the ellipse's (A, B) basis
  mat2 M = mat2(uAxisA, uAxisB);
  float det = M[0][0] * M[1][1] - M[1][0] * M[0][1];
  if (abs(det) < 1e-6) return;
  mat2 Mi = mat2(M[1][1], -M[0][1], -M[1][0], M[0][0]) / det;
  vec2 e = Mi * d;
  float r = length(e);
  float band = exp(-sq((r - 1.0) / uWidth));
  float wob = sin(r * 60.0 - uPhase * 20.0) * 0.5 + 0.5;
  vec2 dir = normalize(d + 1e-6);
  uv -= dir * band * uStrength * (0.6 + 0.4 * wob);
}`;

class HeatRingEffect extends Effect {
  constructor() {
    super('HeatRingEffect', FRAG, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uAxisA', new THREE.Uniform(new THREE.Vector2(0.1, 0))],
        ['uAxisB', new THREE.Uniform(new THREE.Vector2(0, 0.1))],
        ['uWidth', new THREE.Uniform(0.08)],
        ['uStrength', new THREE.Uniform(0)],
        ['uPhase', new THREE.Uniform(0)],
      ]),
    });
  }
}

const V = new THREE.Vector3();
const toUv = (p: THREE.Vector3, cam: THREE.Camera) => {
  V.copy(p).project(cam);
  return new THREE.Vector2(V.x * 0.5 + 0.5, V.y * 0.5 + 0.5);
};

export const TungHeat: React.FC<{
  progress: number;
  center?: [number, number, number];
  big?: boolean;
  radius?: number;
  strength?: number;
}> = ({ progress, center = [0, 0, 0], big = false, radius, strength = 1 }) => {
  const camera = useThree((s) => s.camera);
  const effect = useMemo(() => new HeatRingEffect(), []);
  const p = clamp(progress);
  const maxR = radius ?? (big ? 40 : 7);
  const R = Math.max(0.01, tungRadius(p, maxR));
  camera.updateMatrixWorld();
  const c = new THREE.Vector3(...center);
  const uc = toUv(c, camera);
  const ua = toUv(c.clone().add(new THREE.Vector3(R, 0, 0)), camera).sub(uc);
  const ub = toUv(c.clone().add(new THREE.Vector3(0, 0, R)), camera).sub(uc);
  const u = effect.uniforms;
  (u.get('uCenter')!.value as THREE.Vector2).copy(uc);
  (u.get('uAxisA')!.value as THREE.Vector2).copy(ua);
  (u.get('uAxisB')!.value as THREE.Vector2).copy(ub);
  u.get('uWidth')!.value = big ? 0.06 : 0.09;
  u.get('uStrength')!.value = p > 0 && p < 1 ? 0.006 * strength * (1 - invLerp(0.4, 1, p)) * (big ? 1.6 : 1) : 0;
  u.get('uPhase')!.value = p;
  return <primitive object={effect} dispose={null} />;
};
