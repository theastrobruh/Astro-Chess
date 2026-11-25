// Exercises the two v.021 features: click-to-review on the Move Timeline,
// and persisting / resuming an in-progress game from the Home screen.
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

const clickSq = (page, r, c) => page.evaluate((r, c) => {
  document.getElementById(`sq-${r}-${c}`)
    .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}, r, c);

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await wait(4200);
  await page.evaluate(() => { localStorage.removeItem('astrochess_in_progress'); });

  // ── Start a local game and play a real opening ──────────────
  await page.evaluate(() => { initGame('local'); UI.switchScreen('game-screen'); });
  await wait(500);

  const opening = [
    [6, 4, 4, 4],  // e4
    [1, 4, 3, 4],  // e5
    [7, 6, 5, 5],  // Nf3
    [0, 1, 2, 2],  // Nc6
    [7, 5, 4, 2],  // Bc4
    [0, 6, 2, 5],  // Nf6
  ];
  for (const [fr, fc, tr, tc] of opening) {
    await clickSq(page, fr, fc); await wait(70);
    await clickSq(page, tr, tc); await wait(200);
  }
  await wait(700);

  const afterOpening = await page.evaluate(() => ({
    plies: reviewHistory.length,
    chips: document.querySelectorAll('#move-timeline .tl-entry').length,
    lastChipPly: (document.querySelector('#move-timeline .tl-entry.tl-latest') || {}).dataset?.ply,
    allButtons: Array.from(document.querySelectorAll('#move-timeline .tl-entry'))
      .every(el => el.tagName === 'BUTTON'),
    reviewBar: !!document.querySelector('.tl-review-bar'),
    btnCount: document.querySelectorAll('.tl-review-bar .tl-review-btn').length,
    countText: (document.querySelector('.tl-review-count') || {}).textContent,
  }));
  check('6 plies recorded + 6 timeline chips', afterOpening.plies === 6 && afterOpening.chips === 6,
    JSON.stringify(afterOpening));
  check('chips are real buttons for keyboard/click', afterOpening.allButtons, JSON.stringify(afterOpening));
  check('review transport bar exists with 4 buttons', afterOpening.reviewBar && afterOpening.btnCount === 4,
    JSON.stringify(afterOpening));

  // ── Click a chip to review ──────────────────────────────────
  // Chip for ply 3 = Bc4. Capture the live knight position first.
  const liveNf3 = await page.evaluate(() => {
    const el = document.querySelector('#pieces-layer .piece[data-r="5"][data-c="5"]');
    return el ? el.className : null;
  });

  await page.evaluate(() => {
    document.querySelector('#move-timeline .tl-entry[data-ply="3"]').click();
  });
  await wait(400);

  const reviewing = await page.evaluate(() => ({
    isReviewing: window.__astroIsReviewing(),
    activeChip: (document.querySelector('.tl-entry.tl-active') || {}).dataset?.ply,
    countText: document.querySelector('.tl-review-count').textContent,
    exitVisible: !document.querySelector('.tl-review-exit').hidden,
    bodyClass: document.body.classList.contains('astro-reviewing'),
    piecesCount: document.querySelectorAll('#pieces-layer .piece').length,
    // At ply 3 the white knight has moved from g1 (7,6) to f3 (5,5)
    hasKnightF3: !!document.querySelector('#pieces-layer .piece[data-r="5"][data-c="5"]'),
    // and the white bishop is still on f1 (7,5), not yet on c4 (4,2)
    bishopStillF1: !!document.querySelector('#pieces-layer .piece[data-r="7"][data-c="5"]'),
    bishopNotC4: !document.querySelector('#pieces-layer .piece[data-r="4"][data-c="2"]'),
    clockPaused: Timer.isPaused(),
  }));
  check('clicking a chip enters review mode', reviewing.isReviewing && reviewing.bodyClass,
    JSON.stringify(reviewing));
  check('active chip is marked', reviewing.activeChip === '3', JSON.stringify(reviewing));
  check('board shows the position AFTER ply 3 (Nf3 played, Bc4 not yet)',
    reviewing.hasKnightF3 && reviewing.bishopStillF1 && reviewing.bishopNotC4,
    JSON.stringify(reviewing));
  check('review counter reads 3 / 6', reviewing.countText.trim() === '3 / 6', reviewing.countText);
  check('clock is frozen while reviewing', reviewing.clockPaused, JSON.stringify(reviewing));

  await page.screenshot({ path: path.join(OUT, 'review-desktop.png') });

  // Board clicks must be inert during review
  const beforeClick = await page.evaluate(() => reviewHistory.length);
  await clickSq(page, 6, 0); await wait(120); await clickSq(page, 4, 0); await wait(200);
  const afterClick = await page.evaluate(() => reviewHistory.length);
  check('board clicks are inert during review', beforeClick === afterClick,
    `${beforeClick} → ${afterClick}`);

  // ── Transport buttons ───────────────────────────────────────
  await page.click('#btn-review-back'); await wait(300);
  const atStart = await page.evaluate(() => ({
    active: (document.querySelector('.tl-entry.tl-active') || {}).dataset?.ply,
    backDisabled: document.getElementById('btn-review-back').disabled,
    // After ply 1 (e4) the e-pawn sits on e4 (4,4) and d2 pawn untouched
    pawnE4: !!document.querySelector('#pieces-layer .piece[data-r="4"][data-c="4"]'),
  }));
  check('"go to start" jumps to ply 1', atStart.active === '1' && atStart.pawnE4, JSON.stringify(atStart));
  check('back button disabled at the start', atStart.backDisabled, JSON.stringify(atStart));

  await page.click('#btn-review-last'); await wait(300);
  const atEnd = await page.evaluate(() => ({
    active: (document.querySelector('.tl-entry.tl-active') || {}).dataset?.ply,
    lastDisabled: document.getElementById('btn-review-last').disabled,
  }));
  check('"go to end" jumps to the last ply', atEnd.active === '6' && atEnd.lastDisabled, JSON.stringify(atEnd));

  // Keyboard stepping
  await page.keyboard.press('ArrowLeft'); await wait(250);
  const stepped = await page.evaluate(() => (document.querySelector('.tl-entry.tl-active') || {}).dataset?.ply);
  check('ArrowLeft steps back one ply in review', stepped === '5', 'ply ' + stepped);

  // ── Exit review restores the live board ─────────────────────
  await page.click('.tl-review-exit'); await wait(400);
  const exited = await page.evaluate(() => ({
    isReviewing: window.__astroIsReviewing(),
    bodyClass: document.body.classList.contains('astro-reviewing'),
    exitHidden: document.querySelector('.tl-review-exit').hidden,
    knightF3: !!document.querySelector('#pieces-layer .piece[data-r="5"][data-c="5"]'),
    bishopC4: !!document.querySelector('#pieces-layer .piece[data-r="4"][data-c="2"]'),
    clockRunning: !Timer.isPaused(),
  }));
  check('exiting review restores the live position',
    !exited.isReviewing && exited.knightF3 && exited.bishopC4, JSON.stringify(exited));
  check('clock resumes after review', exited.clockRunning, JSON.stringify(exited));
  check('exit button hidden when not reviewing', exited.exitHidden, JSON.stringify(exited));

  // ── Persistence: the game is saved ──────────────────────────
  const saved = await page.evaluate(() => {
    // Force the debounced save to flush
    saveGameInProgress();
    const raw = localStorage.getItem('astrochess_in_progress');
    if (!raw) return { present: false };
    const d = JSON.parse(raw);
    return {
      present: true,
      plies: d.reviewHistory.length,
      mode: d.mode,
      turn: d.currentPlayer,
      hasBoard: Array.isArray(d.board) && d.board.length === 8,
      hasClocks: !!d.remaining,
      descriptions: describeSavedGame(),
    };
  });
  check('in-progress game is persisted to localStorage', saved.present && saved.plies === 6,
    JSON.stringify(saved));
  check('saved payload carries board, clocks and turn',
    saved.hasBoard && saved.hasClocks && saved.turn === 'w', JSON.stringify(saved));

  // ── Resume card on Home ─────────────────────────────────────
  await page.evaluate(() => UI.switchScreen('home-screen'));
  await wait(600);
  const card = await page.evaluate(() => {
    const el = document.getElementById('resume-card');
    return {
      exists: !!el,
      title: el ? el.querySelector('.resume-card-title').textContent.trim() : null,
      meta: el ? el.querySelector('.resume-card-meta').textContent.trim() : null,
      resumeBtn: !!document.getElementById('btn-resume-game'),
      discardBtn: !!document.getElementById('btn-discard-game'),
    };
  });
  check('Home shows the Resume card', card.exists && card.resumeBtn && card.discardBtn, JSON.stringify(card));
  check('Resume card names the opponent and turn', /Local|vs\./.test(card.title || '') && /Turno de/.test(card.meta || ''),
    JSON.stringify(card));

  await page.screenshot({ path: path.join(OUT, 'resume-card.png') });

  // ── Actually resume: reload the page, then resume ───────────
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(4200);
  const afterReload = await page.evaluate(() => {
    const el = document.getElementById('resume-card');
    return { cardPresent: !!el, plies: (typeof loadSavedGame === 'function' && loadSavedGame()) ? loadSavedGame().reviewHistory.length : 0 };
  });
  check('Resume card survives a full page reload',
    afterReload.cardPresent && afterReload.plies === 6, JSON.stringify(afterReload));

  await page.click('#btn-resume-game');
  await wait(900);
  const resumed = await page.evaluate(() => ({
    onGameScreen: !document.getElementById('game-screen').classList.contains('hidden'),
    pieces: document.querySelectorAll('#pieces-layer .piece').length,
    chips: document.querySelectorAll('#move-timeline .tl-entry').length,
    knightF3: !!document.querySelector('#pieces-layer .piece[data-r="5"][data-c="5"]'),
    bishopC4: !!document.querySelector('#pieces-layer .piece[data-r="4"][data-c="2"]'),
    turnLabel: document.getElementById('status-message').textContent.trim(),
    whiteChip: !!document.querySelector('#panel-white .turn-chip'),
    blackChip: !!document.querySelector('#panel-black .turn-chip'),
    timer: document.getElementById('timer-white').textContent,
    reviewHistoryLen: reviewHistory.length,
    // Review must still work on a resumed game
    reviewing: window.__astroIsReviewing(),
  }));
  check('Resume opens the board with every piece in place',
    resumed.onGameScreen && resumed.pieces === 32 && resumed.knightF3 && resumed.bishopC4,
    JSON.stringify(resumed));
  check('Resume restores the Move Timeline chips', resumed.chips === 6, JSON.stringify(resumed));
  check('Resume restores the turn and flags the active panel',
    /White/i.test(resumed.turnLabel) && resumed.whiteChip, JSON.stringify(resumed));
  check('Resume restores review history', resumed.reviewHistoryLen === 6, JSON.stringify(resumed));

  await page.screenshot({ path: path.join(OUT, 'resumed-game.png') });

  // Review still works after resume
  await page.evaluate(() => document.querySelector('#move-timeline .tl-entry[data-ply="2"]').click());
  await wait(350);
  const reviewAfterResume = await page.evaluate(() => ({
    isReviewing: window.__astroIsReviewing(),
    active: (document.querySelector('.tl-entry.tl-active') || {}).dataset?.ply,
  }));
  check('click-to-review works on a resumed game',
    reviewAfterResume.isReviewing && reviewAfterResume.active === '2', JSON.stringify(reviewAfterResume));
  await page.evaluate(() => Experience.exitReview());
  await wait(300);

  // ── Discard ─────────────────────────────────────────────────
  await page.evaluate(() => UI.switchScreen('home-screen'));
  await wait(500);
  await page.click('#btn-discard-game');
  await wait(500);
  const discarded = await page.evaluate(() => ({
    card: !!document.getElementById('resume-card'),
    stored: localStorage.getItem('astrochess_in_progress'),
  }));
  check('Discard removes the card and the stored game',
    !discarded.card && !discarded.stored, JSON.stringify(discarded));

  // ── A finished game must not be resumable ───────────────────
  await page.evaluate(() => {
    initGame('local'); UI.switchScreen('game-screen');
  });
  await wait(300);
  for (const [fr, fc, tr, tc] of [[6, 4, 4, 4], [1, 4, 3, 4]]) {
    await clickSq(page, fr, fc); await wait(70); await clickSq(page, tr, tc); await wait(200);
  }
  await wait(700);
  const savedBeforeEnd = await page.evaluate(() => !!localStorage.getItem('astrochess_in_progress'));
  await page.evaluate(() => {
    gameOver = true;
    _showGameEndModal({ status: 'resign', winner: 'w' });
  });
  await wait(800);
  const afterEnd = await page.evaluate(() => !!localStorage.getItem('astrochess_in_progress'));
  check('finishing a game clears the saved snapshot', savedBeforeEnd && !afterEnd,
    `before=${savedBeforeEnd} after=${afterEnd}`);

  await browser.close();

  console.log('\n' + results.join('\n'));
  console.log('\nconsole errors: ' + (errors.length ? [...new Set(errors)].join(' | ') : 'none'));
  console.log('FAILURES: ' + results.filter(r => r.startsWith('FAIL')).length);
})()
  .catch(err => {
    console.log('\n--- results before the crash ---');
    console.log(results.join('\n'));
    console.log('\nFAILURES so far: ' + results.filter(r => r.startsWith('FAIL')).length);
    console.log('CRASH: ' + err.message);
    process.exit(1);
  });
