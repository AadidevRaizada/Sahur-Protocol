// Stand-in for the few `remotion` exports the promo models use. In the film every model is a pure
// function of the Remotion frame; in the game the driver sets the frame before each render.
let frame = 0;

export const __setFrame = (f: number) => {
  frame = f;
};

export const useCurrentFrame = () => frame;
export const useVideoConfig = () => ({ fps: 60, width: 960, height: 540, durationInFrames: 1e9, id: 'game' });

// Font loading in the models holds a delayRender; the game simply renders without the text until it is ready.
export const delayRender = (_label?: string) => 0;
export const continueRender = (_handle: number) => {};
export const cancelRender = (err: unknown) => {
  console.warn('[r3d]', err);
};
export const staticFile = (p: string) => p;
