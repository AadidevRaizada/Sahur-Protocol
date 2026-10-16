// Instanced meshes whose per-instance transforms are recomputed from props on every render.
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const D = new THREE.Vector3();
const C = new THREE.Color();

export const useInstanced = (geo: THREE.BufferGeometry, mat: THREE.Material, count: number, withColor = false) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (withColor) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3);
    return m;
  }, [geo, mat, count, withColor]);
  useEffect(() => () => { mesh.dispose(); }, [mesh]);
  return mesh;
};

export const setInst = (
  mesh: THREE.InstancedMesh,
  i: number,
  pos: [number, number, number],
  scale: [number, number, number] | number,
  rot?: THREE.Quaternion | [number, number, number],
) => {
  P.set(pos[0], pos[1], pos[2]);
  if (typeof scale === 'number') S.set(scale, scale, scale);
  else S.set(scale[0], scale[1], scale[2]);
  if (!rot) Q.identity();
  else if (Array.isArray(rot)) Q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  else Q.copy(rot);
  M.compose(P, Q, S);
  mesh.setMatrixAt(i, M);
};

/** Orient local +Y along a direction (for stretched droplets / streaks). */
export const alignY = (dir: [number, number, number], out = new THREE.Quaternion()) => {
  D.set(dir[0], dir[1], dir[2]);
  if (D.lengthSq() < 1e-8) return out.identity();
  D.normalize();
  return out.setFromUnitVectors(UP, D);
};

export const setInstColor = (mesh: THREE.InstancedMesh, i: number, c: THREE.ColorRepresentation | [number, number, number]) => {
  if (Array.isArray(c)) C.setRGB(c[0], c[1], c[2]);
  else C.set(c);
  mesh.setColorAt(i, C);
};

export const commit = (mesh: THREE.InstancedMesh, count: number) => {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};
