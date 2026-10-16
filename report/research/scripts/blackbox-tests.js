// Black-box test harness for Sahur Protocol (Chapter 9 test cases).
// Run from report/:  node research/scripts/blackbox-tests.js
// Drives the UNMODIFIED Sahur_Protocol.html in headless Chrome through its own UI
// (clicks, key presses, touch emulation). page.evaluate() is used to read state for the
// verdicts and, where a test needs to reach a late point of the run quickly, to fast-forward
// (e.g. emptying a room through the game's own damageEnemy()/checkClear() flow).
// Writes research/test-results.json and research/test-log.md.
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const GAME = path.resolve(__dirname, '../../../Sahur_Protocol.html');
const URL = 'file:///' + GAME.split(path.sep).join('/');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT_DIR = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const logLines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); logLines.push(s); };
function record(id, scenario, expected, observed, verdict, evidence) {
  results.push({ id, scenario, expected, observed, verdict, evidence });
  log(`${id} [${verdict}] ${scenario} :: ${observed}`);
}

async function open(browser, opts = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', async (d) => { errors.push('DIALOG:' + d.message()); await d.dismiss(); });
  if (opts.emulate) await page.emulate(opts.emulate); else await page.setViewport({ width: 1280, height: 720 });
  if (opts.blockStorage) {
    await page.evaluateOnNewDocument(() => {
      const thrower = () => { throw new DOMException('blocked', 'SecurityError'); };
      Storage.prototype.getItem = thrower; Storage.prototype.setItem = thrower; Storage.prototype.removeItem = thrower;
    });
  }
  await page.goto(URL, { waitUntil: 'load' });
  await sleep(400);
  return { page, errors };
}

function H(page) {
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const mode = () => ev(() => mode);
  const waitMode = async (m, timeout = 15000) => { await page.waitForFunction((m) => mode === m, { timeout, polling: 30 }, m); };
  const finishCut = async () => { for (let k = 0; k < 80; k++) { if ((await mode()) !== 'cutscene') return; await page.keyboard.press('Space'); await sleep(60); } };
  const visible = (sel) => ev((sel) => { const el = document.querySelector(sel); if (!el) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null || (cs.position === 'fixed' && cs.display !== 'none'); }, sel);
  const text = (sel) => ev((sel) => (document.querySelector(sel) || {}).textContent || '', sel);
  const clickCard = async (i = 0) => { await page.waitForSelector('#cards button', { timeout: 10000 }); const b = await page.$$('#cards button'); await b[Math.min(i, b.length - 1)].click(); await sleep(120); };
  const clearRoom = () => ev(() => { state.spawnQueue = []; state.pending = []; for (const e of state.enemies) damageEnemy(e, 99999, true); });
  const save = () => ev(() => localStorage.getItem('sahurProtocolRunV1'));
  return { ev, mode, waitMode, finishCut, visible, text, clickCard, clearRoom, save };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  try {
    // ------------------------------------------------------------ desktop run
    let { page, errors } = await open(browser);
    let h = H(page);
    await h.ev(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await sleep(400);

    // TC-01 / TC-02: Start New Game and advance the prologue
    await page.click('#startBtn'); await sleep(150);
    const c0 = await h.ev(() => ({ m: mode, id: cut && cut.id, i: cut && cut.i, typing }));
    await sleep(300);
    await page.keyboard.press('Space'); await sleep(80);
    const c1 = await h.ev(() => ({ i: cut.i, typing }));
    await page.keyboard.press('Space'); await sleep(80);
    const c2 = await h.ev(() => ({ i: cut.i }));
    record('TC-02', 'Advance the prologue', '1st press completes line, 2nd advances',
      `typing ${c0.typing}→${c1.typing} on line ${c1.i}; next press moved to line ${c2.i}`,
      c0.typing && !c1.typing && c1.i === c0.i && c2.i === c0.i + 1 ? 'Pass' : 'Fail', { c0, c1, c2 });
    await h.finishCut();
    await h.waitMode('choose');
    const fu = await h.ev(() => ({ title: document.querySelector('#chooseTitle').textContent, n: document.querySelectorAll('#cards button').length }));
    await h.clickCard(0); await h.waitMode('play');
    await sleep(1500);
    const r1 = await h.ev(() => ({ biome: state.biome, room: state.room, boss: !!state.boss, queued: state.spawnQueue.length + state.pending.length + state.enemies.length }));
    record('TC-01', 'Start New Game', 'Prologue, FIRST UPGRADE, room 1/3',
      `prologue cutscene (${c0.id}); "${fu.title}" with ${fu.n} cards; play in biome ${r1.biome + 1}, room ${r1.room + 1}/3, ${r1.queued} enemies queued/alive`,
      c0.id === 'prologue' && /FIRST UPGRADE/i.test(fu.title) && fu.n === 3 && r1.biome === 0 && r1.room === 0 && !r1.boss ? 'Pass' : 'Fail', { fu, r1 });

    // TC-03: move and attack
    await h.ev(() => { state.player.x = 480; state.player.y = 300; state.player.hp = state.player.maxHp; });
    let p0 = await h.ev(() => ({ x: state.player.x, y: state.player.y }));
    await page.keyboard.down('KeyD'); await sleep(400); await page.keyboard.up('KeyD');
    let p1 = await h.ev(() => ({ x: state.player.x, y: state.player.y }));
    const straight = p1.x - p0.x;
    await h.ev(() => { state.player.x = 480; state.player.y = 300; });
    await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await sleep(400); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
    let p2 = await h.ev(() => ({ x: state.player.x, y: state.player.y }));
    const dx = p2.x - 480, dy = 300 - p2.y, diag = Math.hypot(dx, dy);
    await h.ev(() => { window.__sw = 0; window.__swPrev = 0; window.__swT = setInterval(() => { const s = state.player.swing; if (s > window.__swPrev + 1e-6 && s > 0.05) window.__sw++; window.__swPrev = s; }, 5); });
    await page.keyboard.down('Space'); for (let k = 0; k < 10; k++) { await sleep(100); await page.keyboard.down('Space'); } await page.keyboard.up('Space');
    const held = await h.ev(() => window.__sw);
    await h.ev(() => { window.__sw = 0; });
    for (let k = 0; k < 3; k++) { await page.keyboard.press('Space'); await sleep(450); }
    const taps = await h.ev(() => { clearInterval(window.__swT); return window.__sw; });
    record('TC-03', 'Move and attack', '8-way move; one swing per tap',
      `D for 0.4 s moved ${straight.toFixed(0)} px; W+D moved ${dx.toFixed(0)}/${dy.toFixed(0)} px (diagonal ${diag.toFixed(0)} px, normalised); holding Space 1 s gave ${held} swing, 3 taps gave ${taps}`,
      straight > 60 && Math.abs(dx - dy) < 12 && Math.abs(diag - straight) < straight * 0.2 && held === 1 && taps === 3 ? 'Pass' : 'Fail', { straight, dx, dy, held, taps });

    // TC-04: clear room
    await h.clearRoom(); await h.waitMode('choose', 8000);
    const ch = await h.ev(() => ({ title: document.querySelector('#chooseTitle').textContent, names: [...document.querySelectorAll('#cards button')].map((b) => b.innerText.split('\n').find((l) => /[a-z]/.test(l) && !/^(common|uncommon|rare|epic|legendary)$/i.test(l.trim())) || b.innerText) }));
    const distinct = new Set(ch.names).size === ch.names.length;
    record('TC-04', 'Clear Room', 'Up to 3 distinct upgrade cards', `"${ch.title}" with ${ch.names.length} cards, all distinct: ${distinct}`,
      /CHOOSE AN UPGRADE/i.test(ch.title) && ch.names.length <= 3 && ch.names.length >= 1 && distinct ? 'Pass' : 'Fail', ch);
    await h.clickCard(0); await h.waitMode('play');

    // rooms 2 and 3, then Echo
    for (let r = 0; r < 2; r++) { await sleep(300); await h.clearRoom(); await h.waitMode('choose', 8000); await h.clickCard(0); await h.waitMode('play'); }
    await sleep(500);
    const bossIn = await h.ev(() => ({ room: state.room, boss: state.boss && state.boss.id }));
    // TC-05: fight boss Echo (fast-forward its HP, then a real hit through damageEnemy)
    await h.ev(() => { state.boss.hp = 5; damageEnemy(state.boss, 20, true); });
    await h.waitMode('cutscene', 8000);
    const bc = await h.ev(() => cut.id);
    await h.finishCut(); await h.waitMode('choose');
    const sr = await h.text('#chooseTitle');
    await sleep(1800); await h.clickCard(0); await h.waitMode('play', 8000); await sleep(400);
    const b2 = await h.ev(() => ({ biome: state.biome, room: state.room }));
    const hudRoom = await h.ev(() => state.room);
    record('TC-05', 'Fight Boss: Echo', 'Cutscene, Signal Roll, biome 2',
      `boss ${bossIn.boss} in room ${bossIn.room + 1}; defeat → cutscene ${bc} → "${sr}" → biome ${b2.biome + 1}, room ${b2.room + 1}`,
      bossIn.boss === 'echo' && bc === 'biome1_end' && /SIGNAL ROLL/i.test(sr) && b2.biome === 1 ? 'Pass' : 'Fail', { bossIn, bc, sr, b2, hudRoom });

    // TC-07: pause, resume, main menu
    await sleep(800);
    await page.keyboard.press('Escape'); await sleep(150);
    const pz = await h.ev(() => ({ m: mode, ov: getComputedStyle(document.querySelector('#pauseOv')).display, pos: state.enemies.map((e) => [e.x, e.y]).concat([[state.player.x, state.player.y]]) }));
    await sleep(600);
    const pz2 = await h.ev(() => state.enemies.map((e) => [e.x, e.y]).concat([[state.player.x, state.player.y]]));
    const frozen = JSON.stringify(pz.pos) === JSON.stringify(pz2);
    await page.click('#resumeBtn'); await sleep(150);
    const resumed = await h.mode();
    await page.keyboard.press('Escape'); await sleep(150);
    await page.click('#mainMenuBtn'); await sleep(300);
    const mm = await h.ev(() => ({ m: mode, cont: getComputedStyle(document.querySelector('#continueBtn')).display }));
    record('TC-07', 'Pause, resume, main menu', 'World freezes; CONTINUE shown',
      `Esc → ${pz.m} (overlay ${pz.ov}); world frozen for 0.6 s: ${frozen}; RESUME → ${resumed}; MAIN MENU → ${mm.m}, CONTINUE display ${mm.cont}`,
      pz.m === 'pause' && frozen && resumed === 'play' && mm.m === 'title' && mm.cont !== 'none' ? 'Pass' : 'Fail', { pz: pz.m, frozen, resumed, mm });

    // TC-08: continue game
    const saved = JSON.parse(await h.save());
    await page.click('#continueBtn'); await h.waitMode('play', 8000); await sleep(200);
    const ct = await h.ev(() => ({ biome: state.biome, room: state.room, hp: Math.round(state.player.hp), skills: state.skillLevels }));
    const sameSkills = JSON.stringify(ct.skills) === JSON.stringify(saved.skillLevels);
    record('TC-08', 'Continue Game', 'Saved room, skills and HP',
      `save: biome ${saved.biome + 1} room ${saved.room + 1}, HP ${Math.round(saved.playerHp)}; restored: biome ${ct.biome + 1} room ${ct.room + 1}, HP ${ct.hp}; skill levels identical: ${sameSkills}`,
      ct.biome === saved.biome && ct.room === saved.room && Math.abs(ct.hp - saved.playerHp) <= 1 && sameSkills ? 'Pass' : 'Fail', { saved, ct });

    // TC-10: HP reaches 0
    const before = await h.save();
    await h.ev(() => { state.player.revives = 0; state.player.inv = 0; state.player.armor = 0; state.player.hp = 3; damagePlayer(10); });
    await sleep(500);
    const go = await h.ev(() => ({ m: mode, t: document.querySelector('#endTitle').textContent, b: document.querySelector('#endBtn').textContent, kept: !!localStorage.getItem('sahurProtocolRunV1') }));
    await page.click('#endBtn'); await sleep(600);
    const retry = await h.mode();
    record('TC-10', 'HP reaches 0', 'ABSORBED; RETRY CHECKPOINT',
      `mode ${go.m}, title "${go.t}", button "${go.b}", save kept: ${go.kept}; button → ${retry}`,
      go.m === 'end' && /ABSORBED/.test(go.t) && /RETRY CHECKPOINT/i.test(go.b) && go.kept && retry === 'play' ? 'Pass' : 'Fail', go);

    // TC-11: HP 0 with Second Wind
    await h.waitMode('play', 8000);
    const sw = await h.ev(() => { state.skillLevels['Second Wind'] = 1; applySkillLoadout(); const r0 = state.player.revives; state.player.inv = 0; state.player.armor = 0; state.player.hp = 3; damagePlayer(10); return { r0, m: mode, hp: state.player.hp, max: state.player.maxHp, r1: state.player.revives }; });
    record('TC-11', 'HP 0 with Second Wind', 'Revive at 50% HP',
      `revives ${sw.r0}→${sw.r1}; HP ${sw.hp}/${sw.max}; mode stays ${sw.m}`,
      sw.r0 === 1 && sw.r1 === 0 && Math.abs(sw.hp - sw.max / 2) < 0.01 && sw.m === 'play' ? 'Pass' : 'Fail', sw);

    // TC-06: The Valuation's overextend window
    await h.ev(() => { state.biome = 2; state.room = 3; state.player.armor = 0.9; startRoom(); });
    await sleep(300);
    const v0 = await h.ev(() => { const b = state.boss; const hp = b.hp; damageEnemy(b, 10, true); return { id: b.id, vuln: b.vuln, before: hp, after: b.hp }; });
    let opened = false;
    for (let k = 0; k < 120 && !opened; k++) { await sleep(100); opened = await h.ev(() => state.boss && state.boss.vuln); }
    const v1 = await h.ev(() => { const b = state.boss; const hp = b.hp; damageEnemy(b, 10, true); return { vuln: b.vuln, before: hp, after: b.hp, vulnT: b.vulnT }; });
    await sleep(4300);
    const v2 = await h.ev(() => state.boss.vuln);
    record('TC-06', 'Fight Boss: Valuation', '"NOT YET" until its big burst',
      `${v0.id}: hit before burst ${v0.before}→${v0.after} HP; window opened after its burst: ${opened}; hit in window ${v1.before}→${v1.after} HP; window closed after 4 s: ${!v2}`,
      v0.id === 'valuation' && v0.after === v0.before && opened && v1.after < v1.before && !v2 ? 'Pass' : 'Fail', { v0, v1, v2 });

    // TC-12: mute and volume (then reload)
    await page.keyboard.press('KeyM'); await sleep(100);
    const mu = await h.ev(() => ({ muted: Music.muted, gain: Music.gain ? Music.gain.gain.value : null, choir: ChoirMusic.el ? ChoirMusic.el.volume : null }));
    await page.keyboard.press('KeyM'); await sleep(100);
    await h.ev(() => updateVolume(0.3));
    const vol = await h.ev(() => ({ mv: masterVolume, gain: Music.gain ? Music.gain.gain.value : null }));
    await h.ev(() => { if (!Music.muted) Music.toggle ? null : null; });
    await page.keyboard.press('KeyM'); await sleep(50);
    await page.reload({ waitUntil: 'load' }); await sleep(400);
    const rl = await h.ev(() => ({ muted: Music.muted, mv: masterVolume, slider: document.querySelector('#volumeSlider') && document.querySelector('#volumeSlider').value }));
    record('TC-12', 'Mute and volume', 'All audio silenced or scaled',
      `M: muted ${mu.muted}, music gain ${mu.gain}, choir volume ${mu.choir}; volume 30% → master ${vol.mv}, music gain ${vol.gain}; after reload: muted ${rl.muted}, master ${rl.mv} (slider ${rl.slider})`,
      mu.muted && (mu.gain === null || mu.gain === 0) && Math.abs(vol.mv - 0.3) < 1e-6 ? (rl.muted === false && Math.abs(rl.mv - 0.7) < 1e-6 ? 'Observed' : 'Pass') : 'Fail', { mu, vol, rl });

    // End-to-end finale: Bubble collapse, sacrifice, beats, epilogue, victory; save deleted
    h = H(page);
    await page.click('#continueBtn'); await h.waitMode('play', 8000);
    await h.ev(() => { state.biome = 3; state.player.armor = 0.95; startFinalBoss(); });
    await sleep(500);
    await h.ev(() => { const b = state.boss; b.hp = b.maxHp * 0.6; });
    await sleep(600);
    await h.ev(() => { const b = state.boss; b.hp = b.maxHp * 0.3; });
    await h.waitMode('cutscene', 15000);
    const sac = await h.ev(() => cut.id);
    await h.finishCut(); await h.waitMode('beats', 5000);
    await h.waitMode('cutscene', 12000);
    const epi = await h.ev(() => cut.id);
    await h.finishCut(); await h.waitMode('end', 8000);
    const vic = await h.ev(() => ({ t: document.querySelector('#endTitle').textContent, b: document.querySelector('#endBtn').textContent, save: localStorage.getItem('sahurProtocolRunV1') }));
    await page.reload({ waitUntil: 'load' }); await sleep(400);
    const contAfter = await h.ev(() => getComputedStyle(document.querySelector('#continueBtn')).display);
    record('E2E', 'Finale end to end', 'Victory; save deleted; CONTINUE hidden',
      `cutscene ${sac} → beats → ${epi} → "${vic.t}" ("${vic.b}"); save present: ${!!vic.save}; CONTINUE display after reload: ${contAfter}`,
      sac === 'sacrifice' && epi === 'epilogue' && /WE WON/.test(vic.t) && !vic.save && contAfter === 'none' ? 'Pass' : 'Fail', { sac, epi, vic, contAfter });

    // TC-09: new game over an existing save
    await page.click('#startBtn'); await sleep(200); await h.finishCut(); await h.waitMode('choose'); await h.clickCard(0); await h.waitMode('play'); await sleep(300);
    await page.keyboard.press('Escape'); await sleep(100); await page.click('#mainMenuBtn'); await sleep(300);
    const had = !!(await h.save());
    const dlgBefore = errors.filter((e) => e.startsWith('DIALOG')).length;
    await page.click('#startBtn'); await sleep(300);
    const nw = await h.ev(() => ({ m: mode, save: localStorage.getItem('sahurProtocolRunV1') }));
    const dialogs = errors.filter((e) => e.startsWith('DIALOG')).length - dlgBefore;
    record('TC-09', 'New game over a save', 'Warning before overwriting',
      `save existed: ${had}; WAKE UP → ${nw.m} immediately, ${dialogs} confirmation dialogs, save afterwards: ${nw.save ? 'present' : 'deleted'}`,
      had && dialogs === 0 && nw.m === 'cutscene' && !nw.save ? 'Fail' : 'Pass', { had, dialogs, nw });
    const desktopErrors = errors.filter((e) => !e.startsWith('DIALOG'));
    log(`desktop page errors: ${desktopErrors.length ? desktopErrors.join(' | ') : 'none'}`);
    await page.close();

    // ------------------------------------------------------------ storage blocked
    ({ page, errors } = await open(browser, { blockStorage: true }));
    h = H(page);
    await page.click('#startBtn'); await sleep(200); await h.finishCut(); await h.waitMode('choose'); await h.clickCard(0); await h.waitMode('play'); await sleep(800);
    await h.clearRoom(); await h.waitMode('choose', 8000); await h.clickCard(0); await h.waitMode('play');
    await page.keyboard.press('Escape'); await sleep(100); await page.click('#mainMenuBtn'); await sleep(300);
    const bs = await h.ev(() => ({ m: mode, cont: getComputedStyle(document.querySelector('#continueBtn')).display }));
    record('X-01', 'Storage blocked', 'Game stays playable; nothing saved',
      `with every localStorage call throwing: new run, room clear, upgrade, pause and main menu all worked (mode ${bs.m}); CONTINUE display ${bs.cont}; uncaught errors: ${errors.length}`,
      bs.m === 'title' && bs.cont === 'none' && errors.length === 0 ? 'Pass' : 'Fail', { bs, errors });
    await page.close();

    // ------------------------------------------------------------ mobile landscape: TC-13
    const phone = { viewport: { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36' };
    ({ page, errors } = await open(browser, { emulate: phone }));
    h = H(page);
    await h.ev(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await sleep(400);
    const touchUI = await h.ev(() => matchMedia('(pointer:coarse)').matches);
    await h.ev(() => { const s = document.querySelector('#stickSizeSlider'); s.value = 160; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
    const stored = await h.ev(() => localStorage.getItem('sahurProtocolControlsV1'));
    await page.reload({ waitUntil: 'load' }); await sleep(400);
    const after = await h.ev(() => ({ size: controlSettings.stickSize, slider: document.querySelector('#stickSizeSlider').value }));
    record('TC-13', 'Touch layout, then reload', 'Layout kept',
      `coarse pointer: ${touchUI}; joystick size set to 160 px → stored ${stored}; after reload size ${after.size} px (slider ${after.slider})`,
      touchUI && after.size === 160 && String(after.slider) === '160' ? 'Pass' : 'Fail', { stored, after });
    await page.close();

    // ------------------------------------------------------------ mobile portrait: TC-14
    const portrait = { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false }, userAgent: phone.userAgent };
    ({ page, errors } = await open(browser, { emulate: portrait }));
    h = H(page);
    const rot = await h.ev(() => getComputedStyle(document.querySelector('#rotateOv')).display);
    await h.ev(() => startGame()); await sleep(200); await h.finishCut(); await h.waitMode('choose');
    await h.ev(() => document.querySelector('#cards button').click()); await h.waitMode('play'); await sleep(1500);
    const t0 = await h.ev(() => ({ m: mode, e: state.enemies.map((e) => [e.x, e.y]), q: state.spawnQueue.length }));
    await sleep(1200);
    const t1 = await h.ev(() => ({ m: mode, e: state.enemies.map((e) => [e.x, e.y]), q: state.spawnQueue.length, rot: getComputedStyle(document.querySelector('#rotateOv')).display }));
    const moving = JSON.stringify(t0) !== JSON.stringify(t1);
    record('TC-14', 'Phone in portrait', 'ROTATE DEVICE overlay',
      `overlay display "${rot}" on load and "${t1.rot}" during play; mode ${t1.m}; world kept updating under the overlay: ${moving}`,
      rot !== 'none' && t1.rot !== 'none' ? (t1.m === 'play' && moving ? 'Observed' : 'Pass') : 'Fail', { rot, t0, t1 });
    await page.close();
  } finally {
    await browser.close();
  }
  const order = ['TC-01', 'TC-02', 'TC-03', 'TC-04', 'TC-05', 'TC-06', 'TC-07', 'TC-08', 'TC-09', 'TC-10', 'TC-11', 'TC-12', 'TC-13', 'TC-14', 'E2E', 'X-01'];
  results.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  fs.writeFileSync(path.join(OUT_DIR, 'test-results.json'), JSON.stringify({ ranAt: new Date().toISOString(), browser: 'Chrome (headless, puppeteer-core 23.11.1)', results }, null, 2));
  const md = ['# Black-box test run', '', `Run: ${new Date().toISOString()} · Chrome headless via puppeteer-core · unmodified Sahur_Protocol.html`, '',
    '| ID | Scenario | Expected | Observed | Verdict |', '|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${r.scenario} | ${r.expected} | ${r.observed.replace(/\|/g, '/')} | ${r.verdict} |`)];
  fs.writeFileSync(path.join(OUT_DIR, 'test-log.md'), md.join('\n') + '\n');
  const tally = results.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
  console.log('\nTALLY', JSON.stringify(tally));
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
