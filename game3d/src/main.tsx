// window.R3D: renders the final Bubble fight in 3D on top of the 2D game. The game keeps simulating in 2D
// and calls R3D.frame(info) from render(); when that returns > 0 the game draws its HUD on R3D's overlay.
//   0 = not active (the game draws everything in 2D as before)
//   1 = blending in (the game still draws its 2D world underneath while the 3D canvas fades in)
//   2 = full 3D (the game draws only the HUD overlay)
// URL overrides: ?r3d=off | high | low | force (force = never auto-fall back, for measuring).
import * as THREE from 'three';
import React from 'react';
import { createRoot, advance, extend, flushSync, ReconcilerRoot } from '@react-three/fiber';
import { __setFrame } from 'remotion';
import { Arena, Quality, CORE_BG } from './Arena';
import { camAt, setProjCam, project, unproject } from './camera';
import { createTracker, GameInfo } from './track';

type Setting = Quality | 'off';
const KEY = 'sahurProtocol3dV1';
const qs = new URLSearchParams(location.search).get('r3d');
const FORCE = qs === 'force';
const RM = matchMedia('(prefers-reduced-motion: reduce)');

const store = {
  get(): Setting {
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'high' || v === 'low' || v === 'off') return v;
    } catch {}
    return 'high';
  },
  set(v: Setting) {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  },
};

const webglOk = (() => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
})();

// createRoot (unlike <Canvas>) does not register THREE for JSX by itself. Only the elements the models use
// (grep of game3d/src and the promo's enemies/rig/fx sources) are registered, so the rest of three can be shaken out.
extend({
  BoxGeometry: THREE.BoxGeometry, CapsuleGeometry: THREE.CapsuleGeometry, CircleGeometry: THREE.CircleGeometry,
  ConeGeometry: THREE.ConeGeometry, CylinderGeometry: THREE.CylinderGeometry, OctahedronGeometry: THREE.OctahedronGeometry,
  PlaneGeometry: THREE.PlaneGeometry, RingGeometry: THREE.RingGeometry, SphereGeometry: THREE.SphereGeometry,
  TorusGeometry: THREE.TorusGeometry, BufferGeometry: THREE.BufferGeometry,
  Color: THREE.Color, Fog: THREE.Fog, Group: THREE.Group, Object3D: THREE.Object3D,
  Mesh: THREE.Mesh, InstancedMesh: THREE.InstancedMesh, LineSegments: THREE.LineSegments, Points: THREE.Points,
  MeshBasicMaterial: THREE.MeshBasicMaterial, MeshStandardMaterial: THREE.MeshStandardMaterial,
  DirectionalLight: THREE.DirectionalLight, HemisphereLight: THREE.HemisphereLight, PointLight: THREE.PointLight,
  AmbientLight: THREE.AmbientLight, PerspectiveCamera: THREE.PerspectiveCamera,
});

let setting: Setting = qs === 'off' || qs === 'high' || qs === 'low' ? qs : store.get();
let fallback = webglOk ? '' : 'no WebGL';
let root: ReconcilerRoot<HTMLCanvasElement> | null = null;
let canvas: HTMLCanvasElement | null = null;
let hud: HTMLCanvasElement | null = null;
let hudCtx: CanvasRenderingContext2D | null = null;
let size = { w: 0, h: 0, dpr: 0, q: '' };
let fightBoss: object | null = null;
let trans = 0;
let lastNow = 0;
let F = 0;
let active = 0;
const tracker = createTracker();
const stats = { fps: 0, frames: 0, windows: [] as number[], slow: 0, acc: 0, n: 0, quality: '' as string, downgrades: [] as string[] };

const effectiveQuality = (): Quality => (setting === 'low' ? 'low' : 'high');

const init = () => {
  if (root || fallback) return !fallback;
  try {
    const game = document.getElementById('game') as HTMLCanvasElement;
    const wrap = document.getElementById('wrap')!;
    canvas = document.createElement('canvas');
    canvas.id = 'r3dCanvas';
    hud = document.createElement('canvas');
    hud.id = 'r3dHud';
    hud.width = 960;
    hud.height = 540;
    for (const c of [canvas, hud]) {
      c.style.cssText = 'position:absolute; pointer-events:none; display:none; left:0; top:0;';
      c.setAttribute('aria-hidden', 'true');
    }
    // no z-index: like #game they sit under the HUD buttons, the overlays and the CRT scanlines (#wrap::after)
    canvas.style.background = CORE_BG;
    game.after(canvas, hud);
    hudCtx = hud.getContext('2d')!;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      fail('WebGL context lost');
    });
    root = createRoot(canvas);
    configure();
    return true;
  } catch (e) {
    fail('WebGL init failed: ' + (e as Error).message);
    return false;
  }
};

const configure = () => {
  if (!root || !canvas) return;
  const game = document.getElementById('game')!;
  const r = game.getBoundingClientRect();
  const wr = document.getElementById('wrap')!.getBoundingClientRect();
  const q = effectiveQuality();
  const dpr = q === 'high' ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 1) * 0.8;
  const w = Math.round(r.width), h = Math.round(r.height);
  for (const c of [canvas, hud!]) {
    c.style.left = r.left - wr.left + 'px';
    c.style.top = r.top - wr.top + 'px';
    c.style.width = w + 'px';
    c.style.height = h + 'px';
  }
  if (w === size.w && h === size.h && dpr === size.dpr && q === size.q) return;
  size = { w, h, dpr, q };
  root.configure({
    size: { width: w, height: h, top: 0, left: 0 },
    dpr,
    frameloop: 'never',
    gl: { antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false },
    camera: { fov: 34, near: 0.1, far: 200, position: [0, 20, 0.01] },
    events: undefined,
  });
};

const show = (on: boolean) => {
  if (!canvas || !hud) return;
  const d = on ? 'block' : 'none';
  if (canvas.style.display !== d) canvas.style.display = d;
  if (hud.style.display !== d) hud.style.display = d;
};

let pendingNotice = '';
const fail = (why: string) => {
  if (fallback) return;
  fallback = why;
  console.warn('[r3d] falling back to the 2D renderer:', why);
  show(false);
  try {
    root?.unmount();
  } catch {}
  root = null;
};

/** frame-rate watchdog: 2 s windows; two slow windows in a row drop high -> low, then low -> 2D */
const watch = (dt: number, playing: boolean) => {
  // a frame over 1 s is a hidden tab or a breakpoint, not the renderer
  if (!playing || dt <= 0 || dt > 1) return;
  stats.acc += dt;
  stats.n++;
  if (stats.acc < 2) return;
  const fps = stats.n / stats.acc;
  stats.fps = Math.round(fps * 10) / 10;
  stats.windows.push(stats.fps);
  if (stats.windows.length > 30) stats.windows.shift();
  stats.acc = 0;
  stats.n = 0;
  if (FORCE) return;
  stats.slow = fps < 40 ? stats.slow + 1 : 0;
  if (stats.slow < 2) return;
  stats.slow = 0;
  if (setting === 'high') {
    setting = 'low';
    stats.downgrades.push('high->low at ' + stats.fps + ' fps');
    pendingNotice = '3D: LOW QUALITY (' + Math.round(fps) + ' FPS)';
  } else {
    stats.downgrades.push('low->2D at ' + stats.fps + ' fps');
    pendingNotice = 'SWITCHED TO 2D (' + Math.round(fps) + ' FPS)';
    fail('frame rate below 40 fps');
  }
};

const frame = (g: GameInfo & { notify?: (m: string) => void }): number => {
  const s = g.state;
  const now = g.now;
  const dt = lastNow ? Math.min(1.5, (now - lastNow) / 1000) : 0;
  lastNow = now;
  if (pendingNotice && g.notify) {
    g.notify(pendingNotice);
    pendingNotice = '';
  }
  const fight = !!(s && s.boss && s.boss.final && g.mode !== 'title');
  if (!fight || setting === 'off' || fallback) {
    show(false);
    fightBoss = null;
    active = 0;
    return 0;
  }
  if (!init()) return 0;
  if (s.boss !== fightBoss) {
    fightBoss = s.boss;
    trans = 0;
    tracker.reset();
    stats.slow = 0;
    stats.acc = 0;
    stats.n = 0;
  }
  configure();
  show(true);
  const reduced = RM.matches;
  // capped per frame, so the first frame's shader-compile stall does not skip the transition
  const since = (trans += Math.min(dt, 0.1));
  // the flat arena fades into the WebGL canvas (seen from straight above), then tilts into the 3/4 view
  const fade = Math.min(1, since / (reduced ? 0.25 : 0.45));
  const tilt = reduced ? 1 : Math.min(1, Math.max(0, (since - 0.35) / 1.6));
  canvas!.style.opacity = String(fade);
  const cam = camAt(tilt);
  setProjCam(cam);

  if (g.mode !== 'pause' && g.mode !== 'end') F += Math.min(dt, 0.1) * 60;
  __setFrame(Math.floor(F));
  const input = tracker.build(g, Math.floor(F), g.mode === 'play' || g.mode === 'beats' ? Math.min(dt, 0.1) : 0);
  const sh = reduced ? 0 : Math.min(g.shake, 20) / 40 * 0.35;
  const shake: [number, number] = [(Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh];
  const quality = effectiveQuality();
  try {
    flushSync(() => {
      root!.render(<Arena input={input} cam={cam} shake={shake} quality={quality} reduced={reduced} />);
    });
    advance(now);
  } catch (e) {
    fail('render error: ' + (e as Error).message);
    console.error(e);
    return 0;
  }
  stats.frames++;
  stats.quality = quality;
  watch(dt, g.mode === 'play' && tilt >= 1);
  active = fade < 1 ? 1 : 2;
  return active;
};

const api = {
  version: 1,
  supported: webglOk,
  frame,
  project,
  unproject,
  /** the 2D context of the HUD overlay (960x540, same coordinates as the game canvas) */
  hud: () => hudCtx,
  active: () => active,
  getSetting: () => setting,
  setSetting(v: Setting) {
    setting = v;
    store.set(v);
    if (v !== 'off' && fallback && webglOk && fallback !== 'WebGL context lost') fallback = '';
  },
  status: () => ({ setting, fallback, webgl: webglOk, active, fps: stats.fps, fpsWindows: stats.windows.slice(), frames: stats.frames, quality: stats.quality, downgrades: stats.downgrades.slice(), forced: FORCE, renderer: (() => {
    try {
      const gl = (root as any) && canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    } catch {
      return '';
    }
  })() }),
};
(window as any).R3D = api;
