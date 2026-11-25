// Screenshot harness for Astro Chess UI work.
// Usage: node shot.js <outDir> [tag]
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] || path.join(__dirname, 'shots');
const TAG = process.argv[3] || 'now';
fs.mkdirSync(OUT, { recursive: true });

const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

const VIEWPORTS = {
  mobile: { width: 414, height: 896, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1.5 },
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--allow-file-access-from-files',
      '--font-render-hinting=none',
      '--hide-scrollbars',
      '--no-sandbox',
    ],
  });

  const errors = [];

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(`[${vpName}] pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${vpName}] console: ${m.text()}`); });
    await page.setViewport(vp);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Let the boot loader finish
    await new Promise(r => setTimeout(r, 3500));

    // Force past loader
    await page.evaluate(() => {
      const l = document.getElementById('loading-screen');
      if (l) l.classList.add('hidden');
      const h = document.getElementById('home-screen');
      if (h) h.classList.remove('hidden');
      if (typeof UI !== 'undefined') { UI.updateProfileCard(); UI.updateGreeting && UI.updateGreeting(); }
    });
    await new Promise(r => setTimeout(r, 900));

    const shot = async (name) => {
      await page.screenshot({ path: path.join(OUT, `${TAG}-${vpName}-${name}.png`) });
    };

    await shot('01-home');

    // Open each home dropdown
    for (const [id, label] of [['ctrl-time-trigger', '02-time'], ['ctrl-skin-trigger', '03-skin'], ['ctrl-board-trigger', '04-board']]) {
      const el = await page.$('#' + id);
      if (el) { await el.click(); await new Promise(r => setTimeout(r, 500)); await shot(label);
        await page.evaluate(i => { const t = document.getElementById(i); t && t.click(); }, id);
        await new Promise(r => setTimeout(r, 300)); }
    }

    // Audio panel
    await page.evaluate(() => { const p = document.getElementById('global-audio-panel'); if (p) p.classList.remove('hidden'); });
    await new Promise(r => setTimeout(r, 400));
    await shot('05-audio');
    await page.evaluate(() => { const p = document.getElementById('global-audio-panel'); if (p) p.classList.add('hidden'); });

    // CPU difficulty modal
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showCpuModal(() => {}); });
    await new Promise(r => setTimeout(r, 600));
    await shot('06-cpu-modal');
    await page.evaluate(() => { const m = document.getElementById('cpu-modal'); if (m) m.classList.add('hidden'); });

    // Plaza hub
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showCpuHub(); });
    await new Promise(r => setTimeout(r, 900));
    await shot('07-plaza');
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.switchScreen('home-screen'); });
    await new Promise(r => setTimeout(r, 500));

    // Achievements modal
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showAchievementsModal(); });
    await new Promise(r => setTimeout(r, 700));
    await shot('08-achievements');
    await page.evaluate(() => { const m = document.getElementById('achievements-modal'); if (m) m.remove(); });

    // History screen
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showHistoryScreen(); });
    await new Promise(r => setTimeout(r, 600));
    await shot('09-history');

    // Game screen: start a local match, play a few moves
    await page.evaluate(() => {
      if (typeof initGame === 'function') { initGame('local'); UI.switchScreen('game-screen'); }
    });
    await new Promise(r => setTimeout(r, 900));
    await shot('10-game-start');

    // Play some moves to populate timeline / captured pieces
    await page.evaluate(async () => {
      const seq = [[6,4,4,4],[1,4,3,4],[7,6,5,5],[0,1,2,2],[7,5,4,2],[0,6,2,5],[6,3,4,3],[0,3,3,6]];
      const click = (r,c) => {
        const sq = document.getElementById(`sq-${r}-${c}`);
        if (sq) sq.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
      };
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const [fr,fc,tr,tc] of seq) { click(fr,fc); await wait(120); click(tr,tc); await wait(320); }
    });
    await new Promise(r => setTimeout(r, 800));
    await shot('11-game-moves');

    // Game options panel
    await page.evaluate(() => {
      const c = document.getElementById('game-options-menu');
      if (c) c.classList.remove('hidden');
    });
    await new Promise(r => setTimeout(r, 400));
    await shot('12-game-options');

    // Game over modal
    await page.evaluate(() => {
      if (typeof UI !== 'undefined') UI.showGameOverModal({
        result: 'win', winner: 'w', reason: 'checkmate',
        moves: 24, duration: 312, mostUsedPiece: 'N', playerScore: 42, oppScore: 12,
        checksGiven: 3, captureCount: 5, promotions: 1, eloChange: 24, newElo: 1244,
        diff: 'medium', mode: 'cpu',
      });
    });
    await new Promise(r => setTimeout(r, 2600));
    await shot('13-gameover');

    // Trading card
    await page.evaluate(() => {
      if (typeof UI !== 'undefined') UI.showTradingCard({ username: 'AstroBruh', elo: 1244, wins: 12, losses: 5, draws: 2, avatarId: null, favoritePiece: 'knight' }, false);
    });
    await new Promise(r => setTimeout(r, 900));
    await shot('14-trading-card');

    await page.close();
  }

  await browser.close();
  if (errors.length) {
    console.log('--- ERRORS ---');
    console.log([...new Set(errors)].join('\n'));
  } else {
    console.log('no console errors');
  }
  console.log('shots in', OUT);
})();
