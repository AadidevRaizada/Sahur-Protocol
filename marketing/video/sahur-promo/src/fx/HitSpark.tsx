// HitSpark: a camera-facing star burst (white core, coloured rays of uneven length) plus a few
// spark streaks flying out. Over in ~12 frames at 60 fps: drive `progress` 0..1 fast.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useSpriteMaterial, GlowSprite } from '../enemies/lib/scene';
import { clamp, easeOutCubic, easeOutExpo, invLerp, mulberry32, TAU } from '../enemies/lib/math';

export type HitSparkProps = {
  progress: number;
  color?: string;
  size?: number;
  rays?: number;
  seed?: number;
  position?: [number, number, number];
  sparks?: number;
};

const STAR = /* glsl */ `
#ifndef SQ_DEF
#define SQ_DEF
float sq(float x){ return x * x; }
#endif
uniform float uRays; uniform float uSeed; uniform float uWidth; uniform float uLen; uniform float uCore;
void main(){
  vec2 q = (vUv - 0.5) * 2.0;
  float r = length(q);
  float a = atan(q.y, q.x) + uSeed;
  float k = a / 6.2831853 * uRays;
  float id = floor(k + 0.5);
  float f = abs(fract(k + 0.5) - 0.5);
  float len = uLen * (0.45 + 0.55 * fract(sin(id * 12.9898 + uSeed * 7.0) * 43758.5453));
  float taper = max(0.0, 1.0 - r / max(len, 0.0001));
  float w = uWidth * taper + 0.0001;
  float ray = exp(-sq(f / w)) * taper;
  float core = exp(-r * r * 30.0) * uCore;
  float halo = exp(-r * r * 6.0) * 0.35 * uCore;
  vec3 col = uColor * (ray * 1.4 + halo) + vec3(1.0) * (core * 2.0 + ray * ray * 1.2);
  col *= uIntensity;
  float al = clamp(ray + core + halo, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col * uOpacity, al);
  #include <colorspace_fragment>
}`;

export const HitSpark: React.FC<HitSparkProps> = ({ progress, color = '#ffffff', size = 1, rays = 8, seed = 1, position = [0, 0, 0], sparks = 8 }) => {
  const p = clamp(progress);
  const mat = useSpriteMaterial(STAR, true, {
    uRays: { value: 8 },
    uSeed: { value: 0 },
    uWidth: { value: 0.1 },
    uLen: { value: 1 },
    uCore: { value: 1 },
  });
  const sp = useMemo(() => {
    const r = mulberry32(seed * 131 + 7);
    return Array.from({ length: sparks }, (_, i) => ({ a: (i / sparks) * TAU + r() * 0.6, v: 0.6 + r() * 0.8, z: (r() - 0.5) * 0.4 }));
  }, [seed, sparks]);
  if (p <= 0 || p >= 1) return null;
  const grow = easeOutExpo(invLerp(0, 0.35, p));
  const fade = 1 - invLerp(0.35, 1, p);
  (mat.uniforms.uColor.value as THREE.Color).set(color);
  (mat.uniforms.uSize.value as THREE.Vector2).set(size * 1.6, size * 1.6);
  mat.uniforms.uRays.value = rays;
  mat.uniforms.uSeed.value = seed * 0.37;
  mat.uniforms.uWidth.value = 0.11 * (1 - 0.6 * p);
  mat.uniforms.uLen.value = 0.25 + 0.75 * grow;
  mat.uniforms.uCore.value = 1 - invLerp(0.1, 0.6, p);
  mat.uniforms.uIntensity.value = 2.2;
  mat.uniforms.uOpacity.value = fade;
  const d = easeOutCubic(p) * size * 0.9;
  return (
    <group position={position}>
      <mesh material={mat} renderOrder={8} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {sp.map((s, i) => (
        <GlowSprite
          key={i}
          color={i % 2 ? color : '#ffffff'}
          size={0.09 * size * (1 - p)}
          intensity={2.5}
          position={[Math.cos(s.a) * d * s.v, Math.sin(s.a) * d * s.v, s.z * d]}
          renderOrder={8}
        />
      ))}
    </group>
  );
};
