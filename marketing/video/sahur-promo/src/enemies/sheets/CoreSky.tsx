// The Core's sky: an off-white dome with a far, low horizon line and layered lavender haze bands.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';

const VERT = /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
#ifndef SQ_DEF
#define SQ_DEF
float sq(float x){ return x * x; }
#endif
uniform vec3 uTop; uniform vec3 uHaze; uniform vec3 uLine; uniform vec3 uGround; uniform vec3 uTint;
varying vec3 vDir;
void main(){
  float e = vDir.y;
  vec3 c = mix(uHaze, uTop, smoothstep(0.0, 0.35, e));
  c = mix(c, uTint, 0.10 * exp(-sq((e - 0.035) / 0.012)));
  c = mix(c, uHaze * 0.985, 0.6 * exp(-sq((e - 0.075) / 0.02)));
  c = mix(c, uTint, 0.05 * exp(-sq((e - 0.14) / 0.03)));
  c = mix(c, uLine, 0.75 * exp(-sq(e / 0.0035)));
  c = mix(c, uGround, smoothstep(0.0, -0.02, e));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export const CoreSky: React.FC<{ radius?: number }> = ({ radius = 700 }) => {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: new THREE.Color('#f9f8ff') },
          uHaze: { value: new THREE.Color('#e9e5f8') },
          uLine: { value: new THREE.Color('#b3a9da') },
          uGround: { value: new THREE.Color('#e4e0f4') },
          uTint: { value: new THREE.Color('#f3dcf0') },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => m.dispose(), [m]);
  return (
    <mesh material={m} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 64, 32]} />
    </mesh>
  );
};
