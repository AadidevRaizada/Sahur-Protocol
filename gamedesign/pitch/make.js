// Exports the interactive pitch to PNG stills, a PDF and a PPTX (trailer embedded, notes kept).
// Run from repo root:  node gamedesign/pitch/make.js
const fs = require('fs');
const path = require('path');
const NM = path.resolve(__dirname, '../../report/node_modules');
const puppeteer = require(path.join(NM, 'puppeteer-core'));
const PptxGenJS = require(path.join(NM, 'pptxgenjs'));

const OUT = path.join(__dirname, 'out');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
const url = 'file:///' + path.join(__dirname, 'Sahur_Protocol_Pitch.html').split(path.sep).join('/') + '?export';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const v = document.getElementById('trailerVid'); v.currentTime = 21;
    await new Promise((r) => (v.readyState >= 2 ? setTimeout(r, 300) : v.addEventListener('seeked', () => setTimeout(r, 300), { once: true })));
  });
  await new Promise((r) => setTimeout(r, 800));
  const info = await page.$$eval('section.slide', (els) => els.map((el) => ({
    id: el.id, notes: (el.querySelector('.notes')?.textContent || '').trim(),
    over: el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2,
    broken: [...el.querySelectorAll('img')].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src')),
  })));
  const els = await page.$$('section.slide');
  const pngs = [];
  for (let i = 0; i < els.length; i++) {
    const f = path.join(OUT, 'png', `slide-${String(i + 1).padStart(2, '0')}-${info[i].id}.png`);
    await els[i].screenshot({ path: f, type: 'png' }); pngs.push(f);
    if (info[i].over) console.log('WARN overflow', info[i].id);
    if (info[i].broken.length) console.log('WARN broken img', info[i].id, info[i].broken.join(' '));
  }
  await page.pdf({ path: path.join(OUT, 'Sahur_Protocol_Pitch.pdf'), width: '1920px', height: '1080px', printBackground: true });
  await browser.close();

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Sahur Protocol: the pitch';
  pptx.author = 'Aadidev, Aditya, Arnav, Zeshawn, Viraj';
  info.forEach((s, i) => {
    const sl = pptx.addSlide();
    sl.background = { color: '07090F' };
    if (s.id === 'trailer') {
      sl.addMedia({ type: 'video', path: path.join(__dirname, 'media/trailer.mp4'), cover: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'media/still-21.jpg')).toString('base64'), x: 0, y: 0, w: 13.333, h: 7.5 });
    } else {
      sl.addImage({ path: pngs[i], x: 0, y: 0, w: 13.333, h: 7.5 });
    }
    if (s.id === 'demo') sl.addText('▶ PLAY: sahur-protocol.vercel.app', { x: 0.55, y: 6.55, w: 8.5, h: 0.5, fontSize: 16, color: 'FFB547', bold: true, hyperlink: { url: 'https://sahur-protocol.vercel.app' } });
    sl.addNotes(s.notes);
  });
  await pptx.writeFile({ fileName: path.join(OUT, 'Sahur_Protocol_Pitch.pptx') });
  console.log('done', pngs.length, 'slides');
})().catch((e) => { console.error(e); process.exit(1); });
