// Per-slide interactions for the Sahur Protocol pitch. Each hook: enter/leave/next/key/final.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = () => window.DECK;
  const H = (window.HOOKS = window.HOOKS || {});
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── screenshots (v3 captures; one place to change names)
  const SHOTS = {
    title: 'v3-01-title-fresh.png', combat1: 'v3-04-biome1-combat.png', ult: 'v3-11d-home-run.png',
    boss1: 'v3-13a-boss-echo.png', boss2: 'v3-13b-boss-scraper.png', boss3: 'v3-13c-boss-valuation.png',
    bubble: 'v3-14c-bubble-phase2.png', modifier: 'v3-08a-modifier.png', mobile: 'v3-18d-mobile-play.png', proto3d: 'v3-19a-3d-bubble.png',
  };
  $$('img[data-shot]').forEach((img) => { img.src = '../assets/shots/' + SHOTS[img.dataset.shot]; });

  // ── speaker notes (N)
  const panel = $('#notesPanel');
  addEventListener('keydown', (e) => {
    if (e.key !== 'n' && e.key !== 'N') return;
    panel.classList.toggle('on');
    const s = $('.slide.on'); panel.textContent = s ? ($('.notes', s)?.textContent.trim() || '') : '';
  });
  new MutationObserver(() => { if (panel.classList.contains('on')) { const s = $('.slide.on'); panel.textContent = s ? ($('.notes', s)?.textContent.trim() || '') : ''; } })
    .observe($('#stage'), { subtree: true, attributes: true, attributeFilter: ['class'] });

  // ═══ 1 · wake
  let wakeStage = 0, typer = null;
  const typeLine = (el, text, cps = 22) => { clearInterval(typer); el.textContent = ''; let i = 0; typer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i % 2) D()?.blip(1200 + Math.random() * 200, 0.02, 'square', 0.03); if (i >= text.length) clearInterval(typer); }, 1000 / cps); };
  const titleOn = (s) => { s.classList.add('titled'); $('#wakeTitle').classList.add('on'); $('#wakeBg').style.opacity = 0.18; };
  H.wake = {
    enter(s, back) {
      wakeStage = back ? 2 : 0;
      s.classList.toggle('titled', back); $('#wakeTitle').classList.toggle('on', back); $('#wakeBg').style.opacity = back ? 0.18 : 0;
      $$('.knocks .tungword', s).forEach((k) => k.classList.remove('on'));
      if (!back) setTimeout(() => typeLine($('#wakeType'), '3:07 AM. The feed scrolls itself.'), 400);
    },
    next(s) {
      if (wakeStage === 0) {
        wakeStage = 1;
        ['#k1', '#k2', '#k3'].forEach((id, i) => setTimeout(() => { $(id).classList.add('on'); D().TUNG(0.7 + i * 0.2); }, i * 520));
        return true;
      }
      if (wakeStage === 1) { wakeStage = 2; titleOn(s); return true; }
      return false;
    },
    leave() { clearInterval(typer); },
    final(s) { titleOn(s); },
  };
  $('#wakeBtn').addEventListener('click', () => {
    const c = D().choir; D().TUNG(1);
    if (c.paused) { c.currentTime = 0; c.volume = 0.8; c.play().catch(() => {}); } else c.pause();
  });

  // ═══ 2 · trailer
  const vid = $('#trailerVid'), tr = $('#trailer');
  const playTrailer = () => { D().choir.pause(); tr.classList.add('playing'); vid.currentTime = vid.ended ? 0 : vid.currentTime; vid.play(); };
  $('#playTrailer').addEventListener('click', playTrailer);
  vid.addEventListener('click', () => (vid.paused ? vid.play() : vid.pause()));
  vid.addEventListener('ended', () => tr.classList.remove('playing'));
  H.trailer = {
    enter() { D().choir.pause(); },
    key(e) { if (e.key === 'p' || e.key === 'P') { vid.paused ? playTrailer() : vid.pause(); return true; } },
    leave() { vid.pause(); tr.classList.remove('playing'); },
  };

  // ═══ 5 · loop (keys + beat light at the forest track's 104 BPM)
  let beatTimer = null;
  const keyMap = { w: 'w', arrowup: 'w', a: 'a', s: 's', d: 'd', ' ': ' ', j: ' ', shift: 'shift', k: 'shift', e: 'e' };
  H.loop = {
    enter() {
      clearInterval(beatTimer);
      beatTimer = setInterval(() => { const b = $('#beatDot'); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 120); }, 60000 / 104);
    },
    leave() { clearInterval(beatTimer); },
    key(e) {
      const k = keyMap[e.key.toLowerCase()]; if (!k) return;
      const el = $(`.key[data-k="${k}"]`); el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 140);
      const onBeat = $('#beatDot').classList.contains('on');
      if (k === ' ') D().blip(onBeat ? 990 : 520, 0.07, 'square', 0.09);
      else if (k === 'shift') D().blip(300, 0.12, 'sawtooth', 0.05);
      else if (k === 'e') D().TUNG(0.8);
      else D().blip(420, 0.03, 'triangle', 0.05);
      return k !== ' ';           // Space still advances the deck
    },
  };

  // ═══ 6 · sahur
  const BARKS = ['They call me Triple T. Watch.', 'You swing like you scroll. Tiny.', 'It copy everything. Be original.', 'Little sleepy. Help me up?', 'Is only moss. Takes time.', 'Bring shoes.', 'Always three. Two is rumor.'];
  $('#sahurPoke').addEventListener('click', () => {
    const img = $('#sahurImg'); img.src = 'media/sahur_attack_2.png'; D().TUNG(0.9);
    let b; do b = pick(BARKS); while (b === $('#bark').textContent);
    $('#bark').textContent = b;
    setTimeout(() => (img.src = 'media/sahur_idle_0.png'), 380);
  });

  // ═══ 7 · TRIPLE T
  const WALKUP = ['NOW BATTING... TRIPLE T.', 'Down 0-2. Send in the log.', 'An anomaly steps into the box.', 'No warm-up swings. He does not need them.', 'The bubble leads. A log approaches the plate.'];
  const HOMER = ['That ball has left the city.', 'Deep. Deeper. Out of the feed entirely.', 'Retired side, and a few retired postcodes.', 'Replay unavailable. It has not landed yet.'];
  let ultBusy = false;
  $('#ultBtn').addEventListener('click', async () => {
    if (ultBusy) return; ultBusy = true;
    const segs = $$('.ult-meter i'); segs.forEach((x) => x.classList.remove('on'));
    $('#ultCaption').textContent = pick(WALKUP);
    for (let i = 0; i < 3; i++) { await wait(420); segs[i].classList.add('on'); D().TUNG(0.6 + i * 0.25); }
    await wait(500);
    const hr = $('#homerun'); hr.classList.remove('on'); void hr.offsetWidth; hr.classList.add('on');
    D().tung(1.3); D().doFlash(0.9);
    await wait(700); $('#ultCaption').textContent = pick(HOMER);
    await wait(1100); ultBusy = false;
  });
  H.ult = { enter() { $$('.ult-meter i').forEach((x) => x.classList.remove('on')); $('#ultCaption').textContent = 'NOW BATTING... TRIPLE T.'; } };

  // ═══ 8 · worlds (versus cards are the game's own rows)
  const VS = [
    ['ECHO', ['AURA', '12', '9000'], ['ORIGINAL IDEAS', '0', '1'], ['TIER', 'SECRET', '???']],
    ['THE SCRAPER', ['HANDS', '40', '2'], ['LICENSE', 'NONE', 'WOOD'], ['TIER', 'MYTHIC', '???']],
    ['THE VALUATION', ['VALUE', 'INFINITE', '1 BAT'], ['PROFIT', 'NONE', 'RICE'], ['TIER', 'SECRET', '???']],
    ['THE AI BUBBLE', ['HYPE', 'MAX', 'HONEST'], ['INSIDE', 'NOTHING', '3 TUNGS'], ['TIER', 'SECRET', '???']],
  ];
  const showVs = (i, quiet) => {
    $$('.world').forEach((w) => w.classList.toggle('sel', +w.dataset.boss === i));
    const [name, ...rows] = VS[i];
    $('#vsName').textContent = name;
    $('#vsRows').innerHTML = rows.map(([k, a, b]) => `<div class="flip"><span>${k}: <b class="amber">${a}</b> vs <b style="color:var(--cyan)">${b}</b></span></div>`).join('');
    if (!quiet) D().blip(220, 0.18, 'sawtooth', 0.07);
  };
  $$('.world').forEach((w) => w.addEventListener('click', () => showVs(+w.dataset.boss)));
  H.worlds = { enter() { showVs(0, true); }, final() { showVs(0, true); } };

  // ═══ 10 · modifiers (only the ones that do something in v3)
  const MODS = [
    ['ALGORITHM BOOST', 'The feed likes you today. Aura doubles.'], ["RATIO'D", 'Everyone showed up, and faster. Aura pays more.'],
    ['GOLDEN HOUR', 'Everything shiny is about to be hit.'], ['LAG SPIKE', 'Slow enemies. Sturdy enemies. Sorry.'],
    ['TRENDING', 'More of them. Same you.'], ['SHADOWBANNED', 'Nobody can see you. Stay near the log.'],
    ['PATCH NOTES', 'Minor fixes. One upgrade, free.'], ['TOUCH GRASS', 'Kills drop little green sprouts. Eat one.'],
  ];
  let rolling = false;
  const roll = async () => {
    if (rolling) return; rolling = true;
    const nm = $('#slotName'), ln = $('#slotLine'); nm.classList.add('spin'); ln.textContent = '';
    const cur = nm.textContent; let i = 0;
    for (let t = 0; t < 16; t++) { nm.textContent = MODS[i++ % MODS.length][0]; D().blip(500 + t * 30, 0.03, 'square', 0.05); await wait(40 + t * 9); }
    let m; do m = pick(MODS); while (m[0] === cur);
    nm.classList.remove('spin'); nm.textContent = m[0]; ln.textContent = m[1]; D().TUNG(0.6); rolling = false;
  };
  $('#rollBtn').addEventListener('click', roll);
  H.mods = { key(e) { if (e.key === 'r' || e.key === 'R') { roll(); return true; } } };

  // ═══ 11 · combo
  const TIERS = [[3, 'TUNG TUNG TUNG'], [6, 'SIX TUNG. NO NOTES'], [9, 'SAHUUUR'], [15, 'BRAINROT GOD'], [25, 'TIER: SECRET'], [40, 'TIER: ???'], [60, 'SAHUR SOLOS'], [99, 'UNPRICED']];
  let combo = 0, comboT = null, comboStart = 0;
  const setCombo = (n, sound = true) => {
    combo = n; const el = $('#comboN'); el.textContent = 'x' + n; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    const tier = [...TIERS].reverse().find(([k]) => n >= k);
    $('#comboL').textContent = n === 0 ? 'CLICK / PRESS J TO HIT' : tier ? tier[1] : '...';
    $('#comboL').classList.toggle('rainbow', n >= 60);
    $$('#ladder li').forEach((li) => li.classList.toggle('hit', n >= +li.dataset.n));
    if (sound && n) { D().blip(330 * Math.pow(2, Math.min(n, 12) / 12), 0.06, 'square', 0.08); if (TIERS.some(([k]) => k === n)) D().TUNG(0.5); }
    const bar = $('#comboBar'); bar.style.transition = 'none'; bar.style.width = n ? '100%' : '0';
    if (n) requestAnimationFrame(() => { bar.style.transition = 'width 2.6s linear'; bar.style.width = '0'; });
  };
  const hit = () => { clearTimeout(comboT); setCombo(combo + 1); comboT = setTimeout(() => setCombo(0, false), 2600); };
  $('#comboBox').addEventListener('mousedown', (e) => { e.preventDefault(); hit(); });
  H.feel = {
    enter() { setCombo(0, false); },
    key(e) { if (e.key === 'j' || e.key === 'J') { if (!e.repeat) hit(); return true; } },
    final() { setCombo(15, false); $('#comboBar').style.width = '60%'; },
  };

  // ═══ 12 · answer him
  let answered = 0, answering = false;
  const resetAnswer = () => { answered = 0; $$('.calls i').forEach((i) => { i.classList.remove('on'); i.textContent = ''; }); $('#answerMsg').textContent = 'he calls first'; $('#answerBtn').textContent = 'ANSWER HIM'; };
  $('#answerBtn').addEventListener('click', async () => {
    if (answering) return;
    if (answered >= 3) { resetAnswer(); return; }
    answering = true;
    const sc = $$('.calls .col:not(.you) i')[answered], yc = $$('.calls .you i')[answered];
    sc.classList.add('on'); sc.textContent = 'TUNG'; D().tung(0.5); $('#answerMsg').textContent = 'SAHUR: TUNG';
    await wait(550);
    yc.classList.add('on'); yc.textContent = 'TUNG'; D().tung(0.9 + answered * 0.3); D().doFlash(0.4 + answered * 0.25);
    answered++;
    $('#answerMsg').textContent = answered < 3 ? `YOU: TUNG  (${answered} / 3)` : 'THE BUBBLE POPS.';
    if (answered === 3) { await wait(300); D().doFlash(1); $('#answerBtn').textContent = 'AGAIN - FOR HIM'; }
    answering = false;
  });
  H.story = {
    enter() { resetAnswer(); },
    final() { $$('.calls i').forEach((i) => { i.classList.add('on'); i.textContent = 'TUNG'; }); $('#answerMsg').textContent = 'THE BUBBLE POPS.'; },
  };

  // ═══ 14 · live demo
  const frame = $('#gameFrame');
  $('#loadGame').addEventListener('click', () => { D().choir.pause(); frame.src = frame.dataset.src; $('#demoCover').classList.add('gone'); setTimeout(() => frame.focus(), 300); });
  H.demo = {
    enter() { D().choir.pause(); },
    leave() { frame.src = 'about:blank'; $('#demoCover').classList.remove('gone'); },
  };

  // ═══ 16 · end: choir comes back
  H.end = { enter() { const c = D().choir; if (c.paused && !D().muted) { c.currentTime = 40; c.volume = 0.6; c.play().catch(() => {}); } }, leave() { D().choir.pause(); } };
})();
