// GodRays: faint light shafts from a source (behind/above something) fanning down to the ground.
// Each ray is a quad billboarded around its own axis in the vertex shader. Additive and HDR, so a
// white world can still show them under bloom. Pure function of `frame`.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { mulberry32 } from '../enemies/lib/math';

const VERT = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform float uWA; uniform float uWB;
varying vec2 vUv;
void main(){
  vUv = uv;
  float v = uv.y;
  vec3 axis = uB - uA;
  vec3 c = mix(uA, uB, v);
  vec3 toCam = normalize(cameraPosition - c);
  vec3 side = normalize(cross(axis, toCam));
  float w = mix(uWA, uWB, v);
  vec3 p = c + side * (uv.x - 0.5) * w;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uI; uniform float uT; uniform float uSeed;
varying vec2 vUv;
void main(){
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
  across = across * across;
  float along = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
  float fl = 0.75 + 0.25 * sin(uT * 0.8 + uSeed * 7.0 + vUv.y * 3.0);
  float a = across * along * fl * uI;
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`;

export const GodRays: React.FC<{
  frame: number;
  source: [number, number, number];
  /** end points the rays reach (e.g. on the ground) */
  ends: [number, number, number][];
  width?: [number, number];
  intensity?: number;
  colors?: string[];
  seed?: number;
}> = ({ frame, source, ends, width = [2, 14], intensity = 0.35, colors = ['#ffffff', '#ffe3f8', '#e3f8ff'], seed = 1 }) => {
  const mats = useMemo(() => {
    const r = mulberry32(seed * 19 + 3);
    return ends.map(
      (_, i) =>
        new THREE.ShaderMaterial({
          uniforms: {
            uA: { value: new THREE.Vector3() },
            uB: { value: new THREE.Vector3() },
            uWA: { value: 1 },
            uWB: { value: 1 },
            uColor: { value: new THREE.Color(colors[i % colors.length]) },
            uI: { value: 1 },
            uT: { value: 0 },
            uSeed: { value: r() },
          },
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ends.length, seed]);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 8).translate(0.5, 0.5, 0), []);
  useEffect(
    () => () => {
      mats.forEach((m) => m.dispose());
      geo.dispose();
    },
    [mats, geo],
  );
  return (
    <group>
      {ends.map((e, i) => {
        const m = mats[i];
        (m.uniforms.uA.value as THREE.Vector3).set(...source);
        (m.uniforms.uB.value as THREE.Vector3).set(...e);
        m.uniforms.uWA.value = width[0];
        m.uniforms.uWB.value = width[1] * (0.7 + 0.6 * ((i * 0.37) % 1));
        m.uniforms.uI.value = intensity * (0.6 + 0.4 * Math.sin((frame / 60) * 0.5 + i * 1.7));
        m.uniforms.uT.value = frame / 60;
        return <mesh key={i} geometry={geo} material={m} frustumCulled={false} renderOrder={20} />;
      })}
    </group>
  );
};
