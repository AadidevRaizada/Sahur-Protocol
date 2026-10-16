// Neutral studio for character sheets: a grey-blue cyclorama and a 3-point light rig with soft shadows.
import * as THREE from 'three';
import React, { useMemo } from 'react';

function cycGeometry(width = 60, floorFront = 14, floorBack = -5, radius = 4, wallTop = 20) {
  // profile in (z, y): floor from front to back, a quarter-circle cove, then the wall up
  const prof: [number, number][] = [];
  const nF = 20, nC = 24, nW = 10;
  for (let i = 0; i <= nF; i++) prof.push([floorFront + ((floorBack - floorFront) * i) / nF, 0]);
  for (let i = 1; i <= nC; i++) { const a = (i / nC) * (Math.PI / 2); prof.push([floorBack - Math.sin(a) * radius, radius - Math.cos(a) * radius]); }
  for (let i = 1; i <= nW; i++) prof.push([floorBack - radius, radius + ((wallTop - radius) * i) / nW]);
  const cols = 2;
  const pos: number[] = [], idx: number[] = [], uv: number[] = [];
  prof.forEach(([z, y], j) => {
    for (let i = 0; i < cols; i++) { pos.push(-width / 2 + (width * i) / (cols - 1), y, z); uv.push(i / (cols - 1), j / (prof.length - 1)); }
  });
  for (let j = 0; j < prof.length - 1; j++) {
    const a = j * cols, b = (j + 1) * cols;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export const Cyclorama: React.FC<{ color?: string; z?: number }> = ({ color = '#5d6b86', z = 0 }) => {
  const geo = useMemo(() => cycGeometry(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }), [color]);
  return <mesh geometry={geo} material={mat} position={[0, 0, z]} receiveShadow />;
};

/** key (warm, high left), fill (cool, right), two rims (cool back-right, warm back-left), soft hemisphere */
export const StudioLights: React.FC<{ target?: [number, number, number]; spread?: number; key?: number; rim?: number }> = ({ target = [0, 1.5, 0], spread = 8, key = 3.2, rim = 3.0 }) => {
  const tgt = useMemo(() => { const o = new THREE.Object3D(); o.position.set(...target); return o; }, [target.join(',')]);
  const s = spread;
  return (
    <>
      <primitive object={tgt} />
      <hemisphereLight args={['#c8d4f0', '#3b2c26', 0.55]} />
      <directionalLight position={[target[0] - 4, target[1] + 5.5, target[2] + 6]} intensity={key} color="#fff0db" castShadow target={tgt}
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={6}
        shadow-camera-left={-s} shadow-camera-right={s} shadow-camera-top={s} shadow-camera-bottom={-s} shadow-camera-near={0.5} shadow-camera-far={40} />
      <directionalLight position={[target[0] + 6, target[1] + 1.5, target[2] + 4]} intensity={0.7} color="#a9bdff" target={tgt} />
      <directionalLight position={[target[0] + 3, target[1] + 3.5, target[2] - 6]} intensity={rim} color="#c4d8ff" target={tgt} />
      <directionalLight position={[target[0] - 4, target[1] + 2.5, target[2] - 5]} intensity={rim * 0.6} color="#ffcf9a" target={tgt} />
    </>
  );
};
