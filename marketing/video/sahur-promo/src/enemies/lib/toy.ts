// "Neon toy" material: a glossy vinyl-toy body that falls off into a dark core, a fresnel neon rim
// that blooms (HDR, toneMapped off), a hit flash and a noise dissolve with a glowing edge.
// Self-lit in view space so every enemy looks the same in any set, with or without scene lights.
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { NOISE } from './glsl';

export type ToyOpts = {
  transparent?: boolean;
  depthWrite?: boolean;
  depthTest?: boolean;
  side?: THREE.Side;
  additive?: boolean;
  flat?: boolean; // faceted shading from screen derivatives
  vertPars?: string;
  vertBody?: string; // may modify `vec3 p` and `vec3 n` (object space)
  fragPars?: string;
  fragBody?: string; // may modify `vec3 col` and `float alpha` before dissolve/flash
  uniforms?: Record<string, { value: unknown }>;
};

export type ToyParams = {
  color: THREE.ColorRepresentation;
  deep?: THREE.ColorRepresentation; // the dark core colour
  rim?: THREE.ColorRepresentation;
  rimPower?: number;
  rimStrength?: number;
  fill?: number; // 0 = mostly dark core, 1 = fully coloured toy
  spec?: number;
  gloss?: number;
  glow?: number; // self illumination (adds base colour, can bloom)
  opacity?: number;
  alphaCore?: number; // opacity at face-on angles (fresnel ramps to 1 at the rim)
  flash?: number; // 0..1 hit flash to white
  dissolve?: number; // 0..1
  edge?: THREE.ColorRepresentation; // dissolve edge colour
  noiseScale?: number;
  time?: number;
  wobble?: number;
  wobbleFreq?: number;
  map?: THREE.Texture | null;
  mapMix?: number;
  extra?: Record<string, unknown>; // values for opts.uniforms
};

const VERT = (o: ToyOpts) => /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uWobble;
uniform float uWobbleFreq;
varying vec3 vN;
varying vec3 vP;
varying vec3 vO;
varying vec2 vUv;
varying vec3 vIC;
#include <fog_pars_vertex>
${o.vertPars || ''}
void main(){
  vec3 p = position;
  vec3 n = normal;
  if (uWobble > 0.0) {
    float w = snoise(p * uWobbleFreq + vec3(0.0, uTime * 0.8, uTime * 0.55));
    p += n * w * uWobble;
  }
  ${o.vertBody || ''}
  vO = p;
  vUv = uv;
  vIC = vec3(1.0);
  #ifdef USE_INSTANCING_COLOR
    vIC = instanceColor;
  #endif
  vec4 lp = vec4(p, 1.0);
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 mvPosition = modelViewMatrix * lp;
  vP = mvPosition.xyz;
  vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = (o: ToyOpts) => /* glsl */ `
${NOISE}
uniform vec3 uColor;
uniform vec3 uDeep;
uniform vec3 uRim;
uniform vec3 uEdge;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uFill;
uniform float uSpec;
uniform float uGloss;
uniform float uGlow;
uniform float uOpacity;
uniform float uAlphaCore;
uniform float uFlash;
uniform float uDissolve;
uniform float uNoiseScale;
uniform float uTime;
uniform sampler2D uMap;
uniform float uMapMix;
varying vec3 vN;
varying vec3 vP;
varying vec3 vO;
varying vec2 vUv;
varying vec3 vIC;
#include <fog_pars_fragment>
${o.fragPars || ''}
void main(){
  #ifdef FLAT
    vec3 N = normalize(cross(dFdx(vP), dFdy(vP)));
  #else
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    // BackSide materials flip the winding, so gl_FrontFacing is true on the faces we see
    #ifdef FLIP_SIDED
      N = -N;
    #endif
  #endif
  vec3 V = normalize(-vP);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, uRimPower);
  vec3 L = normalize(vec3(-0.45, 0.8, 0.55));
  float lam = dot(N, L);
  float shade = smoothstep(-0.55, 0.95, lam);
  vec3 base = uColor * vIC;
  if (uMapMix > 0.0) {
    vec4 tx = texture2D(uMap, vUv);
    base = mix(base, tx.rgb, tx.a * uMapMix);
  }
  vec3 col = mix(uDeep, base, clamp(shade * uFill, 0.0, 1.0));
  col += base * 0.22 * clamp(dot(N, normalize(vec3(0.55, -0.6, 0.35))), 0.0, 1.0);
  col += base * uGlow;
  col += uRim * vIC * fres * uRimStrength;
  vec3 H = normalize(L + V);
  col += vec3(1.0) * pow(clamp(dot(N, H), 0.0, 1.0), uGloss) * uSpec;
  float alpha = uOpacity * mix(uAlphaCore, 1.0, fres);
  ${o.fragBody || ''}
  if (uDissolve > 0.0) {
    float nz = snoise(vO * uNoiseScale) * 0.5 + 0.5;
    nz = nz * 0.8 + 0.2 * (snoise(vO * uNoiseScale * 3.3 + 7.0) * 0.5 + 0.5);
    float th = uDissolve * 1.2 - 0.1;
    if (nz < th) discard;
    float e = 1.0 - smoothstep(th, th + 0.08, nz);
    col = mix(col, uEdge * 4.0, e * step(0.001, uDissolve));
  }
  col = mix(col, vec3(2.6), clamp(uFlash, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
  #include <colorspace_fragment>
}`;

export const createToyMaterial = (o: ToyOpts = {}) => {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color('#ffffff') },
        uDeep: { value: new THREE.Color('#000000') },
        uRim: { value: new THREE.Color('#ffffff') },
        uEdge: { value: new THREE.Color('#ffffff') },
        uRimPower: { value: 2.5 },
        uRimStrength: { value: 1.5 },
        uFill: { value: 0.9 },
        uSpec: { value: 0.6 },
        uGloss: { value: 40 },
        uGlow: { value: 0.1 },
        uOpacity: { value: 1 },
        uAlphaCore: { value: 1 },
        uFlash: { value: 0 },
        uDissolve: { value: 0 },
        uNoiseScale: { value: 3 },
        uTime: { value: 0 },
        uWobble: { value: 0 },
        uWobbleFreq: { value: 2 },
        uMap: { value: null },
        uMapMix: { value: 0 },
      },
    ]),
    vertexShader: VERT(o),
    fragmentShader: FRAG(o),
    transparent: !!o.transparent || !!o.additive,
    depthWrite: o.depthWrite ?? !(o.transparent || o.additive),
    depthTest: o.depthTest ?? true,
    side: o.side ?? THREE.FrontSide,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    fog: true,
  });
  if (o.uniforms) for (const k of Object.keys(o.uniforms)) m.uniforms[k] = { value: o.uniforms[k].value };
  if (o.flat) m.defines = { ...(m.defines || {}), FLAT: '' };
  return m;
};

const tmp = new THREE.Color();
const INK = new THREE.Color('#07090f');

/** Write params into a toy material's uniforms (cheap; call every render). */
export const applyToy = (m: THREE.ShaderMaterial, p: ToyParams) => {
  const u = m.uniforms;
  (u.uColor.value as THREE.Color).set(p.color);
  if (p.deep !== undefined) (u.uDeep.value as THREE.Color).set(p.deep);
  else (u.uDeep.value as THREE.Color).copy(tmp.set(p.color).multiplyScalar(0.12).lerp(INK, 0.35));
  if (p.rim !== undefined) (u.uRim.value as THREE.Color).set(p.rim);
  else (u.uRim.value as THREE.Color).copy(tmp.set(p.color).lerp(new THREE.Color('#ffffff'), 0.25));
  (u.uEdge.value as THREE.Color).set(p.edge ?? p.color);
  u.uRimPower.value = p.rimPower ?? 2.5;
  u.uRimStrength.value = p.rimStrength ?? 1.5;
  u.uFill.value = p.fill ?? 0.9;
  u.uSpec.value = p.spec ?? 0.6;
  u.uGloss.value = p.gloss ?? 40;
  u.uGlow.value = p.glow ?? 0.1;
  u.uOpacity.value = p.opacity ?? 1;
  u.uAlphaCore.value = p.alphaCore ?? 1;
  u.uFlash.value = p.flash ?? 0;
  u.uDissolve.value = p.dissolve ?? 0;
  u.uNoiseScale.value = p.noiseScale ?? 3;
  u.uTime.value = p.time ?? 0;
  u.uWobble.value = p.wobble ?? 0;
  u.uWobbleFreq.value = p.wobbleFreq ?? 2;
  u.uMap.value = p.map ?? null;
  u.uMapMix.value = p.map ? p.mapMix ?? 1 : 0;
  if (p.extra) for (const k of Object.keys(p.extra)) if (u[k]) u[k].value = p.extra[k];
};

const optsKey = (o: ToyOpts) =>
  [o.transparent, o.depthWrite, o.depthTest, o.side, o.additive, o.flat, o.vertPars, o.vertBody, o.fragPars, o.fragBody, o.uniforms ? Object.keys(o.uniforms).join(',') : ''].join('|');

/** One material per call site; uniforms refreshed from params every render. */
export const useToy = (p: ToyParams, o: ToyOpts = {}) => {
  const key = optsKey(o);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const m = useMemo(() => createToyMaterial(o), [key]);
  useEffect(() => () => m.dispose(), [m]);
  applyToy(m, p);
  return m;
};

/** Simple unlit additive/alpha colour material for glows and lines (HDR capable). */
export const useGlowMat = (color: THREE.ColorRepresentation, intensity = 1, opacity = 1, additive = true) => {
  const m = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: false,
      }),
    [additive],
  );
  useEffect(() => () => m.dispose(), [m]);
  m.color.set(color).multiplyScalar(intensity);
  m.opacity = opacity;
  return m;
};
