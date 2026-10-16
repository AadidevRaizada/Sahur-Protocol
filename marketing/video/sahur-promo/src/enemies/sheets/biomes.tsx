// Minimal biome dressing for the sheets (the real sets belong to the film/sets workstream).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PAL } from '../../lib/palette';
import { useToy } from '../lib/toy';
import { mulberry32 } from '../lib/math';

/** Hype Cycle Forest: dark trunks with flickering green vein lines. */
export const Forest: React.FC<{ f: number }> = ({ f }) => {
  const bark = useToy({ color: '#0f1d16', deep: '#030805', fill: 1, rim: PAL.forestAccent, rimStrength: 0.25, spec: 0.1, gloss: 10, glow: 0 });
  const vein = useToy({ color: PAL.forestAccent, fill: 1, glow: 1.2, rimStrength: 0.2, spec: 0 });
  const trees = useMemo(() => {
    const r = mulberry32(42);
    return Array.from({ length: 9 }, (_, i) => ({ x: (i - 4) * 1.5 + (r() - 0.5) * 0.8, z: -3 - r() * 6, rad: 0.12 + r() * 0.14, ph: r() * 10 }));
  }, []);
  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh material={bark} position={[0, 4, 0]}>
            <cylinderGeometry args={[t.rad * 0.8, t.rad, 8, 10]} />
          </mesh>
          {Math.floor(f / 6 + t.ph) % 5 !== 0 && (
            <mesh material={vein} position={[0, 2.2 + (i % 3) * 0.6, t.rad * 0.95]}>
              <boxGeometry args={[0.02, 1.4 + (i % 2) * 0.8, 0.02]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

/** Server Farm Wastes: ruined rack rows with a few amber LEDs. */
export const Wastes: React.FC<{ f: number }> = ({ f }) => {
  const rack = useToy({ color: '#1d1a12', deep: '#060503', fill: 1, rim: PAL.wastesAccent, rimStrength: 0.3, spec: 0.3, gloss: 20 });
  const led = useToy({ color: PAL.wastesAccent, fill: 1, glow: 1.5, rimStrength: 0, spec: 0 });
  const racks = useMemo(() => {
    const r = mulberry32(7);
    return Array.from({ length: 8 }, (_, i) => ({ x: (i - 3.5) * 1.3, z: -4 - (i % 2) * 2.5, h: 1.8 + r() * 1.6, tilt: (r() - 0.5) * 0.15, leds: Array.from({ length: 5 }, () => r()) }));
  }, []);
  return (
    <group>
      {racks.map((k, i) => (
        <group key={i} position={[k.x, 0, k.z]} rotation={[0, 0, k.tilt]}>
          <mesh material={rack} position={[0, k.h / 2, 0]}>
            <boxGeometry args={[0.9, k.h, 0.7]} />
          </mesh>
          {k.leds.map((l, j) =>
            (Math.floor(f / 8) + j + i) % 4 === 0 || l > 0.6 ? (
              <mesh key={j} material={led} position={[-0.3 + l * 0.6, 0.3 + j * (k.h / 6), 0.36]}>
                <boxGeometry args={[0.04, 0.04, 0.01]} />
              </mesh>
            ) : null,
          )}
        </group>
      ))}
    </group>
  );
};

/** Boardroom of Broken Promises: a window wall with nothing outside. */
export const Boardroom: React.FC = () => {
  const frame = useToy({ color: '#1a2233', deep: '#05070c', fill: 1, rim: PAL.boardAccent, rimStrength: 0.6, spec: 0.8, gloss: 60 });
  const glass = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8dce8').multiplyScalar(0.06), toneMapped: false }), []);
  return (
    <group position={[0, 0, -5]}>
      <mesh material={glass} position={[0, 3, -0.05]}>
        <planeGeometry args={[16, 6]} />
      </mesh>
      {[-6, -3.6, -1.2, 1.2, 3.6, 6].map((x) => (
        <mesh key={x} material={frame} position={[x, 3, 0]}>
          <boxGeometry args={[0.08, 6, 0.08]} />
        </mesh>
      ))}
      {[0.5, 3.0, 5.5].map((y) => (
        <mesh key={y} material={frame} position={[0, y, 0]}>
          <boxGeometry args={[16, 0.06, 0.08]} />
        </mesh>
      ))}
    </group>
  );
};

