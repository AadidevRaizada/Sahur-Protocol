// Common props for every enemy / boss component.
// All components are positioned by a parent <group>; their origin is the floor point under them (y = 0),
// except AIBubble whose origin is its centre.
export type EnemyBase = {
  /** current frame (60 fps). Every animation is a pure function of this. */
  frame: number;
  /** 0..1 white hit flash */
  hit?: number;
  /** 0..1 death (dissolve / shatter / splat depending on the enemy) */
  death?: number;
  /** uniform scale */
  scale?: number;
  /** varies idle phase so a crowd doesn't move in sync */
  seed?: number;
  /** draw the coloured light pool + contact shadow on the floor (default true) */
  floor?: boolean;
};
