// BOARDROOM OF BROKEN PROMISES (storyboard 3.2, light L5c). Owned by the battle builder.
// A long glossy black table (a real planar reflection, roughness ~0.08 look) with 12 empty executive chairs,
// cyan ceiling strips and a cold strip light over the table, inside glass walls that read as dark mirrors
// until TUNG #3 blows them outward (`shatter`); outside there is NOTHING: a flat, unlit #d8dce8 (`voidAmt`),
// no fog, no horizon. Pure function of `frame` and the props.
// World: metres, floor y = 0; the table runs along z (top at TABLE.y), centred on x = 0.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { prng } from '../rig/util';

export const TABLE = { y: 0.76, x0: -1.2, x1: 1.2, z0: -8.6, z1: 1.4, thick: 0.08 };
export const ROOM = { x: 4.5, zFar: -11.5, zNear: 3.5, h: 4.3 };
export const VOID = '#d8dce8';
/** pre-gain so the void lands near #d8dce8 after the act's ACES + grade (calibrated from stills) */
export const VOID_GAIN = 0.5;

// ---------------- table reflection shader (dark glossy lacquer with mirror streaks) ----------------
const REFL_SHADER = {
  name: 'BoardTableReflector',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uStrength: { value: 0.55 },
    uBase: { value: new THREE.Color('#05060a') },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float uStrength; uniform vec3 uBase;
    varying vec4 vUv; varying vec3 vW;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec3 V = normalize(cameraPosition - vW);
      float fr = 0.06 + 0.94 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
      // faint brushed streaks along the table (z) blur the reflection a touch
      vec4 uv = vUv;
      float st = (h(vec2(floor(vW.x * 60.0), 3.0)) - 0.5) * 0.004;
      uv.x += st * uv.w;
      vec3 r = texture2DProj(tDiffuse, uv).rgb;
      vec3 r2 = texture2DProj(tDiffuse, uv + vec4(0.0, 0.006, 0.0, 0.0) * uv.w).rgb;
      vec3 refl = mix(r, r2, 0.5);
      gl_FragColor = vec4(uBase + refl * uStrength * fr * color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

// ---------------- glass shards ----------------
type Shard = { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; cen: THREE.Vector3; n: THREE.Vector3; v: THREE.Vector3; spin: THREE.Vector3; delay: number };
const buildShards = () => {
  const R = prng(777);
  const shards: Shard[] = [];
  const panes: { o: THREE.Vector3; u: THREE.Vector3; w: number; n: THREE.Vector3 }[] = [];
  // side walls: panes along z; far wall: panes along x
  for (let z = ROOM.zFar; z < ROOM.zNear - 0.1; z += 2.0) {
    panes.push({ o: new THREE.Vector3(-ROOM.x, 0, z), u: new THREE.Vector3(0, 0, 1), w: Math.min(2.0, ROOM.zNear - z), n: new THREE.Vector3(-1, 0, 0) });
    panes.push({ o: new THREE.Vector3(ROOM.x, 0, z), u: new THREE.Vector3(0, 0, 1), w: Math.min(2.0, ROOM.zNear - z), n: new THREE.Vector3(1, 0, 0) });
  }
  for (let x = -ROOM.x; x < ROOM.x - 0.1; x += 2.25) panes.push({ o: new THREE.Vector3(x, 0, ROOM.zFar), u: new THREE.Vector3(1, 0, 0), w: 2.25, n: new THREE.Vector3(0, 0, -1) });
  const up = new THREE.Vector3(0, 1, 0);
  for (const p of panes) {
    const nx = 4, ny = 5;
    const grid: THREE.Vector3[][] = [];
    for (let i = 0; i <= nx; i++) {
      grid.push([]);
      for (let j = 0; j <= ny; j++) {
        const jx = i > 0 && i < nx ? (R() - 0.5) * 0.35 : 0;
        const jy = j > 0 && j < ny ? (R() - 0.5) * 0.35 : 0;
        grid[i].push(p.o.clone().addScaledVector(p.u, ((i + jx) / nx) * p.w).addScaledVector(up, ((j + jy) / ny) * ROOM.h));
      }
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const A = grid[i][j], B = grid[i + 1][j], C = grid[i + 1][j + 1], Dd = grid[i][j + 1];
      const tris = R() < 0.5 ? [[A, B, C], [A, C, Dd]] : [[A, B, Dd], [B, C, Dd]];
      for (const [a, b, c] of tris) {
        const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
        const out = p.n.clone().multiplyScalar(5 + R() * 9).add(new THREE.Vector3((R() - 0.5) * 3, 1 + R() * 3, (R() - 0.5) * 3));
        shards.push({ a, b, c, cen, n: p.n, v: out, spin: new THREE.Vector3((R() - 0.5) * 16, (R() - 0.5) * 16, (R() - 0.5) * 16), delay: R() * 0.06 });
      }
    }
  }
  return { shards, panes };
};
let SHARDS: ReturnType<typeof buildShards> | null = null;
const shardData = () => (SHARDS ??= buildShards());

const GlassWalls: React.FC<{ shatter: number; origin: [number, number, number]; voidAmt: number }> = ({ shatter, origin, voidAmt }) => {
  const { shards } = shardData();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a2436', roughness: 0.04, metalness: 0.9, transparent: true, opacity: 0.88, side: THREE.DoubleSide, emissive: new THREE.Color('#0a1424'), envMapIntensity: 1 }), []);
  const mesh = useMemo(() => { const m = new THREE.InstancedMesh(geo, mat, shards.length); m.frustumCulled = false; return m; }, [geo, mat, shards.length]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  // intact glass reads as a dark mirror; flying shards turn pale and catch the void
  const flying = shatter > 0;
  mat.opacity = flying ? 0.55 : 0.9;
  mat.color.set(flying ? '#7f90aa' : '#18202e');
  mat.emissive.set(flying ? '#3a4658' : '#08101c');
  const o = new THREE.Vector3(...origin);
  const M = new THREE.Matrix4(), A = new THREE.Matrix4(), T = new THREE.Matrix4(), Rm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  shards.forEach((s, i) => {
    const ab = s.b.clone().sub(s.a), ac = s.c.clone().sub(s.a);
    A.makeBasis(ab, ac, s.n).setPosition(s.a);
    // the ring reaches the nearer walls first
    const dist = s.cen.clone().setY(o.y).distanceTo(o);
    // `shatter` runs past 1 (it is time since the blowout / 14 f): shards keep flying and fall away
    const local = Math.max(0, shatter * 1.0 - dist * 0.03 - s.delay);
    if (local <= 0) { mesh.setMatrixAt(i, A); return; }
    const t = local * 0.7; // seconds-ish
    const d = s.v.clone().multiplyScalar(t).add(new THREE.Vector3(0, -4.9 * t * t, 0));
    if (s.cen.y + d.y < -30) { mesh.setMatrixAt(i, M.makeScale(0, 0, 0)); return; }
    e.set(s.spin.x * t, s.spin.y * t, s.spin.z * t); q.setFromEuler(e); Rm.makeRotationFromQuaternion(q);
    T.makeTranslation(-s.cen.x, -s.cen.y, -s.cen.z);
    M.makeTranslation(s.cen.x + d.x, s.cen.y + d.y, s.cen.z + d.z).multiply(Rm).multiply(T).multiply(A);
    mesh.setMatrixAt(i, M);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------------- chairs ----------------
const Chairs: React.FC = () => {
  const mats = useMemo(() => ({
    leather: new THREE.MeshStandardMaterial({ color: '#15171d', roughness: 0.42, metalness: 0.1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#9aa4b4', roughness: 0.18, metalness: 1 }),
  }), []);
  const spots = useMemo(() => {
    const out: { x: number; z: number; yaw: number; turn: number }[] = [];
    const R = prng(12);
    for (let i = 0; i < 6; i++) {
      const z = -7.6 + i * 1.6;
      out.push({ x: -1.75, z, yaw: Math.PI / 2, turn: (R() - 0.5) * 0.5 });
      out.push({ x: 1.75, z, yaw: -Math.PI / 2, turn: (R() - 0.5) * 0.5 });
    }
    return out;
  }, []);
  return (
    <>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.yaw + s.turn, 0]}>
          <mesh material={mats.leather} position={[0, 0.48, 0]} castShadow receiveShadow><boxGeometry args={[0.56, 0.1, 0.54]} /></mesh>
          <mesh material={mats.leather} position={[0, 0.98, -0.27]} rotation={[-0.12, 0, 0]} castShadow><boxGeometry args={[0.54, 0.95, 0.09]} /></mesh>
          <mesh material={mats.chrome} position={[0, 0.25, 0]}><cylinderGeometry args={[0.03, 0.03, 0.42, 10]} /></mesh>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} material={mats.chrome} position={[Math.sin((k / 5) * Math.PI * 2) * 0.17, 0.04, Math.cos((k / 5) * Math.PI * 2) * 0.17]} rotation={[0, (k / 5) * Math.PI * 2, 0]}>
              <boxGeometry args={[0.04, 0.03, 0.34]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
};

export type BoardroomProps = {
  frame: number;
  /** 0..1 glass blowout progress (TUNG #3: 2886-2900) */
  shatter?: number;
  /** where the ring comes from (the strike on the table) */
  shatterOrigin?: [number, number, number];
  /** 0 = dark night glass, 1 = the flat #d8dce8 nothing outside */
  voidAmt?: number;
  /** table jump (m) when the golem slams it */
  jump?: number;
  /** main light multiplier */
  key?: number;
  /** half-res planar reflection on the table (perf switch) */
  reflect?: boolean;
};

export const Boardroom: React.FC<BoardroomProps> = ({ frame, shatter = 0, shatterOrigin = [0, TABLE.y, -2], voidAmt = 0, jump = 0, key = 1, reflect = true }) => {
  useMemo(() => RectAreaLightUniformsLib.init(), []);
  const reflector = useMemo(() => {
    const L = TABLE.z1 - TABLE.z0, W = TABLE.x1 - TABLE.x0;
    const r = new Reflector(new THREE.PlaneGeometry(W, L), { textureWidth: 960, textureHeight: 540, clipBias: 0.003, color: 0xffffff, shader: REFL_SHADER as any });
    r.rotation.x = -Math.PI / 2;
    return r;
  }, []);
  useEffect(() => () => { reflector.dispose(); }, [reflector]);
  const mats = useMemo(() => ({
    floor: new THREE.MeshStandardMaterial({ color: '#0e121c', roughness: 0.55, metalness: 0.2 }),
    tableEdge: new THREE.MeshStandardMaterial({ color: '#07080b', roughness: 0.15, metalness: 0.6 }),
    tableTop: new THREE.MeshStandardMaterial({ color: '#050609', roughness: 0.08, metalness: 0.3 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#0a0d14', roughness: 0.8 }),
    mullion: new THREE.MeshStandardMaterial({ color: '#141a26', roughness: 0.3, metalness: 0.8, emissive: new THREE.Color('#0c2a33') }),
    strip: new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe9ff').multiplyScalar(3.0), toneMapped: false }),
    cyan: new THREE.MeshBasicMaterial({ color: new THREE.Color('#35e8ff').multiplyScalar(2.2), toneMapped: false }),
    voidM: new THREE.MeshBasicMaterial({ color: '#05070c', side: THREE.BackSide, fog: false, toneMapped: false }),
  }), []);
  // the void: unlit, exactly #d8dce8 once revealed
  mats.voidM.color.set('#05070c').lerp(new THREE.Color(VOID).multiplyScalar(VOID_GAIN), voidAmt);
  const tl = TABLE;
  const cz = (tl.z0 + tl.z1) / 2, L = tl.z1 - tl.z0, W = tl.x1 - tl.x0;
  reflector.position.set(0, tl.y + jump + 0.0015, cz);
  reflector.visible = reflect;
  const flick = 0.92 + 0.08 * Math.sin(frame * 0.9) * Math.sin(frame * 0.37);
  return (
    <group>
      {/* the void (beyond the glass) */}
      <mesh material={mats.voidM} position={[0, 10, -4]} renderOrder={-5}><boxGeometry args={[140, 60, 140]} /></mesh>
      {/* floor + ceiling */}
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (ROOM.zFar + ROOM.zNear) / 2]} receiveShadow>
        <planeGeometry args={[ROOM.x * 2, ROOM.zNear - ROOM.zFar]} />
      </mesh>
      <mesh material={mats.ceiling} rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, (ROOM.zFar + ROOM.zNear) / 2]}>
        <planeGeometry args={[ROOM.x * 2, ROOM.zNear - ROOM.zFar]} />
      </mesh>
      {/* ceiling light strip over the table + cyan strips */}
      <mesh material={mats.strip} position={[0, ROOM.h - 0.02, cz]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, 6]} /></mesh>
      {[-3.2, -1.9, 1.9, 3.2].map((x) => (
        <mesh key={x} material={mats.cyan} position={[x, ROOM.h - 0.02, (ROOM.zFar + ROOM.zNear) / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.05, ROOM.zNear - ROOM.zFar - 0.4]} /></mesh>
      ))}
      <rectAreaLight position={[0, ROOM.h - 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]} width={6} height={0.3} color="#cfe9ff" intensity={20 * key * flick} />
      <spotLight position={[0, ROOM.h - 0.1, cz + 1]} angle={0.9} penumbra={0.8} intensity={34 * key} color="#dff0ff" distance={14} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
      <hemisphereLight args={['#2a3550', '#05060a', 0.9 * key]} />
      <directionalLight position={[3, 4, -12]} color="#35e8ff" intensity={0.9} />
      {/* the table: lacquered slab on two dark pedestals */}
      <group position={[0, jump, 0]}>
        <mesh material={mats.tableEdge} position={[0, tl.y - tl.thick / 2, cz]} castShadow receiveShadow><boxGeometry args={[W, tl.thick, L]} /></mesh>
        {!reflect && <mesh material={mats.tableTop} position={[0, tl.y + 0.001, cz]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W, L]} /></mesh>}
        {[-5.5, -1.5, 2.5 - 3.0].map((z, i) => (
          <mesh key={i} material={mats.tableEdge} position={[0, (tl.y - tl.thick) / 2, z]} castShadow><boxGeometry args={[1.2, tl.y - tl.thick, 0.5]} /></mesh>
        ))}
      </group>
      <primitive object={reflector} />
      <Chairs />
      {/* mullions stay standing: a skeleton frame against the nothing */}
      {Array.from({ length: 8 }, (_, i) => ROOM.zFar + i * 2.0).map((z) => (
        <group key={z}>
          <mesh material={mats.mullion} position={[-ROOM.x, ROOM.h / 2, z]}><boxGeometry args={[0.08, ROOM.h, 0.08]} /></mesh>
          <mesh material={mats.mullion} position={[ROOM.x, ROOM.h / 2, z]}><boxGeometry args={[0.08, ROOM.h, 0.08]} /></mesh>
        </group>
      ))}
      {Array.from({ length: 5 }, (_, i) => -ROOM.x + i * 2.25).map((x) => (
        <mesh key={x} material={mats.mullion} position={[x, ROOM.h / 2, ROOM.zFar]}><boxGeometry args={[0.08, ROOM.h, 0.08]} /></mesh>
      ))}
      <GlassWalls shatter={shatter} origin={shatterOrigin} voidAmt={voidAmt} />
    </group>
  );
};
