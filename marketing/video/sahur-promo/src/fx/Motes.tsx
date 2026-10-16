// Motes: drifting dust / embers / data specks inside a box, as GPU points. Pure function of `frame`.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { mulberry32 } from '../enemies/lib/math';

const VERT = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime; uniform vec3 uBox; uniform vec3 uVel; uniform float uSize; uniform float uViewH; uniform float uWander;
varying float vA; varying float vS;
void main(){
  vec3 p = aSeed * uBox;
  p += uVel * uTime * (0.6 + 0.8 * aSeed.y);
  p += uWander * vec3(sin(uTime * 0.7 + aSeed.x * 40.0), sin(uTime * 0.53 + aSeed.z * 30.0), cos(uTime * 0.61 + aSeed.y * 50.0));
  p = mod(p, uBox) - uBox * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float s = uSize * (0.35 + aSeed.z);
  gl_PointSize = max(1.0, s * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z);
  gl_Position = projectionMatrix * mv;
  // fade near the box edges so wrapping is invisible
  vec3 e = abs(p) / (uBox * 0.5);
  vA = (1.0 - smoothstep(0.75, 1.0, max(e.x, max(e.y, e.z)))) * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed.x * 60.0));
  vS = aSeed.y;
}`;
const FRAG = /* glsl */ `
uniform vec3 uColor; uniform vec3 uColor2; uniform float uIntensity; uniform float uOpacity; uniform float uSquare;
varying float vA; varying float vS;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q) * 2.0;
  float soft = exp(-d * d * 3.5) * (1.0 - smoothstep(0.8, 1.0, d));
  float sq = step(max(abs(q.x), abs(q.y)), 0.42);
  float m = mix(soft, sq, uSquare);
  vec3 c = mix(uColor, uColor2, step(0.7, vS)) * uIntensity;
  float a = m * vA * uOpacity;
  gl_FragColor = vec4(c * a, a);
  #include <colorspace_fragment>
}`;

export const Motes: React.FC<{
  frame: number;
  count?: number;
  box?: [number, number, number];
  center?: [number, number, number];
  vel?: [number, number, number];
  wander?: number;
  size?: number; // world units
  color?: string;
  color2?: string;
  intensity?: number;
  opacity?: number;
  square?: boolean; // pixel squares instead of soft dots
  additive?: boolean;
  seed?: number;
}> = ({ frame, count = 200, box = [10, 5, 10], center = [0, 2.5, 0], vel = [0, 0.15, 0], wander = 0.3, size = 0.05, color = '#ffffff', color2, intensity = 1, opacity = 1, square = false, additive = true, seed = 1 }) => {
  const size2 = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const geo = useMemo(() => {
    const r = mulberry32(seed * 1013 + 5);
    const pos = new Float32Array(count * 3);
    const sd = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) sd[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 3));
    return g;
  }, [count, seed]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBox: { value: new THREE.Vector3() },
          uVel: { value: new THREE.Vector3() },
          uSize: { value: 0.05 },
          uViewH: { value: 1080 },
          uWander: { value: 0.3 },
          uColor: { value: new THREE.Color() },
          uColor2: { value: new THREE.Color() },
          uIntensity: { value: 1 },
          uOpacity: { value: 1 },
          uSquare: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    [additive],
  );
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const u = mat.uniforms;
  u.uTime.value = frame / 60;
  (u.uBox.value as THREE.Vector3).set(...box);
  (u.uVel.value as THREE.Vector3).set(...vel);
  u.uSize.value = size;
  u.uViewH.value = size2.height * dpr;
  u.uWander.value = wander;
  (u.uColor.value as THREE.Color).set(color);
  (u.uColor2.value as THREE.Color).set(color2 ?? color);
  u.uIntensity.value = intensity;
  u.uOpacity.value = opacity;
  u.uSquare.value = square ? 1 : 0;
  return <points geometry={geo} material={mat} position={center} frustumCulled={false} />;
};
