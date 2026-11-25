const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'diag');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, pass, detail) => {
  results.push((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.setViewport({ width: 1440, height: 900 });

  // ---- Boot: loader + skeleton ----
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 900));
  const boot = await page.evaluate(() => ({
    skeleton: !!document.getElementById('boot-skeleton'),
    loaderVisible: !document.getElementById('loading-screen').classList.contains('hidden'),
    barWidth: document.getElementById('loader-progress-fill').style.width,
    status: document.getElementById('loader-status-text').textContent,
  }));
  check('boot skeleton removed by loader', !boot.skeleton, JSON.stringify(boot));

  await new Promise(r => setTimeout(r, 4000));
  const afterBoot = await page.evaluate(() => ({
    home: !document.getElementById('home-screen').classList.contains('hidden'),
    loader: document.getElementById('loading-screen').classList.contains('hidden'),
  }));
  check('boot completes to home screen', afterBoot.home && afterBoot.loader, JSON.stringify(afterBoot));

  // ---- Start a local game ----
  await page.evaluate(() => { initGame('local'); UI.switchScreen('game-screen'); });
  await new Promise(r => setTimeout(r, 500));

  // ---- Keyboard: F flips ----
  const beforeFlip = await page.evaluate(() => isFlipped);
  await page.keyboard.press('f');
  await new Promise(r => setTimeout(r, 250));
  const afterFlip = await page.evaluate(() => ({ flip: isFlipped, attr: document.getElementById('board-wrapper').dataset.flipped }));
  check('keyboard F flips the board', afterFlip.flip !== beforeFlip, JSON.stringify(afterFlip));
  await page.keyboard.press('f');
  await new Promise(r => setTimeout(r, 200));

  // ---- Keyboard: arrow cursor ----
  await page.keyboard.press('ArrowUp');
  await new Promise(r => setTimeout(r, 150));
  const cursor = await page.evaluate(() => {
    const a = document.activeElement;
    return { tag: a.tagName, id: a.id, cls: a.className, label: a.getAttribute('aria-label') };
  });
  check('arrow keys focus a board square', cursor.id && cursor.id.startsWith('sq-'), JSON.stringify(cursor));

  // ---- Pause ----
  await page.keyboard.press('p');
  await new Promise(r => setTimeout(r, 400));
  const paused = await page.evaluate(() => ({
    overlay: !document.getElementById('pause-overlay').classList.contains('hidden'),
    timerPaused: Timer.isPaused(),
    label: document.querySelector('#btn-pause .btn-game-label').textContent,
    icon: document.querySelector('#btn-pause i').className,
  }));
  check('P pauses: overlay + Timer.isPaused()', paused.overlay && paused.timerPaused, JSON.stringify(paused));
  check('pause button reflects state', paused.label === 'Resume' && paused.icon.includes('fa-play'), JSON.stringify(paused));

  const t1 = await page.evaluate(() => document.getElementById('timer-white').textContent);
  await new Promise(r => setTimeout(r, 1600));
  const t2 = await page.evaluate(() => document.getElementById('timer-white').textContent);
  check('clock frozen while paused', t1 === t2, `${t1} vs ${t2}`);

  await page.screenshot({ path: path.join(OUT, 'pause-overlay.png') });

  // ---- Escape resumes ----
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));
  const resumed = await page.evaluate(() => ({
    overlay: document.getElementById('pause-overlay').classList.contains('hidden'),
    timerPaused: Timer.isPaused(),
  }));
  check('Escape closes pause', resumed.overlay && !resumed.timerPaused, JSON.stringify(resumed));

  // ---- Material readout ----
  await page.evaluate(() => {
    // nx: play a capture sequence  e4 d5 exd5
    const click = (r, c) => document.getElementById(`sq-${r}-${c}`).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    click(6, 4); click(4, 4);
    click(1, 3); click(3, 3);
    click(4, 4); click(3, 3);
  });
  await new Promise(r => setTimeout(r, 700));
  const mat = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.material-adv')].map(e => e.textContent);
    const capW = document.querySelector('#captured-by-white').innerHTML.length;
    const lastMove = document.querySelectorAll('.square.last-move').length;
    return { chips, capW, lastMove };
  });
  check('capture produces +1 material chip', mat.chips.includes('+1'), JSON.stringify(mat));
  check('last-move highlight applied', mat.lastMove === 2, JSON.stringify(mat));

  // ---- Aria labels updated ----
  const aria = await page.evaluate(() => ({
    boardRole: document.getElementById('chessboard').getAttribute('role'),
    d5: document.getElementById('sq-3-3').getAttribute('aria-label'),
    statusRole: document.getElementById('status-message').getAttribute('role'),
  }));
  check('board has role=grid', aria.boardRole === 'grid', JSON.stringify(aria));
  check('square labels updated after capture', /d5, white pawn/.test(aria.d5 || ''), aria.d5);

  // ---- Board theme switch ----
  await page.evaluate(() => { BoardRenderer.applyBoardTheme('royal', 0.8); });
  await new Promise(r => setTimeout(r, 200));
  const theme = await page.evaluate(() => {
    const rs = getComputedStyle(document.documentElement);
    const coord = getComputedStyle(document.querySelector('#sq-7-7 .sq-coord') || document.body);
    return {
      light: rs.getPropertyValue('--sq-light').trim(),
      coordOnDark: rs.getPropertyValue('--coord-on-dark').trim(),
      coordColor: coord.color,
      op: rs.getPropertyValue('--board-op').trim(),
    };
  });
  check('royal theme applies distinct square colours', theme.light === '214, 213, 240', JSON.stringify(theme));
  check('coordinate colour token published', theme.coordOnDark === '#e6e3ff', JSON.stringify(theme));

  await page.screenshot({ path: path.join(OUT, 'royal-theme.png') });

  // ---- Modal focus trap ----
  await page.evaluate(() => UI.showCpuModal(() => {}));
  await new Promise(r => setTimeout(r, 500));
  const focusIn = await page.evaluate(() => {
    const m = document.getElementById('cpu-modal');
    return { contained: m.contains(document.activeElement), tag: document.activeElement.tagName };
  });
  check('modal moves focus inside itself', focusIn.contained, JSON.stringify(focusIn));

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));
  const modalClosed = await page.evaluate(() => document.getElementById('cpu-modal').classList.contains('hidden'));
  check('Escape closes a modal', modalClosed);

  // ---- Mobile chip check ----
  await page.setViewport({ width: 414, height: 896, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => { initGame('local'); UI.switchScreen('game-screen'); });
  await new Promise(r => setTimeout(r, 500));
  // Give black the turn so the chip shows
  await page.evaluate(() => {
    const click = (r, c) => document.getElementById(`sq-${r}-${c}`).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    click(6, 4); click(4, 4);
  });
  await new Promise(r => setTimeout(r, 700));
  const mobile = await page.evaluate(() => {
    const panel = document.getElementById('panel-black');
    const chip = panel.querySelector('.turn-chip');
    const cs = chip ? getComputedStyle(chip) : null;
    let clipped = false;
    if (chip) {
      const pr = panel.getBoundingClientRect();
      const cr = chip.getBoundingClientRect();
      clipped = cr.right > pr.right + 1;
    }
    return {
      hasChip: !!chip,
      chipText: chip ? chip.textContent : null,
      colored: cs ? cs.color : null,
      clipped,
      panelBox: JSON.stringify(panel.getBoundingClientRect().toJSON()),
    };
  });
  check('mobile: turn chip present with explicit colour', mobile.hasChip && mobile.colored !== 'rgb(255, 255, 255)', JSON.stringify(mobile));
  check('mobile: turn chip not clipped', !mobile.clipped, JSON.stringify(mobile));

  await page.screenshot({ path: path.join(OUT, 'mobile-turn.png') });

  await browser.close();

  console.log('\n' + results.join('\n'));
  console.log('\nconsole errors: ' + (errors.length ? [...new Set(errors)].join(' | ') : 'none'));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  console.log('FAILURES: ' + fails);
})();
