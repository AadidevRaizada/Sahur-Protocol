import { Composition, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

// Toolchain check: three + postprocessing render under Chrome/ANGLE.
const Smoke = () => {
  const f = useCurrentFrame();
  return (
    <ThreeCanvas width={1920} height={1080} camera={{ position: [0, 0, 5], fov: 40 }} style={{ background: '#07090f' }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={60} color="#35e8ff" />
      <mesh rotation={[0.4, f / 30, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 2, 32]} />
        <meshStandardMaterial color="#b0743a" roughness={0.7} />
      </mesh>
      <mesh position={[2, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#ff3df0" emissive="#ff3df0" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.6} mipmapBlur />
        <Vignette darkness={0.6} offset={0.3} />
      </EffectComposer>
    </ThreeCanvas>
  );
};

export const SmokeCompositions = () => (
  <Composition id="Smoke" component={Smoke} width={1920} height={1080} fps={60} durationInFrames={60} />
);
