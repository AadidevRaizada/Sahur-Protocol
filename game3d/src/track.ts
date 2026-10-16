// Turns the live 2D game state into plain props for the 3D models (pure data, rebuilt every frame).
// The simulation is never touched: this only reads `state`, `beats` and a few timers.
import { toX, toZ } from './camera';

export type GameInfo = {
  state: any;
  mode: string;
  beats: any;
  shake: number;
  flash: number;
  now: number;
  /** constants from the game, so the two never drift apart */
  k: { SNIPE_WINDUP: number; SAHUR_HELP_TIME: number; SAHUR_HELP_R: number; attackFrames: number; colors: Record<string, string> };
};

export type EnemyView = {
  id: number;
  type: string;
  X: number;
  Z: number;
  yaw: number;
  scale: number;
  hit: number;
  death: number;
  seed: number;
  fire: number;
  lunge: number;
  lungeYaw: number;
  windup: number;
  grab: number;
};

export type BubbleView = {
  X: number; Y: number; Z: number; hit: number; opacity: number;
  inflate: number; dent: number; dentAmp: number; leak: number; seam: number; shed: number; pop: number;
  gaze: [number, number]; smileFlat: number; faceWarp: number; ringSpeed: number;
};

export type SahurView = {
  visible: boolean; X: number; Z: number; turn: number;
  swing: number; swingMix: number; walk: number; walkAmount: number;
  down: boolean; expression: string; cracks: number; innerLight: number; glitch: number;
  look: [number, number]; ring: number; ringR: number; help: number; helpR: number;
  shards: number;
};

export type ArenaInput = {
  frame: number;
  bubble: BubbleView | null;
  sahur: SahurView;
  player: { X: number; Z: number; yaw: number; blink: boolean; swing: number; swingCol: string; hp: number };
  enemies: EnemyView[];
  bullets: { X: number; Z: number; snipe: boolean }[];
  parts: { X: number; Z: number; h: number; col: string; a: number }[];
  pending: { X: number; Z: number; r: number; col: string; pulse: number }[];
  snipes: number[];
  answers: number;
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const DEATH_FRAMES = 48;

export const createTracker = () => {
  const ids = new WeakMap<object, number>();
  let nextId = 1;
  const idOf = (o: object) => {
    let i = ids.get(o);
    if (!i) {
      i = nextId++;
      ids.set(o, i);
    }
    return i;
  };
  let live = new Map<number, EnemyView>();
  let ghosts: (EnemyView & { f0: number })[] = [];
  let prevState: any = null;
  const sah = { px: 0, py: 0, walk: 0, walkAmt: 0, swingMix: 0, ring: 0, lastX: 0, lastZ: 0, turn: 0 };
  const bub = { inflate: 0.06, dentF: -999, dentAmp: 0.02, lastN: 0, seamF: -1 };

  const reset = () => {
    live = new Map();
    ghosts = [];
    bub.inflate = 0.06;
    bub.dentF = -999;
    bub.lastN = 0;
    bub.seamF = -1;
    sah.swingMix = 0;
    sah.walkAmt = 0;
  };

  const build = (g: GameInfo, F: number, dt: number): ArenaInput => {
    const s = g.state, p = s.player, sa = s.sahur, b = s.boss, beats = g.mode === 'beats' ? g.beats : null;
    if (s !== prevState) {
      reset();
      prevState = s;
      sah.px = sa.x;
      sah.py = sa.y;
    }

    // ---- enemies (+ ghosts that keep dying after the game drops them) ----
    const next = new Map<number, EnemyView>();
    for (const e of s.enemies) {
      const id = idOf(e);
      const dx = p.x - e.x, dy = p.y - e.y;
      let fire = 0, lunge = 0, windup = 0, grab = 0;
      if (e.type === 'drone' || e.type === 'yesman') fire = e.t < 0.3 ? ((0.3 - e.t) / 0.3) * 0.2 : 0;
      if (e.type === 'wraith') lunge = e.dashT > 0 ? 0.3 + (1 - e.dashT / 0.4) * 0.32 : e.t < 0.3 ? ((0.3 - e.t) / 0.3) * 0.3 : 0;
      if (e.type === 'hand') {
        windup = e.wind > 0 ? 1 - e.wind / 0.45 : 0;
        grab = e.dashT > 0 ? 1 - e.dashT / 0.32 : 0;
      }
      const v: EnemyView = {
        id, type: e.type, X: toX(e.x), Z: toZ(e.y),
        yaw: Math.atan2(dx, dy),
        scale: e.type === 'golem' ? 1.05 : e.type === 'drone' ? 0.8 : 0.85,
        hit: clamp(e.hitT / 0.12), death: 0, seed: (id * 0.618) % 7,
        fire, lunge: clamp(lunge), lungeYaw: Math.atan2(-dy, dx), windup: clamp(windup), grab: clamp(grab),
      };
      next.set(id, v);
    }
    for (const [id, v] of live) if (!next.has(id)) ghosts.push({ ...v, hit: 0, fire: 0, lunge: 0, windup: 0, grab: 0, f0: F });
    live = next;
    ghosts = ghosts.filter((gh) => F - gh.f0 < DEATH_FRAMES);
    const enemies: EnemyView[] = [...next.values()];
    for (const gh of ghosts) enemies.push({ ...gh, death: clamp((F - gh.f0) / DEATH_FRAMES) });

    // ---- the Bubble ----
    let bubble: BubbleView | null = null;
    if (b) {
      const phase = s.phase || 1;
      const collapse = clamp((s.collapseT || 0) / 7);
      const target = phase >= 3 ? 0.32 : phase === 2 ? 0.2 : 0.06;
      bub.inflate += (target - bub.inflate) * Math.min(1, dt * 2.5);
      // every TUNG of his (and every answer of yours) ripples the film
      if ((sa.ring || 0) > 0.3 && sah.ring <= 0.3) {
        bub.dentF = F;
        bub.dentAmp = 0.022;
      }
      const n = beats ? beats.n : 0;
      if (n > bub.lastN) {
        bub.dentF = F;
        bub.dentAmp = 0.06;
        if (n >= 2 && bub.seamF < 0) bub.seamF = F;
      }
      bub.lastN = n;
      const dentP = (F - bub.dentF) / 40;
      const R = 1.42 * (1 + 0.65 * bub.inflate);
      bubble = {
        X: toX(b.x), Z: toZ(b.y), Y: R + 0.6,
        hit: clamp(b.hitT / 0.12), opacity: b.vuln ? 1 : 0.82,
        inflate: bub.inflate,
        dent: dentP > 0 && dentP < 1 ? dentP : 0, dentAmp: bub.dentAmp,
        leak: beats ? 0.75 + 0.08 * n : phase >= 3 ? 0.15 + 0.6 * collapse : 0,
        seam: bub.seamF >= 0 ? clamp((F - bub.seamF) / 40) : 0,
        shed: beats ? 0.3 + 0.2 * n : phase >= 3 ? 0.25 * collapse : 0,
        pop: beats && beats.done ? clamp(beats.endT / 1.7) : 0,
        gaze: [clamp((p.x - b.x) / 320, -1, 1), clamp(-(p.y - b.y) / 320, -1, 1) * 0.7],
        smileFlat: beats ? 1 : phase >= 3 ? collapse : 0,
        faceWarp: phase >= 3 ? 0.5 : phase === 2 ? 0.2 : 0,
        ringSpeed: phase >= 2 ? 1.6 : 1,
      };
    }
    sah.ring = sa.ring || 0;

    // ---- Sahur ----
    const step = Math.hypot(sa.x - sah.px, sa.y - sah.py);
    sah.px = sa.x;
    sah.py = sa.y;
    const speed = dt > 0 ? step / dt : 0;
    sah.walk += step / 95;
    sah.walkAmt += (clamp(speed / 110) - sah.walkAmt) * Math.min(1, dt * 8);
    const attack = sa.anim === 'attack';
    const atkK = clamp(sa.animT / (0.09 * g.k.attackFrames));
    sah.swingMix = attack ? 1 : Math.max(0, sah.swingMix - dt * 4);
    const turnTarget = sa.down ? 0 : (sa.facing || 1) * 0.55;
    sah.turn += (turnTarget - sah.turn) * Math.min(1, dt * 6);
    const collapsing = b && b.final && s.phase >= 3;
    const coreFlick = Math.sin(sa.flicker * 13) > 0.9 || (collapsing && Math.random() < 0.25);
    const n = beats ? beats.n : 0;
    const sahur: SahurView = {
      visible: !!sa.alive,
      X: toX(sa.x), Z: toZ(sa.y), turn: sah.turn,
      swing: attack ? 0.42 + 0.58 * atkK : 1, swingMix: sah.swingMix,
      walk: sah.walk, walkAmount: sa.down ? 0 : sah.walkAmt,
      down: !!sa.down,
      expression: sa.down || sa.hurtT > 0 ? 'strained' : attack ? 'fierce' : collapsing || beats ? 'sad' : 'determined',
      cracks: beats ? 2.2 + 0.25 * n : collapsing ? 2.2 * clamp((s.collapseT || 0) / 7) : 0,
      innerLight: beats ? 0.12 * n : 0,
      glitch: coreFlick ? 0.85 : 0,
      look: [b ? clamp((b.x - sa.x) / 300, -1, 1) : 0, 0.35],
      ring: sa.ring > 0 ? 1 - sa.ring / 0.4 : -1,
      ringR: (sa.radius || 135) / 40,
      help: sa.down ? clamp(sa.help / g.k.SAHUR_HELP_TIME) : -1,
      helpR: g.k.SAHUR_HELP_R / 40,
      shards: beats && beats.done ? clamp(beats.endT / 1.3) : -1,
    };
    if (sa.alive) {
      sah.lastX = sahur.X;
      sah.lastZ = sahur.Z;
    } else {
      sahur.X = sah.lastX;
      sahur.Z = sah.lastZ;
    }

    // ---- player, bullets, particles, telegraphs ----
    const player = {
      X: toX(p.x), Z: toZ(p.y), yaw: Math.atan2(p.fx || 0, p.fy || 0),
      blink: p.inv > 0 && Math.sin(g.now / 40) <= 0,
      swing: p.swing || 0,
      swingCol: p.onBeat > 0 ? '#ffb547' : p.buffT > 0 ? '#ff3df0' : '#5b5470',
      hp: p.hp / p.maxHp,
    };
    const bullets = s.bullets.map((bl: any) => ({ X: toX(bl.x), Z: toZ(bl.y), snipe: !!bl.snipe }));
    const parts = s.parts.map((pt: any) => {
      const age = 0.5 - pt.t;
      return { X: toX(pt.x), Z: toZ(pt.y), h: 0.3 + 3 * age - 6 * age * age, col: pt.col, a: clamp(pt.t * 2) };
    });
    const pulse = 0.5 + 0.5 * Math.sin(g.now / 85);
    const pending = s.pending.map((pd: any) => ({ X: toX(pd.x), Z: toZ(pd.y), r: 0.45, col: g.k.colors[pd.type] || '#ff3df0', pulse }));
    const snipes = sa.alive && b ? s.snipes.map((sn: any) => clamp(1 - sn.t / g.k.SNIPE_WINDUP)) : [];

    return { frame: F, bubble, sahur, player, enemies, bullets, parts, pending, snipes, answers: n };
  };

  return { build, reset };
};
