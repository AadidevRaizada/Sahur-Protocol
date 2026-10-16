// usage: node scripts/stills.mjs <CompositionId> <outDir> <frame> [frame...] [--scale=0.5] [--quality=85] [--props=file.json]
// Bundles once and renders many stills (much faster than repeated `npx remotion still`).
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [id, outDir, ...frames] = args.filter((a) => !a.startsWith('--'));
const inputProps = flags.props ? JSON.parse(fs.readFileSync(flags.props, 'utf8')) : {};
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const cleanup = () => { try { fs.rmSync(serveUrl, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));
const opts = { serveUrl, id, inputProps, browserExecutable: chrome, chromiumOptions: { gl: 'angle' } };
const composition = await selectComposition(opts);
fs.mkdirSync(outDir, { recursive: true });
for (const f of frames) {
  const output = path.join(outDir, `${id}-f${String(f).padStart(4, '0')}.jpg`);
  await renderStill({ ...opts, composition, frame: Number(f), output, imageFormat: 'jpeg', jpegQuality: Number(flags.quality || 85), scale: Number(flags.scale || 1) });
  console.log('wrote', output);
}
