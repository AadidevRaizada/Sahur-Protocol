// A modern phone: rounded graphite slab, dark bezel, emissive screen showing the reel (or any texture),
// plus a small blue-white light that the screen casts on hands and blanket.
// Local frame: screen faces +Z, long side along Y, centred at the origin. Size PHONE_W x PHONE_H.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { drawReel, useReelAssets, ReelOpts } from './reel';

RectAreaLightUniformsLib.init();

export const PHONE_W = 0.074;
export const PHONE_H = 0.156;
export const PHONE_D = 0.0085;

const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

let GEO: { body: THREE.ExtrudeGeometry; glass: THREE.ShapeGeometry; screen: THREE.ShapeGeometry; bump: THREE.ExtrudeGeometry } | null = null;
const geos = () => {
  if (GEO) return GEO;
  const body = new THREE.ExtrudeGeometry(roundedRect(PHONE_W, PHONE_H, 0.011), { depth: PHONE_D - 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 4, curveSegments: 12 });
  body.translate(0, 0, -(PHONE_D - 0.003) / 2);
  const glass = new THREE.ShapeGeometry(roundedRect(PHONE_W - 0.002, PHONE_H - 0.002, 0.0102), 12);
  const sw = PHONE_W - 0.0062, sh = PHONE_H - 0.0062;
  const screen = new THREE.ShapeGeometry(roundedRect(sw, sh, 0.0082), 12);
  const uv = screen.attributes.uv as THREE.BufferAttribute;
  const pos = screen.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / sw + 0.5, pos.getY(i) / sh + 0.5);
  const bump = new THREE.ExtrudeGeometry(roundedRect(0.026, 0.03, 0.007), { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2 });
  GEO = { body, glass, screen, bump };
  return GEO;
};

export type PhoneProps = {
  /** 0..1 screen brightness (0 = off, dark glass) */
  screenOn?: number;
  /** custom screen texture; default = the animated Sahur reel */
  texture?: THREE.Texture;
  reel?: ReelOpts;
  /** frame offset for the reel animation */
  reelFrame?: number;
  /** intensity of the light cast by the screen */
  glow?: number;
  castShadow?: boolean;
};

export const Phone: React.FC<PhoneProps> = ({ screenOn = 1, texture, reel, reelFrame, glow = 1, castShadow = true }) => {
  const frame = useCurrentFrame();
  const assets = useReelAssets();
  const g = geos();
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 540; c.height = 1170; return c; }, []);
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, [canvas]);
  if (!texture) {
    drawReel(canvas.getContext('2d')!, canvas.width, canvas.height, reelFrame ?? frame, assets, reel);
    tex.needsUpdate = true;
  }
  const mats = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color: '#23262e', metalness: 0.65, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#05060a', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    screen: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#0b0c10', roughness: 0.1, clearcoat: 1 }),
  }), [tex]);
  mats.screen.map = texture ?? tex;
  const b = Math.max(0, screenOn);
  mats.screen.color.setRGB(1.15 * b, 1.15 * b, 1.2 * b);
  return (
    <group>
      <mesh geometry={g.body} material={mats.body} castShadow={castShadow} receiveShadow />
      <mesh geometry={g.glass} material={mats.glass} position={[0, 0, PHONE_D / 2 + 0.00005]} />
      {b > 0.001 && <mesh geometry={g.screen} material={mats.screen} position={[0, 0, PHONE_D / 2 + 0.0002]} />}
      <mesh geometry={g.bump} material={mats.lens} position={[-0.016, 0.054, -PHONE_D / 2 - 0.0006]} rotation={[Math.PI, 0, 0]} />
      {b > 0.001 && glow > 0 && (
        <>
          <pointLight position={[0, -0.02, 0.16]} color="#c9dcff" intensity={0.035 * glow * b} distance={1.6} decay={2} />
          <rectAreaLight position={[0, 0, PHONE_D / 2 + 0.001]} rotation={[0, Math.PI, 0]} width={PHONE_W * 0.9} height={PHONE_H * 0.9} color="#d4e2ff" intensity={0.35 * glow * b} />
        </>
      )}
    </group>
  );
};
