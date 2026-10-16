// Glitch materials: a banded TV-static shader (additive) and chromatic ghost materials.
// All driven by a frame uniform; no clocks.
import * as THREE from 'three';

const hashGLSL = /* glsl */ `
  float h11(float n){ return fract(sin(n*127.1)*43758.5453); }
  float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
`;

export function makeStaticMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFrame: { value: 0 }, uAmt: { value: 0 }, uColA: { value: new THREE.Color('#bff6ff') }, uColB: { value: new THREE.Color('#ff7af2') } },
    vertexShader: /* glsl */ `
      uniform float uFrame; uniform float uAmt;
      ${hashGLSL}
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float band = floor(wp.y * 26.0);
        float on = step(0.55, h11(band * 3.7 + floor(uFrame * 0.5) * 11.0));
        wp.x += (h11(band + uFrame * 1.3) - 0.5) * 0.07 * uAmt * on;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFrame; uniform float uAmt; uniform vec3 uColA; uniform vec3 uColB;
      ${hashGLSL}
      void main(){
        float band = floor(gl_FragCoord.y / 5.0);
        float bn = h21(vec2(band, floor(uFrame)));
        float n = h21(gl_FragCoord.xy + vec2(uFrame * 17.0, uFrame * 3.0));
        float on = step(0.62, bn);
        vec3 col = mix(uColA, uColB, step(0.8, h21(vec2(band * 3.1, uFrame))));
        col = mix(col, vec3(1.0), n * 0.6);
        float a = uAmt * (0.06 + 0.94 * on) * step(0.35, n) * n;
        gl_FragColor = vec4(col * a * 1.6, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function makeGhostMaterial(color: string) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

/** a clone of a standard/physical material whose vertices slice sideways in horizontal world bands */
export function makeGlitchSlices<T extends THREE.Material>(base: T) {
  const m = base.clone() as T;
  const uniforms = { uFrame: { value: 0 }, uAmt: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFrame = uniforms.uFrame;
    sh.uniforms.uAmt = uniforms.uAmt;
    sh.vertexShader = 'uniform float uFrame; uniform float uAmt;\n' + hashGLSL + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 gw = modelMatrix * vec4(transformed, 1.0);
      float gstep = floor(uFrame * 0.5);
      float gb = floor(gw.y * 34.0 + h11(gstep) * 3.0);
      float gon = step(0.58, h11(gb * 7.3 + gstep * 13.0));
      transformed.x += (h11(gb + gstep * 1.7) - 0.5) * 0.16 * uAmt * gon;
      transformed.z += (h11(gb * 1.3 + gstep) - 0.5) * 0.05 * uAmt * gon;
    `);
  };
  (m as any).customProgramCacheKey = () => 'glitch-slices';
  return { material: m, uniforms };
}

/** opaque TV-static "texture swap" with a horizontal tear (band displacement) */
export function makeStaticSwapMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFrame: { value: 0 }, uAmt: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uFrame; uniform float uAmt;
      ${hashGLSL}
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float gstep = floor(uFrame * 0.5);
        float band = floor(wp.y * 30.0 + h11(gstep) * 4.0);
        float on = step(0.6, h11(band * 5.1 + gstep * 7.0));
        wp.x += (h11(band + gstep * 2.3) - 0.5) * 0.1 * uAmt * on;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFrame; uniform float uAmt;
      ${hashGLSL}
      void main(){
        vec2 px = floor(gl_FragCoord.xy / 2.0);
        float n = h21(px + vec2(uFrame * 13.0, uFrame * 7.0));
        float band = floor(gl_FragCoord.y / 3.0);
        float scan = 0.75 + 0.25 * step(0.5, fract(band * 0.5));
        float tint = h21(vec2(floor(gl_FragCoord.y / 14.0), floor(uFrame)));
        vec3 col = vec3(n) * scan;
        col = mix(col, col * vec3(0.55, 1.0, 1.15), step(0.6, tint));
        col = mix(col, col * vec3(1.2, 0.55, 1.1), step(0.85, tint));
        gl_FragColor = vec4(col * 0.9 + 0.05, 1.0);
      }`,
    toneMapped: false,
  });
}
