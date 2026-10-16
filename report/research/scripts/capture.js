// Screenshot driver for Sahur Protocol (report figures).
// Run from the report/ folder:  node research/scripts/capture.js [desktop|mobile|all]
// Drives the REAL game (unmodified Sahur_Protocol.html) through its own flow using
// keyboard/mouse/touch input plus a few page.evaluate() calls into the game's own
// globals (mode, state, cut, beats, startRoom, ...). See game-facts.md section 15.
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const GAME = path.resolve(__dirname, '../../../Sahur_Protocol.html');
const URL = 'file:///' + GAME.split(path.sep).join('/');
const OUT = path.resolve(__dirname, '../../assets/shots');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(OUT, {recursive: true});

const which = process.argv[2] || 'all';
// optional: node capture.js desktop 06-biome1-combat.png  -> re-run the flow but only write the listed files
const ONLY = process.argv.slice(3);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log('[cap]', ...a);

async function launch() {
  return puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--hide-scrollbars'],
  });
}

function helpers(page) {
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const shot = async name => { if (ONLY.length && !ONLY.includes(name)) return; await page.screenshot({path: path.join(OUT, name)}); log('saved', name); if (ONLY.length) { ONLY.splice(ONLY.indexOf(name), 1); if (!ONLY.length) throw new Error('ONLY_DONE'); } };
  const waitFor = (expr, timeout = 20000) => page.waitForFunction(expr, {timeout, polling: 30});
  const freeze = async () => { await ev(() => { window.__frozen = mode; mode = 'pause'; }); await sleep(70); };
  const unfreeze = () => ev(() => { if (window.__frozen) { mode = window.__frozen; window.__frozen = null; last = performance.now(); } });
  const freezeShot = async name => { await freeze(); await shot(name); await unfreeze(); };
  const status = () => ev(() => ({mode, biome: state && state.biome, room: state && state.room,
    enemies: state && state.enemies.length, bullets: state && state.bullets.length,
    boss: state && state.boss && state.boss.id, cut: cut && cut.id, line: cut && cut.i}));
  // press Space until the cutscene reaches line index i (first press finishes the typewriter)
  const gotoLine = async i => {
    for (let k = 0; k < 40; k++) {
      const st = await ev(() => ({m: mode, i: cut ? cut.i : -1}));
      if (st.m !== 'cutscene' || st.i >= i) return;
      await page.keyboard.press('Space'); await sleep(70);
    }
  };
  const finishCut = async () => {
    for (let k = 0; k < 60; k++) {
      const m = await ev(() => mode);
      if (m !== 'cutscene') return;
      await page.keyboard.press('Space'); await sleep(70);
    }
  };
  const waitTyped = () => waitFor('mode!=="cutscene" || !typing', 15000);
  // simple in-page "autopilot": steers via the game's own joystick vector (touch.dx/dy),
  // queues swings when enemies are in range, and stops HP from collapsing (screenshots only).
  const autopilot = (opts = {}) => ev(o => {
    window.__ap = Object.assign({on: true, attack: true, move: true, keepHp: 0.5, target: null}, o);
    if (window.__apTimer) return;
    window.__apTimer = setInterval(() => {
      const A = window.__ap;
      if (!A.on || mode !== 'play' || !state) return;
      const p = state.player;
      const tg = A.target || {x: W / 2, y: H / 2 + 30};
      let ax = (tg.x - p.x) / 180, ay = (tg.y - p.y) / 180;
      for (const e of state.enemies) { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < 120) { const f = (120 - d) / 120 * 1.1; ax += dx / d * f; ay += dy / d * f; } }
      for (const b of state.bullets) { const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (d < 70) { const f = (70 - d) / 70 * 0.9; ax += dx / d * f; ay += dy / d * f; } }
      const t = performance.now() / 1000; ax += Math.cos(t * 0.9) * 0.3; ay += Math.sin(t * 1.3) * 0.3;
      if (A.move) { const m = Math.hypot(ax, ay);
        if (m > 0.15) { touch.dx = ax / Math.max(1, m); touch.dy = ay / Math.max(1, m); } else { touch.dx = 0; touch.dy = 0; } }
      const near = state.enemies.some(e => Math.hypot(e.x - p.x, e.y - p.y) < 80 + e.r) ||
        (state.boss && Math.hypot(state.boss.x - p.x, state.boss.y - p.y) < 80 + state.boss.r);
      if (A.attack && near && Math.random() < 0.45) state.attackQueued = true;
      if (A.keepHp && p.hp < p.maxHp * A.keepHp) p.hp = Math.min(p.maxHp, p.hp + 1.5);
    }, 50);
  }, opts);
  const ap = o => ev(o => Object.assign(window.__ap, o), o);
  return {ev, shot, waitFor, freeze, unfreeze, freezeShot, status, gotoLine, finishCut, waitTyped, autopilot, ap};
}

async function desktop() {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERROR', e.message));
  await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1.5});
  await page.goto(URL, {waitUntil: 'load'});
  const H = helpers(page);
  await H.ev(() => document.fonts.load('38px "Press Start 2P"'));
  await H.ev(() => document.fonts.ready);
  await sleep(1500);

  /* ---- title + menus ---- */
  await H.shot('01b-title-first-launch.png');
  await H.ev(() => { localStorage.setItem(SAVE_KEY, JSON.stringify({v: 1, savedAt: Date.now(), biome: 1, room: 1, relics: [], skillLevels: {}, unlockedSkills: DEFAULT_UNLOCKED_SKILLS, completedChallenges: [], roomsCleared: 4, speedBosses: 1, playerHp: 80, playerMaxHp: 100})); updateContinueButton(); });
  await sleep(400);
  await H.shot('01-title.png');
  await page.click('button[data-menu="how"]'); await sleep(500);
  await H.shot('03-howto.png');
  await page.click('#menuHow button[data-menu="main"]'); await sleep(200);
  await page.click('button[data-menu="story"]'); await sleep(500);
  await H.shot('03b-story.png');
  await page.click('#menuStory button[data-menu="main"]'); await sleep(200);
  await page.click('button[data-menu="options"]'); await sleep(500);
  await H.shot('04-settings.png');
  await H.ev(() => { const m = document.getElementById('menuOptions'); m.scrollTop = m.scrollHeight; }); await sleep(300);
  await H.shot('04d-settings-scrolled.png');
  await page.click('#menuOptions button[data-menu="main"]'); await sleep(200);

  /* ---- new game -> prologue ---- */
  await page.click('#startBtn');
  await H.waitFor('mode==="cutscene"');
  await sleep(1400);
  await H.shot('02b-prologue-opening.png');           // narration line typing
  await H.gotoLine(3); await sleep(1250);
  await H.shot('02-prologue.png');                    // SAHUR line mid-typing
  await H.finishCut();
  await H.waitFor('mode==="choose"'); await sleep(500);
  await H.shot('05-first-upgrade.png');
  await page.click('#cards .card:nth-child(1)');
  await H.waitFor('mode==="play"');
  log(await H.status());

  /* ---- run the three biomes: rooms 1-2 fast-forwarded, combat shot in room 3 (busiest) ---- */
  const clearRoom = () => H.ev(() => { state.spawnQueue = []; state.pending = []; state.enemies.forEach(e => e.hp = 0); });
  const pick = async (n = 1) => { await page.click(`#cards .card:nth-child(${n})`); await H.waitFor('mode==="play"'); };
  const combatShot = async (name, minEnemies) => {
    await H.ap({target: null, attack: false});
    // wait for a TUNG while the room is crowded; relax the crowd requirement if enemies die too fast
    let ok = false;
    for (const n of [minEnemies, minEnemies - 2, 3]) {
      ok = await H.waitFor(`mode==="play" && state.sahur.ring>0.27 && state.enemies.length>=${n}`, 9000).then(() => true, () => false);
      if (ok) break;
      log(name, 'relaxing crowd requirement below', n);
    }
    if (await H.ev(() => mode !== 'play')) throw new Error(name + ': room ended before the shot');
    await H.ev(() => { state.attackQueued = true; }); await sleep(30);
    await H.freezeShot(name);
    await H.ap({attack: true});
  };
  await H.ev(() => { state.player.armor = 0.7; });
  await H.autopilot({attack: true});

  const bossShots = {
    echo:      {cond: 'state.bossTime>9.2 && state.bullets.length>=8', after: 480, file: '10-boss-echo.png'},
    scraper:   {cond: 'state.bossTime>6.45 && state.bullets.length>=10', after: 300, file: '10-boss-scraper.png'},
    valuation: {cond: 'state.bossTime>8 && state.boss.vuln && state.bullets.length>=12', after: 320, file: '10-boss-valuation.png'},
  };
  const combatFiles = ['06-biome1-combat.png', '07-biome2-combat.png', '08-biome3-combat.png'];
  const endFiles = ['20-cutscene-fire.png', '21-cutscene-river.png', '22-cutscene-boardroom.png'];
  const minEnemies = [6, 7, 8];

  for (let b = 0; b < 3; b++) {
    // room 1
    await sleep(2500);
    if (b === 1) { await H.waitFor('state.enemies.length>=4 && state.bullets.length>=1', 8000).catch(() => {}); await H.ev(() => { state.showChallenges = true; }); await sleep(250); await H.freezeShot('18-challenges-panel.png'); await H.ev(() => { state.showChallenges = false; }); }
    await clearRoom();
    await H.waitFor('mode==="choose"'); await sleep(700);
    if (b === 0) await H.shot('09-upgrade-choice.png');
    await pick(b === 0 ? 2 : 1);
    // room 2
    await sleep(1800); await clearRoom();
    await H.waitFor('mode==="choose"'); await sleep(300); await pick(1);
    // room 3 -> combat screenshot
    await combatShot(combatFiles[b], minEnemies[b]);
    await sleep(600); await clearRoom();
    await H.waitFor('mode==="choose"'); await sleep(300); await pick(1);
    // boss
    const bossId = ['echo', 'scraper', 'valuation'][b];
    await H.waitFor(`state.boss && state.boss.id==="${bossId}"`);
    log(await H.status());
    await H.ap({target: {x: 480, y: 335}, attack: true});
    const bs = bossShots[bossId];
    await H.waitFor(bs.cond, 25000).catch(() => log(bossId, 'timeout'));
    await sleep(bs.after);
    await H.freezeShot(bs.file);
    await H.ev(() => { state.boss.hp = 0; });          // defeat -> game's own onBossDown()
    await H.waitFor('mode==="cutscene"');
    if (b === 1) { await H.gotoLine(1); await sleep(1900); } else { await sleep(1800); }
    await H.shot(endFiles[b]);
    await H.finishCut();
    await H.waitFor('mode==="choose"');
    if (b === 0) { await sleep(550); await H.shot('09b-signal-roll-rolling.png'); await sleep(1400); await H.shot('09c-signal-roll-unlock.png'); }
    else if (b === 2) { await sleep(500); await H.shot('09d-signal-roll-all-unlocked.png'); }
    else await sleep(1800);
    await page.click('#cards .card');
    if (b < 2) { await H.waitFor('mode==="play"'); await H.ap({target: null}); }
  }

  /* ---- core intro ---- */
  await H.waitFor('mode==="cutscene" && cut.id==="core_intro"');
  await H.gotoLine(1); await sleep(1500);
  await H.shot('11-core-cutscene.png');
  await H.finishCut();
  await H.waitFor('mode==="choose" || mode==="play"');
  if (await H.ev(() => mode === 'choose')) {
    await sleep(500);
    await H.shot('05b-final-upgrade.png');
    await page.click('#cards .card:nth-child(1)');
  }
  await H.waitFor('mode==="play" && state.boss && state.boss.id==="bubble"');
  log(await H.status());

  /* ---- The AI Bubble ---- */
  await H.ap({target: {x: 480, y: 360}, attack: true, keepHp: 0.6});
  await H.waitFor('state.bossTime>6.75 && state.bullets.length>=14', 25000).catch(() => log('bubble: timeout'));
  await sleep(650);
  await H.freezeShot('12-bubble.png');
  await H.ev(() => { state.boss.hp = state.boss.maxHp * 0.6; });
  await H.waitFor('state.phase===2');
  await H.waitFor('state.bullets.length>=12', 2400).catch(() => log('phase2: few bullets'));
  await sleep(200);
  await H.freezeShot('12b-bubble-phase2.png');
  await sleep(2700);                                    // let the PHASE 2 banner expire
  await H.ev(() => { state.boss.hp = state.boss.maxHp * 0.3; });
  await H.waitFor('state.phase===3'); await sleep(1100);
  await H.freezeShot('12c-bubble-collapse.png');
  /* ---- sacrifice -> beats -> epilogue -> victory (natural flow) ---- */
  await H.waitFor('mode==="cutscene" && cut.id==="sacrifice"', 15000);
  await H.gotoLine(2); await H.waitTyped(); await sleep(300);
  await H.shot('23-cutscene-sacrifice.png');
  await H.finishCut();
  await H.waitFor('mode==="beats" && beats.n>=1'); await sleep(250);
  await H.shot('13b-beats-first-tung.png');
  await H.waitFor('beats.n>=3'); await sleep(500);
  await H.shot('13-beats-finale.png');
  await H.waitFor('mode==="cutscene" && cut.id==="epilogue"', 10000);
  await sleep(1600);
  await H.shot('24-cutscene-epilogue.png');
  await H.finishCut();
  await H.waitFor('mode==="end"'); await sleep(500);
  await H.shot('14-victory.png');

  /* ---- new run -> pause menu -> game over ---- */
  await page.click('#endBtn');
  await H.waitFor('mode==="cutscene"'); await H.finishCut();
  await H.waitFor('mode==="choose"'); await sleep(200);
  await page.click('#cards .card:nth-child(1)');
  await H.waitFor('mode==="play"');
  await H.ap({target: null, attack: true, keepHp: 0.5});
  await sleep(3500);
  await page.keyboard.press('Escape');
  await H.waitFor('mode==="pause"'); await sleep(400);
  await H.shot('04b-pause.png');
  await page.click('#pauseControlsBtn'); await sleep(400);
  await H.shot('04c-pause-controls.png');
  await page.click('#resumeBtn');
  await H.waitFor('mode==="play"');
  await H.ap({on: false});
  await H.ev(() => { touch.dx = 0; touch.dy = 0; state.player.armor = 0; state.player.hp = 3; state.player.revives = 0; });
  await H.waitFor('mode==="end"', 15000).catch(async () => { log('gameover: forcing'); await H.ev(() => damagePlayer(999)); });
  await sleep(600);
  await H.shot('15-gameover.png');
  log(await H.status());
  await browser.close();
}

async function mobile() {
  const browser = await launch();
  /* landscape phone with touch */
  const page = await browser.newPage();
  page.on('pageerror', e => log('PAGEERROR', e.message));
  await page.setViewport({width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true});
  await page.goto(URL, {waitUntil: 'load'});
  const H = helpers(page);
  await H.ev(() => document.fonts.ready); await sleep(1200);
  await H.shot('16a-mobile-title.png');
  await page.tap('#startBtn');
  await H.waitFor('mode==="cutscene"'); await H.gotoLine(3); await sleep(1300);
  await H.shot('16b-mobile-cutscene.png');
  await H.finishCut();
  await H.waitFor('mode==="choose"'); await sleep(400);
  await H.shot('16c-mobile-upgrade.png');
  await page.tap('#cards .card:nth-child(1)');
  await H.waitFor('mode==="play"');
  await H.ev(() => { state.player.armor = 0.7; });
  await H.autopilot({move: false, attack: true, keepHp: 0.5});
  const c = await H.ev(() => { const r = document.getElementById('stick').getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2}; });
  await page.touchscreen.touchStart(c.x, c.y);
  const t0 = Date.now();
  let k = 0;
  while (Date.now() - t0 < 5200) {
    const a = k * 0.35; k++;
    await page.touchscreen.touchMove(c.x + Math.cos(a) * c.r * 0.6, c.y + Math.sin(a) * c.r * 0.45 - 6);
    await sleep(110);
  }
  await H.waitFor('state.sahur.ring>0.25', 8000).catch(() => log('mobile: no ring'));
  await H.freezeShot('16-mobile-touch.png');
  await page.touchscreen.touchEnd();
  await page.close();

  /* portrait phone -> rotate prompt */
  const pp = await browser.newPage();
  await pp.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false});
  await pp.goto(URL, {waitUntil: 'load'});
  await pp.evaluate(() => document.fonts.ready); await sleep(1000);
  await pp.screenshot({path: path.join(OUT, '17-orientation-lock.png')}); log('saved 17-orientation-lock.png');
  await browser.close();
}

(async () => {
  try {
    if (which === 'desktop' || which === 'all') await desktop();
    if (which === 'mobile' || which === 'all') await mobile();
  } catch (e) { if (e && e.message === 'ONLY_DONE') { log('requested shots done'); process.exit(0); } console.error('FAILED', e); process.exit(1); }
})();
