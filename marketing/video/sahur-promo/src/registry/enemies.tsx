// Enemies workstream compositions: model sheets for enemies, bosses, the AI Bubble and FX.
import { Composition } from 'remotion';
import { EnemySheet } from '../enemies/sheets/EnemySheet';
import { BossSheet } from '../enemies/sheets/BossSheet';
import { BubbleSheet } from '../enemies/sheets/BubbleSheet';
import { KeyFrameCore } from '../enemies/sheets/KeyFrameCore';
import { TungWaveSheet } from '../enemies/sheets/TungWaveSheet';

export const EnemyCompositions = () => (
  <>
    <Composition id="EnemySheet" component={EnemySheet} width={1920} height={1080} fps={60} durationInFrames={120} />
    <Composition id="BossSheet" component={BossSheet} width={1920} height={1080} fps={60} durationInFrames={120} />
    <Composition id="BubbleSheet" component={BubbleSheet} width={1920} height={1080} fps={60} durationInFrames={240} />
    <Composition id="KeyFrameCore" component={KeyFrameCore} width={1920} height={1080} fps={60} durationInFrames={240} />
    <Composition id="KeyFrameCoreVertical" component={KeyFrameCore} width={1080} height={1920} fps={60} durationInFrames={240} />
    <Composition id="TungWaveSheet" component={TungWaveSheet} width={1920} height={1080} fps={60} durationInFrames={90} />
  </>
);
