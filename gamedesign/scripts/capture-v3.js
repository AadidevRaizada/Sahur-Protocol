// Screenshot driver for Sahur Protocol v3 (pitch deck + report figures).
//   node gamedesign/scripts/capture-v3.js [desktop|mobile|3d|all] [only-file.png ...]
// Drives the REAL, unmodified game (Sahur_Protocol.html) and the unmodified 3D prototype
// (game3d/Sahur_Protocol.3d-prototype.html). Real input (clicks, keys, taps, the touch stick) where
// possible, plus page.evaluate() calls into the game's own globals (mode, state, cut, beats, ...).
// Screenshot-only assists (documented in SHOTS.md): hidden armor + slow HP top-up so the run survives,
// fast-forwarding rooms/bosses by setting enemy/boss HP to 0 (the game's own checkClear/onBossDown run),
// and freeze-frames (mode='pause' without the pause overlay: update() stops, render() keeps drawing).
const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '../../report/node_modules/puppeteer-core'));

const ROOT = path.resolve(__dirname, '../..');
const toUrl = f => 'file:///' + f.split(path.sep).join('/');
const GAME = toUrl(path.join(ROOT, 'Sahur_Protocol.html'));
const GAME3D = toUrl(path.join(ROOT, 'game3d/Sahur_Protocol.3d-prototype.html'));
const OUT = path.resolve(__dirname, '../assets/shots');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(OUT, {recursive: true});

const which = process.argv[2] || 'all';
const ONLY = process.argv.slice(3);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log('[cap]', ...a);
const BASE_ARGS = ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--hide-scrollbars'];

function launch(extra = [], headless = true) {
  return puppeteer.launch({executablePath: CHROME, headless, args: [...BASE_ARGS, ...extra], protocolTimeout: 120000});
}

function helpers(page) {
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const shot = async name => {
    if (ONLY.length && !ONLY.includes(name)) return;
    await page.screenshot({path: path.join(OUT, name)}); log('saved', name);
  };
  const waitFor = (expr, timeout = 20000) => page.waitForFunction(expr, {timeout, polling: 30});
  const tryWait = (expr, timeout) => waitFor(expr, timeout).then(() => true, () => false);
  const freeze = async () => { await ev(() => { window.__frozen = mode; mode = 'pause'; }); await sleep(90); };
  const unfreeze = () => ev(() => { if (window.__frozen) { mode = window.__frozen; window.__frozen = null; last = performance.now(); } });
  const freezeShot = async name => { await freeze(); await shot(name); await unfreeze(); };
  const status = () => ev(() => ({mode, biome: state && state.biome, room: state && state.room,
    enemies: state && state.enemies.length, bullets: state && state.bullets.length, combo: state && state.combo,
    ttt: state && state.ttt, mod: state && state.modifier && state.modifier.id, boss: state && state.boss && state.boss.id,
    cut: cut && cut.id, line: cut && cut.i, skills: state && JSON.stringify(state.skillLevels), evo: state && state.evolutions.join()}));
  const press = k => page.keyboard.press(k);
  // advance a cutscene until line index i (first press of a line finishes the typewriter)
  const gotoLine = async i => {
    for (let k = 0; k < 60; k++) {
      const st = await ev(() => ({m: mode, i: cut ? cut.i : -1}));
      if (st.m !== 'cutscene' || st.i >= i) return;
      await press('Space'); await sleep(80);
    }
  };
  const finishCut = async () => {
    for (let k = 0; k < 90; k++) {
      if (await ev(() => mode) !== 'cutscene') return;
      await press('Space'); await sleep(80);
    }
  };
  const waitTyped = () => waitFor('mode!=="cutscene" || !typing', 15000);
  // advance only through the cutscene with this id (the epilogue chains straight into epilogue_card)
  const finishCutId = async id => {
    for (let k = 0; k < 90; k++) {
      if (await ev(id => !(mode === 'cutscene' && cut && cut.id === id), id)) return;
      await press('Space'); await sleep(80);
    }
  };
  // in-page autopilot: steers with the game's own joystick vector, swings near enemies, dashes through bullets
  const autopilot = (opts = {}) => ev(o => {
    window.__ap = Object.assign({on: true, attack: true, move: true, dash: true, keepHp: 0.5, target: null}, o);
    if (window.__apTimer) return;
    window.__apTimer = setInterval(() => {
      const A = window.__ap;
      if (!A.on || mode !== 'play' || !state) return;
      const p = state.player;
      const tg = A.target || {x: W / 2, y: H / 2 + 30};
      let ax = (tg.x - p.x) / 180, ay = (tg.y - p.y) / 180;
      for (const e of state.enemies) { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < 110) { const f = (110 - d) / 110 * 1.1; ax += dx / d * f; ay += dy / d * f; } }
      let threat = false;
      for (const b of state.bullets) { const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (d < 70) { const f = (70 - d) / 70 * 0.9; ax += dx / d * f; ay += dy / d * f; if (d < 45) threat = true; } }
      const t = performance.now() / 1000; ax += Math.cos(t * 0.9) * 0.3; ay += Math.sin(t * 1.3) * 0.3;
      if (A.move) { const m = Math.hypot(ax, ay);
        if (m > 0.15) { touch.dx = ax / Math.max(1, m); touch.dy = ay / Math.max(1, m); } else { touch.dx = 0; touch.dy = 0; } }
      const near = state.enemies.some(e => Math.hypot(e.x - p.x, e.y - p.y) < 80 + e.r) ||
        (state.boss && Math.hypot(state.boss.x - p.x, state.boss.y - p.y) < 80 + state.boss.r);
      if (A.attack && near && Math.random() < 0.45) state.attackQueued = true;
      if (A.dash && threat && p.dashCD <= 0 && Math.random() < 0.5) state.dashQueued = true;
      if (A.keepHp && p.hp < p.maxHp * A.keepHp) p.hp = Math.min(p.maxHp, p.hp + 1.5);
    }, 50);
  }, opts);
  const ap = o => ev(o => Object.assign(window.__ap, o), o);
  return {ev, shot, waitFor, tryWait, freeze, unfreeze, freezeShot, status, press, gotoLine, finishCut, finishCutId, waitTyped, autopilot, ap};
}

// card picker: evolution first, then skills that build toward FIFTH TUNG (Louder Voice + Quick Wit)
const PREFER = ['Louder Voice', 'Quick Wit', 'Thick Skin', 'Touch Grass', 'Boomerang Bat', 'Kentongan Horn', 'Wider Bat'];
async function pickCard(page, H) {
  await page.mouse.move(4, 4);
  await H.waitFor('mode==="choose" && document.querySelectorAll("#cards .card").length>0');
  const idx = await H.ev(prefer => {
    const cards = [...document.querySelectorAll('#cards .card')];
    const evo = cards.findIndex(c => c.classList.contains('evo'));
    if (evo >= 0) return evo;
    for (const n of prefer) {
      const i = cards.findIndex(c => { const nm = c.querySelector('.nm'); return nm && nm.textContent === n; });
      if (i >= 0) return i;
    }
    return 0;
  }, PREFER);
  await page.click(`#cards .card:nth-child(${idx + 1})`);
}

async function desktop() {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERROR', e.message));
  await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1.5});
  await page.goto(GAME, {waitUntil: 'load'});
  const H = helpers(page);
  await H.ev(() => document.fonts.load('38px "Press Start 2P"'));
  await H.ev(() => document.fonts.ready);
  await sleep(1500);
  const done = new Set();
  const once = async (name, fn) => { if (done.has(name)) return false; done.add(name); await fn(); return true; };

  /* ---- title + difficulty ---- */
  await H.shot('v3-01-title-fresh.png');
  await page.click('button[data-menu="options"]'); await sleep(500);
  await H.shot('v3-02-difficulty-options.png');
  await page.click('#menuOptions button[data-menu="main"]'); await sleep(250);

  /* ---- new game -> prologue (real Space presses) ---- */
  await page.click('#startBtn');
  await H.waitFor('mode==="cutscene"');
  await H.gotoLine(4); await H.waitTyped(); await sleep(500);
  await H.shot('v3-03a-prologue-eyes.png');
  await H.gotoLine(5); await H.waitTyped(); await sleep(400);
  await H.shot('v3-03b-prologue-reveal.png');
  await H.gotoLine(8); await H.waitTyped(); await sleep(400);
  await H.shot('v3-03c-prologue-sahur.png');
  await H.finishCut();
  await H.waitFor('mode==="choose"'); await page.mouse.move(4, 4); await sleep(600);
  await H.shot('v3-09a-first-upgrade.png');
  await pickCard(page, H);
  await H.waitFor('mode==="play"');

  const clearRoom = () => H.ev(() => { state.spawnQueue = []; state.pending = []; state.rivalPending = false; state.enemies.forEach(e => e.hp = 0); });
  await H.ev(() => { state.player.armor = 0.75; });
  await H.autopilot({attack: true});

  // side-shots that can happen in any room
  const watchSides = async () => {
    const st = await H.ev(() => ({
      elite: state.enemies.some(e => e.elite && e.born > 0.6 && e.hp > 0),
      ach: !!(state.unlockFeed[0] && state.unlockFeed[0].kind === 'ach' && state.unlockFeed[0].t < 3.0 && state.unlockFeed[0].t > 1),
    }));
    if (st.elite && !done.has('v3-07a-elite.png')) {
      done.add('v3-07a-elite.png');
      await H.ap({attack: false});
      const inFrame = 'state.enemies.some(e=>e.elite && e.x>140 && e.x<W-140 && e.y>140 && e.y<H-170)';
      if (!await H.tryWait(`state.enemies.length>=5 && ${inFrame}`, 5000)) await H.tryWait(inFrame, 4000);
      await H.ap({attack: true});
      await H.freezeShot('v3-07a-elite.png');
      // steer onto it so it dies by the player's bat -> the game's own chest
      await H.ap({target: null});
      const ok = await H.tryWait('state.texts.some(t=>/CHEST/.test(t.msg) && t.t<1.9 && t.t>1.2)', 25000);
      if (ok && await H.ev(() => state.texts.some(t => /ROOM CLEAR/.test(t.msg)))) { log('chest overlaps ROOM CLEAR; retry on next elite'); done.delete('v3-07a-elite.png'); return; }
      if (ok) await H.freezeShot('v3-07b-chest.png'); else done.delete('v3-07a-elite.png');
    }
    if (st.ach) await once('v3-16c-hall-of-tung-toast.png', () => H.freezeShot('v3-16c-hall-of-tung-toast.png'));
  };
  const roomPlay = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await watchSides(); await sleep(150); } };

  const combatShot = async (name, minEnemies) => {
    await H.ap({attack: false});
    let ok = false;
    for (const n of [minEnemies, minEnemies - 2, 4]) {
      ok = await H.tryWait(`mode==="play" && state.enemies.length>=${n} && state.spawnQueue.length===0`, 15000);
      if (ok) break;
    }
    await H.ap({attack: true});
    await sleep(900);
    // a TUNG ring still expanding, combo on screen, and no enemy mid hit-flash (they flash white for 0.1 s)
    ok = await H.tryWait('mode==="play" && state.sahur.ring>0.1 && state.sahur.ring<0.27 && state.combo>=3 && state.comboT>1.2 && state.enemies.length>=4 && state.enemies.filter(e=>e.hitT>0).length<=1', 12000);
    if (!ok) ok = await H.tryWait('mode==="play" && state.sahur.ring>0.1 && state.combo>=3 && state.enemies.length>=3', 8000);
    if (!ok) log(name, 'no ring+combo moment, shooting anyway');
    await H.freezeShot(name);
  };

  const ultShots = async (prefix) => {
    // TRIPLE T: charge comes from hits/kills; if not full yet, top up the meter (assist), then press E (real key)
    const natural = await H.ev(() => state.ttt >= 1);
    if (!natural) await H.ev(() => { state.ttt = 1; });
    log('TRIPLE T meter natural:', natural);
    await sleep(400);
    await H.freezeShot(prefix + 'a-ready.png');
    await H.press('e');
    await H.waitFor('state.ult && state.ult.t>0.78'); await H.freezeShot(prefix + 'b-walkup.png');
    await H.waitFor('state.ult && state.ult.t>1.36'); await H.freezeShot(prefix + 'c-three-tungs.png');
    await H.waitFor('state.ult && state.ult.t>1.80'); await H.freezeShot(prefix + 'd-home-run.png');
    await H.waitFor('!state.ult', 5000);
  };

  const bossShots = {
    echo:      {cond: 'state.bossTime>8 && state.bullets.length>=8', file: 'v3-13a-boss-echo.png'},
    scraper:   {cond: 'state.bossTime>7 && state.bullets.length>=10', file: 'v3-13b-boss-scraper.png'},
    valuation: {cond: 'state.bossTime>8 && state.bullets.length>=12', file: 'v3-13c-boss-valuation.png'},
  };
  const combatFiles = ['v3-04-biome1-combat.png', 'v3-05-biome2-combat.png', 'v3-06-biome3-combat.png'];
  const endCuts = ['v3-20a-cutscene-campfire.png', 'v3-20b-cutscene-memory-lane.png', 'v3-20c-cutscene-memory-window.png'];

  for (let b = 0; b < 3; b++) {
    for (let r = 0; r < 3; r++) {
      await H.waitFor('mode==="play"');
      log('room', b, r, await H.status());
      // modifier banner (rooms after the very first roll one)
      if (!(b === 0 && r === 2) && await H.ev(() => !!(state.modifier && state.modCard > 0))) {
        const name = !done.has('v3-08a-modifier.png') ? 'v3-08a-modifier.png' : (!done.has('v3-08b-modifier.png') ? 'v3-08b-modifier.png' : null);
        if (name) {
          if (await H.tryWait('state.modCard<2.1 && state.enemies.length>=2', 3000)) { done.add(name); await H.freezeShot(name); }
        }
      }
      if (b === 0 && r === 2) {
        // the mossy rival and its versus card
        if (await H.tryWait('state.versus && state.versus.id==="patatam" && state.versus.t>1.5', 12000)) await H.freezeShot('v3-12a-versus-patatam.png');
        else log('patatam versus missed');
      }
      if (r === 2) {
        await combatShot(combatFiles[b], [7, 8, 9][b]);
        if (b === 1) await ultShots('v3-11');
        if (b === 2 && !done.has('ult2')) { done.add('ult2'); }
        await roomPlay(1500);
      } else {
        await roomPlay(b === 0 && r === 0 ? 6000 : 4000);
      }
      if (b === 1 && r === 2 && !done.has('v3-10-evolution.png') && !await H.ev(() => EVOS.some(e => e.recipe.every(n => (state.skillLevels[n] || 0) >= 2)))) {
        // ASSIST: the random card offers didn't build a recipe; raise Louder Voice + Quick Wit to Lv.2 so the game offers FIFTH TUNG
        log('evolution assist', await H.ev(() => JSON.stringify(state.skillLevels)));
        await H.ev(() => { ['Louder Voice', 'Quick Wit'].forEach(n => { state.skillLevels[n] = Math.max(2, state.skillLevels[n] || 0); }); applySkillLoadout(); });
      }
      await clearRoom();
      await H.waitFor('mode==="choose"'); await page.mouse.move(4, 4); await sleep(700);
      if (b === 1 && r === 0) await H.shot('v3-09b-upgrade-choice.png');
      if (await H.ev(() => !!document.querySelector('#cards .card.evo')) && !done.has('v3-10-evolution.png')) {
        done.add('v3-10-evolution.png'); await H.shot('v3-10-evolution.png');
      }
      // evolution nudge (assist) before biome 3 if the random picks didn't get there
      if (b === 2 && r === 0 && !done.has('v3-10-evolution.png')) log('no evolution reached naturally yet', await H.status());
      await pickCard(page, H);
    }
    // boss
    const bossId = ['echo', 'scraper', 'valuation'][b];
    await H.waitFor(`state.boss && state.boss.id==="${bossId}"`);
    await H.ap({target: {x: 480, y: 340}, attack: true, keepHp: 0.6});
    await H.waitFor('state.versus && state.versus.t>1.45', 8000);
    await H.freezeShot(`v3-12${'bcd'[b]}-versus-${bossId}.png`);
    const bs = bossShots[bossId];
    if (!await H.tryWait(bs.cond, 25000)) log(bossId, 'timeout');
    await sleep(450);
    await H.freezeShot(bs.file);
    await H.ev(() => { state.boss.hp = 0; });
    await H.waitFor('mode==="end"', 10000); await sleep(700);
    await H.shot(`v3-16a-biome-clear-${b + 1}.png`);
    await page.click('#endBtn');
    await H.waitFor('mode==="cutscene"');
    await H.gotoLine([3, 2, 3][b]); await H.waitTyped(); await sleep(500);
    await H.shot(endCuts[b]);
    await H.finishCut();
    await H.waitFor('mode==="choose"');
    await sleep(2000);
    if (b === 0) await H.shot('v3-09c-signal-roll.png');
    await page.click('#cards .card');
    if (b < 2) { await H.waitFor('mode==="play"'); await H.ap({target: null, keepHp: 0.5}); }
  }

  /* ---- core intro -> final upgrade -> The AI Bubble ---- */
  await H.waitFor('mode==="cutscene" && cut.id==="core_intro"');
  await H.waitTyped(); await sleep(500);
  await H.shot('v3-14a-core-intro.png');
  await H.finishCut();
  await H.waitFor('mode==="choose" || mode==="play"');
  if (await H.ev(() => mode === 'choose')) {
    await sleep(600);
    if (await H.ev(() => !!document.querySelector('#cards .card.evo')) && !done.has('v3-10-evolution.png')) { done.add('v3-10-evolution.png'); await H.shot('v3-10-evolution.png'); }
    await pickCard(page, H);
  }
  await H.waitFor('mode==="play" && state.boss && state.boss.id==="bubble"');
  await H.waitFor('state.versus && state.versus.t>1.45', 8000);
  await H.freezeShot('v3-12e-versus-bubble.png');
  await H.ap({target: {x: 480, y: 360}, attack: true, keepHp: 0.6});
  if (!await H.tryWait('state.bossTime>7 && state.bullets.length>=14', 25000)) log('bubble p1 timeout');
  await sleep(300);
  await H.freezeShot('v3-14b-bubble-phase1.png');
  await H.ev(() => { state.boss.hp = state.boss.maxHp * 0.6; });
  await H.waitFor('state.phase===2');
  await H.tryWait('state.bullets.length>=12', 3000);
  await sleep(250);
  await H.freezeShot('v3-14c-bubble-phase2.png');
  await sleep(2800);
  await H.ev(() => { state.boss.hp = state.boss.maxHp * 0.3; });
  await H.waitFor('state.phase===3'); await sleep(1300);
  await H.freezeShot('v3-14d-bubble-collapse.png');
  /* sacrifice -> three TUNGs -> epilogue -> stinger -> victory */
  await H.waitFor('mode==="cutscene" && cut.id==="sacrifice"', 15000);
  await H.gotoLine(5); await H.waitTyped(); await sleep(300);
  await H.shot('v3-15a-cutscene-sacrifice.png');
  await H.finishCut();
  await H.waitFor('mode==="beats" && beats.called'); await sleep(300);
  await H.shot('v3-15b-finale-call.png');
  for (let n = 0; n < 3; n++) {
    await H.waitFor('mode==="beats" && beats.called', 8000);
    await sleep(250);
    await H.press('Space');
    if (n === 1) { await sleep(120); await H.shot('v3-15c-finale-two-tungs.png'); }
  }
  await sleep(400);
  await H.shot('v3-15d-finale-three-tungs.png');
  await H.waitFor('mode==="cutscene" && cut.id==="epilogue"', 10000);
  await H.gotoLine(1); await H.waitTyped(); await sleep(500);
  await H.shot('v3-15e-epilogue.png');
  await H.finishCutId('epilogue');
  await H.waitFor('mode==="cutscene" && cut.id==="epilogue_card"');
  await sleep(1300);
  await H.shot('v3-15f-epilogue-title.png');
  await H.gotoLine(3); await H.waitTyped(); await sleep(300);
  await H.shot('v3-15g-stinger-tung.png');
  await H.gotoLine(5); await sleep(1300);
  await H.shot('v3-15h-to-be-continued.png');
  await H.finishCut();
  await H.waitFor('mode==="end"'); await sleep(700);
  await H.shot('v3-16b-victory.png');

  /* ---- title again: best score + Hall of TUNG count earned this session ---- */
  // reload: the victory cleared the run save; prefs + Hall of TUNG + best score persist in localStorage
  await page.reload({waitUntil: 'load'});
  await H.ev(() => document.fonts.ready); await sleep(1500);
  await H.shot('v3-01-title.png');
  await H.autopilot({on: false});

  await gameOverRun(page, H);
  await browser.close();
}

// new run (prologue skipped with the real SKIP button) -> play a while -> game over
async function gameOverRun(page, H) {
  await page.click('#startBtn');
  await sleep(300);
  if (await H.ev(() => document.getElementById('confirmOv').classList.contains('show'))) await page.click('#confirmYes');
  await H.waitFor('mode==="cutscene"'); await sleep(700);
  await H.shot('v3-03d-skip-button.png');
  await page.click('#skipBtn');
  await H.waitFor('mode==="choose"'); await page.mouse.move(4, 4); await sleep(300);
  await pickCard(page, H);
  await H.waitFor('mode==="play"');
  await H.autopilot({on: true, target: null, attack: true, keepHp: 0.5});
  await H.ap({on: true, target: null, attack: true, keepHp: 0.5});
  await sleep(14000);
  await H.ap({on: false});
  await H.ev(() => { touch.dx = 0; touch.dy = 0; state.player.armor = 0; state.player.hp = 4; state.player.revives = 0; });
  if (!await H.tryWait('mode==="end"', 20000)) { log('gameover: forcing'); await H.ev(() => damagePlayer(999)); }
  await sleep(800);
  await H.shot('v3-17-game-over.png');
}

async function mobile() {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERROR', e.message));
  await page.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false});
  await page.goto(GAME, {waitUntil: 'load'});
  const H = helpers(page);
  await H.ev(() => document.fonts.load('38px "Press Start 2P"'));
  await H.ev(() => document.fonts.ready); await sleep(1300);
  await H.shot('v3-18a-mobile-title.png');
  await page.tap('#startBtn');
  await H.waitFor('mode==="cutscene"'); await H.gotoLine(8); await H.waitTyped(); await sleep(400);
  await H.shot('v3-18b-mobile-cutscene.png');
  await H.finishCut();
  await H.waitFor('mode==="choose"'); await sleep(500);
  await H.shot('v3-18c-mobile-upgrade.png');
  await page.tap('#cards .card:nth-child(1)');
  await H.waitFor('mode==="play"');
  await H.ev(() => { state.player.armor = 0.75; });
  await H.autopilot({move: false, attack: true, keepHp: 0.5});
  const c = await H.ev(() => { const r = document.getElementById('stick').getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2}; });
  log('stick', c);
  // real touches on the stick: steer back toward the arena centre with a little circular wiggle
  const drive = async ms => { const t0 = Date.now(); let k = 0;
    while (Date.now() - t0 < ms) {
      const p = await H.ev(() => state && mode === 'play' ? {x: state.player.x, y: state.player.y, W, H} : null);
      if (p) { k++; let vx = (p.W / 2 - p.x) / 140 + Math.cos(k * 0.4) * 0.6, vy = (p.H * 0.55 - p.y) / 140 + Math.sin(k * 0.4) * 0.6;
        const m = Math.max(1, Math.hypot(vx, vy)); vx /= m; vy /= m;
        await page.touchscreen.touchMove(c.x + vx * c.r * 0.8, c.y + vy * c.r * 0.8); }
      await sleep(110); } };
  await page.touchscreen.touchStart(c.x, c.y);
  await drive(4000);
  await page.touchscreen.touchEnd();
  // fast-forward room 1 (assist), take the next upgrade with a real tap, fight room 2
  await H.ev(() => { state.spawnQueue = []; state.pending = []; state.enemies.forEach(e => e.hp = 0); });
  await H.waitFor('mode==="choose"'); await sleep(500);
  await page.tap('#cards .card:nth-child(1)');
  await H.waitFor('mode==="play"');
  // SHADOWBANNED darkens the whole arena: skip ahead to a brighter room for the portrait hero shot
  for (let k = 0; k < 2 && await H.ev(() => !!(state.modifier && state.modifier.id === 'shadowbanned')); k++) {
    log('mobile: shadowbanned room, skipping');
    await sleep(1500);
    await H.ev(() => { state.spawnQueue = []; state.pending = []; state.rivalPending = false; state.enemies.forEach(e => e.hp = 0); });
    await H.waitFor('mode==="choose"'); await sleep(500);
    await page.tap('#cards .card:nth-child(1)');
    await H.waitFor('mode==="play"');
  }
  await page.touchscreen.touchStart(c.x, c.y);
  await H.ap({attack: false});
  await drive(5000);
  await H.ap({attack: true});
  await drive(1200);
  // keep steering while waiting for the moment (a held stick keeps the player walking into a wall)
  const driveUntil = async (cond, ms) => { const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await H.ev(c => !!eval(c), cond)) return true; await drive(220); } return false; };
  if (!await driveUntil('state.sahur.ring>0.1 && state.sahur.ring<0.27 && state.combo>=3 && state.enemies.length>=4 && state.enemies.filter(e=>e.hitT>0).length<=1', 10000))
    await driveUntil('state.sahur.ring>0.1 && state.combo>=3', 8000);
  await H.freezeShot('v3-18d-mobile-play.png');
  await drive(1200);
  await H.ev(() => { state.ttt = 1; });   // assist: fill the meter so the TRIPLE T button lights up
  await page.touchscreen.touchEnd();
  await sleep(400);
  // no freeze here: the DOM TRIPLE T button only shows while mode==='play'
  await H.shot('v3-18e-mobile-ult-ready.png');
  await page.tap('#ultBtn');
  await H.waitFor('state.ult && state.ult.t>1.36'); await H.freezeShot('v3-18f-mobile-triple-t.png');
  await browser.close();
}

async function proto3d() {
  const SAVE = JSON.stringify({v: 1, savedAt: Date.now(), biome: 3, room: 0, relics: [], skillLevels: {}, unlockedSkills: [], completedChallenges: [], roomsCleared: 9, speedBosses: 0, playerHp: 100, playerMaxHp: 100});
  const browser = await launch(['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11'], 'new');
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERROR', e.message));
  await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1.5});
  await page.evaluateOnNewDocument(save => {
    localStorage.setItem('sahurProtocolRunV1', save);
    localStorage.setItem('sahurProtocolAudioV1', JSON.stringify({muted: true, volume: 0.7}));
  }, SAVE);
  await page.goto(GAME3D + '?r3d=force', {waitUntil: 'load'});
  const H = helpers(page);
  await H.ev(() => document.fonts.ready); await sleep(800);
  await page.click('#continueBtn');
  await sleep(3200);
  log('3d status', await H.ev(() => window.R3D ? R3D.status() : null));
  await H.ev(() => { state.player.armor = 0.75; });
  await H.autopilot({target: {x: 480, y: 360}, attack: true, keepHp: 0.7});
  await H.tryWait('state.bossTime>7 && state.bullets.length>=12', 20000);
  await sleep(200);
  await H.freezeShot('v3-19a-3d-bubble.png');
  await H.ev(() => { state.boss.hp = state.boss.maxHp * 0.6; });
  await H.waitFor('state.phase===2');
  await sleep(2600);
  await H.tryWait('state.bullets.length>=12 && state.sahur.ring>0.2', 8000);
  await H.freezeShot('v3-19b-3d-bubble-phase2.png');
  await H.ev(() => { state.boss.hp = state.boss.maxHp * 0.3; });
  await H.waitFor('state.phase===3'); await sleep(2500);
  await H.freezeShot('v3-19c-3d-bubble-collapse.png');
  await H.waitFor('mode==="cutscene" && cut.id==="sacrifice"', 15000);
  await H.finishCut();
  for (let n = 0; n < 3; n++) { await H.waitFor('mode==="beats" && beats.called', 8000); await sleep(250); await H.press('Space'); if (n === 1) { await sleep(150); await H.shot('v3-19d-3d-finale.png'); } }
  await sleep(450);
  await H.shot('v3-19e-3d-pop.png');
  await browser.close();
}

(async () => {
  try {
    if (which === 'desktop' || which === 'all') await desktop();
    if (which === 'mobile' || which === 'all') await mobile();
    if (which === '3d' || which === 'all') await proto3d();
    if (which === 'gameover') {
      const browser = await launch(); const page = await browser.newPage();
      await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1.5});
      await page.goto(GAME, {waitUntil: 'load'}); const H = helpers(page);
      await H.ev(() => document.fonts.ready); await sleep(1200);
      await gameOverRun(page, H); await browser.close();
    }
  } catch (e) { console.error('FAILED', e); process.exit(1); }
})();
