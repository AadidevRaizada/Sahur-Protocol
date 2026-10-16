// <PovCamera> drives the ThreeCanvas default camera from povCamera(); <CamAttach> parents children
// to the camera (for the blob hands). <StaticCamera> is a simple position/target/fov setter.
import React, { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { povCamera, PovCamProps, CamState } from './camera';

export const ApplyCamera: React.FC<{ cam: CamState; near?: number; far?: number }> = ({ cam, near = 0.03, far = 200 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(cam.position);
    camera.quaternion.copy(cam.quaternion);
    camera.fov = cam.fov;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  });
  return null;
};

export const PovCamera: React.FC<PovCamProps & { near?: number; far?: number }> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = povCamera(frame, fps, props);
  return <ApplyCamera cam={cam} near={props.near} far={props.far} />;
};

export const StaticCamera: React.FC<{ position: [number, number, number]; target: [number, number, number]; fov?: number; near?: number; far?: number }> = ({ position, target, fov = 30, near = 0.1, far = 200 }) => {
  const pos = new THREE.Vector3(...position);
  const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(...target), new THREE.Vector3(0, 1, 0));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return <ApplyCamera cam={{ position: pos, quaternion: q, fov }} near={near} far={far} />;
};

/** children live in camera space: x right, y up, -z forward */
export const CamAttach: React.FC<{ cam: CamState; children: React.ReactNode }> = ({ cam, children }) => (
  <group position={cam.position} quaternion={cam.quaternion}>{children}</group>
);
