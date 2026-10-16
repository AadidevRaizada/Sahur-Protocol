// ACT "bedroomA" (global frames 0-1410, storyboard S01-S14). Owned by the rig builder.
// S01-S03 the reel -> S04 black -> S05-S07 waking in the blue -> S08-S14 TUNG x3, the door, Sahur, let's go, amber.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useFilmFrame } from '../context';
import { PhoneShot } from '../bedroom/PhoneShot';
import { WakeShot } from '../bedroom/WakeShot';
import { DoorwayShot } from '../../rig/comps/DoorwayScene';

export const BedroomAAct: React.FC = () => {
  const f = useFilmFrame();
  if (f < 330) return <PhoneShot f={f} />;
  if (f < 420) return <AbsoluteFill style={{ background: '#000' }} />;
  if (f < 720) return <WakeShot f={f} />;
  return <DoorwayShot sb={f} />;
};
