// The Journey act's post stack: DOF (world focus) -> heat haze + glitch tear (UV effects) -> bloom ->
// chromatic aberration -> ACES -> vignette. All uniforms are set from props every render (pure).
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, DepthOfField, ToneMapping, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { Effect, ToneMappingMode, BlendFunction } from 'postprocessing';

const HAZE_FRAG = /* glsl */ `
uniform float uTime; uniform float uAmt; uniform float uTop;
uniform float uTearAmt; uniform float uTearY0; uniform float uTearY1; uniform float uTearPx; uniform float uAspect;
void mainUv(inout vec2 uv){
  if (uAmt > 0.0) {
    float m = 1.0 - smoothstep(uTop * 0.55, uTop, uv.y);
    float w = sin(uv.y * 95.0 - uTime * 7.0 + sin(uv.x * 23.0 + uTime * 2.3) * 1.6) * 0.6
            + sin(uv.y * 41.0 - uTime * 4.3 + uv.x * 11.0) * 0.4;
    uv.x += w * uAmt * m;
    uv.y += cos(uv.x * 47.0 + uTime * 5.1) * uAmt * 0.45 * m;
  }
  if (uTearAmt > 0.0 && uv.y > uTearY0 && uv.y < uTearY1) {
    float band = floor((uv.y - uTearY0) / max(uTearY1 - uTearY0, 1e-4) * 5.0);
    float s = fract(sin(band * 91.7 + uTime * 13.0) * 4375.5) - 0.5;
    uv.x += (uTearPx + s * uTearPx) * uTearAmt;
  }
}`;

class HazeTearEffect extends Effect {
  constructor() {
    super('HazeTearEffect', HAZE_FRAG, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uTime', new THREE.Uniform(0)], ['uAmt', new THREE.Uniform(0)], ['uTop', new THREE.Uniform(0.35)],
        ['uTearAmt', new THREE.Uniform(0)], ['uTearY0', new THREE.Uniform(0.4)], ['uTearY1', new THREE.Uniform(0.45)], ['uTearPx', new THREE.Uniform(0.004)], ['uAspect', new THREE.Uniform(1.78)],
      ]),
    });
  }
}

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

const HazeTear: React.FC<{ time: number; haze: number; hazeTop: number; tear: number; tearY: [number, number]; tearPx: number }> = ({ time, haze, hazeTop, tear, tearY, tearPx }) => {
  const effect = useMemo(() => new HazeTearEffect(), []);
  const u = effect.uniforms;
  u.get('uTime')!.value = time;
  u.get('uAmt')!.value = haze;
  u.get('uTop')!.value = hazeTop;
  u.get('uTearAmt')!.value = tear;
  u.get('uTearY0')!.value = tearY[0];
  u.get('uTearY1')!.value = tearY[1];
  u.get('uTearPx')!.value = tearPx;
  return <primitive object={effect} dispose={null} />;
};

export type JourneyPostProps = {
  /** world focus distance (m); omit = no DOF */
  focus?: number;
  focusRange?: number;
  bokeh?: number;
  bloom?: number;
  threshold?: number;
  smoothing?: number;
  /** chromatic aberration offset in uv (storyboard: 0.0008 lens, 0.012 glitch) */
  ca?: number;
  vignette?: number;
  /** heat haze in the lower part of the frame: amplitude in uv (~0.002) and the top of the zone (0..1 from the bottom) */
  haze?: number;
  hazeTop?: number;
  /** glitch tear: 0..1, a band in uv y (0 bottom) and the shift in uv x */
  tear?: number;
  tearY?: [number, number];
  tearPx?: number;
  time?: number;
  multisampling?: number;
};

export const JourneyPost: React.FC<JourneyPostProps> = ({ focus, focusRange = 0.6, bokeh = 3, bloom = 1, threshold = 0.6, smoothing = 0.3, ca = 0, vignette = 0.45, haze = 0, hazeTop = 0.33, tear = 0, tearY = [0.4, 0.45], tearPx = 0.004, time = 0, multisampling = 4 }) => {
  const off = useMemo(() => new THREE.Vector2(), []);
  off.set(ca, ca * 0.6);
  const kids: React.ReactElement[] = [];
  if (haze > 0 || tear > 0) kids.push(<HazeTear key="ht" time={time} haze={haze} hazeTop={hazeTop} tear={tear} tearY={tearY} tearPx={tearPx} />);
  if (focus !== undefined) kids.push(<DOF key="dof" focus={focus} range={focusRange} bokeh={bokeh} />);
  if (bloom > 0) kids.push(<Bloom key="bloom" intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={smoothing} radius={0.75} mipmapBlur />);
  if (ca > 0) kids.push(<ChromaticAberration key="ca" offset={off} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />);
  kids.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
  if (vignette > 0) kids.push(<Vignette key="vig" darkness={vignette} offset={0.3} />);
  return <EffectComposer multisampling={multisampling}>{kids}</EffectComposer>;
};
