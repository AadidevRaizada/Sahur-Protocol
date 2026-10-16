import { RigCompositions } from './registry/rig';
import { EnemyCompositions } from './registry/enemies';
import { FilmCompositions } from './registry/film';
import { SmokeCompositions } from './registry/smoke';

// Each registry file is owned by one workstream, so agents never edit the same file:
//   rig.tsx      -> Sahur, blob hands, rooms, POV camera kit, character sheets
//   enemies.tsx  -> enemies, bosses, the AI Bubble, enemy sheets
//   film.tsx     -> the final film (SahurPromo 16:9, SahurPromoVertical 9:16)
export const Root = () => (
  <>
    <SmokeCompositions />
    <RigCompositions />
    <EnemyCompositions />
    <FilmCompositions />
  </>
);
