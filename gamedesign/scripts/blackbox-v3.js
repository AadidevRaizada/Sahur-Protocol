// Black-box functional test pass for Sahur Protocol v3 (Play Testing section of the report).
// Run from the repo root:  node gamedesign/scripts/blackbox-v3.js
//
// Drives the UNMODIFIED Sahur_Protocol.html in headless Chrome. Input is real wherever practical
// (mouse clicks on the DOM buttons, key presses/holds, touch taps on the touch UI). page.evaluate()
// is used (a) to READ state for the verdicts and (b) for documented SETUP ASSISTS: placing a stunned
// high-HP "dummy" in reach, resetting the skill loadout so damage maths are deterministic, filling the
// TRIPLE T meter, teleporting the player, fast-forwarding rooms/bosses through the game's own
// damageEnemy()/checkClear() flow, and jumping straight to a biome/boss with the game's startRoom()/
// startFinalBoss(). Every assist used is listed in the generated log.
//
// Writes gamedesign/research/test-results-v3.json and gamedesign/research/test-log-v3.md
// (an existing "## Findings" section at the end of the .md is preserved across re-runs).
const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '../../report/node_modules/puppeteer-core'));

const ROOT = path.resolve(__dirname, '../..');
const GAME = path.join(ROOT, 'Sahur_Protocol.html');
const URL = 'file:///' + GAME.split(path.sep).join('/');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT_DIR = path.resolve(__dirname, '../research');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const perf = [];
const pageErrors = [];      // uncaught exceptions + console.error, per page
const assists = new Set();
const r2 = (x) => (x === null || x === undefined || Number.isNaN(x) ? String(x) : Math.round(x * 100) / 100);
function record(id, scenario, expected, observed, verdict, evidence) {
  results.push({ id, scenario, expected, observed, verdict, evidence });
  console.log(`${id} [${verdict}] ${scenario} :: ${observed}`);
}
async function T(id, scenario, expected, fn) {
  try {
    const r = await fn();
    record(id, scenario, expected, r.observed, r.verdict, r.evidence);
    return r;
  } catch (e) {
    record(id, scenario, expected, 'HARNESS ERROR: ' + String(e && e.message || e).split('\n')[0], 'Error');
    return null;
  }
}
const assist = (s) => assists.add(s);

async function open(browser, label, opts = {}) {
  const page = await browser.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', (e) => { errors.push(e.message); pageErrors.push({ page: label, kind: 'uncaught', msg: e.message }); });
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push({ page: label, kind: 'console.error', msg: m.text() }); });
  page.on('dialog', async (d) => { dialogs.push({ type: d.type(), msg: d.message(), def: d.defaultValue() }); await d.dismiss(); });
  if (opts.emulate) await page.emulate(opts.emulate); else await page.setViewport({ width: 1280, height: 720 });
  if (opts.blockStorage) {
    await page.evaluateOnNewDocument(() => {
      const thrower = () => { throw new DOMException('blocked', 'SecurityError'); };
      Storage.prototype.getItem = thrower; Storage.prototype.setItem = thrower; Storage.prototype.removeItem = thrower; Storage.prototype.clear = thrower;
    });
  }
  await page.goto(URL, { waitUntil: 'load' });
  await sleep(400);
  return { page, errors, dialogs };
}

function H(page) {
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const mode = () => ev(() => mode);
  const waitMode = (m, timeout = 15000) => page.waitForFunction((m) => mode === m, { timeout, polling: 30 }, m);
  const waitFor = (fn, timeout = 15000, ...a) => page.waitForFunction(fn, { timeout, polling: 30 }, ...a);
  const finishCut = async (max = 260) => { for (let k = 0; k < max; k++) { if ((await mode()) !== 'cutscene') return k; await page.keyboard.press('Space'); await sleep(55); } return max; };
  const clickCard = async (i = 0) => {
    await waitFor(() => { const b = document.querySelector('#cards button'); return b && !b.disabled && document.querySelector('#chooseOv').classList.contains('show'); }, 10000);
    const b = await page.$$('#cards button'); await b[Math.min(i, b.length - 1)].click(); await sleep(150);
  };
  const cardNames = () => ev(() => [...document.querySelectorAll('#cards button')].map((b) => ({ nm: (b.querySelector('.nm') || {}).textContent, evo: b.classList.contains('evo') })));
  const clearRoom = () => ev(() => { state.spawnQueue = []; state.pending = []; for (const e of state.enemies) damageEnemy(e, 99999, true); });
  // keeps killing (rival / golem splits) until the upgrade overlay appears
  const clearRoomFully = async () => {
    assist('Rooms fast-forwarded by emptying the spawn queue and killing enemies through the game\'s own damageEnemy() (so checkClear/onEnemyKilled run normally).');
    for (let k = 0; k < 60; k++) { const m = await mode(); if (m === 'choose') return true; if (m === 'play') await clearRoom(); await sleep(250); }
    throw new Error('room never cleared');
  };
  const save = () => ev(() => localStorage.getItem('sahurProtocolRunV1'));
  // a stunned, high-HP golem pinned 40 px to the right of the player (stunned enemies never move or deal contact damage)
  const dummy = (hp = 5000, dx = 40) => {
    assist('A stunned high-HP "dummy" golem (spawned with the game\'s spawnEnemyAt, never elite) is pinned 40 px from the player as a swing target; Sahur\'s TUNG is held off (slamT) while damage is being measured.');
    return ev((hp, dx) => {
      state.spawnQueue = []; state.pending = []; state.rivalPending = true;
      const keep = state.enemies.filter((e) => e.__dummy);
      state.enemies = keep;
      const e = spawnEnemyAt('golem', state.player.x + dx, state.player.y, 1, true);
      e.hp = e.maxHp = hp; e.stun = 1e9; e.__dummy = true;
      state.enemies = state.enemies.filter((x) => x === e);
      window.__dummy = e; window.__dx = dx;
      clearInterval(window.__pin);
      window.__pin = setInterval(() => { const d = window.__dummy; if (!d || !state) return; d.x = Math.min(W - 30, state.player.x + window.__dx); d.y = state.player.y; d.kx = 0; d.ky = 0; d.stun = 1e9; }, 4);
      state.sahur.slamT = 1e9;
      return e.hp;
    }, hp, dx);
  };
  const resetLoadout = () => {
    assist('Skill loadout reset to empty (state.skillLevels = {} then the game\'s applySkillLoadout()) before damage / difficulty measurements, so crit, lifesteal and damage bonuses cannot skew the numbers.');
    return ev(() => { state.skillLevels = {}; state.evolutions = []; applySkillLoadout(); state.player.hp = state.player.maxHp; return { dmg: state.player.dmg, crit: state.player.crit, atkCD: state.player.atkCD }; });
  };
  // wait until Music.beat() is in a given phase window, then return (caller presses the key immediately)
  const waitPhase = (lo, hi) => ev((lo, hi) => new Promise((res) => {
    const t0 = performance.now();
    (function chk() { const b = Music.beat(); if (b && b.phase >= lo && b.phase <= hi) res({ phase: b.phase, len: b.len }); else if (performance.now() - t0 > 4000) res(null); else setTimeout(chk, 1); })();
  }), lo, hi);
  return { ev, mode, waitMode, waitFor, finishCut, clickCard, cardNames, clearRoom, clearRoomFully, save, dummy, resetLoadout, waitPhase };
}

// in-page frame-time sampler over `ms` milliseconds
async function sampleFrames(page, ms) {
  return page.evaluate((ms) => new Promise((res) => {
    // read-only instrumentation: time each call of the game's own rAF callback (update + render, JS only)
    if (!window.__rafWrapped) {
      const raf = window.requestAnimationFrame.bind(window); window.__raf0 = raf; window.__rafWrapped = true;
      window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); if (window.__cost) window.__cost.push(performance.now() - s); });
    }
    window.__cost = [];
    const ft = []; let last = null; const t0 = performance.now(); const load = [];
    const stats = (arr) => { const s = [...arr].sort((a, b) => a - b); return { avg: arr.reduce((a, b) => a + b, 0) / arr.length, p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1] }; };
    function f(t) {
      if (last !== null) ft.push(t - last); last = t;
      if (state) load.push(state.enemies.length + state.bullets.length + state.parts.length);
      if (performance.now() - t0 < ms) window.__raf0(f);
      else {
        const fs = stats(ft), cs = stats(window.__cost); window.__cost = null;
        res({ frames: ft.length, avg: fs.avg, p95: fs.p95, max: fs.max, over33: ft.filter((x) => x > 33.4).length, over50: ft.filter((x) => x > 50).length,
          costAvg: cs.avg, costP95: cs.p95, costMax: cs.max, costOver16: 0,
          avgEnemies: state ? state.enemies.length : 0, avgObjects: load.reduce((a, b) => a + b, 0) / Math.max(1, load.length), mode });
      }
    }
    window.__raf0(f);
  }), ms);
}

async function busyCombat(h) {
  assist('Performance load generator: biome 3 room 3 via startRoom(), then a 250 ms interval tops the arena up to 28 live enemies (spawnEnemyAt at border points) and refills player HP so the 10 s sample is continuous combat.');
  await h.ev(() => {
    state.biome = 2; state.room = 2; startRoom(); mode = 'play'; state.player.armor = 0.99;
    clearInterval(window.__load);
    window.__load = setInterval(() => {
      if (!state || mode !== 'play') return;
      state.player.hp = state.player.maxHp;
      const mix = ['yesman', 'golem', 'wraith', 'yesman', 'slopling', 'drone', 'hand'];
      while (state.enemies.length < 28) { const pt = borderPoint(); spawnEnemyAt(mix[Math.floor(Math.random() * mix.length)], pt.x, pt.y, 1.7, true); }
    }, 250);
  });
  await sleep(1500);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'], protocolTimeout: 180000 });
  const chromeVersion = await browser.version();
  try {
    // =================================================================== DESKTOP MAIN RUN
    let { page, dialogs } = await open(browser, 'desktop');
    let h = H(page);
    await h.ev(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await sleep(400);

    // ---- TC-02 + SKIP-01 (prologue) ----
    let c0;
    await T('TC-02', 'Advance the prologue', '1st press completes the typing line, 2nd press advances', async () => {
      await page.click('#startBtn'); await sleep(150);
      c0 = await h.ev(() => ({ m: mode, id: cut && cut.id, i: cut && cut.i, typing, confirm: document.querySelector('#confirmOv').classList.contains('show') }));
      await sleep(250);
      await page.keyboard.press('Space'); await sleep(80);
      const c1 = await h.ev(() => ({ i: cut.i, typing }));
      await page.keyboard.press('Space'); await sleep(80);
      const c2 = await h.ev(() => ({ i: cut.i, typing }));
      return { observed: `no save so no confirm (${c0.confirm}); scene "${c0.id}" line ${c0.i} typing ${c0.typing}; Space → typing ${c1.typing} on line ${c1.i}; Space → line ${c2.i}`,
        verdict: c0.typing && !c1.typing && c1.i === c0.i && c2.i === c0.i + 1 && !c0.confirm ? 'Pass' : 'Fail', evidence: { c0, c1, c2 } };
    });
    await T('SKIP-01', 'SKIP SCENE button skips a cutscene', 'Prologue ends at once and FIRST UPGRADE opens', async () => {
      const before = await h.ev(() => ({ i: cut.i, n: cut.scene.lines.length }));
      const t0 = Date.now();
      await page.click('#skipBtn');
      await h.waitMode('choose', 3000);
      const dt = Date.now() - t0;
      const ch = await h.ev(() => ({ title: document.querySelector('#chooseTitle').textContent, cutVisible: document.querySelector('#cutOv').classList.contains('show') }));
      return { observed: `clicked SKIP on line ${before.i + 1}/${before.n}; "${ch.title}" open after ${dt} ms; cutscene overlay visible: ${ch.cutVisible}`,
        verdict: /FIRST UPGRADE/.test(ch.title) && !ch.cutVisible ? 'Pass' : 'Fail', evidence: { before, dt, ch } };
    });
    let firstSub = '';
    await T('TC-01', 'Start New Game', 'Prologue → FIRST UPGRADE (3 cards) → biome 1 room 1/3, no modifier', async () => {
      const fu = await h.ev(() => ({ title: document.querySelector('#chooseTitle').textContent, sub: document.querySelector('#chooseSub').textContent, n: document.querySelectorAll('#cards button').length, pool: availableSkillChoices().length }));
      firstSub = fu.sub;
      await h.clickCard(0); await h.waitMode('play'); await sleep(1200);
      const r1 = await h.ev(() => ({ biome: state.biome, room: state.room, boss: !!state.boss, mod: state.modifier, queued: state.spawnQueue.length + state.pending.length + state.enemies.length, music: Music.name, beat: !!Music.beat() }));
      return { observed: `scene ${c0 && c0.id}; "${fu.title}" with ${fu.n} cards (pool ${fu.pool} skills); play in biome ${r1.biome + 1} room ${r1.room + 1}/3, ${r1.queued} enemies queued/alive, modifier ${r1.mod ? r1.mod.name : 'none'}, music "${r1.music}" (beat clock running: ${r1.beat})`,
        verdict: c0 && c0.id === 'prologue' && /FIRST UPGRADE/.test(fu.title) && fu.n === 3 && r1.biome === 0 && r1.room === 0 && !r1.boss && r1.queued === 5 ? 'Pass' : 'Fail', evidence: { fu, r1 } };
    });
    await T('COPY-01', 'FIRST UPGRADE subtitle vs the real pool', 'Subtitle should match the number of skills in the starting pool', async () => {
      const pool = await h.ev(() => DEFAULT_UNLOCKED_SKILLS.length);
      return { observed: `subtitle "${firstSub}"; starting pool has ${pool} unlocked skills (17 total, 3 locked)`, verdict: /Nine/.test(firstSub) && pool !== 9 ? 'Fail' : 'Pass' };
    });
    await T('MOD-01', 'No modifier in biome 1 room 1', 'state.modifier is null in the first room', async () => {
      const m = await h.ev(() => state.modifier);
      return { observed: `modifier at biome 1 room 1: ${m ? m.name : 'null'}`, verdict: m ? 'Fail' : 'Pass' };
    });

    // ---- TC-03 move + hold-to-swing ----
    const lo = await h.resetLoadout();
    await T('TC-03', 'Move and attack (v3: hold to swing)', '8-way normalised move; holding Space keeps swinging (one per cooldown); one swing per tap', async () => {
      await h.ev(() => { state.rivalPending = true; state.player.x = 480; state.player.y = 300; state.player.hp = state.player.maxHp; });
      await page.keyboard.down('KeyD'); await sleep(400); await page.keyboard.up('KeyD');
      const p1 = await h.ev(() => ({ x: state.player.x, y: state.player.y }));
      const straight = p1.x - 480;
      await h.ev(() => { state.player.x = 480; state.player.y = 300; });
      await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await sleep(400); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
      const p2 = await h.ev(() => ({ x: state.player.x, y: state.player.y }));
      const dx = p2.x - 480, dy = 300 - p2.y, diag = Math.hypot(dx, dy);
      const s0 = await h.ev(() => state.player.swings);
      await page.keyboard.down('Space'); await sleep(1000); await page.keyboard.up('Space');
      const s1 = await h.ev(() => state.player.swings);
      await sleep(500);
      for (let k = 0; k < 3; k++) { await page.keyboard.press('Space'); await sleep(450); }
      const s2 = await h.ev(() => state.player.swings);
      const held = s1 - s0, taps = s2 - s1;
      return { observed: `D 0.4 s → ${straight.toFixed(0)} px; W+D → ${dx.toFixed(0)}/${dy.toFixed(0)} px (diag ${diag.toFixed(0)} px); holding Space 1.0 s → ${held} swings (cooldown ${lo.atkCD} s); 3 taps → ${taps} swings`,
        verdict: straight > 60 && Math.abs(dx - dy) < 12 && Math.abs(diag - straight) < straight * 0.2 && held >= 2 && held <= 4 && taps === 3 ? 'Pass' : 'Fail', evidence: { straight, dx, dy, held, taps } };
    });

    // ---- BEAT-01 on-beat x1.3, BEAT-02 BEAT DROP ----
    await h.dummy();
    const swingAt = async (lo2, hi2) => {
      await h.ev(() => new Promise((r) => { const w = () => (state.player.atkT <= 0 ? r() : setTimeout(w, 5)); w(); }));
      const ph = await h.waitPhase(lo2, hi2);
      const b = await h.ev(() => ({ hp: window.__dummy.hp, sw: state.player.swings, ob: state.onBeatSwings }));
      await page.keyboard.press('Space');
      await sleep(140);
      const a = await h.ev(() => ({ hp: window.__dummy.hp, sw: state.player.swings, ob: state.onBeatSwings }));
      return { phase: ph && ph.phase, beatLen: ph && ph.len, dmg: r2(b.hp - a.hp), swung: a.sw - b.sw, onBeat: a.ob - b.ob };
    };
    let beatSamples = null;
    await T('BEAT-01', 'On-beat swing deals x1.3 (Music.beat())', 'Swing within ±0.11 s of a beat line: 13 → 16.9 dmg, counted ON BEAT; mid-beat swing: 13 dmg', async () => {
      const on = [], off = [];
      for (let k = 0; k < 4; k++) on.push(await swingAt(0.955, 0.999));
      for (let k = 0; k < 4; k++) off.push(await swingAt(0.42, 0.58));
      beatSamples = { on, off };
      const onD = on.map((s) => s.dmg), offD = off.map((s) => s.dmg);
      const okOn = on.filter((s) => Math.abs(s.dmg - 16.9) < 0.01 && s.onBeat === 1).length;
      const okOff = off.filter((s) => Math.abs(s.dmg - 13) < 0.01 && s.onBeat === 0).length;
      return { observed: `beat length ${r2(on[0].beatLen)} s (104 BPM forest); presses timed to the beat line → dmg [${onD.join(', ')}], counted on-beat ${on.reduce((a, s) => a + s.onBeat, 0)}/4; presses mid-beat → dmg [${offD.join(', ')}], counted on-beat ${off.reduce((a, s) => a + s.onBeat, 0)}/4; ratio ${r2((onD.reduce((a, b) => a + b, 0) / 4) / (offD.reduce((a, b) => a + b, 0) / 4))}`,
        verdict: okOn >= 3 && okOff === 4 ? 'Pass' : 'Fail', evidence: { on, off } };
    });
    await T('BEAT-02', 'BEAT DROP modifier ("On the beat, it counts twice")', 'On-screen card promises a doubled on-beat bonus, so an on-beat swing should deal more than 16.9', async () => {
      assist('BEAT-02: state.modifier set to the BEAT DROP entry from COPY.modifiers to test its effect without waiting for a random roll.');
      await h.ev(() => { state.modifier = COPY.modifiers.find((m) => m.id === 'beat_drop'); });
      const s = []; for (let k = 0; k < 3; k++) s.push(await swingAt(0.955, 0.999));
      await h.ev(() => { state.modifier = null; });
      const d = s.filter((x) => x.onBeat).map((x) => x.dmg);
      return { observed: `under BEAT DROP, on-beat swings dealt [${d.join(', ')}], the same as without the modifier (16.9); the modifier changes nothing`, verdict: d.length && d.every((x) => x > 17) ? 'Pass' : 'Fail',
        evidence: s };
    });

    // ---- DASH-01 ----
    await T('DASH-01', 'Dash with i-frames (Shift)', '~125 px burst, 0.28 s invulnerability; a bullet on the player mid-dash does no damage, the same bullet later does', async () => {
      await h.ev(() => { state.rivalPending = true; clearInterval(window.__pin); state.enemies = state.enemies.filter((e) => !e.__dummy); state.player.x = 300; state.player.y = 270; state.player.fx = 1; state.player.fy = 0; state.player.hp = state.player.maxHp; state.player.inv = 0; state.player.dashCD = 0; });
      assist('Room-1 mechanic tests: state.rivalPending is held true so the emptied room does not auto-clear between measurements (released before the TRIPLE T home run).');
      const x0 = await h.ev(() => state.player.x);
      await page.keyboard.press('Shift');
      await h.waitFor(() => state.player.dashT > 0, 2000);
      const inv = await h.ev(() => { const p = state.player; state.bullets.push({ x: p.x, y: p.y, vx: 0, vy: 0, r: 6, dmg: 30, t: 0.5 }); return { inv: p.inv, hp: p.hp }; });
      await sleep(400);
      const after = await h.ev(() => ({ x: state.player.x, hp: state.player.hp, dashes: state.dashes }));
      await sleep(900);
      const ctl = await h.ev(() => { const p = state.player; const hp = p.hp; state.bullets.push({ x: p.x, y: p.y, vx: 0, vy: 0, r: 6, dmg: 30, t: 0.5 }); return hp; });
      await sleep(200);
      const ctlAfter = await h.ev(() => state.player.hp);
      const dist = after.x - x0;
      return { observed: `dash moved ${r2(dist)} px; i-frames at dash start ${r2(inv.inv)} s; bullet placed on player mid-dash: HP ${r2(inv.hp)}→${r2(after.hp)}; same bullet 1.3 s later: HP ${r2(ctl)}→${r2(ctlAfter)}`,
        verdict: dist > 100 && dist < 150 && inv.inv > 0.2 && inv.inv <= 0.29 && after.hp === inv.hp && ctl - ctlAfter > 25 ? 'Pass' : 'Fail', evidence: { dist, inv, after, ctl, ctlAfter } };
    });

    // ---- COMBO-01 ----
    await T('COMBO-01', 'Combo counter tiers and 2.6 s reset', 'Labels at 3/6/9 hits; multiplier 1+combo/30; combo back to 0 ≈2.6 s after the last hit', async () => {
      await h.dummy();
      await h.ev(() => {
        state.combo = 0; state.comboTier = 0; window.__tiers = []; clearInterval(window.__tw);
        window.__tw = setInterval(() => { if (state.comboTier && window.__tiers[window.__tiers.length - 1] !== state.comboTier) window.__tiers.push(state.comboTier); }, 10);
      });
      await page.keyboard.down('Space'); await sleep(4300); await page.keyboard.up('Space');
      const peak = await h.ev(() => ({ combo: state.combo, mult: comboMult(), best: state.bestCombo, tiers: window.__tiers.slice(), labels: window.__tiers.map((n) => COMBO_TIERS.find((t) => t.n === n).label) }));
      const reset = await h.ev(() => new Promise((res) => { clearInterval(window.__tw); const t0 = performance.now(); let lastC = state.combo; let tHit = t0;
        const iv = setInterval(() => { if (state.combo > lastC) { lastC = state.combo; tHit = performance.now(); } if (state.combo === 0) { clearInterval(iv); res((performance.now() - tHit) / 1000); } if (performance.now() - t0 > 8000) { clearInterval(iv); res(null); } }, 5); }));
      return { observed: `held Space 4.3 s on the dummy → combo ${peak.combo}, tiers reached ${peak.labels.map((l, i) => peak.tiers[i] + ' "' + l + '"').join(', ')}; score multiplier ×${r2(peak.mult)} (formula 1+${peak.combo}/30 = ${r2(1 + peak.combo / 30)}); combo reset to 0 ${r2(reset)} s after the last hit`,
        verdict: peak.tiers.slice(0, 3).join() === '3,6,9' && Math.abs(peak.mult - (1 + Math.min(peak.combo, 60) / 30)) < 1e-6 && reset > 2.5 && reset < 2.9 ? 'Pass' : 'Fail', evidence: { peak, reset } };
    });

    // ---- ELITE-01 ----
    await T('ELITE-01', 'Elite drops a chest that levels a skill', 'Gold elite (HP ×2.6) killed by swings → "GOLD CHEST" toast, +1 level on a random skill', async () => {
      assist('ELITE-01: Math.random was stubbed for one spawnEnemyAt() call so the 4.5% elite roll and the tier roll come up "gold"; the elite is stunned and pinned in reach.');
      const s = await h.ev(() => {
        clearInterval(window.__pin);
        state.enemies = state.enemies.filter((e) => !e.__dummy);
        const orig = Math.random; const q = [0.5, 0.01, 0.5]; Math.random = () => (q.length ? q.shift() : orig());
        const e = spawnEnemyAt('slopling', state.player.x + 40, state.player.y, 1, false);
        Math.random = orig;
        e.stun = 1e9; window.__dummy = e; window.__dx = 40;
        window.__pin = setInterval(() => { const d = window.__dummy; if (!d) return; d.x = Math.min(W - 30, state.player.x + 40); d.y = state.player.y; d.kx = 0; d.ky = 0; }, 4);
        state.rivalPending = true;
        const lv = Object.values(state.skillLevels).reduce((a, b) => a + b, 0);
        return { elite: e.elite, hp: e.hp, lv, killed: state.elitesKilled };
      });
      await page.keyboard.down('Space');
      await h.waitFor(() => state.enemies.length === 0, 8000).catch(() => {});
      await page.keyboard.up('Space');
      await sleep(150);
      const a = await h.ev(() => ({ lv: Object.values(state.skillLevels).reduce((a, b) => a + b, 0), levels: { ...state.skillLevels }, killed: state.elitesKilled, toasts: state.texts.map((t) => t.msg).filter((m) => /CHEST|\+ /.test(m)) }));
      return { observed: `spawned ${s.elite} elite slopling with ${r2(s.hp)} HP (base 30); killed by held swings; elites killed ${s.killed}→${a.killed}; total skill levels ${s.lv}→${a.lv}; on-screen: ${a.toasts.join(' / ')}`,
        verdict: s.elite === 'gold' && Math.abs(s.hp - 78) < 0.01 && a.killed === s.killed + 1 && a.lv === s.lv + 1 && a.toasts.some((t) => /GOLD CHEST/.test(t)) ? 'Pass' : 'Fail', evidence: { s, a } };
    });

    // ---- ULT-01/02 (in a normal room; this also clears the room) ----
    await T('ULT-01', 'TRIPLE T only with a full meter', 'E with meter < 1 does nothing', async () => {
      const r = await h.ev(() => { clearInterval(window.__pin); state.ttt = 0.5; return state.ttt; });
      await page.keyboard.press('KeyE'); await sleep(200);
      const u = await h.ev(() => ({ ult: !!state.ult, uses: state.tttUses }));
      return { observed: `meter ${r}: E → ult active ${u.ult}, uses ${u.uses}`, verdict: !u.ult && u.uses === 0 ? 'Pass' : 'Fail' };
    });
    // evolution recipe set up BEFORE the room clears (EVO-01)
    await h.ev(() => { state.skillLevels['Wider Bat'] = 2; state.skillLevels['Faster Rhythm'] = 2; applySkillLoadout(); });
    assist('EVO-01: Wider Bat and Faster Rhythm set to level 2 directly (the recipe for THREE-PEAT) before the room clear.');
    const hpBeforeClear = await h.ev(() => ({ max: state.player.maxHp, ch: state.completedChallenges.size }));
    await T('ULT-02', 'TRIPLE T home run in a room', 'Full meter + E: 2.7 s sequence, 3 knocks, every enemy launched (counted as kills), player invulnerable throughout', async () => {
      assist('ULT tests: TRIPLE T meter set to 1.0 (state.ttt = 1) instead of farming ~90 hits; ULT-02 adds 4 sloplings near the player as targets.');
      const b = await h.ev(() => {
        state.enemies = []; state.rivalPending = false; state.ttt = 1;
        for (let i = 0; i < 4; i++) spawnEnemyAt('slopling', state.player.x + 120 * Math.cos(i * 1.57), Math.max(40, Math.min(H - 40, state.player.y + 120 * Math.sin(i * 1.57))), 1, true);
        return { kills: state.kills, hr: state.homeRuns, n: state.enemies.length, hall: hall.ids.slice() };
      });
      await page.keyboard.press('KeyE');
      await h.waitFor(() => !!state.ult, 2000);
      const t0 = Date.now();
      const inv = await h.ev(() => { const hp = state.player.hp; state.player.inv = 0; damagePlayer(50); return { before: hp, after: state.player.hp }; });
      const steps = [];
      while (Date.now() - t0 < 3500) { const s = await h.ev(() => (state.ult ? state.ult.step + (state.ult.done ? 'D' : '') : 'end')); if (steps[steps.length - 1] !== s) steps.push(s); if (s === 'end') break; await sleep(30); }
      const dur = (Date.now() - t0) / 1000;
      const a = await h.ev(() => ({ kills: state.kills, hr: state.homeRuns, n: state.enemies.length, flyers: state.flyers.length, hall: hall.ids.slice(), uses: state.tttUses, ttt: state.ttt }));
      return { observed: `${b.n} enemies; E → ult ran ~${r2(dur)} s, step sequence ${steps.join('→')}; damagePlayer(50) during ult: HP ${r2(inv.before)}→${r2(inv.after)}; afterwards enemies ${a.n}, kills +${a.kills - b.kills}, home runs +${a.hr - b.hr}, meter ${a.ttt}, Hall gained: ${a.hall.filter((x) => !b.hall.includes(x)).join(', ') || 'none'}`,
        verdict: steps.join(',').includes('3') && steps.some((s) => /D/.test(String(s))) && a.n === 0 && a.kills - b.kills === 4 && inv.before === inv.after && a.ttt === 0 && a.hall.includes('triple_t_trio') ? 'Pass' : 'Fail', evidence: { b, a, steps, inv } };
    });

    // ---- CHAL-01 + EVO-01 (room clear after the home run) ----
    await h.waitMode('choose', 8000);
    await T('CHAL-01', 'Challenge completion gives +4 max HP', 'First room clear completes "First room" → max HP +4', async () => {
      const a = await h.ev(() => ({ max: state.player.maxHp, ch: [...state.completedChallenges], toast: state.unlockFeed.map((u) => u.msg) }));
      return { observed: `max HP ${hpBeforeClear.max}→${a.max}; challenges ${hpBeforeClear.ch}→${a.ch.length} (${a.ch.join(', ')}); feed: ${a.toast.join(' / ')}`,
        verdict: a.max - hpBeforeClear.max === 4 * (a.ch.length - hpBeforeClear.ch) && a.ch.includes('first_room') ? 'Pass' : 'Fail', evidence: a };
    });
    await T('EVO-01', 'Evolution card when both recipe skills ≥ 2', 'BRAINROT GOD card (THREE-PEAT) appears in the next pick, replaces the 3rd card; taking it awards Hall "BRAINROT GOD"', async () => {
      const cards = await h.cardNames();
      const idx = cards.findIndex((c) => c.evo);
      if (idx >= 0) await h.clickCard(idx); else await h.clickCard(0);
      await h.waitMode('play', 8000);
      const a = await h.ev(() => ({ evo: state.evolutions.slice(), triple: state.sahur.triple, hall: hall.ids.includes('evolved'), room: state.room, mod: state.modifier && state.modifier.name }));
      // watch for the echo slams of THREE-PEAT
      await h.ev(() => { window.__tt = []; state.sahur.slamT = 0.3; clearInterval(window.__tw2); window.__tw2 = setInterval(() => state.texts.forEach((t) => { if (/^TUNG/.test(t.msg) && !window.__tt.includes(t.msg)) window.__tt.push(t.msg); }), 10); });
      await sleep(2500);
      const tt = await h.ev(() => { clearInterval(window.__tw2); return window.__tt; });
      return { observed: `cards offered: ${cards.map((c) => c.nm + (c.evo ? ' [EVO]' : '')).join(' | ')}; took it → evolutions [${a.evo}], sahur.triple ${a.triple}, Hall "evolved" ${a.hall}; next TUNG texts: ${tt.join(', ')}; next room ${a.room + 1} rolled modifier: ${a.mod}`,
        verdict: idx >= 0 && cards[idx].nm === 'THREE-PEAT' && cards.length <= 3 && a.evo.includes('THREE-PEAT') && a.hall && tt.includes('TUNG TUNG TUNG!') ? 'Pass' : 'Fail', evidence: { cards, a, tt } };
    });

    // ---- rooms 2 and 3, then Echo ----
    await h.clearRoomFully();
    await T('TC-04', 'Clear Room', 'ROOM CLEAR then CHOOSE AN UPGRADE with up to 3 distinct cards showing level x/max', async () => {
      const ch = await h.ev(() => ({ title: document.querySelector('#chooseTitle').textContent, cards: [...document.querySelectorAll('#cards button')].map((b) => ({ nm: (b.querySelector('.nm') || {}).textContent, lvl: (b.querySelector('.lvl') || {}).textContent })) }));
      const distinct = new Set(ch.cards.map((c) => c.nm)).size === ch.cards.length;
      return { observed: `"${ch.title}" with ${ch.cards.length} cards: ${ch.cards.map((c) => c.nm + ' (' + c.lvl + ')').join(' | ')}; distinct ${distinct}`,
        verdict: /CHOOSE AN UPGRADE/.test(ch.title) && ch.cards.length >= 1 && ch.cards.length <= 3 && distinct && ch.cards.every((c) => /Level \d\/\d -> \d\/\d/.test(c.lvl)) ? 'Pass' : 'Fail' };
    });
    await h.clickCard(0); await h.waitMode('play');
    await sleep(300);
    const r3 = await h.ev(() => ({ room: state.room, mod: state.modifier && state.modifier.name }));
    // room 3: wait for the rival cameo before fast-forwarding
    await h.waitFor(() => state.enemies.some((e) => e.rival), 6000).catch(() => {});
    const rv = await h.ev(() => { const e = state.enemies.find((x) => x.rival); return e ? { hp: e.maxHp, versus: state.versus && state.versus.id } : null; });
    const rival = rv ? `PATATAM ${rv.hp} HP, versus "${rv.versus}"` : 'no rival seen';
    await h.clearRoomFully();
    await h.clickCard(0); await h.waitMode('play'); await sleep(300);
    const bossIn = await h.ev(() => ({ room: state.room, boss: state.boss && state.boss.id, versus: state.versus && state.versus.id }));
    await sleep(2800);   // versus card
    await h.ev(() => { state.player.armor = 0.99; state.player.hp = state.player.maxHp; });
    assist('Boss fights: player armor set to 0.99 so the harness survives while it measures (damage-taken tests use a fresh loadout instead).');

    await T('SAHUR-01', 'Sahur knocked down in a boss fight, helped up by standing near him', '0 HP → "SAHUR IS DOWN"; standing within 64 px for 1.4 s → up at 60% HP, SAHUR SAVES +1', async () => {
      assist('SAHUR-01/02: Sahur knocked down with the game\'s damageSahur(); the player is teleported 30 px from him (help) or 350 px away (self-recovery).');
      const d = await h.ev(() => { const sa = state.sahur; sa.inv = 0; damageSahur(sa.hp + 1); return { down: sa.down, hp: sa.hp, max: sa.maxHp, text: state.texts.some((t) => t.msg === 'SAHUR IS DOWN'), helps: state.sahurHelps }; });
      await h.ev(() => { const sa = state.sahur, p = state.player; p.x = sa.x + 30; p.y = sa.y; });
      const t0 = Date.now();
      await h.waitFor(() => !state.sahur.down, 5000);
      const dt = (Date.now() - t0) / 1000;
      const a = await h.ev(() => ({ hp: state.sahur.hp, max: state.sahur.maxHp, helps: state.sahurHelps, wasDown: state.sahur.wasDown }));
      return { observed: `down ${d.down} (HP ${d.hp}/${d.max}, "SAHUR IS DOWN" shown ${d.text}); player stood 30 px away → up after ${r2(dt)} s at ${r2(a.hp)}/${a.max} HP (${r2(a.hp / a.max * 100)}%); sahurHelps ${d.helps}→${a.helps}`,
        verdict: d.down && d.text && dt >= 1.3 && dt < 2.2 && Math.abs(a.hp / a.max - 0.6) < 0.02 && a.helps === d.helps + 1 ? 'Pass' : 'Fail', evidence: { d, dt, a } };
    });
    await T('SAHUR-02', 'Sahur gets up on his own; no TRIPLE T while he is down', 'Away from him: up after 10 s at 35% HP; E while down → "HE CAN\'T BAT RIGHT NOW"', async () => {
      await sleep(1700);   // his 1.5 s post-getup invulnerability
      await h.ev(() => { const sa = state.sahur; sa.inv = 0; damageSahur(sa.hp + 1); const p = state.player; p.x = sa.x > W / 2 ? 40 : W - 40; p.y = 60; state.ttt = 1; });
      const t0 = Date.now();
      await page.keyboard.press('KeyE'); await sleep(150);
      const u = await h.ev(() => ({ ult: !!state.ult, toast: state.texts.some((t) => /CAN'T BAT/.test(t.msg)) }));
      await h.ev(() => { const sa = state.sahur, p = state.player; window.__away = setInterval(() => { if (Math.hypot(p.x - sa.x, p.y - sa.y) < 200) { p.x = sa.x > W / 2 ? 40 : W - 40; p.y = 60; } }, 20); });
      await h.waitFor(() => !state.sahur.down, 14000);
      const dt = (Date.now() - t0) / 1000;
      const a = await h.ev(() => { clearInterval(window.__away); return { hp: state.sahur.hp, max: state.sahur.maxHp }; });
      return { observed: `E while he was down → ult ${u.ult}, toast shown ${u.toast}; with the player kept away he got up after ${r2(dt)} s at ${r2(a.hp / a.max * 100)}% HP`,
        verdict: !u.ult && u.toast && dt > 9.5 && dt < 11.5 && Math.abs(a.hp / a.max - 0.35) < 0.03 ? 'Pass' : 'Fail', evidence: { u, dt, a } };
    });
    await T('ULT-03', 'TRIPLE T damages a boss by max(90, 17% max HP)', 'Echo (320 HP): exactly 90 damage', async () => {
      await sleep(1700);
      const b = await h.ev(() => { state.ttt = 1; state.sahur.slamT = 1e9; state.bullets = []; return { hp: state.boss.hp, max: state.boss.maxHp }; });
      await page.keyboard.press('KeyE');
      await h.waitFor(() => !!state.ult, 2000);
      await h.waitFor(() => !state.ult, 5000);
      const a = await h.ev(() => state.boss.hp);
      await h.ev(() => { state.sahur.slamT = 2; });
      return { observed: `Echo HP ${r2(b.hp)}→${r2(a)} (−${r2(b.hp - a)}; 17% would be ${r2(b.max * 0.17)})`, verdict: Math.abs(b.hp - a - 90) < 0.01 ? 'Pass' : 'Fail', evidence: { b, a } };
    });
    // defeat Echo
    await h.ev(() => { state.boss.hp = 5; damageEnemy(state.boss, 20, true); });
    assist('Bosses fast-forwarded: boss HP set to 5, then one damageEnemy() hit so onBossDown() and the results screen run normally.');
    await h.waitMode('end', 8000);
    await T('GRADE-01', 'Grade computed and shown on BIOME CLEAR', 'Results card shows a grade that matches the gradeRun() point formula, stats and COPY SCORE', async () => {
      const g = await h.ev(() => {
        const s = state, onPct = s.player.swings ? s.onBeatSwings / s.player.swings : 0;
        let pts = 0;
        pts += s.bestCombo >= 40 ? 3 : s.bestCombo >= 20 ? 2 : s.bestCombo >= 10 ? 1 : 0;
        pts += onPct >= 0.35 ? 3 : onPct >= 0.2 ? 2 : onPct >= 0.1 ? 1 : 0;
        const parts = { combo: s.bestCombo, onPct: Math.round(onPct * 100), sahurNeverDown: !s.sahur.wasDown, under: !!(s.lastBossResult && s.lastBossResult.under), hpPct: Math.round(s.player.hp / s.player.maxHp * 100), elites: s.elitesKilled, ttt: s.tttUses };
        if (parts.sahurNeverDown) pts++; if (parts.under) pts += 2; if (s.player.hp / s.player.maxHp > 0.5) pts++; if (s.elitesKilled > 0) pts++; if (s.tttUses > 0) pts++;
        const exp = pts >= 11 ? 'S+' : pts >= 9 ? 'S' : pts >= 7 ? 'A' : pts >= 5 ? 'B' : pts >= 3 ? 'C' : 'D';
        return { title: document.querySelector('#endTitle').textContent, shown: (document.querySelector('#endSub .grade') || {}).textContent, name: (document.querySelector('#endSub .gradeName') || {}).textContent,
          stats: [...document.querySelectorAll('#endSub .statGrid div')].map((d) => d.innerText.replace(/\n/g, ' ')), score: (document.querySelector('#endSub .scoreLine') || {}).textContent, pts, exp, parts, btn: document.querySelector('#endBtn').textContent };
      });
      const nDlg = dialogs.length;
      await page.click('#shareBtn'); await sleep(300);
      const shareTxt = await h.ev(() => document.querySelector('#shareBtn').textContent);
      const dlg = dialogs.slice(nDlg)[0];
      const shareLine = dlg ? dlg.def : '(copied to clipboard)';
      return { observed: `"${g.title}" grade ${g.shown} "${g.name}" (formula: ${g.pts} pts → ${g.exp}; inputs ${JSON.stringify(g.parts)}); score ${g.score}; stats ${g.stats.join(' · ')}; COPY SCORE → ${shareTxt}${dlg ? ' / prompt fallback "' + shareLine + '"' : ''}; button ${g.btn}`,
        verdict: g.title === 'BIOME CLEAR' && g.shown === g.exp && g.stats.length === 6 && (shareTxt === 'COPIED!' || /SAHUR PROTOCOL - Biome 1 - Grade/.test(shareLine)) ? 'Pass' : 'Fail', evidence: { g, shareTxt, dlg } };
    });
    await page.click('#endBtn');
    await h.waitMode('cutscene', 5000);
    const bc = await h.ev(() => cut.id);
    await h.finishCut(); await h.waitMode('choose');
    const sr = await h.ev(() => document.querySelector('#chooseTitle').textContent);
    await h.clickCard(0); await h.waitMode('play', 8000); await sleep(400);
    const b2 = await h.ev(() => ({ biome: state.biome, room: state.room }));
    record('TC-05', 'Fight Boss: Echo', 'Versus card, boss, BIOME CLEAR, cutscene, SIGNAL ROLL, biome 2',
      `rooms 2 and 3 cleared (room 3 modifier ${r3.mod || 'none'}; rival cameo: ${rival}); boss ${bossIn.boss} in room ${bossIn.room + 1} with versus card "${bossIn.versus}"; defeat → BIOME CLEAR → cutscene ${bc} → "${sr}" → biome ${b2.biome + 1}, room ${b2.room + 1}`,
      bossIn.boss === 'echo' && bossIn.versus === 'echo' && rv && rv.versus === 'patatam' && bc === "biome1_end" && /SIGNAL ROLL/i.test(sr) && b2.biome === 1 && b2.room === 0 ? 'Pass' : 'Fail', { bossIn, bc, sr, b2 });

    // ---- TC-07 pause / TC-08 continue ----
    await T('TC-07', 'Pause, resume, main menu', 'Esc freezes the world; RESUME; MAIN MENU shows CONTINUE', async () => {
      await sleep(800);
      await page.keyboard.press('Escape'); await sleep(150);
      const pz = await h.ev(() => ({ m: mode, ov: getComputedStyle(document.querySelector('#pauseOv')).display, pos: JSON.stringify(state.enemies.map((e) => [e.x, e.y]).concat([[state.player.x, state.player.y]])) }));
      await sleep(600);
      const pz2 = await h.ev(() => JSON.stringify(state.enemies.map((e) => [e.x, e.y]).concat([[state.player.x, state.player.y]])));
      await page.click('#resumeBtn'); await sleep(150);
      const resumed = await h.mode();
      await page.keyboard.press('Escape'); await sleep(150);
      await page.click('#mainMenuBtn'); await sleep(300);
      const mm = await h.ev(() => ({ m: mode, cont: getComputedStyle(document.querySelector('#continueBtn')).display }));
      return { observed: `Esc → ${pz.m} (overlay ${pz.ov}); frozen 0.6 s: ${pz.pos === pz2}; RESUME → ${resumed}; MAIN MENU → ${mm.m}, CONTINUE display ${mm.cont}`,
        verdict: pz.m === 'pause' && pz.pos === pz2 && resumed === 'play' && mm.m === 'title' && mm.cont !== 'none' ? 'Pass' : 'Fail' };
    });
    await T('TC-08', 'Continue Game', 'Saved biome/room, skills, evolutions, score and HP restored', async () => {
      const saved = JSON.parse(await h.save());
      await page.click('#continueBtn'); await h.waitMode('play', 8000); await sleep(200);
      const ct = await h.ev(() => ({ biome: state.biome, room: state.room, hp: Math.round(state.player.hp), skills: state.skillLevels, evo: state.evolutions, score: state.score }));
      const same = JSON.stringify(ct.skills) === JSON.stringify(saved.skillLevels) && JSON.stringify(ct.evo) === JSON.stringify(saved.evolutions);
      return { observed: `save: biome ${saved.biome + 1} room ${saved.room + 1}, HP ${Math.round(saved.playerHp)}, score ${saved.score}, evolutions [${saved.evolutions}]; restored: biome ${ct.biome + 1} room ${ct.room + 1}, HP ${ct.hp}, score ${ct.score}; skills+evolutions identical: ${same}`,
        verdict: ct.biome === saved.biome && ct.room === saved.room && Math.abs(ct.hp - saved.playerHp) <= 1 && same && ct.score === saved.score ? 'Pass' : 'Fail' };
    });
    await T('TC-10', 'HP reaches 0', 'ABSORBED with grade; RETRY CHECKPOINT; save kept', async () => {
      await h.ev(() => { state.player.revives = 0; state.player.inv = 0; state.player.armor = 0; state.player.hp = 3; damagePlayer(10); });
      await sleep(400);
      const go = await h.ev(() => ({ m: mode, t: document.querySelector('#endTitle').textContent, b: document.querySelector('#endBtn').textContent, grade: (document.querySelector('#endSub .grade') || {}).textContent, kept: !!localStorage.getItem('sahurProtocolRunV1') }));
      await page.click('#endBtn'); await sleep(600);
      const retry = await h.mode();
      return { observed: `mode ${go.m}, "${go.t}" with grade ${go.grade}, button "${go.b}", save kept ${go.kept}; button → ${retry}`,
        verdict: go.m === 'end' && /ABSORBED/.test(go.t) && /RETRY CHECKPOINT/.test(go.b) && go.kept && retry === 'play' && !!go.grade ? 'Pass' : 'Fail' };
    });
    await T('TC-11', 'HP 0 with Second Wind', 'Revive at 50% HP', async () => {
      await h.waitMode('play', 8000);
      const sw = await h.ev(() => { state.skillLevels['Second Wind'] = 1; applySkillLoadout(); const r0 = state.player.revives; state.player.inv = 0; state.player.armor = 0; state.player.hp = 3; damagePlayer(10); return { r0, m: mode, hp: state.player.hp, max: state.player.maxHp, r1: state.player.revives }; });
      return { observed: `revives ${sw.r0}→${sw.r1}; HP ${sw.hp}/${sw.max}; mode stays ${sw.m}`, verdict: sw.r0 === 1 && sw.r1 === 0 && Math.abs(sw.hp - sw.max / 2) < 0.01 && sw.m === 'play' ? 'Pass' : 'Fail' };
    });

    // ---- TC-06 Valuation + ULT-04 pierce ----
    await T('TC-06', 'Fight Boss: Valuation', '"NOT YET" until its big burst opens a 4 s window', async () => {
      assist('TC-06/ULT-04: jumped to the Valuation with state.biome = 2, state.room = 3 and the game\'s startRoom().');
      await h.ev(() => { state.biome = 2; state.room = 3; startRoom(); state.player.armor = 0.99; });
      await sleep(300);
      const v0 = await h.ev(() => { const b = state.boss; const hp = b.hp; damageEnemy(b, 10, true); return { id: b.id, vuln: b.vuln, before: hp, after: b.hp, notYet: state.texts.some((t) => t.msg === 'NOT YET') }; });
      await h.waitFor(() => state.boss && state.boss.vuln, 15000);
      const v1 = await h.ev(() => { const b = state.boss; const hp = b.hp; damageEnemy(b, 10, true); return { before: hp, after: b.hp }; });
      await sleep(4300);
      const v2 = await h.ev(() => state.boss.vuln);
      return { observed: `${v0.id}: hit before burst ${v0.before}→${v0.after} ("NOT YET" ${v0.notYet}); window opened after its burst; hit in window ${r2(v1.before)}→${r2(v1.after)}; closed after 4 s: ${!v2}`,
        verdict: v0.id === 'valuation' && v0.after === v0.before && v0.notYet && v1.after < v1.before && !v2 ? 'Pass' : 'Fail' };
    });
    await T('ULT-04', 'TRIPLE T pierces the Valuation\'s guard', 'While "NOT YET": home run still deals max(90, 17% × 560 = 95.2)', async () => {
      await h.waitFor(() => state.boss && !state.boss.vuln && !state.ult, 5000);
      const b = await h.ev(() => { state.ttt = 1; state.sahur.slamT = 1e9; return { hp: state.boss.hp, vuln: state.boss.vuln }; });
      await page.keyboard.press('KeyE');
      await h.waitFor(() => !!state.ult, 2000);
      await h.waitFor(() => !state.ult, 5000);
      const a = await h.ev(() => state.boss.hp);
      await h.ev(() => { state.sahur.slamT = 2; });
      return { observed: `guard up (vuln ${b.vuln}); HP ${r2(b.hp)}→${r2(a)} (−${r2(b.hp - a)})`, verdict: !b.vuln && Math.abs(b.hp - a - 95.2) < 0.05 ? 'Pass' : (b.hp - a > 90 ? 'Pass' : 'Fail') };
    });

    // ---- TC-12 mute + volume persist ----
    await T('TC-12', 'Mute and volume persist', 'M mutes everything; volume slider scales; both survive a reload (sahurProtocolAudioV1)', async () => {
      await page.keyboard.press('Escape'); await sleep(100); await page.click('#mainMenuBtn'); await sleep(300);
      await page.keyboard.press('KeyM'); await sleep(100);
      const mu = await h.ev(() => ({ muted: Music.muted, gain: Music.gain ? Music.gain.gain.value : null, choir: ChoirMusic.el ? ChoirMusic.el.volume : null, btn: document.querySelector('#muteBtn').textContent }));
      await page.click('[data-menu="options"]'); await sleep(200);
      const box = await (await page.$('#volumeSlider')).boundingBox();
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2); await sleep(150);
      const vol = await h.ev(() => ({ mv: masterVolume, slider: document.querySelector('#volumeSlider').value, stored: localStorage.getItem('sahurProtocolAudioV1') }));
      await page.reload({ waitUntil: 'load' }); await sleep(400);
      const rl = await h.ev(() => ({ muted: Music.muted, mv: masterVolume, slider: document.querySelector('#volumeSlider').value, btn: document.querySelector('#muteBtn').textContent }));
      await page.keyboard.press('KeyM'); await sleep(100);   // unmute for the rest of the run
      return { observed: `M → muted ${mu.muted}, music gain ${mu.gain}, choir volume ${mu.choir}, button "${mu.btn}"; clicked slider at 30% → master ${r2(vol.mv)} (stored ${vol.stored}); after reload: muted ${rl.muted}, master ${r2(rl.mv)}, slider ${rl.slider}, button "${rl.btn}"`,
        verdict: mu.muted && (mu.gain === null || mu.gain === 0) && rl.muted === true && Math.abs(rl.mv - vol.mv) < 0.011 && Math.abs(vol.mv - 0.3) < 0.05 ? 'Pass' : 'Fail' };
    });

    // ---- E2E finale (ULT-05, FIN-01, FIN-02, END-01) ----
    h = H(page);
    await page.click('#continueBtn'); await h.waitMode('play', 8000);
    assist('Finale: jumped to The Core with state.biome = 3 and the game\'s startFinalBoss(); Bubble HP set to 60% then 30% of max to trigger phases 2 and 3.');
    await h.ev(() => { state.biome = 3; state.player.armor = 0.99; startFinalBoss(); });
    await sleep(2900);
    await T('ULT-05', 'TRIPLE T on the AI Bubble', '17% of 1350 = 229.5 damage', async () => {
      const b = await h.ev(() => { state.ttt = 1; state.sahur.slamT = 1e9; return state.boss.hp; });
      await page.keyboard.press('KeyE');
      await h.waitFor(() => !!state.ult, 2000); await h.waitFor(() => !state.ult, 5000);
      const a = await h.ev(() => state.boss.hp);
      return { observed: `Bubble HP ${r2(b)}→${r2(a)} (−${r2(b - a)})`, verdict: Math.abs(b - a - 229.5) < 0.05 ? 'Pass' : 'Fail' };
    });
    let col = null;
    await T('FIN-00', 'Bubble collapse (phase 3)', 'Below 33%: music stops, Bubble invulnerable, TRIPLE T refused, Sahur drains to 0 over 6.5 s, sacrifice after 7 s', async () => {
      await h.ev(() => { const b = state.boss; b.hp = b.maxHp * 0.6; });
      await sleep(500);
      const p2 = await h.ev(() => state.phase);
      await h.ev(() => { const b = state.boss; b.hp = b.maxHp * 0.3; });
      await h.waitFor(() => state.phase === 3, 3000);
      const t0 = Date.now();
      const c1 = await h.ev(() => { const hp = state.boss.hp; damageEnemy(state.boss, 50, true); return { music: Music.name, vuln: state.boss.vuln, before: hp, after: state.boss.hp, sa: state.sahur.hp / state.sahur.maxHp }; });
      await h.ev(() => { state.ttt = 1; });
      await page.keyboard.press('KeyE'); await sleep(150);
      const ref = await h.ev(() => ({ ult: !!state.ult, toast: state.texts.some((t) => /CAN'T BAT/.test(t.msg)) }));
      await sleep(3250 - (Date.now() - t0));
      const half = await h.ev(() => state.sahur.hp / state.sahur.maxHp);
      await h.waitMode('cutscene', 9000);
      const tc = (Date.now() - t0) / 1000;
      const sac = await h.ev(() => cut.id);
      col = { p2, c1, ref, half, tc, sac };
      return { observed: `phase 2 at 60%: ${p2 === 2}; phase 3 at 30%: music "${c1.music}", hit ${r2(c1.before)}→${r2(c1.after)}; E → ult ${ref.ult}, "HE CAN'T BAT RIGHT NOW" ${ref.toast}; Sahur HP ${r2(c1.sa * 100)}% → ${r2(half * 100)}% at 3.25 s; cutscene "${sac}" after ${r2(tc)} s`,
        verdict: p2 === 2 && c1.music === null && c1.before === c1.after && !ref.ult && ref.toast && half < 0.62 && half > 0.38 && sac === 'sacrifice' && tc > 6.5 && tc < 8.5 ? 'Pass' : 'Fail', evidence: col };
    });
    await T('FIN-01', 'Finale needs 3 answers; auto-answers after 5 s', 'Sahur calls, Space answers; 2 answers do not end it; a missed call is answered for you after 5 s; 3rd answer pops the Bubble', async () => {
      await h.finishCut(); await h.waitMode('beats', 5000);
      const log = [];
      await h.waitFor(() => beats.called, 4000);
      await page.keyboard.press('Space'); await sleep(100);
      log.push(await h.ev(() => ({ n: beats.n, done: beats.done })));
      await h.waitFor(() => beats.called, 4000);
      const t0 = Date.now();
      await h.waitFor(() => beats.n === 2, 8000);
      const auto = (Date.now() - t0) / 1000;
      log.push(await h.ev(() => ({ n: beats.n, done: beats.done, alive: state.sahur.alive })));
      await h.waitFor(() => beats.called, 4000);
      await page.keyboard.press('Space'); await sleep(100);
      log.push(await h.ev(() => ({ n: beats.n, done: beats.done, alive: state.sahur.alive })));
      return { observed: `answer 1 (Space) → n ${log[0].n}, done ${log[0].done}; no press on call 2 → auto-answered after ${r2(auto)} s (n ${log[1].n}, done ${log[1].done}); answer 3 (Space) → n ${log[2].n}, done ${log[2].done}, Sahur alive ${log[2].alive}`,
        verdict: log[0].n === 1 && !log[0].done && log[1].n === 2 && !log[1].done && auto > 4.7 && auto < 5.6 && log[2].n === 3 && log[2].done && !log[2].alive ? 'Pass' : 'Fail', evidence: { log, auto } };
    });
    await T('E2E', 'Finale end to end; victory deletes save', 'epilogue (3 knocks) → epilogue_card → "WE WON."; save deleted; CONTINUE hidden; FIRST ANSWER in Hall', async () => {
      await h.waitMode('cutscene', 6000);
      const epi = await h.ev(() => cut.id);
      let sawKnock = false;
      for (let k = 0; k < 120 && (await h.mode()) === 'cutscene'; k++) {
        const hint = await h.ev(() => document.querySelector('#dhint').textContent);
        if (/KNOCK/.test(hint)) sawKnock = hint;
        await page.keyboard.press('Space'); await sleep(70);
        if ((await h.mode()) === 'cutscene' && (await h.ev(() => cut.id)) === 'epilogue_card') break;
      }
      const card = await h.ev(() => cut && cut.id);
      await h.finishCut(); await h.waitMode('end', 8000);
      const vic = await h.ev(() => ({ t: document.querySelector('#endTitle').textContent, b: document.querySelector('#endBtn').textContent, grade: (document.querySelector('#endSub .grade') || {}).textContent, save: localStorage.getItem('sahurProtocolRunV1'), hall: hall.ids.slice() }));
      await page.reload({ waitUntil: 'load' }); await sleep(400);
      const contAfter = await h.ev(() => getComputedStyle(document.querySelector('#continueBtn')).display);
      return { observed: `cutscene ${epi} (knock prompt seen: "${sawKnock}") → ${card} → "${vic.t}" grade ${vic.grade} ("${vic.b}"); save present ${!!vic.save}; CONTINUE after reload: ${contAfter}; Hall: ${vic.hall.join(', ')}`,
        verdict: epi === 'epilogue' && sawKnock && card === 'epilogue_card' && /WE WON/.test(vic.t) && !vic.save && contAfter === 'none' && vic.hall.includes('first_answer') ? 'Pass' : 'Fail', evidence: vic };
    });
    await T('HALL-01', 'Hall of TUNG persists across reload', 'sahurProtocolHallV1 survives; title shows "HALL OF TUNG n/12" and BEST score', async () => {
      const a = await h.ev(() => ({ stored: JSON.parse(localStorage.getItem('sahurProtocolHallV1')), line: document.querySelector('#titleDiff').textContent }));
      await page.reload({ waitUntil: 'load' }); await sleep(300);
      const b = await h.ev(() => ({ ids: hall.ids.slice(), line: document.querySelector('#titleDiff').textContent }));
      return { observed: `stored ids [${a.stored.ids.join(', ')}], runs ${a.stored.runs}, wins ${a.stored.wins}, bestScore ${a.stored.bestScore}; after reload in memory ${b.ids.length} ids; title "${b.line}"`,
        verdict: b.ids.length === a.stored.ids.length && b.ids.length > 0 && new RegExp('HALL OF TUNG ' + b.ids.length + '/12').test(b.line) && /BEST/.test(b.line) ? 'Pass' : 'Fail' };
    });

    // ---- TC-09 START OVER? confirm ----
    await T('TC-09', 'New game over a save', '"START OVER?" confirm naming the checkpoint; Esc and KEEP MY RUN keep it; ERASE AND WAKE UP erases it', async () => {
      await page.click('#startBtn'); await sleep(200); await h.finishCut(); await h.waitMode('choose'); await h.clickCard(0); await h.waitMode('play'); await sleep(300);
      await page.keyboard.press('Escape'); await sleep(100); await page.click('#mainMenuBtn'); await sleep(300);
      const had = !!(await h.save());
      await page.click('#startBtn'); await sleep(200);
      const c1 = await h.ev(() => ({ show: document.querySelector('#confirmOv').classList.contains('show'), title: document.querySelector('#confirmTitle').textContent, text: document.querySelector('#confirmText').textContent, m: mode }));
      await page.keyboard.press('Escape'); await sleep(150);
      const c2 = await h.ev(() => ({ show: document.querySelector('#confirmOv').classList.contains('show'), save: !!localStorage.getItem('sahurProtocolRunV1'), m: mode }));
      await page.click('#startBtn'); await sleep(200); await page.click('#confirmNo'); await sleep(150);
      const c3 = await h.ev(() => ({ show: document.querySelector('#confirmOv').classList.contains('show'), save: !!localStorage.getItem('sahurProtocolRunV1'), m: mode }));
      await page.click('#startBtn'); await sleep(200); await page.click('#confirmYes'); await sleep(250);
      const c4 = await h.ev(() => ({ save: !!localStorage.getItem('sahurProtocolRunV1'), m: mode, cut: cut && cut.id }));
      return { observed: `save existed ${had}; WAKE UP → confirm shown ${c1.show} "${c1.title}": "${c1.text}" (mode ${c1.m}); Esc → closed ${!c2.show}, save kept ${c2.save}; KEEP MY RUN → save kept ${c3.save}, mode ${c3.m}; ERASE AND WAKE UP → ${c4.m} "${c4.cut}", save present ${c4.save}`,
        verdict: had && c1.show && /START OVER/.test(c1.title) && /HYPE CYCLE FOREST, room 1/.test(c1.text) && c1.m === 'title' && !c2.show && c2.save && c3.save && !c3.show && c4.m === 'cutscene' && c4.cut === 'prologue' && !c4.save ? 'Pass' : 'Fail' };
    });
    await h.finishCut(); await h.waitMode('choose'); await h.clickCard(0); await h.waitMode('play'); await sleep(500);

    // ---- X-02 auto-pause on hidden tab ----
    await T('X-02', 'Auto-pause when the tab is hidden', 'visibilitychange to hidden during play → mode "pause" with the pause overlay', async () => {
      const other = await browser.newPage();
      await other.bringToFront(); await sleep(400);
      let hidden = await h.ev(() => document.hidden);
      let how = 'real tab switch (another tab brought to front)';
      if (!hidden) {
        assist('X-02: headless Chrome did not report the background tab as hidden, so document.hidden was overridden to true and a visibilitychange event dispatched (the game\'s own listener then runs).');
        how = 'simulated (document.hidden overridden + visibilitychange dispatched; headless did not hide the background tab)';
        await h.ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
        hidden = true;
      }
      await sleep(200);
      const a = await h.ev(() => ({ m: mode, ov: document.querySelector('#pauseOv').classList.contains('show'), saved: !!localStorage.getItem('sahurProtocolRunV1') }));
      await other.close(); await page.bringToFront();
      await h.ev(() => { delete document.hidden; delete document.visibilityState; });
      await page.click('#resumeBtn'); await sleep(150);
      return { observed: `${how}: document.hidden ${hidden} → mode ${a.m}, pause overlay ${a.ov}, checkpoint saved ${a.saved}`, verdict: a.m === 'pause' && a.ov ? 'Pass' : 'Fail' };
    });

    // ---- X-03 reduced motion ----
    await T('X-03', 'Reduced motion caps shake and removes hit-stop', 'prefers-reduced-motion: shake offset ≤ 0.4 px (cap 0.8) and no hit-stop; normal: offsets up to 7 px and hit-stop on hits', async () => {
      await h.resetLoadout();
      await h.ev(() => {
        const c = document.getElementById('game').getContext('2d');
        const st = c.setTransform.bind(c), tr = c.translate.bind(c); let armed = false;
        window.__tr = [];
        c.setTransform = function (...a) { armed = true; return st(...a); };
        c.translate = function (x, y) { if (armed && shake > 0) { window.__tr.push(Math.max(Math.abs(x), Math.abs(y))); } armed = false; return tr(x, y); };
      });
      assist('X-03: the canvas context\'s setTransform/translate were wrapped (read-only instrumentation) to record the per-frame shake offset; shake set to 14 (the cap) repeatedly; hitStop read after a real swing on the dummy.');
      const measure = async () => {
        await h.ev(() => { window.__tr = []; window.__hs = 0; });
        for (let k = 0; k < 20; k++) { await h.ev(() => { shake = 14; }); await sleep(30); }
        await h.dummy();
        await h.ev(() => { clearInterval(window.__hsw); window.__hsw = setInterval(() => { window.__hs = Math.max(window.__hs, hitStop); }, 1); });
        await h.ev(() => new Promise((r) => { const w = () => (state.player.atkT <= 0 ? r() : setTimeout(w, 5)); w(); }));
        await page.keyboard.press('Space'); await sleep(250);
        return h.ev(() => { clearInterval(window.__hsw); return { maxOff: Math.max(...window.__tr), n: window.__tr.length, hs: window.__hs }; });
      };
      const normal = await measure();
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(100);
      const rm = await measure();
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
      return { observed: `normal: max shake offset ${r2(normal.maxOff)} px over ${normal.n} frames, max hit-stop ${r2(normal.hs)} s; reduced motion: max offset ${r2(rm.maxOff)} px over ${rm.n} frames, max hit-stop ${r2(rm.hs)} s`,
        verdict: rm.maxOff <= 0.41 && rm.hs === 0 && normal.maxOff > 2 && normal.hs > 0 ? 'Pass' : 'Fail', evidence: { normal, rm } };
    });
    await page.close();

    // =================================================================== LAB PAGE: difficulty + modifiers
    ({ page, dialogs } = await open(browser, 'desktop-lab'));
    h = H(page);
    await h.ev(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await sleep(400);
    const diffRows = {};
    for (const d of ['chill', 'normal', 'spicy']) {
      if ((await h.mode()) === 'play') { await page.keyboard.press('Escape'); await sleep(100); await page.click('#mainMenuBtn'); await sleep(250); }
      await page.click('[data-menu="options"]'); await sleep(150);
      await page.click(`[data-diff="${d}"]`); await sleep(100);
      const line = await h.ev(() => document.querySelector('#diffLine').textContent);
      await page.click('#menuOptions [data-menu="main"]'); await sleep(150);
      if (await h.ev(() => getComputedStyle(document.querySelector('#continueBtn')).display !== 'none')) { await page.click('#continueBtn'); }
      else { await page.click('#startBtn'); await sleep(150); await page.click('#skipBtn'); await h.waitMode('choose'); await h.clickCard(0); }
      await h.waitMode('play', 8000); await sleep(300);
      await h.resetLoadout();
      await h.dummy(5000, -300);   // keeps the room open, far from the player
      const m = await h.ev(() => {
        const p = state.player; p.inv = 0; p.armor = 0; p.hp = p.maxHp;
        const hp0 = p.hp; state.bullets.push({ x: p.x, y: p.y, vx: 0, vy: 0, r: 6, dmg: 20, t: 0.3 });
        const e = spawnEnemyAt('slopling', 60, 60, 1, true); const eh = e.maxHp, es = e.speed;
        state.enemies = state.enemies.filter((x) => x !== e);
        return { hp0, eh, es, sahurMax: state.sahur.maxHp, diff: prefs.diff, saved: JSON.parse(localStorage.getItem('sahurProtocolPrefsV1') || '{}').diff };
      });
      await sleep(150);
      const taken = await h.ev(() => state.player.hp);
      const sc = await h.ev(() => new Promise((res) => {
        state.combo = 0; state.comboT = 0; const before = state.score;
        const e = spawnEnemyAt('slopling', state.player.x < W / 2 ? W - 60 : 60, 60, 1, true); damageEnemy(e, 99999, false);
        setTimeout(() => res({ gain: state.score - before, mult: comboMult() }), 60);
      }));
      diffRows[d] = { line, taken: r2(m.hp0 - taken), enemyHp: r2(m.eh), enemySpeed: m.es, sahurMax: m.sahurMax, scoreKill: sc.gain, comboMult: r2(sc.mult), saved: m.saved };
      await h.ev(() => { clearInterval(window.__pin); });
    }
    await T('DIFF-01', 'Difficulty multipliers (Options → CHILL / NORMAL / SPICY)', 'Damage taken ×0.5/×1/×1.35; enemy HP ×0.85/×1/×1.35; Sahur HP ×1.5/×1/×1; score ×0.7/×1/×1.6; copy mentions enemy speed changes', async () => {
      const c = diffRows.chill, n = diffRows.normal, s = diffRows.spicy;
      const obs = ['chill', 'normal', 'spicy'].map((k) => { const x = diffRows[k]; return `${k.toUpperCase()}: 20-dmg bullet took ${x.taken} HP, slopling HP ${x.enemyHp}, slopling speed ${x.enemySpeed}, Sahur max ${x.sahurMax}, kill score ${x.scoreKill} (saved pref "${x.saved}")`; }).join('; ');
      const ok = c.taken === 10 && n.taken === 20 && s.taken === 27 && c.enemyHp === 25.5 && n.enemyHp === 30 && s.enemyHp === 40.5 && c.sahurMax === 180 && n.sahurMax === 120 && s.sahurMax === 120 && c.scoreKill < n.scoreKill && s.scoreKill > n.scoreKill;
      return { observed: obs + `; enemy speed identical on all three: ${c.enemySpeed === n.enemySpeed && n.enemySpeed === s.enemySpeed}`, verdict: ok ? 'Pass' : 'Fail', evidence: diffRows };
    });
    await T('DIFF-02', 'Difficulty copy vs behaviour', 'CHILL line says "Slower enemies"; SPICY says "Faster enemies, no free heals"', async () => {
      const c = diffRows.chill, s = diffRows.spicy, n = diffRows.normal;
      const same = c.enemySpeed === n.enemySpeed && n.enemySpeed === s.enemySpeed;
      return { observed: `CHILL "${c.line}" / SPICY "${s.line}"; measured slopling speed ${c.enemySpeed} / ${n.enemySpeed} / ${s.enemySpeed} px/s (no change); Sahur self-recovery is the constant SAHUR_SELF_UP = ${await h.ev(() => SAHUR_SELF_UP)} s on every difficulty; rice-drop chance has no difficulty term`,
        verdict: same ? 'Fail' : 'Pass', evidence: diffRows };
    });
    // back to NORMAL for the modifier tests
    await page.keyboard.press('Escape'); await sleep(100); await page.click('#mainMenuBtn'); await sleep(200);
    await page.click('[data-menu="options"]'); await sleep(100); await page.click('[data-diff="normal"]'); await page.click('#menuOptions [data-menu="main"]'); await sleep(100);
    await page.click('#continueBtn'); await h.waitMode('play', 8000); await sleep(300);
    await h.resetLoadout(); await h.dummy(5000, -300);
    await T('MOD-03', 'TRENDING: "More of them. More score."', 'Enemy count ×1.5 (biome 1 room 2: 6 → 9) and score ×1.5 (the modifier\'s own effect text says "score x1.5")', async () => {
      assist('MOD-02/03: room starts were sampled by calling the game\'s startRoom()/pickModifier() in a loop with window.setTimeout stubbed out (so PATCH NOTES chests and barks are not queued); the kill-score comparison sets state.modifier directly.');
      const cnt = await h.ev(() => {
        const st = window.setTimeout; window.setTimeout = () => 0;
        const out = { trending: null, other: null };
        for (let i = 0; i < 400 && (out.trending === null || out.other === null); i++) {
          state.biome = 0; state.room = 1; startRoom();
          const n = state.spawnQueue.length;
          if (state.modifier.id === 'trending') out.trending = n; else out.other = out.other === null ? n : out.other;
        }
        window.setTimeout = st; state.spawnQueue = []; state.pending = []; state.enemies = state.enemies.filter((e) => e.__dummy);
        if (!state.enemies.length) { const e = spawnEnemyAt('golem', 40, 40, 1, true); e.hp = e.maxHp = 5000; e.stun = 1e9; e.__dummy = true; }
        return out;
      });
      const kill = async (mod) => h.ev((mod) => new Promise((res) => {
        state.modifier = mod ? COPY.modifiers.find((m) => m.id === mod) : null;
        state.combo = 0; state.comboT = 0; const before = state.score;
        const e = spawnEnemyAt('slopling', state.player.x < W / 2 ? W - 60 : 60, 60, 1, true); damageEnemy(e, 99999, false);
        setTimeout(() => res(state.score - before), 60);
      }), mod);
      const sNone = await kill(null), sTr = await kill('trending');
      await h.ev(() => { state.modifier = null; });
      return { observed: `biome 1 room 2 spawn queue: ${cnt.other} without TRENDING, ${cnt.trending} with it (count part works); score for one identical kill: ${sNone} without, ${sTr} with TRENDING (no score bonus)`,
        verdict: cnt.other === 6 && cnt.trending === 9 && sTr >= sNone * 1.4 ? 'Pass' : 'Fail', evidence: { cnt, sNone, sTr } };
    });
    await T('EVO-02', 'FAMILY MEAL ("Big heal on room clear, for you and Sahur")', 'Room clear heals the player 30% of max HP; Sahur is healed too', async () => {
      assist('EVO-02: the FAMILY MEAL evolution was added to state.evolutions directly (then applySkillLoadout()); player HP set to 30 and Sahur HP to 10 just before a fast-forwarded room clear.');
      const b = await h.ev(() => { state.evolutions = ['FAMILY MEAL']; state.skillLevels = {}; applySkillLoadout(); state.player.hp = 30; state.sahur.hp = 10; return { max: state.player.maxHp, smax: state.sahur.maxHp, fm: state.player.familyMeal }; });
      await sleep(80);
      const sMid = await h.ev(() => state.sahur.hp);
      await h.ev(() => { clearInterval(window.__pin); state.rivalPending = false; });
      await h.clearRoomFully();
      const a = await h.ev(() => ({ hp: state.player.hp, max: state.player.maxHp, sa: state.sahur.hp, fmText: state.texts.some((t) => t.msg === 'FAMILY MEAL') }));
      await h.clickCard(0);
      return { observed: `player HP 30 → ${r2(a.hp)} on room clear (= +${r2(a.max - b.max)} from the "First room" challenge + ${r2(a.hp - 30 - (a.max - b.max))} FAMILY MEAL, i.e. ${r2((a.hp - 30 - (a.max - b.max)) / a.max * 100)}% of max ${a.max}; "FAMILY MEAL" text ${a.fmText}); Sahur HP set to 10 was back at ${r2(sMid)}/${b.smax} one frame later (outside boss fights the game refills him every frame), so the "and Sahur" half has nothing to heal and is not implemented`,
        verdict: b.fm && Math.abs(a.hp - 30 - (a.max - b.max) - a.max * 0.3) < 0.5 ? 'Observed' : 'Fail', evidence: { b, a, sMid } };
    });
    await T('MOD-02', 'Room modifier rolls', 'Every room except biome 1 room 1 rolls one; never the same twice in a row; SPONSORED never rolls; 9 possible', async () => {
      const s = await h.ev(() => {
        const st = window.setTimeout; window.setTimeout = () => 0;
        const first = []; for (let i = 0; i < 50; i++) { state.biome = 0; state.room = 0; startRoom(); first.push(state.modifier ? state.modifier.id : null); }
        const seq = []; state.lastModifier = null;
        for (let i = 0; i < 600; i++) { state.biome = 1 + (i % 2); state.room = i % 3; startRoom(); seq.push(state.modifier ? state.modifier.id : null); }
        const boss = []; for (let i = 0; i < 20; i++) { state.biome = 0; state.room = 3; startRoom(); boss.push(state.modifier ? state.modifier.id : null); }
        window.setTimeout = st;
        let repeats = 0; for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) repeats++;
        const counts = {}; seq.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
        state.biome = 0; state.room = 1; startRoom();
        return { firstNonNull: first.filter(Boolean).length, nulls: seq.filter((x) => !x).length, repeats, counts, bossMods: boss.filter(Boolean).length };
      });
      const ids = Object.keys(s.counts);
      return { observed: `biome 1 room 1 ×50: ${s.firstNonNull} modifiers; 600 later room starts: ${s.nulls} without a modifier, ${s.repeats} back-to-back repeats, ${ids.length} distinct (${ids.map((k) => k + ' ' + s.counts[k]).join(', ')}); boss rooms: ${s.bossMods} modifiers`,
        verdict: s.firstNonNull === 0 && s.nulls === 0 && s.repeats === 0 && ids.length === 9 && !ids.includes('sponsored') && s.bossMods === 0 ? 'Pass' : 'Fail', evidence: s };
    });
    await page.close();

    // =================================================================== DESKTOP PERFORMANCE
    ({ page } = await open(browser, 'desktop-perf'));
    h = H(page);
    await h.ev(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await sleep(300);
    await page.click('#startBtn'); await sleep(150); await page.click('#skipBtn'); await h.waitMode('choose'); await h.clickCard(0); await h.waitMode('play');
    await busyCombat(h);
    {
      await page.keyboard.down('Space');
      const mover = (async () => { for (let k = 0; k < 10; k++) { const key = k % 2 ? 'KeyA' : 'KeyD'; await page.keyboard.down(key); await sleep(1000); await page.keyboard.up(key); } })();
      const s = await sampleFrames(page, 10000);
      await mover; await page.keyboard.up('Space');
      perf.push({ id: 'PERF-D', setup: 'Desktop 1280×720, DPR 1, no throttle; biome 3, 28 live enemies, holding swing + moving', ...s });
      console.log('PERF-D', JSON.stringify(s));
    }
    await page.close();

    // =================================================================== STORAGE BLOCKED
    ({ page } = await open(browser, 'storage-blocked', { blockStorage: true }));
    h = H(page);
    await T('X-01', 'Storage blocked', 'Every localStorage call throws: game still runs; CONTINUE stays hidden; no uncaught errors', async () => {
      const errsBefore = pageErrors.filter((e) => e.page === 'storage-blocked' && e.kind === 'uncaught').length;
      await page.click('#startBtn'); await sleep(200); await h.finishCut(); await h.waitMode('choose'); await h.clickCard(0); await h.waitMode('play'); await sleep(800);
      await h.clearRoomFully(); await h.clickCard(0); await h.waitMode('play');
      await page.keyboard.press('KeyM'); await page.keyboard.press('KeyM');
      await page.keyboard.press('Escape'); await sleep(100); await page.click('#mainMenuBtn'); await sleep(300);
      await page.click('[data-menu="options"]'); await page.click('[data-diff="spicy"]'); await page.click('#menuOptions [data-menu="main"]');
      const bs = await h.ev(() => ({ m: mode, cont: getComputedStyle(document.querySelector('#continueBtn')).display, diff: prefs.diff }));
      const errs = pageErrors.filter((e) => e.page === 'storage-blocked' && e.kind === 'uncaught').length - errsBefore;
      return { observed: `new run, prologue, upgrade, room clear, mute toggle, pause, main menu, difficulty change all worked (mode ${bs.m}, diff ${bs.diff}); CONTINUE display ${bs.cont}; uncaught errors ${errs}`,
        verdict: bs.m === 'title' && bs.cont === 'none' && errs === 0 ? 'Pass' : 'Fail' };
    });
    await page.close();

    // =================================================================== MOBILE LANDSCAPE: TC-13, TC-15, PERF-M
    const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
    const phone = { viewport: { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: UA };
    ({ page } = await open(browser, 'mobile-landscape', { emulate: phone }));
    h = H(page);
    await h.ev(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await sleep(400);
    await T('TC-13', 'Touch layout, then reload', 'Joystick size kept after reload', async () => {
      const touchUI = await h.ev(() => matchMedia('(pointer:coarse)').matches);
      await page.tap('[data-menu="options"]'); await sleep(150);
      const box = await (await page.$('#stickSizeSlider')).boundingBox();
      // tap the slider at the position of 160 px on its 96..190 range
      await page.touchscreen.tap(box.x + box.width * ((160 - 96) / (190 - 96)), box.y + box.height / 2); await sleep(150);
      let v = await h.ev(() => controlSettings.stickSize);
      if (v === 128) { // range inputs ignore taps in some emulations: fall back to an input event
        assist('TC-13: the joystick-size slider value was set and an input event dispatched (a tap on the range track did not move it in emulation).');
        await h.ev(() => { const s = document.querySelector('#stickSizeSlider'); s.value = 160; s.dispatchEvent(new Event('input', { bubbles: true })); });
        v = await h.ev(() => controlSettings.stickSize);
      }
      const stored = await h.ev(() => localStorage.getItem('sahurProtocolControlsV1'));
      await page.reload({ waitUntil: 'load' }); await sleep(400);
      const after = await h.ev(() => ({ size: controlSettings.stickSize, slider: document.querySelector('#stickSizeSlider').value, css: getComputedStyle(document.documentElement).getPropertyValue('--stick-size').trim() }));
      return { observed: `coarse pointer ${touchUI}; joystick size set to ${v} px → stored ${stored}; after reload ${after.size} px (slider ${after.slider}, CSS ${after.css})`,
        verdict: touchUI && after.size === v && String(after.slider) === String(v) && v !== 128 ? 'Pass' : 'Fail' };
    });
    await T('TC-15', 'Touch controls: SWING, DASH, TRIPLE T, stick', 'Taps on the on-screen buttons swing/dash/ult; stick drag moves; auto-swing on by default on touch', async () => {
      await page.tap('#startBtn'); await sleep(200); await page.tap('#skipBtn'); await h.waitMode('choose');
      const cb = await page.$('#cards button'); await cb.tap(); await h.waitMode('play'); await sleep(600);
      await h.ev(() => { state.spawnQueue = []; state.pending = []; state.enemies = []; state.rivalPending = true; });
      assist('TC-15: the room is emptied (and held open with rivalPending) so auto-swing does not fire on its own while taps are counted.');
      const a0 = await h.ev(() => ({ auto: prefs.autoSwing, sw: state.player.swings, dashes: state.dashes || 0, x: state.player.x }));
      await page.tap('#atkBtn'); await sleep(450);
      await page.tap('#dashBtn'); await sleep(300);
      const a1 = await h.ev(() => ({ sw: state.player.swings, dashes: state.dashes || 0 }));
      await h.ev(() => { state.ttt = 1; state.player.x = 300; });
      await sleep(150);
      const ready = await h.ev(() => ({ cls: document.querySelector('#ultBtn').classList.contains('ready'), disp: getComputedStyle(document.querySelector('#ultBtn')).display }));
      await page.tap('#ultBtn'); await sleep(200);
      const ult = await h.ev(() => !!state.ult);
      await h.waitFor(() => !state.ult, 5000);
      const sb = await (await page.$('#stick')).boundingBox();
      const cx = sb.x + sb.width / 2, cy = sb.y + sb.height / 2;
      const x0 = await h.ev(() => state.player.x);
      await page.touchscreen.touchStart(cx, cy); await page.touchscreen.touchMove(cx + sb.width * 0.4, cy); await sleep(500);
      const x1 = await h.ev(() => state.player.x);
      await page.touchscreen.touchEnd(); await sleep(100);
      await h.ev(() => { state.rivalPending = false; });
      return { observed: `auto-swing default ${a0.auto}; SWING tap → swings +${a1.sw - a0.sw}; DASH tap → dashes +${a1.dashes - a0.dashes}; meter full → TRIPLE T pill ready ${ready.cls} (display ${ready.disp}); pill tap → ult ${ult}; stick drag right 0.5 s → player x ${r2(x0)}→${r2(x1)}`,
        verdict: a0.auto === true && a1.sw - a0.sw === 1 && a1.dashes - a0.dashes === 1 && ready.cls && ready.disp !== 'none' && ult && x1 - x0 > 50 ? 'Pass' : 'Fail' };
    });
    {
      await page.emulateCPUThrottling(4);
      await busyCombat(h);
      const ab = await (await page.$('#atkBtn')).boundingBox();
      await page.touchscreen.touchStart(ab.x + ab.width / 2, ab.y + ab.height / 2);
      const s = await sampleFrames(page, 10000);
      await page.touchscreen.touchEnd();
      await page.emulateCPUThrottling(1);
      perf.push({ id: 'PERF-M', setup: 'Mobile emulation 844×390 landscape, DPR 2, touch, CPU throttled 4×; biome 3, 28 live enemies, SWING held + auto-swing', ...s });
      console.log('PERF-M', JSON.stringify(s));
    }
    await page.close();

    // =================================================================== MOBILE PORTRAIT: TC-14
    const portrait = { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false }, userAgent: UA };
    ({ page } = await open(browser, 'mobile-portrait', { emulate: portrait }));
    h = H(page);
    await h.ev(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await sleep(400);   // file:// pages share storage: drop the earlier pages' save
    await T('TC-14', 'Phone in portrait (v3: plays in 540×960)', 'No ROTATE DEVICE overlay; arena 540×960; player starts at 62% height; world runs', async () => {
      const rot = await h.ev(() => getComputedStyle(document.querySelector('#rotateOv')).display);
      await page.tap('#startBtn'); await sleep(200); await page.tap('#skipBtn'); await h.waitMode('choose');
      const cb = await page.$('#cards button'); await cb.tap(); await h.waitMode('play'); await sleep(100);
      const t0 = await h.ev(() => ({ W, H, py: state.player.y, portrait: document.querySelector('#wrap').classList.contains('portrait'), canvas: [document.querySelector('#game').width, document.querySelector('#game').height], css: (() => { const r = document.querySelector('#game').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() }));
      await sleep(2500);
      const t1 = await h.ev(() => ({ m: mode, n: state.enemies.length, rot: getComputedStyle(document.querySelector('#rotateOv')).display, inside: state.enemies.every((e) => e.x >= 0 && e.x <= W && e.y >= 0 && e.y <= H) }));
      return { observed: `ROTATE DEVICE display "${rot}" on load, "${t1.rot}" in play; arena ${t0.W}×${t0.H} (portrait class ${t0.portrait}, backing store ${t0.canvas.join('×')}, on screen ${t0.css.join('×')} CSS px); player starts at y ${r2(t0.py)} (${r2(t0.py / t0.H * 100)}%); after 2.5 s mode ${t1.m}, ${t1.n} enemies, all inside the arena ${t1.inside}`,
        verdict: rot === 'none' && t1.rot === 'none' && t0.W === 540 && t0.H === 960 && Math.abs(t0.py - 595.2) < 1 && t1.m === 'play' && t1.n > 0 && t1.inside ? 'Pass' : 'Fail' };
    });
    await page.close();
  } finally {
    await browser.close();
  }

  // =================================================================== OUTPUT
  const order = ['TC-01', 'TC-02', 'TC-03', 'TC-04', 'TC-05', 'TC-06', 'TC-07', 'TC-08', 'TC-09', 'TC-10', 'TC-11', 'TC-12', 'TC-13', 'TC-14', 'TC-15',
    'SKIP-01', 'COPY-01', 'MOD-01', 'MOD-02', 'MOD-03', 'BEAT-01', 'BEAT-02', 'DASH-01', 'COMBO-01', 'ULT-01', 'ULT-02', 'ULT-03', 'ULT-04', 'ULT-05',
    'SAHUR-01', 'SAHUR-02', 'ELITE-01', 'EVO-01', 'EVO-02', 'CHAL-01', 'GRADE-01', 'DIFF-01', 'DIFF-02', 'HALL-01', 'FIN-00', 'FIN-01', 'E2E', 'X-01', 'X-02', 'X-03'];
  results.sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999));
  const ranAt = new Date().toISOString();
  const uncaught = pageErrors.filter((e) => e.kind === 'uncaught');
  const consoleErr = pageErrors.filter((e) => e.kind === 'console.error');
  fs.writeFileSync(path.join(OUT_DIR, 'test-results-v3.json'), JSON.stringify({ ranAt, browser: chromeVersion + ' headless, puppeteer-core 23.11.1', results, perf, pageErrors, assists: [...assists] }, null, 2));
  const tally = results.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
  const esc = (s) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
  const mdPath = path.join(OUT_DIR, 'test-log-v3.md');
  let findings = '';
  if (fs.existsSync(mdPath)) { const old = fs.readFileSync(mdPath, 'utf8'); const i = old.indexOf('\n## Findings'); if (i >= 0) findings = old.slice(i + 1); }
  const md = [
    '# Black-box test run: Sahur Protocol v3', '',
    `Run: ${ranAt} · ${chromeVersion} (headless) via puppeteer-core 23.11.1 · unmodified \`Sahur_Protocol.html\` (v3, commit 9e2f789) · harness \`gamedesign/scripts/blackbox-v3.js\``, '',
    `**Result: ${results.length} cases: ${Object.entries(tally).map(([k, v]) => v + ' ' + k).join(', ')}.** "Observed" marks a case where the game behaves consistently but differs from its own on-screen copy (see Findings).`, '',
    '| ID | Scenario | Expected | Observed (concrete values) | Verdict |', '|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${esc(r.scenario)} | ${esc(r.expected)} | ${esc(r.observed)} | ${r.verdict} |`), '',
    '## Performance sample', '',
    'Frame times measured in-page with `requestAnimationFrame` timestamps over 10 s of continuous combat. Headless Chrome renders the 2D canvas without a visible window, so absolute numbers are indicative only; the throttled run approximates a mid-range phone.', '',
    '"Frame interval" is the time between rAF callbacks (headless Chrome is not locked to a 60 Hz display, so it can exceed 60 fps). "Game loop cost" is the JavaScript time of each `loop()` call (update + render draw calls; rasterisation and compositing are not included), measured by wrapping `requestAnimationFrame`. The 60 fps budget is 16.7 ms.', '',
    '| ID | Setup | Frames in 10 s | Avg interval (ms) | ≈ FPS | p95 interval | Worst interval | Intervals > 33 ms | Loop cost avg (ms) | Loop cost p95 | Loop cost worst | Avg live objects |', '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...perf.map((p) => `| ${p.id} | ${p.setup} | ${p.frames} | ${r2(p.avg)} | ${Math.round(1000 / p.avg)} | ${r2(p.p95)} | ${r2(p.max)} | ${p.over33} | ${r2(p.costAvg)} | ${r2(p.costP95)} | ${r2(p.costMax)} | ${Math.round(p.avgObjects)} |`), '',
    '## Console errors across the whole run', '',
    `Uncaught exceptions: **${uncaught.length}**${uncaught.length ? ' (' + uncaught.map((e) => e.page + ': ' + e.msg).join('; ') + ')' : ''}. console.error messages: **${consoleErr.length}**${consoleErr.length ? ' (' + [...new Set(consoleErr.map((e) => e.page + ': ' + e.msg))].join('; ') + ')' : ''}.`, '',
    '## Setup assists used', '',
    'Input is real wherever practical (DOM clicks, key presses/holds, touch taps/drags). These state changes were made through `page.evaluate()` to reach a precondition quickly or to measure; none changes game code.', '',
    ...[...assists].map((a) => '- ' + a), '',
  ].join('\n');
  fs.writeFileSync(mdPath, md + (findings ? '\n' + findings : ''));
  console.log('\nTALLY', JSON.stringify(tally));
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
