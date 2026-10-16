// Fonts for in-world text drawn onto CanvasTextures. Canvas text needs the font *loaded* before
// drawing, so every 3D text user calls useEnemyFonts() which holds a delayRender until it is.
// Note: @remotion/google-fonts names Press Start 2P "Press Start TwoP"; always quote families.
import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';
import { loadFont as loadPress } from '@remotion/google-fonts/PressStart2P';
import { loadFont as loadPixel } from '@remotion/google-fonts/PixelifySans';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

const press = loadPress('normal', { weights: ['400'], subsets: ['latin'] });
const pixel = loadPixel('normal', { weights: ['400', '600', '700'], subsets: ['latin'] });
const inter = loadInter('normal', { weights: ['500', '600', '700', '800'], subsets: ['latin'] });

export const F_PRESS = press.fontFamily; // boss names, $999B
export const F_PIXEL = pixel.fontFamily; // labels, small UI
export const F_HYPE = inter.fontFamily; // the Bubble's glossy corporate sans

export const font = (family: string, px: number, weight: number | string = 400) => `${weight} ${px}px "${family}"`;

let loaded = false;
let pending: Promise<void> | null = null;
const loadAll = () => {
  if (!pending) {
    pending = Promise.all([press.waitUntilDone(), pixel.waitUntilDone(), inter.waitUntilDone()])
      .then(() =>
        Promise.all([
          document.fonts.load(font(F_PRESS, 32), 'AZ$09+%'),
          document.fonts.load(font(F_PIXEL, 32), 'AZaz09'),
          document.fonts.load(font(F_PIXEL, 32, 700), 'AZaz09'),
          document.fonts.load(font(F_HYPE, 32, 600), 'AZaz09'),
          document.fonts.load(font(F_HYPE, 32, 700), 'AZaz09'),
          document.fonts.load(font(F_HYPE, 32, 800), 'AZaz09'),
        ]),
      )
      .then(() => {
        loaded = true;
      });
  }
  return pending;
};

/** true once the enemy fonts are drawable on a canvas. Blocks the render until then. */
export const useEnemyFonts = () => {
  const [ok, setOk] = useState(loaded);
  const [handle] = useState(() => (loaded ? null : delayRender('enemy fonts')));
  useEffect(() => {
    if (ok) {
      if (handle !== null) continueRender(handle);
      return;
    }
    let live = true;
    loadAll()
      .then(() => {
        if (live) setOk(true);
        if (handle !== null) continueRender(handle);
      })
      .catch((e) => cancelRender(e));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ok;
};
