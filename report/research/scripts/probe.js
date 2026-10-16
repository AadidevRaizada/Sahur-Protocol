const puppeteer = require('puppeteer-core');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../../../Sahur_Protocol.html').split(path.sep).join('/');
(async()=>{
  const browser = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true,
    args:['--autoplay-policy=no-user-gesture-required','--mute-audio']});
  const page = await browser.newPage();
  page.on('console', m=>console.log('console:', m.type(), m.text()));
  page.on('pageerror', e=>console.log('pageerror', e.message));
  await page.setViewport({width:844,height:390,deviceScaleFactor:2,isMobile:true,hasTouch:true,isLandscape:true});
  await page.goto(URL, {waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  console.log(URL);
  console.log(await page.evaluate(()=>({coarse:matchMedia('(pointer:coarse)').matches, touchOn:document.getElementById('touchUI').className, mode, stateNull: state===null, fonts: document.fonts.check('20px "Press Start 2P"')})));
  console.log(typeof page.touchscreen.touchStart, typeof page.touchscreen.touchMove, typeof page.touchscreen.touchEnd);
  await browser.close();
})();
