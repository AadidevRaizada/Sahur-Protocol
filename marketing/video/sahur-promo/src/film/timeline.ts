// The film's master timeline. Frames are STORYBOARD frames (60 fps, 0..4499) = the film's global frames.
// Shot list: storyboard.md section 4.1. Acts are the unit of ownership: one builder per act file.
export const FPS = 60;
export const TOTAL = 4500;

export type ActId = 'bedroomA' | 'journey' | 'battle' | 'core' | 'bedroomB' | 'endcard';

/** [start, end) in global frames. Contiguous, covering 0..4500. */
export const ACTS: Record<ActId, [number, number]> = {
  bedroomA: [0, 1410],    // beats 1-4  (S01-S14)  the reel, waking in blue, Sahur arrives, let's go
  journey: [1410, 2400],  // beats 5-6  (S15-S26)  the montage, the fire
  battle: [2400, 2976],   // beat 7     (S27-S44)  the fights, three biomes, mid-boss flashes, into white
  core: [2976, 3720],     // beats 8-9  (S45-S51)  the AI Bubble, hand on shoulder, TUNG TUNG POP
  bedroomB: [3720, 4200], // beat 10    (S52-S57)  white to eyelids, we did it., …sahur?, the far TUNG
  endcard: [4200, 4500],  // beat 11    (S58)      the game's title screen, the choir
};

export const ACT_ORDER: ActId[] = ['bedroomA', 'journey', 'battle', 'core', 'bedroomB', 'endcard'];
