// The set behind each biome's canvas. The Hype Cycle Forest is the journey builder's src/sets/Forest.tsx
// (mood 'fight', laid out for the fight in forest.tsx). Scene-level fog/background are attached as direct
// children of the canvas scene (an attach="fog" inside a <group> binds to the group, not the scene).
import React from 'react';
import { Biome } from './types';
import { Wastes, WastesAtmos } from '../../sets/Wastes';
import { Boardroom } from '../../sets/Boardroom';
import { Forest } from '../../sets/Forest';
import { FOREST_FIGHT } from './forest';

export const BiomeSet: React.FC<{ biome: Biome; f: number; v: boolean; props: Record<string, unknown> }> = ({ biome, f, props }) => {
  if (biome === 'wastes') return (<><WastesAtmos /><Wastes frame={f} {...(props as object)} /></>);
  if (biome === 'board') return (<><color attach="background" args={['#05070c']} /><Boardroom frame={f} {...(props as object)} /></>);
  return <Forest {...FOREST_FIGHT} time={f} {...(props as object)} />;
};
