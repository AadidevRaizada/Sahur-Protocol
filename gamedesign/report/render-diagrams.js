// Renders the Mermaid figures in diagrams.html to PNGs in figs/. Run from repo root.
const path = require('path');
const NM = path.resolve(__dirname, '../../report/node_modules');
const puppeteer = require(path.join(NM, 'puppeteer-core'));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: 1800, height: 1200, deviceScaleFactor: 2 });
  await p.goto('file:///' + path.join(__dirname, 'diagrams.html').split(path.sep).join('/'), { waitUntil: 'networkidle0' });
  await p.waitForFunction(() => document.querySelectorAll('.mermaid svg').length === 2 && document.querySelector('.mmlines path'), { timeout: 30000 });
  for (const id of ['flow', 'loop', 'mind']) { const el = await p.$('#' + id); await el.screenshot({ path: path.join(__dirname, 'figs', `fig-${id}.png`) }); }
  await b.close(); console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
