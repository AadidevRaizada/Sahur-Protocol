// Fonts. Pixel fonts come from the game itself. Montserrat is for subtitles only.
import { loadFont as loadPixelify } from '@remotion/google-fonts/PixelifySans';
import { loadFont as loadPress } from '@remotion/google-fonts/PressStart2P';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';

export const PIXEL = loadPixelify().fontFamily;      // Sahur's in-world speech, UI
export const PRESS = loadPress().fontFamily;         // title card, boss names
export const SANS = loadMontserrat().fontFamily;     // the player's subtitles
