// Post for the white Core: no tone mapping (pure whites stay white, the Bubble's palette stays exact),
// optional world-space DOF, a tight bloom that only catches true highlights, chromatic kicks, vignette.
// Extra effects (e.g. <TungHeat/>) go in as children and render before the bloom.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, DepthOfField, Vignette } from '@react-three/postprocessing';

const DOF: React.FC<{ focus: number; range: number; bokeh: number }> = ({ focus, range, bokeh }) => {
  const ref = useRef<any>(null);
  useLayoutEffect(() => {
    const e = ref.current;
    if (!e) return;
    e.cocMaterial.worldFocusDistance = focus;
    e.cocMaterial.worldFocusRange = range;
    e.bokehScale = bokeh;
  });
  return <DepthOfField ref={ref} worldFocusDistance={focus} worldFocusRange={range} bokehScale={bokeh} />;
};

export const CorePost: React.FC<{
  bloom?: number;
  threshold?: number;
  radius?: number;
  chroma?: number;
  vignette?: number;
  focus?: number;
  focusRange?: number;
  bokeh?: number;
  children?: React.ReactNode;
}> = ({ bloom = 0.9, threshold = 1.1, radius = 0.6, chroma = 0, vignette = 0.22, focus, focusRange = 0.5, bokeh = 3, children }) => {
  const off = useMemo(() => new THREE.Vector2(), []);
  off.set(0.0035 * chroma, 0.002 * chroma);
  const kids: React.ReactNode[] = [];
  if (focus !== undefined) kids.push(<DOF key="dof" focus={focus} range={focusRange} bokeh={bokeh} />);
  return (
    <EffectComposer multisampling={4}>
      {kids as any}
      {children as any}
      <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.12} mipmapBlur radius={radius} />
      <ChromaticAberration offset={off} radialModulation={false} modulationOffset={0} />
      <Vignette darkness={vignette} offset={0.32} />
    </EffectComposer>
  );
};
