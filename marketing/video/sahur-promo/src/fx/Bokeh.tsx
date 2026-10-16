// Bokeh: large, defocused debris right in front of the lens (soft rounded squares), placed in screen
// space relative to a camera so they frame the shot. Pure function of `frame`.
import * as THREE from 'three';
import React from 'react';
import { useSpriteMaterial } from '../enemies/lib/scene';

const FRAG = /* glsl */ `
void main(){
  vec2 q = abs(vUv - 0.5) * 2.0;
  float d = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
  float m = 1.0 - smoothstep(0.55, 1.0, d);
  float ring = smoothstep(0.6, 0.85, d) * (1.0 - smoothstep(0.85, 1.0, d)) * 0.35;
  float a = (m * 0.75 + ring) * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`;

export type BokehItem = { x: number; y: number; d: number; size: number; color: string; rot?: number };

const BokehOne: React.FC<{ pos: THREE.Vector3; size: number; color: string; opacity: number; rot: number }> = ({ pos, size, color, opacity, rot }) => {
  const m = useSpriteMaterial(FRAG, false);
  m.blending = THREE.CustomBlending;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  (m.uniforms.uColor.value as THREE.Color).set(color);
  (m.uniforms.uSize.value as THREE.Vector2).set(size, size);
  m.uniforms.uOpacity.value = opacity;
  m.uniforms.uRot.value = rot;
  return (
    <mesh position={pos} material={m} renderOrder={30} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};

/** items: x, y in normalised screen coords (-1..1), d = distance from the eye (m), size in metres. */
export const Bokeh: React.FC<{
  frame: number;
  eye: [number, number, number];
  pitch: number;
  vfov: number;
  aspect: number;
  items: BokehItem[];
  opacity?: number;
}> = ({ frame, eye, pitch, vfov, aspect, items, opacity = 0.45 }) => {
  const t = frame / 60;
  const fwd = new THREE.Vector3(0, Math.sin(pitch), -Math.cos(pitch));
  const up = new THREE.Vector3(0, Math.cos(pitch), Math.sin(pitch));
  const right = new THREE.Vector3(1, 0, 0);
  const th = Math.tan(((vfov / 2) * Math.PI) / 180);
  return (
    <group>
      {items.map((it, i) => {
        const yy = it.y + 0.03 * Math.sin(t * 0.35 + i * 2) + t * 0.004 * (1 + (i % 3));
        const xx = it.x + 0.02 * Math.cos(t * 0.3 + i);
        const p = new THREE.Vector3(...eye)
          .addScaledVector(fwd, it.d)
          .addScaledVector(right, xx * it.d * th * aspect)
          .addScaledVector(up, yy * it.d * th);
        return <BokehOne key={i} pos={p} size={it.size} color={it.color} opacity={opacity} rot={(it.rot ?? 0) + t * 0.1 * ((i % 2) * 2 - 1)} />;
      })}
    </group>
  );
};
