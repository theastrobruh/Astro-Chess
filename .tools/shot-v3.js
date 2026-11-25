// Visual capture of the review mode, the resume card and the mobile layout.
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'shots-v3');
fs.mkdirSync(OUT, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));
const clickSq = (page, r, c) => page.evaluate((r, c) => {
  document.getElementById(`sq-${r}-${c}`).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}, r, c);

const OPENING = [
  [6, 4, 4, 4], [1, 4, 3, 4], [7, 6, 5, 5], [0, 1, 2, 2],
  [7, 5, 4, 2], [0, 6, 2, 5], [6, 3, 4, 3], [0, 3, 3, 4],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--hide-scrollbars'],
  });

  for (const [tag, vp] of Object.entries({
    mobile:  { width: 414, height: 896, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
  })) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await wait(4200);
    await page.evaluate(() => localStorage.removeItem('astrochess_in_progress'));

    // Play the opening
    await page.evaluate(() => { initGame('local'); UI.switchScreen('game-screen'); });
    await wait(400);
    for (const [fr, fc, tr, tc] of OPENING) {
      await clickSq(page, fr, fc); await wait(70);
      await clickSq(page, tr, tc); await wait(180);
    }
    await wait(700);

    await page.screenshot({ path: path.join(OUT, `v021-${tag}-A-live-with-transport.png`) });

    // Enter review on ply 4 (after Nc6)
    await page.evaluate(() => document.querySelector('#move-timeline .tl-entry[data-ply="4"]').click());
    await wait(450);
    await page.screenshot({ path: path.join(OUT, `v021-${tag}-B-review-ply4.png`) });

    // Exit and go home for the resume card
    await page.evaluate(() => Experience.exitReview());
    await wait(300);
    await page.evaluate(() => { saveGameInProgress(); UI.switchScreen('home-screen'); });
    await wait(700);
    await page.screenshot({ path: path.join(OUT, `v021-${tag}-C-resume-card.png`) });

    await page.close();
  }

  await browser.close();
  console.log('shots in', OUT);
})();
