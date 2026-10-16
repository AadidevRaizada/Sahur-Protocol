// Rig workstream compositions: character sheets, hands sheet, key frames, dev lab.
import React from 'react';
import { Composition, Still } from 'remotion';
import { SahurLab } from '../rig/comps/SahurLab';
import { HandsSheet } from '../rig/comps/HandsSheet';
import { SahurSheet } from '../rig/comps/SahurSheet';
import { DoorwayScene } from '../rig/comps/DoorwayScene';
import { KeyFramePhone } from '../rig/comps/KeyFramePhone';
import { BedroomLab } from '../rig/comps/BedroomLab';

// KeyFrameDoorway covers storyboard frames 860-1410 (S09-S14): frame f = storyboard frame 860 + f.
// Pass sbStart (e.g. 720) to include the knocks (S08).
export const RigCompositions = () => (
  <>
    <Composition id="SahurLab" component={SahurLab} width={1920} height={1080} fps={60} durationInFrames={12} />
    <Composition id="BedroomLab" component={BedroomLab} width={1920} height={1080} fps={60} durationInFrames={8} />
    <Still id="SahurSheet" component={SahurSheet} width={1920} height={1080} />
    <Composition id="HandsSheet" component={HandsSheet} width={1920} height={1080} fps={60} durationInFrames={60} />
    <Composition id="KeyFrameDoorway" component={DoorwayScene} width={1920} height={1080} fps={60} durationInFrames={550} defaultProps={{ sbStart: 860 }} />
    <Composition id="KeyFrameDoorwayVertical" component={DoorwayScene} width={1080} height={1920} fps={60} durationInFrames={550} defaultProps={{ sbStart: 860 }} />
    <Composition id="KeyFramePhone" component={KeyFramePhone} width={1920} height={1080} fps={60} durationInFrames={90} />
    <Composition id="KeyFramePhoneVertical" component={KeyFramePhone} width={1080} height={1920} fps={60} durationInFrames={90} />
  </>
);
