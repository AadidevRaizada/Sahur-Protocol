// Knockback: wrap any enemy to send it tumbling away after a hit (drones "knocked spinning away",
// the scraper hand "cartwheels out to the right"). Pure function of `progress` 0..1.
import React from 'react';
import { clamp, easeOutCubic } from '../enemies/lib/math';

export const Knockback: React.FC<{
  progress: number;
  /** direction of travel (need not be normalised) */
  dir?: [number, number, number];
  /** distance travelled at progress 1 */
  dist?: number;
  /** extra upward arc height */
  arc?: number;
  /** total rotation (radians) around x, y, z at progress 1 */
  spin?: [number, number, number];
  /** pivot height for the spin (the enemy's visual centre) */
  pivotY?: number;
  children: React.ReactNode;
}> = ({ progress, dir = [1, 0.25, 0], dist = 3, arc = 0.6, spin = [0, 0, -9], pivotY = 0.8, children }) => {
  const p = clamp(progress);
  const e = easeOutCubic(p);
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const x = (dir[0] / l) * dist * e;
  const y = (dir[1] / l) * dist * e + arc * Math.sin(Math.PI * p);
  const z = (dir[2] / l) * dist * e;
  return (
    <group position={[x, y + pivotY, z]} rotation={[spin[0] * e, spin[1] * e, spin[2] * e]}>
      <group position={[0, -pivotY, 0]}>{children}</group>
    </group>
  );
};
