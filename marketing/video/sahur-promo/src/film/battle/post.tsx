// Battle post stack: (extra effects such as TungHeat) → camera motion blur → bloom → chromatic
// aberration → ACES → vignette. The motion blur is a screen-space directional + radial smear driven by
// the camera's own motion (kit.camBlur), so whip-pans and drops streak like a real shutter.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { EffectComposer, Bloom, ChromaticAberration, ToneMapping, Vignette } from '@react-three/postprocessing';
import { Effect, EffectAttribute, ToneMappingMode, BlendFunction } from 'postprocessing';

const BLUR_FRAG = /* glsl */ `
uniform vec2 uDir;
uniform float uRadial;
uniform vec2 uCenter;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
  float L = length(uDir) + abs(uRadial);
  if (L < 0.0008) { outputColor = inputColor; return; }
  vec4 acc = vec4(0.0);
  float ws = 0.0;
  for (int i = 0; i < 20; i++) {
    float t = float(i) / 19.0 - 0.5;
    vec2 off = uDir * t + (uv - uCenter) * uRadial * t;
    float w = 1.0 - abs(t) * 0.9;
    acc += texture2D(inputBuffer, clamp(uv + off, vec2(0.001), vec2(0.999))) * w;
    ws += w;
  }
  outputColor = acc / ws;
}`;

class DirBlurEffect extends Effect {
  constructor() {
    super('DirBlurEffect', BLUR_FRAG, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uDir', new THREE.Uniform(new THREE.Vector2(0, 0))],
        ['uRadial', new THREE.Uniform(0)],
        ['uCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
      ]),
    });
  }
}

const DirBlur: React.FC<{ dir: [number, number]; radial: number; center?: [number, number] }> = ({ dir, radial, center = [0.5, 0.5] }) => {
  const e = useMemo(() => new DirBlurEffect(), []);
  (e.uniforms.get('uDir')!.value as THREE.Vector2).set(dir[0], dir[1]);
  e.uniforms.get('uRadial')!.value = radial;
  (e.uniforms.get('uCenter')!.value as THREE.Vector2).set(center[0], center[1]);
  return <primitive object={e} dispose={null} />;
};

export type BattlePostProps = {
  bloom?: number;
  threshold?: number;
  radius?: number;
  /** chromatic aberration as a uv offset (storyboard values: 0.0008 base, 0.004 spikes) */
  ca?: number;
  vignette?: number;
  /** motion blur vector in uv units, plus a radial zoom smear */
  blur?: [number, number];
  zoom?: number;
  zoomCenter?: [number, number];
  children?: React.ReactNode;
};

export const BattlePost: React.FC<BattlePostProps> = ({ bloom = 1.0, threshold = 1.0, radius = 0.6, ca = 0.0008, vignette = 0.35, blur = [0, 0], zoom = 0, zoomCenter, children }) => {
  const off = useMemo(() => new THREE.Vector2(), []);
  off.set(ca, ca * 0.6);
  const kids: React.ReactElement[] = [];
  React.Children.forEach(children, (c) => { if (React.isValidElement(c)) kids.push(c); });
  return (
    <EffectComposer multisampling={4}>
      {kids}
      <DirBlur dir={blur} radial={zoom} center={zoomCenter} />
      <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.25} radius={radius} mipmapBlur />
      <ChromaticAberration offset={off} radialModulation modulationOffset={0.15} blendFunction={BlendFunction.NORMAL} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette darkness={vignette} offset={0.3} />
    </EffectComposer>
  );
};
