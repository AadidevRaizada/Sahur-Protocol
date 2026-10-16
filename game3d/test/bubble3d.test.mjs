// End-to-end check of the 3D Bubble fight: CONTINUE from a Core checkpoint -> 3D fight (tilt-in, steady,
// phase 2, Sahur down, collapse) -> sacrifice cutscene -> three-TUNG finale -> pop -> victory.
// Desktop (1280x720) and mobile (844x390, touch) runs, plus a no-WebGL run that must stay 2D.
//
//   node game3d/test/bubble3d.test.mjs
//
// Uses puppeteer-core from report/node_modules and the installed Chrome. Screenshots and a JSON report
// land in game3d/test/shots/. To keep the run short the test lowers the Bubble's HP between phases and
// keeps the player alive; everything else (attacks, spawns, snipes, input) is the real game.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const require = createRequire(path.join(root, 'report/package.json'));
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(here, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const URL = pathToFileURL(path.join(root, 'Sahur_Protocol.html')).href;
const SAVE = JSON.stringify({ v: 1, savedAt: Date.now(), biome: 3, room: 0, relics: [], skillLevels: {}, unlockedSkills: [], completedChallenges: [], roomsCleared: 9, speedBosses: 0, playerHp: 100, playerMaxHp: 100 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { url: URL, runs: [] };

async function run(label, { viewport, touch = false, args = [], query = '?r3d=force', expect3d = true }) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required', ...args],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text());
  });
  page.on('requestfailed', (r) => {
    if (!r.url().startsWith('data:')) errors.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText || ''));
  });
  await page.setViewport({ ...viewport, isMobile: touch, hasTouch: touch, isLandscape: touch });
  await page.evaluateOnNewDocument((save) => {
    localStorage.setItem('sahurProtocolRunV1', save);
    localStorage.setItem('sahurProtocolAudioV1', JSON.stringify({ muted: true, volume: 0.7 }));
  }, SAVE);
  await page.goto(URL + query, { waitUntil: 'load' });
  await sleep(600);
  const shots = [];
  const shot = async (name) => {
    const f = `${label}-${String(shots.length + 1).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, f) });
    shots.push(f);
  };
  const g = (fn, ...a) => page.evaluate(fn, ...a);
  const status = () => g(() => (window.R3D ? R3D.status() : null));
  const keepAlive = () => g(() => { if (state) { state.player.hp = state.player.maxHp; } });

  // CONTINUE -> straight into the Bubble fight (the save is at The Core)
  if (touch) await page.tap('#continueBtn');
  else await page.click('#continueBtn');
  await sleep(700); // mid-tilt
  await shot('tilt-in');
  await sleep(1700);
  await shot('fight-3d');

  // play: move around and swing for a while (real input)
  const fpsStart = Date.now();
  for (let i = 0; i < 24; i++) {
    const dir = ['a', 'w', 'd', 's'][Math.floor(i / 6) % 4];
    if (touch) {
      await g((d) => { touch.dx = { a: -1, d: 1, w: 0, s: 0 }[d]; touch.dy = { w: -1, s: 1, a: 0, d: 0 }[d]; }, dir);
      await page.tap('#atkBtn');
    } else {
      await page.keyboard.down(dir);
      await page.keyboard.press('Space');
    }
    await sleep(220);
    if (!touch) await page.keyboard.up(dir);
    await keepAlive();
  }
  if (touch) await g(() => { touch.dx = 0; touch.dy = 0; });
  await shot('playing');
  const st1 = await status();

  // phase 2 (the Bubble summons yes-men, wraiths and drones)
  await g(() => { state.boss.hp = state.boss.maxHp * 0.6; });
  await sleep(2600);
  await keepAlive();
  await shot('phase2');
  // Sahur knocked down: the help ring and prompt
  await g(() => { state.sahur.inv = 0; damageSahur(9999); });
  await sleep(700);
  await shot('sahur-down');
  await g(() => { state.player.x = state.sahur.x + 20; state.player.y = state.sahur.y; });
  await sleep(1800);
  await keepAlive();
  // a snipe aimed at Sahur (the red beam)
  await g(() => { state.sahur.down = false; state.snipes.push({ t: 0.9, n: 4, dmg: 1, spd: 330 }); });
  await sleep(450);
  await shot('snipe');
  const st2 = await status();
  const fpsWindows = (st2 && st2.fpsWindows) || [];

  // phase 3: the music stops, the Bubble leaks, Sahur cracks; after 7 s the sacrifice cutscene
  await g(() => { state.boss.hp = state.boss.maxHp * 0.3; });
  await sleep(3500);
  await keepAlive();
  await shot('collapse');
  for (let i = 0; i < 40; i++) {
    if ((await g(() => mode)) === 'cutscene') break;
    await sleep(250);
    await keepAlive();
  }
  await sleep(600);
  await shot('sacrifice-cutscene');
  for (let i = 0; i < 80 && (await g(() => mode)) !== 'beats'; i++) {
    if (touch) await page.tap('#cutOv');
    else await page.keyboard.press('Space');
    await sleep(220);
  }
  // the three TUNGs: he calls, you answer
  const answers = [];
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < 40 && !(await g(() => beats && beats.called)); i++) await sleep(100);
    await sleep(250);
    await shot('call-' + (n + 1));
    if (touch) await page.tap('#atkBtn');
    else await page.keyboard.press('Space');
    answers.push(await g(() => beats.n));
    await sleep(n === 2 ? 350 : 500);
    await shot('answer-' + (n + 1));
  }
  await sleep(500);
  await shot('pop');
  for (let i = 0; i < 60 && (await g(() => mode)) !== 'end'; i++) {
    if ((await g(() => mode)) === 'cutscene') {
      if (touch) await page.tap('#cutOv');
      else await page.keyboard.press('Space');
    }
    await sleep(250);
  }
  await shot('end');
  const final = await g(() => ({ mode, title: document.getElementById('endTitle').textContent }));
  const st3 = await status();
  await browser.close();
  const r = {
    label, viewport, touch, query,
    renderer: st3 && st3.renderer, quality: st3 && st3.quality, fallback: st3 && st3.fallback, frames3d: st3 && st3.frames,
    fpsWindows, fpsDuringPlay: st1 && st1.fps, playSeconds: (Date.now() - fpsStart) / 1000,
    answers, final, errors, shots,
    ok: errors.filter((e) => !e.includes('fonts.g')).length === 0 && final.mode === 'end' && final.title === 'WE WON.' && (!expect3d || (st3 && st3.frames > 100)),
  };
  report.runs.push(r);
  console.log(label, r.ok ? 'OK' : 'FAIL', JSON.stringify({ fps: fpsWindows, renderer: r.renderer, final, errors: errors.slice(0, 5) }));
}

async function noWebgl() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--disable-webgl', '--disable-3d-apis'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluateOnNewDocument((save) => localStorage.setItem('sahurProtocolRunV1', save), SAVE);
  await page.goto(URL, { waitUntil: 'load' });
  await sleep(500);
  await page.click('#continueBtn');
  await sleep(2500);
  const f = 'nowebgl-01-fight-2d.png';
  await page.screenshot({ path: path.join(OUT, f) });
  const st = await page.evaluate(() => ({ s: R3D.status(), active: R3D.active(), boss: !!(state && state.boss) }));
  await browser.close();
  const r = { label: 'no-webgl', status: st, errors, shots: [f], ok: !st.s.webgl && st.active === 0 && st.boss && errors.length === 0 };
  report.runs.push(r);
  console.log('no-webgl', r.ok ? 'OK' : 'FAIL', JSON.stringify(st), errors);
}

/** short runs: low quality, reduced motion, and the frame-rate watchdog under a throttled CPU */
async function quick(label, { query = '?r3d=force', reduced = false, cpu = 1, waitMs = 4500, shotAt = [], check }) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--ignore-gpu-blocklist', '--use-angle=d3d11'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewport({ width: 1280, height: 720 });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument((save) => {
    localStorage.setItem('sahurProtocolRunV1', save);
    localStorage.setItem('sahurProtocolAudioV1', JSON.stringify({ muted: true, volume: 0.7 }));
  }, SAVE);
  await page.goto(URL + query, { waitUntil: 'load' });
  await sleep(500);
  if (cpu > 1) {
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  }
  await page.click('#continueBtn');
  const shots = [];
  let t = 0;
  for (const at of [...shotAt, waitMs]) {
    await sleep(at - t);
    t = at;
    await page.evaluate(() => { if (state) state.player.hp = state.player.maxHp; });
    const f = `${label}-${String(shots.length + 1).padStart(2, '0')}-${at}ms.png`;
    await page.screenshot({ path: path.join(OUT, f) });
    shots.push(f);
  }
  const st = await page.evaluate(() => ({ ...R3D.status(), active: R3D.active(), texts: state.texts.map((x) => x.msg) }));
  await browser.close();
  const r = { label, query, reduced, cpu, status: st, errors, shots, ok: errors.length === 0 && check(st) };
  report.runs.push(r);
  console.log(label, r.ok ? 'OK' : 'FAIL', JSON.stringify({ fps: st.fpsWindows, quality: st.quality, fallback: st.fallback, downgrades: st.downgrades, active: st.active }), errors.slice(0, 3));
}

// ONLY=desktop,watchdog node game3d/test/bubble3d.test.mjs  runs a subset
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (l) => !ONLY || ONLY.includes(l);
if (want('desktop')) await run('desktop', { viewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
if (want('low')) await quick('low', { query: '?r3d=low', waitMs: 6500, check: (st) => st.quality === 'low' && st.active === 2 });
if (want('reduced')) await quick('reduced', { reduced: true, shotAt: [350], waitMs: 2500, check: (st) => st.active === 2 });
if (want('watchdog')) await quick('watchdog', { query: '', cpu: 10, waitMs: 16000, check: (st) => st.fpsWindows.length > 0 && (st.downgrades.length > 0 || Math.min(...st.fpsWindows) >= 40) });
if (want('mobile')) await run('mobile', { viewport: { width: 844, height: 390, deviceScaleFactor: 2 }, touch: true });
if (want('no-webgl')) await noWebgl();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('report:', path.join(OUT, 'report.json'));
process.exit(report.runs.every((r) => r.ok) ? 0 : 1);
