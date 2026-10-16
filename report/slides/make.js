// Builds the 12-slide Sahur Protocol presentation: slides.html -> PNGs -> .pptx (+ PDF).
// Run from report/:  node slides/make.js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const PptxGenJS = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(OUT, { recursive: true });

const A = (rel) => {
  const base = rel.replace(/\.(png|jpe?g)$/i, '');
  for (const ext of ['.jpg', '.png']) if (fs.existsSync(path.join(ROOT, 'assets/web', base + ext))) return `../assets/web/${base}${ext}`;
  return `../assets/${rel}`;
};
const crt = (rel, extra = '') => `<div class="crt" ${extra}><div class="screen"><img src="${A(rel)}"></div></div>`;
const P = {
  1: { n: 'P1', name: 'AADIDEV RAIZADA', roll: 'N152', c: 'var(--magenta)' },
  2: { n: 'P2', name: 'KUSH MODI', roll: 'N135', c: 'var(--cyan)' },
  3: { n: 'P3', name: 'PRATHAM BALDEWA', roll: 'N153', c: 'var(--yellow)' },
};
const stat = (v, k, col) => `<div class="stat" style="--sc:${col}"><b>${v}</b><span>${k}</span></div>`;

const slides = [];
const add = (who, kicker, html, notes) => slides.push({ who, kicker, html, notes });

require('./deck')({ add, crt, A, stat, P });

// ───────────────────────────────────────────── HTML
const css = fs.readFileSync(path.join(__dirname, 'slides.css'), 'utf8');
const total = slides.length;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
${slides.map((s, i) => `<section class="slide${i === 0 ? ' title' : ''}" id="s${i + 1}">
<div class="bgfx"></div>
${s.kicker ? `<div class="kicker">${s.kicker}</div>` : ''}
${s.html}
<footer><span>SAHUR PROTOCOL // SE MINI-PROJECT</span>${s.who ? `<span class="who" style="--pc:${P[s.who].c}">▶ ${P[s.who].n} · ${P[s.who].name} · ${P[s.who].roll}</span>` : '<span class="who all">P1 · P2 · P3</span>'}<span class="num">${String(i + 1).padStart(2, '0')}/${total}</span></footer>
</section>`).join('\n')}
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'slides.html'), html);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });
  await page.goto('file:///' + path.join(__dirname, 'slides.html').split(path.sep).join('/'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // overflow check
  const over = await page.$$eval('section.slide', (els) => els.map((el, i) => (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2 ? i + 1 : null)).filter(Boolean));
  if (over.length) console.log('WARN overflow on slides', over.join(','));
  const pngs = [];
  const els = await page.$$('section.slide');
  for (let i = 0; i < els.length; i++) {
    const f = path.join(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await els[i].screenshot({ path: f, type: 'png' }); pngs.push(f);
  }
  await page.pdf({ path: path.join(OUT, 'Sahur_Protocol_Presentation.pdf'), width: '1920px', height: '1080px', printBackground: true, pageRanges: '' });
  await browser.close();

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Sahur Protocol — SE Mini-Project';
  pptx.author = 'Aadidev Raizada, Kush Modi, Pratham Baldewa';
  slides.forEach((s, i) => {
    const sl = pptx.addSlide();
    sl.background = { color: '120D1F' };
    sl.addImage({ path: pngs[i], x: 0, y: 0, w: 13.333, h: 7.5 });
    sl.addNotes(s.notes);
  });
  await pptx.writeFile({ fileName: path.join(OUT, 'Sahur_Protocol_Presentation.pptx') });
  console.log('done', pngs.length, 'slides');
})().catch((e) => { console.error(e); process.exit(1); });
