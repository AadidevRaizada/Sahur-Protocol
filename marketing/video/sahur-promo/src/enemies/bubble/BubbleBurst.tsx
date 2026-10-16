// The pop: iridescent film shreds ("petals") and droplets thrown off where the tearing rim passes,
// a shockwave ring and a flash. All in bubble-local units (radius 1 * scale). Pure function of `pop`.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { BUBBLE_RAMP } from '../lib/glsl';
import { GlowSprite, useSpriteMaterial } from '../lib/scene';
import { bump, clamp, dragDist, invLerp, mulberry32, randDir } from '../lib/math';

const SHRED_VERT = /* glsl */ `
attribute float aHue;
attribute float aFade;
varying vec2 vUv;
varying float vHue;
varying float vFade;
varying vec3 vN;
varying vec3 vP;
void main(){
  vUv = uv;
  vHue = aHue;
  vFade = aFade;
  vec3 pos = position;
  pos.z += 0.18 * (uv.x - 0.5) * (uv.x - 0.5) * 4.0 - 0.09; // a little curl
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  vP = mv.xyz;
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * mv;
}`;
const SHRED_FRAG = /* glsl */ `
${BUBBLE_RAMP}
uniform float uDark;
varying vec2 vUv;
varying float vHue;
varying float vFade;
varying vec3 vN;
varying vec3 vP;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 q = vUv - 0.5;
  // torn petal: a pointed ellipse with a ragged edge
  float ang = atan(q.y, q.x);
  float rag = 0.06 * sin(ang * 7.0 + vHue * 40.0) + 0.04 * sin(ang * 13.0 + vHue * 90.0);
  float d = length(q * vec2(1.0, 1.9)) * 2.0 - rag;
  float m = 1.0 - smoothstep(0.86, 0.95, d);
  if (m < 0.05) discard;
  if (h21(floor(vUv * 18.0) + vHue * 50.0) > vFade) discard;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vP);
  float ndv = abs(dot(N, V));
  vec3 c = bubbleRamp(vHue + (1.0 - ndv) * 0.6);
  vec3 L = normalize(vec3(-0.5, 0.7, 0.5));
  float sp = pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 60.0);
  c = c * mix(0.75, 1.0, ndv) + vec3(1.0) * sp * 2.0;
  float edge = smoothstep(0.55, 0.9, d);
  c = mix(c, vec3(0.2, 0.12, 0.55), edge * 0.6 * (1.0 - uDark));
  float a = m * mix(0.55, 0.95, edge) * vFade;
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;

const DROP_VERT = /* glsl */ `
attribute float aHue;
varying float vHue;
varying vec3 vN;
varying vec3 vP;
void main(){
  vHue = aHue;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vP = mv.xyz;
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * mv;
}`;
const DROP_FRAG = /* glsl */ `
${BUBBLE_RAMP}
varying float vHue;
varying vec3 vN;
varying vec3 vP;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(-vP);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float F = pow(1.0 - ndv, 1.4);
  vec3 c = bubbleRamp(vHue + F * 0.7);
  vec3 L = normalize(vec3(-0.5, 0.7, 0.5));
  float sp = pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 80.0);
  c = mix(c * 1.1, vec3(0.22, 0.14, 0.6), smoothstep(0.75, 1.0, 1.0 - ndv) * 0.7) + vec3(2.0) * sp;
  gl_FragColor = vec4(c, mix(0.35, 1.0, F));
  #include <colorspace_fragment>
}`;

const RING_FRAG = /* glsl */ `
${BUBBLE_RAMP}
uniform float uR; uniform float uW; uniform float uA; uniform float uDark;
void main(){
  vec2 q = vUv - 0.5;
  float r = length(q) * 2.0;
  float a = atan(q.y, q.x);
  float ring = exp(-sq((r - uR) / uW));
  float inner = exp(-sq((r - uR * 0.92) / (uW * 2.5))) * 0.35;
  vec3 c = bubbleRamp(a / 6.2831853 * 2.0 + r);
  c = mix(c, vec3(0.32, 0.2, 0.85), 0.6 * (1.0 - uDark));
  float al = clamp(ring + inner, 0.0, 1.0) * uA;
  gl_FragColor = vec4(c * al * (1.0 + uDark * 1.5), al);
  #include <colorspace_fragment>
}`;

export type BubbleBurstProps = {
  pop: number;
  scale: number;
  tearDir: THREE.Vector3;
  shreds?: number;
  drops?: number;
  seed?: number;
  dark?: boolean;
};

const Mx = new THREE.Matrix4();
const Qx = new THREE.Quaternion();
const Px = new THREE.Vector3();
const Sx = new THREE.Vector3();
const AXx = new THREE.Vector3();

export const BubbleBurst: React.FC<BubbleBurstProps> = ({ pop, scale, tearDir, shreds = 400, drops = 260, seed = 1, dark = false }) => {
  const p = clamp(pop);
  const parts = useMemo(() => {
    const r = mulberry32(seed * 4241 + 3);
    const mk = (n: number, kind: 0 | 1) =>
      Array.from({ length: n }, () => {
        const d = randDir(r);
        return {
          d: new THREE.Vector3(...d),
          v: kind === 0 ? 0.32 + r() * 0.42 : 0.55 + r() * 0.9,
          size: kind === 0 ? 0.04 + r() * 0.08 : 0.01 + r() * 0.026,
          axis: new THREE.Vector3(...randDir(r)),
          spin: 4 + r() * 14,
          hue: r(),
          life: 0.62 + r() * 0.33,
          up: (r() - 0.5) * 0.3,
        };
      });
    return { sh: mk(shreds, 0), dr: mk(drops, 1) };
  }, [shreds, drops, seed]);

  const shredMesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 4, 1);
    g.setAttribute('aHue', new THREE.InstancedBufferAttribute(new Float32Array(shreds), 1));
    g.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(shreds).fill(1), 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uDark: { value: 0 } }, vertexShader: SHRED_VERT, fragmentShader: SHRED_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const im = new THREE.InstancedMesh(g, m, shreds);
    im.frustumCulled = false;
    im.renderOrder = 6;
    return im;
  }, [shreds]);
  const dropMesh = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    g.setAttribute('aHue', new THREE.InstancedBufferAttribute(new Float32Array(drops), 1));
    const m = new THREE.ShaderMaterial({ vertexShader: DROP_VERT, fragmentShader: DROP_FRAG, transparent: true, depthWrite: false });
    const im = new THREE.InstancedMesh(g, m, drops);
    im.frustumCulled = false;
    im.renderOrder = 6;
    return im;
  }, [drops]);
  useEffect(
    () => () => {
      shredMesh.geometry.dispose();
      (shredMesh.material as THREE.Material).dispose();
      dropMesh.geometry.dispose();
      (dropMesh.material as THREE.Material).dispose();
    },
    [shredMesh, dropMesh],
  );
  const ringMat = useSpriteMaterial(RING_FRAG, false, { uR: { value: 0 }, uW: { value: 0.02 }, uA: { value: 0 }, uDark: { value: 0 } });
  (shredMesh.material as THREE.ShaderMaterial).uniforms.uDark.value = dark ? 1 : 0;

  // the rim reaches a point at angle a from the tear origin at pop = 0.15 * a / PI
  const T = 70 / 60; // seconds the pop spans in the reference timing
  const place = (it: (typeof parts.sh)[0], kind: 0 | 1, mesh: THREE.InstancedMesh, i: number, fadeAttr?: THREE.InstancedBufferAttribute) => {
    const a = Math.acos(clamp(it.d.dot(tearDir), -1, 1));
    const born = 0.15 * (a / Math.PI);
    const tau = (p - born) * T;
    if (tau <= 0) return false;
    const k = kind === 0 ? 1.1 : 2.0;
    const dist = dragDist(it.v, k, tau);
    Px.copy(it.d).multiplyScalar((1 + dist) * scale);
    Px.y += (it.up * tau - 0.18 * tau * tau) * scale;
    const life = it.life * (kind === 0 ? 1 : 0.75);
    const fade = 1 - clamp((p - life) / 0.18);
    if (fade <= 0.01) return false;
    if (kind === 0) {
      // face roughly outward, then tumble
      Qx.setFromUnitVectors(new THREE.Vector3(0, 0, 1), it.d);
      AXx.copy(it.axis);
      Qx.premultiply(new THREE.Quaternion().setFromAxisAngle(AXx, it.spin * tau));
      const s = it.size * scale;
      Sx.set(s, s * 0.55, s);
      fadeAttr!.setX(i, fade);
    } else {
      Qx.setFromUnitVectors(new THREE.Vector3(0, 1, 0), it.d);
      const s = it.size * scale * (0.4 + 0.6 * fade);
      const st = 1 + 2.5 * Math.exp(-tau * 3);
      Sx.set(s / Math.sqrt(st), s * st, s / Math.sqrt(st));
    }
    Mx.compose(Px, Qx, Sx);
    mesh.setMatrixAt(i, Mx);
    return true;
  };

  let ns = 0, nd = 0;
  if (p > 0) {
    const hueS = shredMesh.geometry.getAttribute('aHue') as THREE.InstancedBufferAttribute;
    const fadeS = shredMesh.geometry.getAttribute('aFade') as THREE.InstancedBufferAttribute;
    for (const it of parts.sh) if (place(it, 0, shredMesh, ns, fadeS)) { hueS.setX(ns, it.hue); ns++; }
    const hueD = dropMesh.geometry.getAttribute('aHue') as THREE.InstancedBufferAttribute;
    for (const it of parts.dr) if (place(it, 1, dropMesh, nd)) { hueD.setX(nd, it.hue); nd++; }
    hueS.needsUpdate = true;
    fadeS.needsUpdate = true;
    hueD.needsUpdate = true;
  }
  shredMesh.count = ns;
  dropMesh.count = nd;
  shredMesh.instanceMatrix.needsUpdate = true;
  dropMesh.instanceMatrix.needsUpdate = true;

  // shockwave ring + flash
  const sw = invLerp(0.12, 0.55, p);
  const ringR = 0.3 + 0.7 * (1 - Math.pow(1 - sw, 2.4));
  (ringMat.uniforms.uSize.value as THREE.Vector2).set(4.6 * scale, 4.6 * scale);
  ringMat.uniforms.uR.value = ringR;
  ringMat.uniforms.uW.value = 0.012 + 0.03 * sw;
  ringMat.uniforms.uA.value = sw > 0 && sw < 1 ? (1 - sw) * 0.95 : 0;
  ringMat.uniforms.uDark.value = dark ? 1 : 0;
  const flash = bump(0.14, 0.24, p) * 0.6;
  return (
    <group>
      <primitive object={shredMesh} />
      <primitive object={dropMesh} />
      {sw > 0 && sw < 1 && (
        <mesh material={ringMat} renderOrder={7} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      )}
      {flash > 0.01 && <GlowSprite color="#ffffff" size={3.2 * scale * (0.4 + flash)} intensity={1.8 * flash} renderOrder={8} />}
      {flash > 0.01 && <GlowSprite color="#ffb3f2" size={5 * scale * (0.5 + flash)} intensity={0.8 * flash} renderOrder={8} />}
    </group>
  );
};
