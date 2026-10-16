// A small paper lantern (INVENTED in the storyboard): bulging paper body with bamboo ribs, dark wood
// caps, a cord and a tassel, glowing amber with a PointLight inside. Origin = the hook at the top of
// the cord; it hangs along -Y. All sizes scale with `height` (the paper body height).
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';

let TEX: THREE.CanvasTexture | null = null;
const paperTex = () => {
  if (TEX) return TEX;
  const w = 256, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#c86a1e'); gr.addColorStop(0.5, '#ffd08a'); gr.addColorStop(1, '#c86a1e');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // ribs
  for (let i = 1; i < 8; i++) { g.fillStyle = 'rgba(90,40,10,0.55)'; g.fillRect(0, (i / 8) * h - 1.5, w, 3); }
  // paper fibres
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,60,20,${0.04 + (i % 7) * 0.01})`; g.fillRect((i * 97) % w, (i * 53) % h, 1 + (i % 3), 1); }
  // a soft painted mark (a simple wooden-log glyph, not text)
  g.fillStyle = 'rgba(140,50,10,0.35)'; g.fillRect(w * 0.44, h * 0.33, w * 0.12, h * 0.34);
  TEX = new THREE.CanvasTexture(c); TEX.colorSpace = THREE.SRGBColorSpace; TEX.wrapS = THREE.RepeatWrapping;
  return TEX;
};

export type LanternProps = {
  /** paper body height in local units (0.12 m in the world at scale 1) */
  height?: number;
  /** cord length as a fraction of height (storyboard: 0.15 m cord for a 0.12 m lantern) */
  cord?: number;
  /** 0..n glow multiplier (emissive + light) */
  glow?: number;
  /** PointLight intensity in candela at glow 1 (storyboard: 18) */
  light?: number;
  lightDistance?: number;
  castShadow?: boolean;
};

export const Lantern: React.FC<LanternProps> = ({ height = 0.12, cord = 1.25, glow = 1, light = 18, lightDistance = 6, castShadow = false }) => {
  const H = height, R = height * 0.42, C = height * cord;
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(R * (0.62 + 0.38 * Math.sin(Math.PI * t)), -H / 2 + H * t)); }
    return {
      body: new THREE.LatheGeometry(pts, 28),
      cap: new THREE.CylinderGeometry(R * 0.66, R * 0.66, H * 0.07, 20),
      cord: new THREE.CylinderGeometry(H * 0.012, H * 0.012, C, 6),
      tassel: new THREE.ConeGeometry(H * 0.05, H * 0.3, 8),
    };
  }, [H, R, C]);
  const mats = useMemo(() => ({
    paper: new THREE.MeshStandardMaterial({ map: paperTex(), emissiveMap: paperTex(), emissive: new THREE.Color(PAL.real), roughness: 0.9, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: '#3a2010', roughness: 0.7 }),
    cord: new THREE.MeshStandardMaterial({ color: '#2a170c', roughness: 0.9 }),
    tassel: new THREE.MeshStandardMaterial({ color: '#a0281e', roughness: 0.8 }),
  }), []);
  mats.paper.emissiveIntensity = 2.0 * glow;
  const cy = -C - H / 2;
  return (
    <group>
      <mesh geometry={geo.cord} material={mats.cord} position={[0, -C / 2, 0]} />
      <mesh geometry={geo.cap} material={mats.wood} position={[0, cy + H / 2, 0]} castShadow={castShadow} />
      <mesh geometry={geo.body} material={mats.paper} position={[0, cy, 0]} />
      <mesh geometry={geo.cap} material={mats.wood} position={[0, cy - H / 2, 0]} />
      <mesh geometry={geo.tassel} material={mats.tassel} position={[0, cy - H / 2 - H * 0.18, 0]} rotation={[Math.PI, 0, 0]} />
      {glow > 0 && light > 0 && (
        <pointLight position={[0, cy, 0]} color={PAL.real} intensity={light * glow} distance={lightDistance} decay={2} castShadow={castShadow} shadow-mapSize={[512, 512]} shadow-bias={-0.002} />
      )}
    </group>
  );
};
