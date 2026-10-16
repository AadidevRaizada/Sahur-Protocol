// A small amber ring rolling across the ground (the stump taps in S17, your weak ring in S23).
// Origin = centre on the ground. `progress` 0..1 drives radius 0 -> `radius` (outCubic) and the fade.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../../lib/palette';
import { clamp } from '../../rig/util';

const VERT = /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
uniform float uR; uniform float uW; uniform float uA; uniform vec3 uCol; uniform float uFlick;
varying vec2 vP;
float h(float n){ return fract(sin(n * 91.3) * 4375.85); }
void main(){
  float r = length(vP);
  float d = (r - uR) / max(uW, 1e-4);
  float edge = exp(-d * d * 3.0);
  float inner = (r < uR) ? exp(-(uR - r) / max(uW * 3.0, 1e-4)) * 0.35 : 0.0;
  float ang = atan(vP.y, vP.x);
  float seg = floor((ang + 3.1416) / 6.2832 * 48.0);
  float broken = mix(1.0, step(0.25, h(seg + uFlick * 13.0)), 0.6);
  float a = (edge + inner) * uA * broken;
  gl_FragColor = vec4(uCol * a, a);
  #include <colorspace_fragment>
}`;

export const AmberRing: React.FC<{ progress: number; radius?: number; width?: number; opacity?: number; intensity?: number; flicker?: number; position?: [number, number, number] }> = ({ progress, radius = 1.2, width = 0.035, opacity = 0.8, intensity = 3, flicker = 0, position = [0, 0, 0] }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uR: { value: 0 }, uW: { value: 0.03 }, uA: { value: 1 }, uCol: { value: new THREE.Color(PAL.real) }, uFlick: { value: 0 } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), []);
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return null;
  const R = radius * (1 - Math.pow(1 - p, 3));
  mat.uniforms.uR.value = R;
  mat.uniforms.uW.value = width * (1 + p);
  mat.uniforms.uA.value = opacity * (1 - p) * (1 - p);
  (mat.uniforms.uCol.value as THREE.Color).set(PAL.real).multiplyScalar(intensity);
  mat.uniforms.uFlick.value = flicker;
  return (
    <mesh position={[position[0], position[1] + 0.012, position[2]]} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={8}>
      <circleGeometry args={[radius * 1.25, 96]} />
    </mesh>
  );
};
