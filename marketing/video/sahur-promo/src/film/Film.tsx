// The film: six acts in sequence plus the score and every SFX cue from public/audio/cues.json.
// Acts are owned by different builders (src/film/acts/*). Don't put shot logic here.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { ACTS, ACT_ORDER, ActId } from './timeline';
import { FilmOffset } from './context';
import { BedroomAAct } from './acts/BedroomA';
import { JourneyAct } from './acts/Journey';
import { BattleAct } from './acts/Battle';
import { CoreAct } from './acts/Core';
import { BedroomBAct } from './acts/BedroomB';
import { EndCardAct } from './acts/EndCard';
import cues from '../../public/audio/cues.json';

const ACT_COMPONENTS: Record<ActId, React.FC> = {
  bedroomA: BedroomAAct, journey: JourneyAct, battle: BattleAct, core: CoreAct, bedroomB: BedroomBAct, endcard: EndCardAct,
};

type Cue = { file: string; frame: number; volume: number; dur?: number };
type Cues = { musicVolume: number; duck: [number, number, number][]; cues: Cue[] };
const C = cues as unknown as Cues;

/** Music volume with the cue-sheet ducks applied: the same maths preview_mix.wav was rendered with (audio-src/SOUND-NOTES.md). */
const musicVolumeAt = (f: number) => {
  let v = C.musicVolume;
  for (const [a, b, lvl] of C.duck) {
    const k = Math.min(1, Math.max(0, Math.min(f - a, b - f) / 4));
    v *= 1 - (1 - lvl) * k;
  }
  return v;
};

const Soundtrack: React.FC<{ muted?: boolean }> = ({ muted }) => {
  useCurrentFrame();
  if (muted) return null;
  return (
    <>
      <Audio src={staticFile('audio/music.wav')} volume={(f) => musicVolumeAt(f)} />
      {C.cues.map((c, i) => (
        <Sequence key={i} from={c.frame} durationInFrames={c.dur ?? Infinity} layout="none">
          <Audio src={staticFile(c.file)} volume={c.volume} />
        </Sequence>
      ))}
    </>
  );
};

export const Film: React.FC<{ muted?: boolean }> = ({ muted }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    {ACT_ORDER.map((id) => {
      const [a, b] = ACTS[id];
      const Act = ACT_COMPONENTS[id];
      return (
        <Sequence key={id} from={a} durationInFrames={b - a} name={id}>
          <FilmOffset offset={a}>
            <Act />
          </FilmOffset>
        </Sequence>
      );
    })}
    <Soundtrack muted={muted} />
  </AbsoluteFill>
);
