// The Bubble's hype rings: phrases set letter by letter around tilted orbits (one glyph = one instanced
// quad sampling a CanvasTexture atlas), so letters can shed like confetti and blow apart on the pop.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { F_HYPE, F_PIXEL, font, useEnemyFonts } from '../lib/fonts';
import { clamp, easeOutCubic, hash, invLerp, TAU } from '../lib/math';

export const DEFAULT_PHRASES: [string, string, string] = [
  'this changes everything · thrilled to announce · this changes everythng · ',
  'we believe · at scale · delighted · disrupting · at scael · ',
  'thriled to anounce · we beleive · delighted · +∞% · ',
];

export type RingSpec = { radius: number; tilt: [number, number]; period: number; dir: 1 | -1; h: number; phase: number };
export const RING_SPECS: RingSpec[] = [
  { radius: 1.27, tilt: [0.26, 0.1], period: 600, dir: 1, h: 0.135, phase: 0.3 },
  { radius: 1.42, tilt: [-0.22, -0.24], period: 720, dir: -1, h: 0.125, phase: 2.1 },
  { radius: 1.57, tilt: [0.5, 0.36], period: 900, dir: 1, h: 0.12, phase: 4.4 },
];

type Glyph = { u0: number; v0: number; u1: number; v1: number; adv: number; w: number };
const CELL = 128;
const FS = 92;

const buildAtlas = (chars: string[], style: 'corporate' | 'pixel') => {
  const W = 2048;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const f = style === 'corporate' ? font(F_HYPE, FS, 700) : font(F_PIXEL, FS, 700);
  ctx.font = f;
  const metrics = chars.map((ch) => ctx.measureText(ch).width);
  const pad = 14;
  let x = 0, y = 0;
  const pos: { x: number; y: number; w: number }[] = [];
  chars.forEach((_, i) => {
    const cw = Math.ceil(metrics[i]) + pad * 2;
    if (x + cw > W) { x = 0; y += CELL; }
    pos.push({ x, y, w: cw });
    x += cw;
  });
  const H = Math.max(CELL, Math.pow(2, Math.ceil(Math.log2(y + CELL))));
  c.width = W;
  c.height = H;
  ctx.font = f;
  ctx.textBaseline = 'alphabetic';
  if (style === 'corporate') ctx.letterSpacing = '0px';
  const glyphs: Record<string, Glyph> = {};
  chars.forEach((ch, i) => {
    const p = pos[i];
    const base = p.y + CELL * 0.74;
    const gx = p.x + pad;
    if (style === 'corporate') {
      // glossy corporate chrome: white top, pink, violet, deep indigo; a dark violet keyline
      const g = ctx.createLinearGradient(0, p.y + CELL * 0.18, 0, base + 6);
      g.addColorStop(0.0, '#ffffff');
      g.addColorStop(0.42, '#ffd3f6');
      g.addColorStop(0.5, '#b49bff');
      g.addColorStop(1.0, '#4a2fd0');
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(36, 16, 96, 0.9)';
      ctx.strokeText(ch, gx, base);
      ctx.shadowColor = 'rgba(255, 61, 240, 0.55)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = g;
      ctx.fillText(ch, gx, base);
      ctx.shadowBlur = 0;
      // specular sweep on the upper half
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.x, p.y, p.w, CELL * 0.47);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(ch, gx, base);
      ctx.restore();
    } else {
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(60, 20, 90, 0.85)';
      ctx.strokeText(ch, gx, base);
      ctx.fillStyle = i % 2 ? '#ffb3f2' : '#ffffff';
      ctx.fillText(ch, gx, base);
    }
    glyphs[ch] = { u0: p.x / W, v0: 1 - (p.y + CELL) / H, u1: (p.x + p.w) / W, v1: 1 - p.y / H, adv: metrics[i] / FS, w: p.w / FS };
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return { tex, glyphs };
};

const VERT = /* glsl */ `
attribute vec4 aUV;
attribute float aFade;
varying vec2 vUv;
varying float vFade;
varying float vSeed;
varying float vDepth;
void main(){
  vUv = mix(aUV.xy, aUV.zw, uv);
  vFade = aFade;
  vSeed = aUV.x * 37.0 + aUV.y * 11.0;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uBright;
uniform float uOpacity;
uniform float uNearFade;
varying vec2 vUv;
varying float vFade;
varying float vSeed;
varying float vDepth;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec4 tx = texture2D(uMap, vUv);
  // dissolve: pixel blocks drop out as the fade falls
  float n = h21(floor(vUv * vec2(900.0, 260.0)) + vSeed);
  if (n > vFade) discard;
  float edge = smoothstep(vFade - 0.08, vFade, n);
  vec3 c = tx.rgb * uBright;
  float back = gl_FrontFacing ? 1.0 : 0.0;
  if (back < 0.5) c = mix(c, vec3(dot(c, vec3(0.33))), 0.5) * 0.75;
  c += vec3(1.0, 0.6, 1.0) * edge * 1.5 * step(vFade, 0.999);
  float a = tx.a * uOpacity * mix(0.38, 1.0, back);
  if (uNearFade > 0.0) a *= smoothstep(uNearFade * 0.55, uNearFade, vDepth);
  if (a < 0.03) discard;
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;

export type HypeRingsProps = {
  frame: number;
  /** bubble scale (rings orbit at radius * scale) */
  scale: number;
  phrases?: [string, string, string];
  style?: 'corporate' | 'pixel';
  speed?: number;
  /** 0..1 letters shed and fall like confetti */
  shed?: number;
  /** 0..1 pop progress: at 0.15 every letter is blown off, falls and dissolves by 1 */
  pop?: number;
  /** wobble of the ring planes (instability) */
  unstable?: number;
  /** stutter (dent): rings jerk for a moment */
  stutter?: number;
  bright?: number;
  /** which rings to draw */
  count?: number;
  /** extra rotation of the whole ring system (e.g. turn the rings' near side toward a camera below) */
  tilt?: [number, number, number];
  /** ring radius multiplier */
  ringScale?: number;
  /** overall letter opacity */
  opacity?: number;
  /** letter size multiplier (spacing scales with it) */
  letterScale?: number;
  /** letters face the ring's centre, so the FAR side reads correctly (seen through the Bubble) */
  inward?: boolean;
  /** letters closer to the camera than this (world units) fade out */
  nearFade?: number;
};

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const Q2 = new THREE.Quaternion();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const AX = new THREE.Vector3();
const E = new THREE.Euler();
const Y = new THREE.Vector3(0, 1, 0);

export const HypeRings: React.FC<HypeRingsProps> = ({ frame, scale, phrases = DEFAULT_PHRASES, style = 'corporate', speed = 1, shed = 0, pop = 0, unstable = 0, stutter = 0, bright = 1, count = 3, tilt = [0, 0, 0], ringScale = 1, opacity = 1, letterScale = 1, inward = false, nearFade = 0 }) => {
  const ready = useEnemyFonts();
  const atlas = useMemo(() => {
    if (!ready) return null;
    const chars = Array.from(new Set(phrases.join('').split(''))).filter((c) => c !== ' ');
    return buildAtlas(chars, style);
  }, [ready, phrases, style]);
  useEffect(() => () => atlas?.tex.dispose(), [atlas]);

  // lay out each ring: letters around the circumference, phrase repeated to fill it exactly
  const layout = useMemo(() => {
    if (!atlas) return [] as { ring: number; ch: string; ang: number; g: Glyph; id: number }[];
    const out: { ring: number; ch: string; ang: number; g: Glyph; id: number }[] = [];
    let id = 0;
    RING_SPECS.slice(0, count).forEach((spec, ri) => {
      const str = phrases[ri] ?? phrases[0];
      const spaceAdv = 0.3;
      const track = 0.05;
      const SEP = ' · ';
      const hh = spec.h * letterScale;
      const wordLen = (w: string) => w.split('').reduce((acc, ch) => acc + (ch === ' ' ? spaceAdv : (atlas.glyphs[ch]?.adv ?? 0.5) + track), 0) * hh;
      // fill the circumference with whole phrase segments; leftover arc goes into the separators
      const segs = str.split('·').map((x) => x.trim()).filter(Boolean);
      const sepLen = wordLen(SEP);
      const C = TAU * spec.radius;
      const chosen: string[] = [];
      let used = 0;
      for (let k = 0; k < 200; k++) {
        const seg = segs[k % segs.length];
        const need = wordLen(seg) + sepLen;
        if (used + need > C && chosen.length > 0) break;
        chosen.push(seg);
        used += need;
      }
      const extra = (C - used) / chosen.length;
      let s = 0;
      for (const seg of chosen) {
        for (const ch of seg + SEP) {
          if (ch === ' ') { s += spaceAdv * hh; continue; }
          const g = atlas.glyphs[ch];
          if (!g) continue;
          const adv = (g.adv + track) * hh;
          out.push({ ring: ri, ch, ang: (s + adv / 2) / spec.radius, g, id: id++ });
          s += adv;
        }
        s += extra;
      }
    });
    return out;
  }, [atlas, phrases, count, letterScale]);

  const N = Math.max(1, layout.length);
  const { mesh, mat } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.setAttribute('aUV', new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4));
    geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(N).fill(1), 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: null }, uBright: { value: 1 }, uOpacity: { value: 1 }, uNearFade: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      alphaToCoverage: true,
    });
    const im = new THREE.InstancedMesh(geo, m, N);
    im.frustumCulled = false;
    im.renderOrder = 1;
    return { mesh: im, mat: m };
  }, [N]);
  useEffect(() => () => { mesh.geometry.dispose(); mat.dispose(); }, [mesh, mat]);

  if (!atlas || layout.length === 0) return null;
  mat.uniforms.uMap.value = atlas.tex;
  mat.uniforms.uBright.value = 1.15 * bright;
  mat.uniforms.uOpacity.value = opacity;
  mat.uniforms.uNearFade.value = nearFade;
  const aUV = mesh.geometry.getAttribute('aUV') as THREE.InstancedBufferAttribute;
  const aFade = mesh.geometry.getAttribute('aFade') as THREE.InstancedBufferAttribute;
  const t = frame;
  const popT = invLerp(0.15, 1, pop); // 0..1 after the burst
  const sysQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt[0], tilt[1], tilt[2]));
  const ringQ = RING_SPECS.map((sp, ri) => {
    const wob = unstable * 0.25 * Math.sin(t / 60 * (2.1 + ri) + ri * 2);
    const st = stutter * 0.12 * Math.sin(t * 1.7 + ri);
    E.set(sp.tilt[0] + wob + st, 0, sp.tilt[1] + wob * 0.6);
    return new THREE.Quaternion().setFromEuler(E).premultiply(sysQ);
  });
  let n = 0;
  for (const L of layout) {
    const sp = RING_SPECS[L.ring];
    const rot = sp.dir * (TAU * t * speed) / sp.period + sp.phase;
    // letters slide along the ring; inward rings run the other way round so the far side reads left to right
    const th = (inward ? -L.ang : L.ang) - rot;
    const R = sp.radius * scale * ringScale;
    // ring-local position and outward-facing orientation
    P.set(R * Math.sin(th), 0, R * Math.cos(th));
    Q.setFromAxisAngle(Y, inward ? th + Math.PI : th);
    P.applyQuaternion(ringQ[L.ring]);
    Q.premultiply(ringQ[L.ring]);
    let fade = 1;
    let sz = sp.h * scale * letterScale;
    // shedding: each letter detaches at its own threshold and falls, tumbling
    const thr = 0.04 + 0.92 * hash(L.id, 17);
    const tau = Math.max(0, (shed - thr) * 2.4);
    if (tau > 0) {
      const out = P.clone().normalize();
      P.addScaledVector(out, 0.25 * tau * scale);
      P.y -= 0.55 * tau * tau * scale;
      P.x += 0.08 * Math.sin(tau * 5 + L.id) * scale;
      AX.set(hash(L.id, 1) - 0.5, hash(L.id, 2) - 0.5, hash(L.id, 3) - 0.5).normalize();
      Q2.setFromAxisAngle(AX, tau * (3 + 4 * hash(L.id, 4)));
      Q.premultiply(Q2);
      fade *= 1 - clamp((tau - 0.8) / 0.6);
    }
    // the pop: blown outward, then falling and dissolving
    if (popT > 0) {
      const out = P.clone().normalize();
      const v = 0.45 + 0.7 * hash(L.id, 5);
      P.addScaledVector(out, easeOutCubic(Math.min(1, popT * 1.8)) * v * scale);
      P.y -= 1.1 * Math.pow(Math.max(0, popT - 0.3), 2) * scale;
      AX.set(hash(L.id, 6) - 0.5, hash(L.id, 7) - 0.5, hash(L.id, 8) - 0.5).normalize();
      Q2.setFromAxisAngle(AX, popT * (4 + 6 * hash(L.id, 9)));
      Q.premultiply(Q2);
      fade *= 1 - clamp((popT - 0.52 - 0.4 * hash(L.id, 10)) / 0.22);
      sz *= 1 + 0.3 * popT;
    }
    if (fade <= 0.001) continue;
    S.set(L.g.w * sz, sz * (CELL / FS), 1);
    M.compose(P, Q, S);
    mesh.setMatrixAt(n, M);
    aUV.setXYZW(n, L.g.u0, L.g.v0, L.g.u1, L.g.v1);
    aFade.setX(n, fade);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  aUV.needsUpdate = true;
  aFade.needsUpdate = true;
  return <primitive object={mesh} />;
};
