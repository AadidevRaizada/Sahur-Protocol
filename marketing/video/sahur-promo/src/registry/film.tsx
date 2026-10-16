// The final film. SahurPromo = 16:9, SahurPromoVertical = 9:16 (re-rendered, not cropped).
import { Composition } from 'remotion';
import { Film } from '../film/Film';
import { TOTAL, FPS } from '../film/timeline';

export const FilmCompositions = () => (
  <>
    <Composition id="SahurPromo" component={Film} width={1920} height={1080} fps={FPS} durationInFrames={TOTAL} defaultProps={{ muted: false }} />
    <Composition id="SahurPromoVertical" component={Film} width={1080} height={1920} fps={FPS} durationInFrames={TOTAL} defaultProps={{ muted: false }} />
  </>
);
