// Reproduces the "piece flickers right after a move" report and dumps what
// happens to the piece element, frame by frame.
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'diag');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 414, height: 896, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3200));
  await page.evaluate(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
    initGame('local'); UI.switchScreen('game-screen');
  });
  await new Promise(r => setTimeout(r, 900));

  // What classes/animations exist on pieces right after the initial render?
  const atRest = await page.evaluate(() => {
    const pieces = [...document.querySelectorAll('.piece')];
    return {
      count: pieces.length,
      withPieceAnimate: pieces.filter(p => p.classList.contains('piece-animate')).length,
      sampleClasses: [...new Set(pieces.map(p => p.className))],
      sampleDelay: pieces.slice(0, 5).map(p => p.style.animationDelay),
    };
  });
  console.log('--- pieces at rest ---');
  console.log(JSON.stringify(atRest, null, 2));

  // Instrument a piece: log every class mutation and animation event for 1.2 s
  await page.evaluate(() => {
    window.__log = [];
    const target = document.getElementById('sq-6-4'); // e2 pawn
    const el = document.querySelector('#pieces-layer .piece[data-r="6"][data-c="4"]');
    if (!el) { window.__log.push('NO PAWN ELEMENT'); return; }

    window.__tracked = el;
    const rec = (kind, extra) => window.__log.push({
      t: Math.round(performance.now()),
      kind,
      cls: el.className,
      styleTop: el.style.top,
      styleLeft: el.style.left,
      opacity: getComputedStyle(el).opacity,
      transform: getComputedStyle(el).transform,
      animName: getComputedStyle(el).animationName,
      animDelay: getComputedStyle(el).animationDelay,
      extra: extra || '',
    });

    rec('start');
    new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.attributeName === 'class') rec('class-change', 'attr class');
        if (m.attributeName === 'style') rec('style-change', 'attr style');
      });
    }).observe(el, { attributes: true });

    ['animationstart', 'animationend', 'animationcancel'].forEach(ev =>
      el.addEventListener(ev, e => rec('event', ev + ' ' + e.animationName)));

    const click = (r, c) => document.getElementById(`sq-${r}-${c}`)
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    // Ruy Lopez-ish: e4 e5 — watch the e4 pawn travel
    click(6, 4);            // select e2 pawn
    window.__log.push({ t: Math.round(performance.now()), kind: 'selected' });
    setTimeout(() => click(4, 4), 400);   // move to e4
  });

  await new Promise(r => setTimeout(r, 1400));
  const log = await page.evaluate(() => window.__log);
  console.log('\n--- piece log (e2 pawn → e4) ---');
  for (const e of log) {
    console.log(`${String(e.t).padStart(6)}  ${e.kind.padEnd(14)} cls="${e.cls}" top=${e.styleTop || '-'} left=${e.styleLeft || '-'} op=${e.opacity} anim=${e.animName} delay=${e.animDelay} ${e.extra}`);
  }

  // Frame-by-frame opacity of the moved pawn over the first 400 ms
  await page.evaluate(() => {
    const click = (r, c) => document.getElementById(`sq-${r}-${c}`)
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    window.__op = [];
    // Now move the black e-pawn e7→e5 to watch a fresh move
    const t0 = performance.now();
    click(1, 4);
    setTimeout(() => {
      click(3, 4);
      const el = () => document.querySelector('#pieces-layer .piece[data-r="3"][data-c="4"]');
      const sample = () => {
        const e = el();
        if (e) window.__op.push({ t: Math.round(performance.now() - t0), op: getComputedStyle(e).opacity, scale: getComputedStyle(e).transform });
        if (performance.now() - t0 < 900) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, 300);
  });
  await new Promise(r => setTimeout(r, 1400));
  const op = await page.evaluate(() => window.__op);
  console.log('\n--- opacity/transform trace of the moved black pawn ---');
  const seen = new Set();
  for (const s of op) {
    const key = s.op + '|' + s.scale;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`t=${String(s.t).padStart(4)}  opacity=${s.op}  transform=${s.scale}`);
  }

  await page.screenshot({ path: path.join(OUT, 'flicker-after-move.png') });
  await browser.close();
})();
