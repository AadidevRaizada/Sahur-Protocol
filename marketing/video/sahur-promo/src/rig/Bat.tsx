// The bat: a lathe-profile baseball bat in light ash with a dark leather grip.
// Origin at the knob end, +Y runs to the barrel tip. Length BAT_LEN.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { batWood, gripTexture } from './wood';

export const BAT_LEN = 1.4;

const profile = (): THREE.Vector2[] => {
  const p: [number, number][] = [
    [0.0, 0.0], [0.03, 0.0], [0.05, 0.006], [0.058, 0.02], [0.056, 0.035], [0.045, 0.05], [0.034, 0.062],
    [0.032, 0.09], [0.032, 0.2], [0.033, 0.32], [0.036, 0.42], [0.042, 0.52], [0.052, 0.64], [0.064, 0.76],
    [0.076, 0.88], [0.085, 1.0], [0.09, 1.12], [0.092, 1.24], [0.091, 1.32], [0.086, 1.36], [0.074, 1.385], [0.05, 1.398], [0.0, 1.402],
  ];
  return p.map(([r, y]) => new THREE.Vector2(r, y));
};

let batGeo: THREE.LatheGeometry | null = null;
let gripGeo: THREE.LatheGeometry | null = null;
const geos = () => {
  if (!batGeo) {
    batGeo = new THREE.LatheGeometry(profile(), 40);
    // grip sleeve over the handle
    const g: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const y = 0.06 + (0.4 - 0.06) * (i / 12);
      const r = (y < 0.32 ? 0.032 : 0.032 + (y - 0.32) * 0.04) + 0.0045;
      g.push(new THREE.Vector2(r, y));
    }
    gripGeo = new THREE.LatheGeometry(g, 40);
  }
  return { bat: batGeo!, grip: gripGeo! };
};

export const Bat: React.FC<{ castShadow?: boolean; material?: THREE.Material; showGrip?: boolean }> = ({ castShadow = true, material, showGrip = true }) => {
  const { bat, grip } = geos();
  const mats = useMemo(() => {
    const w = batWood();
    const gt = gripTexture();
    return {
      wood: new THREE.MeshPhysicalMaterial({ map: w.map, bumpMap: w.bump, bumpScale: 0.6, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
      grip: new THREE.MeshStandardMaterial({ map: gt, roughness: 0.75 }),
    };
  }, []);
  return (
    <group>
      <mesh geometry={bat} material={material ?? mats.wood} castShadow={castShadow} receiveShadow />
      {showGrip && <mesh geometry={grip} material={material ?? mats.grip} castShadow={castShadow} receiveShadow />}
    </group>
  );
};
