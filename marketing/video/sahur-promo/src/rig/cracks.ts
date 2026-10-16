// Crack map for Sahur's log, in the log's UV layout (u around with the face at u = 0.5, v up).
// Three channels = three stages: R hairline, G three spreading cracks, B the full network.
// Each channel stores the growth order along its cracks: value 1 at the crack origin falling to 0.1 at
// the tips (0 = no crack), so a shader can grow each stage continuously.
import * as THREE from 'three';
import { prng, clamp } from './util';

let TEX: THREE.CanvasTexture | null = null;

type Pt = { x: number; y: number };
function crackPath(R: () => number, start: Pt, dir: number, len: number, wobble: number, W: number, H: number) {
  const pts: Pt[] = [start];
  let a = dir, x = start.x, y = start.y;
  const steps = Math.max(6, Math.round(len / 7));
  for (let i = 0; i < steps; i++) {
    a += (R() - 0.5) * wobble;
    x += Math.sin(a) * (len / steps);
    y += Math.cos(a) * (len / steps);
    pts.push({ x: ((x % W) + W) % W, y: clamp(y, 0, H) });
  }
  return pts;
}

/** draw a path into one channel canvas; grey level encodes growth (s0..s1 along the stage) */
function stroke(g: CanvasRenderingContext2D, pts: Pt[], w0: number, w1: number, s0: number, s1: number, W: number) {
  for (let i = 1; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const s = s0 + (s1 - s0) * t;
    const v = Math.round(255 * (1 - 0.9 * s));
    g.strokeStyle = `rgb(${v},${v},${v})`;
    g.lineWidth = w0 + (w1 - w0) * t;
    g.lineCap = 'round';
    const a = pts[i - 1], b = pts[i];
    if (Math.abs(a.x - b.x) > W / 2) continue; // seam wrap
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
}

export function crackTexture(): THREE.CanvasTexture {
  if (TEX) return TEX;
  const W = 1024, H = 1024;
  const R = prng(77);
  const ch = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return { c, g }; });
  // canvas y = 0 is the TOP of the log (texture flipY): cracks start at the top rim and run down.
  // stage 1: one hairline down the front-left, passing beside his right eye
  const p1 = crackPath(R, { x: W * 0.4, y: 0 }, -0.06, H * 0.55, 0.5, W, H);
  stroke(ch[0].g, p1, 5, 1.8, 0, 1, W);
  // stage 2: the hairline widens, plus two more cracks (back-right from the top, and up from the base)
  stroke(ch[1].g, p1, 5, 2.2, 0, 0.6, W);
  const p2 = crackPath(R, { x: W * 0.68, y: 0 }, -0.15, H * 0.7, 0.6, W, H);
  const p3 = crackPath(R, { x: W * 0.2, y: H }, Math.PI + 0.2, H * 0.6, 0.6, W, H);
  stroke(ch[1].g, p2, 4, 1.6, 0.1, 1, W);
  stroke(ch[1].g, p3, 4, 1.4, 0.2, 1, W);
  // branches off stage 2
  for (const base of [p1, p2]) {
    const k = Math.floor(base.length * (0.35 + R() * 0.3));
    const br = crackPath(R, base[k], (R() > 0.5 ? 1 : -1) * (0.9 + R() * 0.6), H * (0.15 + R() * 0.15), 0.7, W, H);
    stroke(ch[1].g, br, 2.4, 1, 0.5, 1, W);
  }
  // stage 3: a full network, wide seams across the whole log
  stroke(ch[2].g, p1, 9, 4, 0, 0.4, W); stroke(ch[2].g, p2, 8, 3.5, 0, 0.45, W); stroke(ch[2].g, p3, 8, 3, 0, 0.5, W);
  for (let i = 0; i < 16; i++) {
    const top = R() < 0.5;
    const start = { x: R() * W, y: top ? 0 : R() * H };
    const p = crackPath(R, start, (top ? 0 : (R() - 0.5) * 2.5) + (R() - 0.5) * 0.6, H * (0.25 + R() * 0.5), 0.8, W, H);
    stroke(ch[2].g, p, 3 + R() * 4, 1 + R(), 0.1 + R() * 0.4, 1, W);
    const k = Math.floor(p.length * R());
    const br = crackPath(R, p[k], (R() - 0.5) * 3, H * (0.08 + R() * 0.15), 0.9, W, H);
    stroke(ch[2].g, br, 2, 0.8, 0.5, 1, W);
  }
  // merge into RGB
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const og = out.getContext('2d')!;
  const img = og.createImageData(W, H);
  const d = ch.map((c) => c.g.getImageData(0, 0, W, H).data);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = d[0][i]; img.data[i + 1] = d[1][i]; img.data[i + 2] = d[2][i]; img.data[i + 3] = 255; }
  og.putImageData(img, 0, 0);
  TEX = new THREE.CanvasTexture(out);
  TEX.wrapS = THREE.RepeatWrapping;
  TEX.minFilter = THREE.LinearFilter; // no mips: the growth values must not blur together
  TEX.generateMipmaps = false;
  return TEX;
}

/** patch a log material: crack lines darken the wood and glow amber; uniforms are returned for per-frame updates */
export function addCracks(m: THREE.MeshPhysicalMaterial) {
  const uniforms = { uCrack: { value: crackTexture() }, uStage: { value: new THREE.Vector3(0, 0, 0) }, uGlow: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = 'uniform sampler2D uCrack; uniform vec3 uStage; uniform float uGlow;\n' + sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      {
        vec3 ck = texture2D(uCrack, vMapUv).rgb;
        // a pixel shows once its stage has grown past it: value >= 1 - 0.9 * progress
        vec3 thr = vec3(1.0) - 0.9 * uStage;
        vec3 on = step(vec3(0.004), ck) * smoothstep(thr - 0.04, thr, ck) * step(vec3(0.001), uStage);
        float crack = clamp(max(max(on.r, on.g), on.b), 0.0, 1.0);
        diffuseColor.rgb *= 1.0 - 0.8 * crack;
        totalEmissiveRadiance += vec3(1.0, 0.71, 0.28) * crack * uGlow;
      }`,
    );
  };
  (m as any).customProgramCacheKey = () => 'sahur-cracks';
  return uniforms;
}
