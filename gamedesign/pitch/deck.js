// Tiny deck engine: 1920x1080 stage, fragments, per-slide hooks, synth TUNG.
// Keys: → / Space / PgDn next · ← / PgUp back · F fullscreen · M mute · Home/End · 1-9 jump
(() => {
  const EXPORT = /[?&]export\b/.test(location.search);
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  const bar = document.querySelector('#hud i');
  const flash = document.getElementById('flash');
  const hooks = (window.HOOKS = window.HOOKS || {});
  let cur = 0, muted = false, AC = null;

  if (EXPORT) { document.body.classList.add('export'); slides.forEach((s) => hooks[s.id]?.final?.(s)); return; }

  // ── scale stage to window
  const fit = () => {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${k})`;
    stage.style.transformOrigin = 'center center';
  };
  addEventListener('resize', fit); fit();

  // ── audio
  const ac = () => { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; };
  const tung = (gain = 1) => {
    if (muted) return;
    const a = ac(), t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.32);
    g.gain.setValueAtTime(0.9 * gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.55);
    const o2 = a.createOscillator(), g2 = a.createGain(); // wooden knock
    o2.type = 'triangle'; o2.frequency.setValueAtTime(620, t); o2.frequency.exponentialRampToValueAtTime(240, t + 0.06);
    g2.gain.setValueAtTime(0.45 * gain, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o2.connect(g2).connect(a.destination); o2.start(t); o2.stop(t + 0.1);
  };
  const blip = (f = 880, d = 0.05, type = 'square', v = 0.08) => {
    if (muted) return;
    const a = ac(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  };
  const doFlash = (strength = 0.8) => {
    flash.style.transition = 'none'; flash.style.opacity = strength;
    requestAnimationFrame(() => { flash.style.transition = 'opacity .45s ease-out'; flash.style.opacity = 0; });
    stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
  };
  const TUNG = (g) => { tung(g); doFlash(0.55); };
  const choir = document.getElementById('choir');
  const setMuted = (m) => { muted = m; document.querySelectorAll('audio,video').forEach((el) => (el.muted = m)); };

  window.DECK = { tung, TUNG, blip, doFlash, choir, get muted() { return muted; }, go: (i) => show(i) };

  // ── navigation with fragments
  const steps = (s) => [...s.querySelectorAll('[data-step]')].sort((a, b) => +a.dataset.step - +b.dataset.step);
  const show = (i, fromBack = false) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const prev = slides[cur];
    if (prev && prev !== slides[i]) { hooks[prev.id]?.leave?.(prev); prev.classList.remove('on'); }
    cur = i;
    const s = slides[i];
    s.classList.add('on');
    steps(s).forEach((el) => el.classList.toggle('shown', fromBack));
    bar.style.width = `${((i + 1) / slides.length) * 100}%`;
    location.hash = s.id;
    hooks[s.id]?.enter?.(s, fromBack);
  };
  const next = () => {
    const s = slides[cur];
    if (hooks[s.id]?.next?.(s) === true) return;            // hook consumed the press
    const hidden = steps(s).filter((el) => !el.classList.contains('shown'));
    if (hidden.length) {
      const n = hidden[0].dataset.step;
      hidden.filter((el) => el.dataset.step === n).forEach((el) => { el.classList.add('shown'); if (el.dataset.tung != null) TUNG(0.8); });
      blip(660, 0.04);
      return;
    }
    if (cur < slides.length - 1) show(cur + 1);
  };
  const prev = () => {
    const s = slides[cur];
    const shown = steps(s).filter((el) => el.classList.contains('shown'));
    if (shown.length) { const n = shown[shown.length - 1].dataset.step; shown.filter((el) => el.dataset.step === n).forEach((el) => el.classList.remove('shown')); return; }
    if (cur > 0) show(cur - 1, true);
  };

  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('iframe,input,textarea')) return;
    const s = slides[cur];
    if (hooks[s.id]?.key?.(e, s) === true) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0); else if (k === 'End') show(slides.length - 1);
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (k === 'm' || k === 'M') setMuted(!muted);
  });
  // click on empty area of a slide = next (buttons/interactive elements opt out)
  stage.addEventListener('click', (e) => {
    if (e.target.closest('button,a,video,iframe,.interactive,[data-click]')) return;
    ac(); next();
  });

  const start = slides.findIndex((s) => '#' + s.id === location.hash);
  show(start >= 0 ? start : 0);
})();
