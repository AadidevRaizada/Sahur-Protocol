// ACT "bedroomB" (global frames 3720-4200, storyboard S52-S57). Owned by the rig builder.
// S52: the Core act's white becomes light through closed eyelids; S53-S57: one continuous morning shot.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { MorningShot } from '../bedroom/MorningShot';
import { colorRamp, useFrames } from '../bedroom/common';

export const BedroomBAct: React.FC = () => {
  const { sb: f, off } = useFrames();
  if (f < 3780) {
    // white holds 3720-3730, then light seen through closed eyelids
    const c = colorRamp(f, [[3730, '#ffffff'], [3744, '#ffd9c4'], [3756, '#c0583c'], [3768, '#2a0d08'], [3780, '#140605']]);
    return <AbsoluteFill style={{ background: c }} />;
  }
  return <MorningShot f={f} off={off} />;
};
