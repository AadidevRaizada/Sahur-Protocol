// Shared pieces for the QA sheets: grid floor, HTML labels projected from 3D anchors.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { projectToScreen } from '../lib/scene';

const FLOOR_VERT = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FLOOR_FRAG = /* glsl */ `
uniform vec3 uBase; uniform vec3 uLine; uniform vec3 uAccent; uniform float uMajor; uniform float uMinor; uniform float uScale; uniform vec2 uCenter; uniform float uFade; uniform float uAccentAmt;
varying vec3 vW;
#include <fog_pars_fragment>
float gridLine(vec2 p, float s, float w){
  vec2 q = p / s;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y) / w, 1.0);
}
void main(){
  float major = gridLine(vW.xz, uScale, 1.1);
  float minor = gridLine(vW.xz, uScale * 0.25, 0.7);
  float d = length(vW.xz - uCenter);
  float fade = exp(-d * uFade);
  vec3 col = uBase + uLine * (major * uMajor + minor * uMinor) * fade;
  col += uAccent * uAccentAmt * exp(-d * d * 0.02);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <colorspace_fragment>
}`;

export const GridFloor: React.FC<{
  base?: string;
  line?: string;
  accent?: string;
  accentAmt?: number;
  size?: number;
  scale?: number;
  major?: number;
  minor?: number;
  fade?: number;
  center?: [number, number];
}> = ({ base = '#07090f', line = '#3a4766', accent = '#000000', accentAmt = 0, size = 200, scale = 1, major = 0.42, minor = 0.12, fade = 0.06, center = [0, 0] }) => {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uBase: { value: new THREE.Color() },
            uLine: { value: new THREE.Color() },
            uAccent: { value: new THREE.Color() },
            uMajor: { value: 0.4 },
            uMinor: { value: 0.1 },
            uScale: { value: 1 },
            uCenter: { value: new THREE.Vector2() },
            uFade: { value: 0.06 },
            uAccentAmt: { value: 0 },
          },
        ]),
        vertexShader: FLOOR_VERT,
        fragmentShader: FLOOR_FRAG,
        fog: true,
      }),
    [],
  );
  useEffect(() => () => m.dispose(), [m]);
  const u = m.uniforms;
  (u.uBase.value as THREE.Color).set(base);
  (u.uLine.value as THREE.Color).set(line);
  (u.uAccent.value as THREE.Color).set(accent);
  u.uMajor.value = major;
  u.uMinor.value = minor;
  u.uScale.value = scale;
  (u.uCenter.value as THREE.Vector2).set(center[0], center[1]);
  u.uFade.value = fade;
  u.uAccentAmt.value = accentAmt;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={m} renderOrder={-2}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

export type SheetCam = { position: [number, number, number]; target: [number, number, number]; fov: number };

export const Label: React.FC<{
  at: [number, number, number];
  cam: SheetCam;
  w: number;
  h: number;
  title: string;
  sub?: string;
  color: string;
  font: string;
  size?: number;
  subFont?: string;
}> = ({ at, cam, w, h, title, sub, color, font, size = 22, subFont }) => {
  const s = projectToScreen(at, cam, w, h);
  return (
    <div
      style={{
        position: 'absolute',
        left: s.x,
        top: s.y,
        transform: 'translate(-50%, 0)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontFamily: font, fontSize: size, color, letterSpacing: 1, textShadow: `0 0 12px ${color}88, 0 2px 0 #000` }}>{title}</div>
      {sub && <div style={{ fontFamily: subFont ?? font, fontSize: Math.round(size * 0.62), color: '#8b8fa3', marginTop: 4 }}>{sub}</div>}
    </div>
  );
};
