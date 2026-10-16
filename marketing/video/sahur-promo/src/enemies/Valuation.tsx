// THE VALUATION (#35e8ff): a colossal glowing "$999B" built from voxels sampled out of the Press Start 2P
// glyphs, floating over a 3D chart whose line only goes up, with "+inf% projected" beneath.
// `overextended` 0..1: the number cracks into chunks that slip and fall, hot red seams open, the
// line's last leg crashes and the caption becomes "v OVEREXTENDED".
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PAL } from '../lib/palette';
import { useToy, useGlowMat } from './lib/toy';
import { FloorGlow, GlowSprite, useCanvasTexture } from './lib/scene';
import { F_PIXEL, F_PRESS, font, useEnemyFonts } from './lib/fonts';
import { useInstanced, setInst, setInstColor, commit } from './lib/instanced';
import { bump, clamp, easeInCubic, easeOutCubic, hash, invLerp, lerp } from './lib/math';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

export type ValuationProps = EnemyBase & {
  /** the number on display */
  text?: string;
  /** 0..1 crack and collapse (the game's vulnerable "overextended" state) */
  overextended?: number;
  /** height of the number's centre */
  hover?: number;
  /** 0..1 the digits topple forward one by one (left to right) and fall */
  topple?: number;
  /** 0..1 the chart line snaps where it meets the number; the far end swings down and drops */
  lineSnap?: number;
  /** the small tag under the number */
  caption?: string;
};

const V = 0.125; // voxel pitch
const VS = 0.112; // voxel size
const DEPTH = 0.42;

type Vox = { gx: number; gy: number; x: number; y: number; region: number; crack: number; fall: number; seed: number; ch: number };

/** Sample glyph pixels: Press Start 2P is an 8x8 pixel font; draw at 4px per font pixel, read centres. */
const sampleVoxels = (text: string) => {
  const px = 4;
  const cell = 8 * px;
  const c = document.createElement('canvas');
  c.width = cell * text.length;
  c.height = cell;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  ctx.font = font(F_PRESS, cell);
  ctx.fillText(text, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const cols = 8 * text.length;
  const out: { gx: number; gy: number }[] = [];
  for (let gy = 0; gy < 8; gy++)
    for (let gx = 0; gx < cols; gx++) {
      const sx = gx * px + px / 2;
      const sy = gy * px + px / 2;
      if (data[(Math.floor(sy) * c.width + Math.floor(sx)) * 4 + 3] > 110) out.push({ gx, gy });
    }
  return { out, cols };
};

// two jagged crack lines across the number, in grid columns as a function of row (0 top .. 7 bottom)
const CRACK_A = [13, 14, 13, 12, 13, 14, 14, 13];
const CRACK_B = [27, 26, 27, 28, 28, 27, 26, 27];

export const Valuation: React.FC<ValuationProps> = ({ frame, hit = 0, death = 0, scale = 1, seed = 1, floor = true, text = '$999B', overextended = 0, hover = 2.5, topple = 0, lineSnap = 0, caption = '+∞% projected' }) => {
  const t = frame / 60 + seed * 0.9;
  const ready = useEnemyFonts();
  const dead = clamp(death);
  const O = clamp(overextended);
  const flash = Math.max(hit, bump(0, 0.12, dead), 0.5 * bump(0.0, 0.12, O));
  const dissolve = invLerp(0.04, 0.8, dead);

  const vox = useMemo<Vox[]>(() => {
    if (!ready) return [];
    const { out, cols } = sampleVoxels(text);
    return out.map(({ gx, gy }) => {
      const ca = CRACK_A[gy], cb = CRACK_B[gy];
      const region = gx < ca ? 0 : gx < cb ? 1 : 2;
      const crack = Math.min(Math.abs(gx - ca + 0.5), Math.abs(gx - cb + 0.5));
      const h = hash(gx * 31 + gy * 7, 3);
      return {
        gx,
        gy,
        x: (gx - (cols - 1) / 2) * V,
        y: (3.5 - gy) * V,
        region,
        crack,
        fall: crack < 1.6 && h < 0.55 ? h : 1,
        seed: hash(gx * 13 + gy * 101, 9),
        ch: Math.floor(gx / 8),
      };
    });
  }, [ready, text]);

  const geo = useMemo(() => new RoundedBoxGeometry(VS, VS, DEPTH, 2, 0.022), []);
  const voxMat = useToy({ color: PAL.valuation, deep: '#02232b', rim: '#c9fbff', fill: 0.9, rimStrength: 1.4, rimPower: 2, spec: 0.9, gloss: 60, glow: 0.55, flash, dissolve, edge: PAL.valuation });
  const mesh = useInstanced(geo, voxMat, 420, true);

  // region motion when overextended: chunks slip apart and tilt
  const slip = easeOutCubic(invLerp(0.05, 0.6, O));
  const regionOff = [
    { x: -0.18 * slip, y: -0.12 * slip, rz: 0.08 * slip },
    { x: 0.0, y: -0.32 * slip, rz: -0.05 * slip },
    { x: 0.2 * slip, y: -0.06 * slip, rz: -0.12 * slip },
  ];
  const red = new THREE.Color(PAL.danger);
  const cy = new THREE.Color(PAL.valuation);
  const tmpC = new THREE.Color();
  let n = 0;
  for (const v of vox) {
    const ro = regionOff[v.region];
    // rotate around the region's centre-ish
    const cx = v.region === 0 ? -1.6 : v.region === 1 ? 0 : 1.6;
    const lx = v.x - cx;
    const c = Math.cos(ro.rz), s = Math.sin(ro.rz);
    let x = cx + lx * c - v.y * s + ro.x;
    let y = lx * s + v.y * c + ro.y;
    let z = 0;
    let rx = 0, ry = 0, rz = ro.rz;
    // voxels on the crack fall out
    const ft = invLerp(0.2 + v.fall * 0.5, 0.75 + v.fall * 0.25, O);
    if (v.fall < 1 && ft > 0) {
      const tt = ft * 1.2;
      y -= 4.5 * tt * tt;
      x += (v.seed - 0.5) * 1.2 * tt;
      z += (v.seed - 0.3) * 1.0 * tt;
      rx = tt * 6 * (v.seed - 0.5);
      ry = tt * 5 * v.seed;
    }
    // digits topple forward one by one around their bottom front edge, then drop
    const TP = clamp(topple);
    if (TP > 0) {
      const pc = invLerp(v.ch * 0.14, v.ch * 0.14 + 0.42, TP);
      if (pc > 0) {
        const th = (Math.PI / 2) * easeInCubic(Math.min(1, pc * 1.25));
        const py = -4 * V, pz = DEPTH / 2;
        const dy = y - py, dz = z - pz;
        y = py + dy * Math.cos(th) - dz * Math.sin(th);
        z = pz + dy * Math.sin(th) + dz * Math.cos(th);
        rx += th;
        const drop = Math.max(0, pc - 0.6);
        y -= 9 * drop * drop;
        z += 1.2 * drop;
      }
    }
    // idle shimmer: a ticker wave of light sweeping left to right
    const wave = Math.pow(0.5 + 0.5 * Math.sin(v.x * 2.4 - t * 5.0), 6);
    const bob = 0.03 * Math.sin(t * 2.0 + v.x * 0.9);
    const hot = O > 0 ? clamp(1 - v.crack / 2.2) * clamp(O * 3) : 0;
    const flick = O > 0 ? 0.5 + 0.5 * Math.sin(t * 40 + v.seed * 20) : 1;
    tmpC.copy(cy).lerp(red, clamp(hot * 1.2 + O * 0.35 * flick));
    const b = 0.85 + 0.9 * wave + hot * 1.6;
    setInst(mesh, n, [x, y + bob, z + (v.seed - 0.5) * 0.04], 1, [rx, ry, rz]);
    setInstColor(mesh, n, [(tmpC.r / cy.r) * b, (tmpC.g / Math.max(cy.g, 1e-3)) * b, (tmpC.b / cy.b) * b]);
    n++;
  }
  commit(mesh, n);

  // caption
  const capTex = useCanvasTexture(
    ready,
    1024,
    128,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(F_PIXEL, 64, 600);
      ctx.shadowColor = PAL.valuation;
      ctx.shadowBlur = 14;
      ctx.fillStyle = PAL.valuation;
      // the font has no infinity glyph, so draw one: two pixel-ish loops
      const parts = caption.split('∞');
      const infW = 58;
      const widths = parts.map((p) => ctx.measureText(p).width);
      const total = widths.reduce((a, b) => a + b, 0) + infW * (parts.length - 1) + 60;
      let x = w / 2 - total / 2;
      ctx.textAlign = 'left';
      // up triangle
      ctx.beginPath();
      ctx.moveTo(x, h / 2 + 16);
      ctx.lineTo(x + 36, h / 2 + 16);
      ctx.lineTo(x + 18, h / 2 - 16);
      ctx.closePath();
      ctx.fill();
      x += 60;
      parts.forEach((p, i) => {
        ctx.fillText(p, x, h / 2 + 4);
        x += widths[i];
        if (i < parts.length - 1) {
          ctx.lineWidth = 8;
          ctx.strokeStyle = PAL.valuation;
          ctx.lineCap = 'square';
          const cyy = h / 2 + 2;
          ctx.strokeRect(x + 6, cyy - 11, 20, 22);
          ctx.strokeRect(x + 26, cyy - 11, 20, 22);
          x += infW;
        }
      });
    },
    [caption],
  );
  const capTexBad = useCanvasTexture(
    ready,
    1024,
    128,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(F_PIXEL, 64, 700);
      ctx.shadowColor = PAL.danger;
      ctx.shadowBlur = 14;
      ctx.fillStyle = PAL.danger;
      const label = 'OVEREXTENDED';
      const tw = ctx.measureText(label).width;
      const tx = w / 2 - tw / 2 - 40;
      ctx.beginPath();
      ctx.moveTo(tx - 18, h / 2 - 16);
      ctx.lineTo(tx + 18, h / 2 - 16);
      ctx.lineTo(tx, h / 2 + 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillText(label, w / 2 + 10, h / 2 + 4);
    },
    [],
  );
  const capMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }), []);
  const capMatBad = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }), []);
  capMat.map = capTex;
  capMat.color.setScalar(1.6);
  capMat.opacity = (1 - invLerp(0.35, 0.55, O)) * (1 - dissolve);
  capMatBad.map = capTexBad;
  capMatBad.color.setScalar(1.8);
  capMatBad.opacity = invLerp(0.4, 0.6, O) * (0.6 + 0.4 * Math.sin(t * 18)) * (1 - dissolve);

  // the chart: a line that only goes up (until it doesn't)
  const crash = easeInCubic(invLerp(0.25, 0.85, O));
  const basePts = useMemo(
    () =>
      [
        [-3.3, -1.75],
        [-2.6, -1.5],
        [-2.05, -1.3],
        [-1.45, -0.85],
        [-0.85, -0.7],
        [-0.2, -0.15],
        [0.45, 0.05],
        [1.05, 0.6],
        [1.6, 0.85],
        [2.2, 1.55],
        [2.75, 2.05],
        [3.25, 2.95],
      ] as [number, number][],
    [],
  );
  const LS = easeInCubic(clamp(lineSnap));
  const SNAP_X = 0.75;
  const pts0 = basePts.map(([x, y], i) => {
    const last = i >= basePts.length - 2;
    const yy = last ? lerp(y, i === basePts.length - 1 ? -1.9 : 0.4, crash) : y;
    return new THREE.Vector3(x, yy + 0.04 * Math.sin(t * 1.6 + i), 0);
  });
  // insert the snap point, then swing everything past it down around the break
  let pts = pts0;
  let tail: THREE.Vector3[] = [];
  if (LS > 0) {
    const j = pts0.findIndex((p) => p.x > SNAP_X);
    const a = pts0[j - 1], b = pts0[j];
    const sp = a.clone().lerp(b, (SNAP_X - a.x) / (b.x - a.x));
    const ang = -1.25 * LS;
    tail = [sp, ...pts0.slice(j)].map((p) => {
      const d = p.clone().sub(sp);
      return new THREE.Vector3(sp.x + d.x * Math.cos(ang) - d.y * Math.sin(ang) + 0.15 * LS, sp.y + d.x * Math.sin(ang) + d.y * Math.cos(ang) - 1.6 * LS * LS, 0.4 * LS);
    });
    pts = [...pts0.slice(0, j), sp];
  }
  const lineGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
    return new THREE.TubeGeometry(curve, 240, 0.032, 8, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crash > 0 ? Math.round(crash * 60) : -1, Math.round(t * 20), Math.round(LS * 90)]);
  const tailGeo = useMemo(() => {
    if (tail.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(tail, false, 'catmullrom', 0.05);
    return new THREE.TubeGeometry(curve, 160, 0.032, 8, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(t * 20), Math.round(LS * 90)]);
  const lineMat = useGlowMat(O > 0.3 ? '#ff9aa5' : '#bff8ff', 2.4 * (1 - dissolve), 1, false);
  const lineGlow = useGlowMat(O > 0.3 ? PAL.danger : PAL.valuation, 0.9 * (1 - dissolve), 0.5);
  const nodeMat = useToy({ color: '#e9fdff', fill: 1, glow: 1.0, rim: PAL.valuation, rimStrength: 1, dissolve }, { flat: true });
  const areaGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(pts[0].x, -2.0);
    for (const p of pts) s.lineTo(p.x, p.y);
    s.lineTo(pts[pts.length - 1].x, -2.0);
    s.closePath();
    return new THREE.ShapeGeometry(s, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crash > 0 ? Math.round(crash * 60) : -1, Math.round(t * 20)]);
  const areaMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color(PAL.valuation) }, uA: { value: 1 } },
        vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vY; void main(){ float a = smoothstep(-2.0, 2.8, vY) * 0.32 * uA; gl_FragColor = vec4(uCol * a, a);
        #include <colorspace_fragment>
        }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  areaMat.uniforms.uA.value = 1 - dissolve;
  const gridMat = useGlowMat(PAL.valuation, 0.5 * (1 - dissolve), 0.22);
  const arrowSrc = tail.length >= 2 ? tail : pts;
  const arrowTip = arrowSrc[arrowSrc.length - 1];
  const prev = arrowSrc[arrowSrc.length - 2];
  const arrowAng = Math.atan2(arrowTip.y - prev.y, arrowTip.x - prev.x) - Math.PI / 2;

  const alive = dead < 0.999;
  const bob = 0.1 * Math.sin(t * 3.33);
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={O > 0.3 ? PAL.danger : PAL.valuation} radius={3.2} intensity={0.35 * (1 - dissolve)} shadow={0.25} />}
      {alive && (
        <group position={[0, hover + bob, 0]}>
          {/* chart behind the number */}
          <group position={[0, -0.25, -1.1]}>
            {[-1.75, -0.9, -0.05, 0.8, 1.65, 2.5].map((gy) => (
              <mesh key={gy} material={gridMat} position={[0, gy, -0.05]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.005, 0.005, 7, 4]} />
              </mesh>
            ))}
            <mesh geometry={areaGeo} material={areaMat} />
            <mesh geometry={lineGeo} material={lineMat} />
            {tailGeo && <mesh geometry={tailGeo} material={lineMat} />}
            {LS > 0 && <GlowSprite color="#ffffff" size={1.4 * bump(0, 0.4, LS) + 0.2} intensity={2.5} position={[SNAP_X, pts[pts.length - 1].y, 0.1]} />}
            {pts.slice(0, -1).map((p, i) => (
              <mesh key={i} material={nodeMat} position={p} rotation={[0, 0, 0.785]} scale={0.09 + 0.03 * bump(0, 1, ((t * 0.8 + i * 0.13) % 1))}>
                <boxGeometry args={[1, 1, 1]} />
              </mesh>
            ))}
            <mesh material={lineMat} position={arrowTip} rotation={[0, 0, arrowAng]}>
              <coneGeometry args={[0.13, 0.3, 4]} />
            </mesh>
            <GlowSprite color={O > 0.3 ? PAL.danger : PAL.valuation} size={1.1} intensity={1.2} position={[arrowTip.x, arrowTip.y, 0.1]} />
          </group>
          {/* the colossal number */}
          <primitive object={mesh} />
          <GlowSprite color={O > 0.3 ? PAL.danger : PAL.valuation} size={6.5} intensity={0.22} position={[0, 0, -0.4]} renderOrder={0} />
          {/* caption */}
          {capTex && (
            <mesh material={capMat} position={[0, -0.95, 0.1]}>
              <planeGeometry args={[3.2, 0.4]} />
            </mesh>
          )}
          {capTexBad && O > 0.3 && (
            <mesh material={capMatBad} position={[0, -0.95, 0.12]}>
              <planeGeometry args={[3.2, 0.4]} />
            </mesh>
          )}
        </group>
      )}
      {O > 0.2 && <Shards progress={invLerp(0.2, 1, O)} color={PAL.danger} origin={[0, hover, 0.2]} seed={seed + 81} count={24} radius={0.6} size={1.1} power={0.6} />}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.valuation} origin={[0, hover, 0]} seed={seed + 82} count={90} radius={1.2} size={1.5} power={1.3} />}
    </group>
  );
};
