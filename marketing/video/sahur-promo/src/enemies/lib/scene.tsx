// Scene helpers shared by enemies, bosses, FX and the sheets.
import * as THREE from 'three';
import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';

/** Builds a CanvasTexture once `ready` (fonts loaded). Redraws when deps change. */
export const useCanvasTexture = (
  ready: boolean,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[] = [],
) => {
  const tex = useMemo(() => {
    if (!ready) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, w, h, ...deps]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
};

/** Static camera placement, applied every render (pure function of props). */
export const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  roll?: number;
  near?: number;
  far?: number;
}> = ({ position, target, fov = 35, roll = 0, near = 0.05, far = 400 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(...target);
    camera.fov = fov;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

/** Project a world point to pixel coordinates for HTML overlays (labels). */
export const projectToScreen = (
  p: [number, number, number],
  cam: { position: [number, number, number]; target: [number, number, number]; fov: number },
  w: number,
  h: number,
) => {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.05, 400);
  c.position.set(...cam.position);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
};

/** Standard post stack: tight bloom (glow without mush), vignette, optional chromatic kick. */
export const Post: React.FC<{
  bloom?: number;
  threshold?: number;
  radius?: number;
  vignette?: number;
  chroma?: number;
  /** extra effects (e.g. <TungHeat/>) rendered before the bloom */
  children?: React.ReactNode;
}> = ({ bloom = 1.0, threshold = 0.9, radius = 0.6, vignette = 0.55, chroma = 0, children }) => {
  const off = useMemo(() => new THREE.Vector2(0, 0), []);
  off.set(chroma * 0.004, chroma * 0.002);
  return (
    <EffectComposer multisampling={4}>
      {children as any}
      <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.12} mipmapBlur radius={radius} />
      <ChromaticAberration offset={off} radialModulation={false} modulationOffset={0} />
      <Vignette darkness={vignette} offset={0.32} />
    </EffectComposer>
  );
};

// ---------- floor glow + contact shadow ----------
const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uIntensity; uniform float uShadow;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float g = exp(-d * d * 4.0) * (1.0 - smoothstep(0.85, 1.0, d));
  float s = exp(-d * d * 14.0);
  vec3 col = uColor * g * uIntensity;
  float a = s * uShadow;
  gl_FragColor = vec4(col * (1.0 - a), max(a, 0.0));
  #include <colorspace_fragment>
}`;

/** A pool of coloured light on the floor plus a soft dark contact shadow. Place at the enemy's feet (y=0). */
export const FloorGlow: React.FC<{
  color: THREE.ColorRepresentation;
  radius?: number;
  intensity?: number;
  shadow?: number;
  y?: number;
}> = ({ color, radius = 1, intensity = 0.6, shadow = 0.55, y = 0.004 }) => {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uIntensity: { value: 1 }, uShadow: { value: 0.5 } },
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        depthWrite: false,
        // colour is added, the shadow darkens: premultiplied-style blend
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    [],
  );
  useEffect(() => () => m.dispose(), [m]);
  (m.uniforms.uColor.value as THREE.Color).set(color);
  m.uniforms.uIntensity.value = intensity;
  m.uniforms.uShadow.value = shadow;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={m} renderOrder={-1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
    </mesh>
  );
};

// ---------- camera-facing sprite (shader billboard, no useFrame) ----------
const SPRITE_VERT = /* glsl */ `
uniform vec2 uSize; uniform float uRot;
varying vec2 vUv;
void main(){
  vUv = uv;
  float sx = length(modelMatrix[0].xyz);
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 q = position.xy;
  float c = cos(uRot), s = sin(uRot);
  q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  mv.xy += q * uSize * sx;
  gl_Position = projectionMatrix * mv;
}`;

export const SPRITE_FRAG_HEADER = /* glsl */ `
uniform vec3 uColor; uniform float uIntensity; uniform float uOpacity; uniform float uP; uniform sampler2D uMap;
varying vec2 vUv;
`;

/** A camera-facing quad with a custom fragment body. fragBody writes `vec4 outc` (rgb linear, a). */
export const useSpriteMaterial = (fragBody: string, additive = true, extra: Record<string, { value: unknown }> = {}) => {
  const m = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: new THREE.Vector2(1, 1) },
        uRot: { value: 0 },
        uColor: { value: new THREE.Color('#ffffff') },
        uIntensity: { value: 1 },
        uOpacity: { value: 1 },
        uP: { value: 0 },
        uMap: { value: null },
        ...extra,
      },
      vertexShader: SPRITE_VERT,
      fragmentShader: `${SPRITE_FRAG_HEADER}\n${fragBody}`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    return mat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragBody, additive]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
};

/** Soft round glow sprite. */
const GLOW_SPRITE = /* glsl */ `
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float g = exp(-d * d * 5.0) * (1.0 - smoothstep(0.9, 1.0, d));
  float core = exp(-d * d * 40.0);
  vec3 col = uColor * uIntensity * (g + core * 1.5);
  gl_FragColor = vec4(col * uOpacity, (g + core) * uOpacity);
  #include <colorspace_fragment>
}`;

export const GlowSprite: React.FC<{
  color: THREE.ColorRepresentation;
  size?: number;
  intensity?: number;
  opacity?: number;
  position?: [number, number, number];
  renderOrder?: number;
}> = ({ color, size = 1, intensity = 1, opacity = 1, position = [0, 0, 0], renderOrder = 5 }) => {
  const m = useSpriteMaterial(GLOW_SPRITE, true);
  (m.uniforms.uColor.value as THREE.Color).set(color);
  (m.uniforms.uSize.value as THREE.Vector2).set(size, size);
  m.uniforms.uIntensity.value = intensity;
  m.uniforms.uOpacity.value = opacity;
  if (opacity <= 0.001 || size <= 0) return null;
  return (
    <mesh position={position} material={m} renderOrder={renderOrder} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};
