// Global-frame and aspect helpers for act components.
import React, { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

const OffsetCtx = createContext(0);

/** Wraps an act's <Sequence>: makes useFilmFrame() return the global (storyboard) frame. */
export const FilmOffset: React.FC<{ offset: number; children: React.ReactNode }> = ({ offset, children }) => (
  <OffsetCtx.Provider value={offset}>{children}</OffsetCtx.Provider>
);

/** The global storyboard frame (0..4499), whatever Sequence you are inside. */
export const useFilmFrame = () => useCurrentFrame() + useContext(OffsetCtx);

/** 'h' for 16:9 (1920x1080), 'v' for 9:16 (1080x1920). */
export const useAspect = (): 'h' | 'v' => {
  const { width, height } = useVideoConfig();
  return height > width ? 'v' : 'h';
};

const D = Math.PI / 180;
/** Storyboard section 9 "V-match": the vertical FOV that keeps the 16:9 frame's centre square identical. */
export const vMatchFov = (vFov169: number) => Math.min(80, (2 * Math.atan((16 / 9) * Math.tan((vFov169 * D) / 2))) / D);
