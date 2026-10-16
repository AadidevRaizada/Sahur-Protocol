// Shared post-processing stack: DOF (world-space focus) -> bloom -> tone mapping -> vignette.
// Focus is updated in place (no effect re-creation per frame).
import React, { useLayoutEffect, useRef } from 'react';
import { EffectComposer, Bloom, DepthOfField, ToneMapping, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';

export type PostProps = {
  bloom?: number;
  bloomThreshold?: number;
  bloomRadius?: number;
  /** world-space focus distance from the camera; omit to disable DOF */
  focus?: number;
  focusRange?: number;
  bokeh?: number;
  vignette?: number;
  /** tiny chromatic aberration for the lens feel (0..1) */
  chroma?: number;
  tone?: 'aces' | 'agx' | 'neutral';
  multisampling?: number;
};

const DOF: React.FC<{ focus: number; range: number; bokeh: number }> = ({ focus, range, bokeh }) => {
  const ref = useRef<any>(null);
  useLayoutEffect(() => {
    const e = ref.current;
    if (!e) return;
    e.cocMaterial.worldFocusDistance = focus;
    e.cocMaterial.worldFocusRange = range;
    e.bokehScale = bokeh;
  }, [focus, range, bokeh]);
  return <DepthOfField ref={ref} worldFocusDistance={5} worldFocusRange={2} bokehScale={bokeh} />;
};

export const Post: React.FC<PostProps> = ({ bloom = 0.8, bloomThreshold = 0.75, bloomRadius = 0.75, focus, focusRange = 1.5, bokeh = 3, vignette = 0.45, chroma = 0, tone = 'aces', multisampling = 4 }) => {
  const mode = tone === 'aces' ? ToneMappingMode.ACES_FILMIC : tone === 'agx' ? ToneMappingMode.AGX : ToneMappingMode.NEUTRAL;
  const offset = React.useMemo(() => new THREE.Vector2(0.0006 * chroma, 0.0004 * chroma), [chroma]);
  const children: React.ReactElement[] = [];
  if (focus !== undefined) children.push(<DOF key="dof" focus={focus} range={focusRange} bokeh={bokeh} />);
  if (bloom > 0) children.push(<Bloom key="bloom" intensity={bloom} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.2} radius={bloomRadius} mipmapBlur />);
  if (chroma > 0) children.push(<ChromaticAberration key="ca" offset={offset} radialModulation modulationOffset={0.3} blendFunction={BlendFunction.NORMAL} />);
  children.push(<ToneMapping key="tm" mode={mode} />);
  if (vignette > 0) children.push(<Vignette key="vig" darkness={vignette} offset={0.32} />);
  return <EffectComposer multisampling={multisampling}>{children}</EffectComposer>;
};
