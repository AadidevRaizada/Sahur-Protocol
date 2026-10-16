// "The feed misses you": a tiny equirect texture of the blue bedroom and the glowing phone reel,
// mirrored faintly in the Bubble's film during S47. Built lazily (no module side effects).
import * as THREE from 'three';

let tex: THREE.CanvasTexture | null = null;

export const feedReflection = () => {
  if (tex) return tex;
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  // night-blue room all around, a little lighter at the horizon
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a1440');
  bg.addColorStop(0.5, '#2a4fd0');
  bg.addColorStop(1, '#070c26');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // the window: a grid of identical glowing screens
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 3; j++) {
      g.fillStyle = (i + j) % 3 === 0 ? '#ff7ae8' : '#6f9bff';
      g.globalAlpha = 0.75;
      g.fillRect(150 + i * 22, 92 + j * 20, 14, 12);
    }
  g.globalAlpha = 1;
  // the phone, glowing, with the reel's warm lamp inside
  g.fillStyle = '#cfe0ff';
  g.fillRect(360, 100, 26, 52);
  g.fillStyle = '#ffd98c';
  g.beginPath();
  g.arc(373, 118, 6, 0, Math.PI * 2);
  g.fill();
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
};
