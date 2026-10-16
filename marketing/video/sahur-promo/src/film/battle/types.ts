// Shot description shared by the three biome files and the act dispatcher.
import React from 'react';
import { CamState } from '../../pov/camera';
import { ShotCam } from './kit';
import { BattlePostProps } from './post';

export type Biome = 'forest' | 'wastes' | 'board';

export type ShotCtx = {
  /** global storyboard frame */
  f: number;
  v: boolean;
  w: number;
  h: number;
  cam: CamState;
  /** the camera 4 f ago (clamped to the shot), for the lagging mittens */
  camLag: CamState;
};

export type Heat = { progress: number; center: [number, number, number]; radius?: number; strength?: number };

export type Look = {
  /** exposure in EV (CSS brightness 2^ev) */
  ev?: number;
  sat?: number;
  contrast?: number;
};

export type Shot = {
  id: string;
  a: number;
  b: number;
  biome: Biome;
  cam: (f: number, v: boolean) => ShotCam;
  /** per-shot props for the biome set (focus, ring, key...) */
  set?: (f: number, v: boolean) => Record<string, unknown>;
  Scene: React.FC<ShotCtx>;
  post?: (f: number, v: boolean) => Partial<BattlePostProps> & { heat?: Heat };
  look?: (f: number) => Look;
  Dom?: React.FC<ShotCtx>;
  /** camera motion blur shutter (0 = off) */
  shutter?: number;
};
