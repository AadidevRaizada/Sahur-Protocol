// Sahur's facial expression presets. All values blend linearly.
import { lerp, clamp } from './util';

export type Expr = {
  /** brow height offset (units) */
  browRaise: number;
  /** + = inner ends up (sad/worried), - = inner ends down (angry V) */
  browAngle: number;
  /** upper lid closure 0 = wide open, 1 = shut */
  lidUpper: number;
  /** lower lid raise 0..1 (smiling / squinting eyes) */
  lidLower: number;
  /** + = outer corners down (sad), - = inner corners down (angry) */
  lidTilt: number;
  /** pupil scale */
  pupil: number;
  /** mouth curvature -1 frown .. +1 smile */
  curve: number;
  /** mouth opening 0..1 (1 = the open "TUNG") */
  open: number;
  /** mouth width multiplier */
  width: number;
  /** wavy, uncertain mouth line (sprite idle) */
  wobble: number;
  /** gaze [x, y] in radians-ish (-0.5..0.5) */
  look: [number, number];
  /** extra closure on his left upper lid only (STRAINED) */
  lidAsym?: number;
};

export type ExprName = 'weary' | 'fierce' | 'warm' | 'sad' | 'surprised' | 'determined' | 'neutral' | 'tung'
  | 'earnest' | 'smile' | 'amused' | 'sadSmile' | 'strained' | 'calm';
export type MouthName = 'flat' | 'smile' | 'grim' | 'tung';

export const EXPRESSIONS: Record<ExprName, Expr> = {
  neutral: { browRaise: 0, browAngle: 0.05, lidUpper: 0.22, lidLower: 0.08, lidTilt: 0, pupil: 1, curve: 0, open: 0, width: 1, wobble: 0, look: [0, 0] },
  // sprite idle: half-lidded, sad brows, wavy mouth, looking a little down
  weary: { browRaise: -0.005, browAngle: 0.3, lidUpper: 0.55, lidLower: 0.12, lidTilt: 0.2, pupil: 1, curve: -0.35, open: 0, width: 0.95, wobble: 0.6, look: [0.04, -0.12] },
  // sprite attack: V brows, wide eyes, grim mouth
  fierce: { browRaise: -0.025, browAngle: -0.5, lidUpper: 0.16, lidLower: 0.22, lidTilt: -0.22, pupil: 0.82, curve: -0.6, open: 0, width: 0.85, wobble: 0.1, look: [0, 0] },
  warm: { browRaise: 0.018, browAngle: 0.14, lidUpper: 0.32, lidLower: 0.38, lidTilt: 0.08, pupil: 1.08, curve: 0.75, open: 0, width: 1.05, wobble: 0, look: [0, 0] },
  sad: { browRaise: 0.028, browAngle: 0.55, lidUpper: 0.4, lidLower: 0.14, lidTilt: 0.32, pupil: 1.05, curve: -0.85, open: 0, width: 0.9, wobble: 0.35, look: [0, -0.2] },
  surprised: { browRaise: 0.07, browAngle: 0.12, lidUpper: 0.0, lidLower: 0.0, lidTilt: 0, pupil: 0.72, curve: 0, open: 0.55, width: 0.7, wobble: 0, look: [0, 0] },
  determined: { browRaise: -0.015, browAngle: -0.25, lidUpper: 0.3, lidLower: 0.22, lidTilt: -0.1, pupil: 0.95, curve: -0.2, open: 0, width: 0.9, wobble: 0, look: [0, 0] },
  // storyboard set
  earnest: { browRaise: 0.012, browAngle: 0.08, lidUpper: 0.18, lidLower: 0.1, lidTilt: 0.05, pupil: 1.05, curve: -0.05, open: 0, width: 0.95, wobble: 0, look: [0, 0] },
  smile: { browRaise: 0.015, browAngle: 0.12, lidUpper: 0.3, lidLower: 0.4, lidTilt: 0.06, pupil: 1.08, curve: 0.85, open: 0, width: 1.08, wobble: 0, look: [0, 0] },
  amused: { browRaise: 0.02, browAngle: 0.04, lidUpper: 0.38, lidLower: 0.42, lidTilt: 0.0, pupil: 1.0, curve: 0.65, open: 0, width: 1.05, wobble: 0.15, look: [0.05, 0] },
  sadSmile: { browRaise: 0.02, browAngle: 0.42, lidUpper: 0.5, lidLower: 0.3, lidTilt: 0.22, pupil: 1.05, curve: 0.45, open: 0, width: 1.0, wobble: 0.2, look: [0, -0.05] },
  strained: { browRaise: -0.03, browAngle: -0.5, lidUpper: 0.2, lidLower: 0.3, lidTilt: -0.2, pupil: 0.8, curve: -0.7, open: 0.1, width: 0.9, wobble: 0.3, look: [0, 0], lidAsym: 0.15 },
  calm: { browRaise: 0.0, browAngle: 0.08, lidUpper: 0.42, lidLower: 0.2, lidTilt: 0.06, pupil: 1.02, curve: 0.25, open: 0, width: 1.0, wobble: 0, look: [0, 0] },
  tung: { browRaise: -0.02, browAngle: -0.4, lidUpper: 0.2, lidLower: 0.25, lidTilt: -0.15, pupil: 0.85, curve: 0, open: 1, width: 0.78, wobble: 0, look: [0, 0] },
};

export const MOUTHS: Record<MouthName, Partial<Expr>> = {
  flat: { curve: 0, open: 0, wobble: 0 },
  smile: { curve: 0.55, open: 0, wobble: 0 },
  grim: { curve: -0.7, open: 0, wobble: 0.1 },
  tung: { curve: 0, open: 1, width: 0.78, wobble: 0 },
};

export const resolveExpr = (e: ExprName | Expr | undefined): Expr => (e === undefined ? EXPRESSIONS.weary : typeof e === 'string' ? EXPRESSIONS[e] : e);

export function mixExpr(a: Expr, b: Expr, t: number): Expr {
  const o: any = {};
  for (const k of Object.keys(a) as (keyof Expr)[]) {
    if (k === 'look') o.look = [lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t)];
    else o[k] = lerp((a[k] as number) ?? 0, (b[k] as number) ?? 0, t);
  }
  if (b.lidAsym !== undefined && a.lidAsym === undefined) o.lidAsym = lerp(0, b.lidAsym, t);
  return o;
}

/** final expression with blink, mouth override, talking and gaze override applied */
export function finalExpr(base: Expr, o: { blink?: number; mouth?: MouthName; talk?: number; look?: [number, number] }): Expr {
  let e = { ...base };
  if (o.mouth) e = { ...e, ...MOUTHS[o.mouth] };
  if (o.talk) e.open = clamp(e.open + o.talk * 0.6);
  if (o.look) e.look = o.look;
  const b = clamp(o.blink ?? 0);
  if (b > 0) { e.lidUpper = lerp(e.lidUpper, 1, b); e.lidLower = lerp(e.lidLower, 0.55, b); }
  return e;
}
