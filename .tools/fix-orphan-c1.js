// Repairs ORPHANED C1 bytes.
//
// When UTF-8 text was read as Windows-1252 and re-encoded, a punctuation
// character such as "—" (E2 80 94) sometimes lost its lead byte and now
// appears as a bare U+0097. The same happens for "•" (U+0095), "–" (U+0096)
// and "…" (U+0085). These are unambiguous — no legitimate text contains a raw
// C1 control character — so they can be mapped directly.
//
// Everything else in the file is copied through untouched.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const ORPHANS = {
  0x0080: '\u20AC',  // €   (rare)
  0x0082: '\u201A',
  0x0085: '\u2026',  // …   ellipsis
  0x0091: '\u2018',  // ‘
  0x0092: '\u2019',  // ’
  0x0093: '\u201C',  // “
  0x0094: '\u201D',  // ”
  0x0095: '\u2022',  // •   bullet
  0x0096: '\u2013',  // –   en dash
  0x0097: '\u2014',  // —   em dash
  0x0099: '\u2122',  // ™
};

const dryRun = process.argv.includes('--dry-run');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));

let grandTotal = 0;
const grandCounts = new Map();

for (const rel of files) {
  const file = path.join(ROOT, rel);
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { console.log(rel.padEnd(22), 'MISSING'); continue; }

  const counts = new Map();
  const out = text.replace(/[\u0080-\u009F]/g, ch => {
    const cp = ch.codePointAt(0);
    const replacement = ORPHANS[cp];
    if (replacement === undefined) return ch;      // unknown C1 — leave it
    counts.set(cp, (counts.get(cp) || 0) + 1);
    grandCounts.set(cp, (grandCounts.get(cp) || 0) + 1);
    return replacement;
  });

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) { console.log(rel.padEnd(22), 'none'); continue; }
  grandTotal += total;

  if (!dryRun) fs.writeFileSync(file, out, 'utf8');
  const detail = [...counts.entries()]
    .map(([cp, n]) => `${ORPHANS[cp]}×${n}`)
    .join('  ');
  console.log(rel.padEnd(22), (dryRun ? 'WOULD FIX' : 'fixed').padEnd(10), detail);
}

console.log(`\ntotal replacements: ${grandTotal}`);
console.log('breakdown:', [...grandCounts.entries()].map(([cp, n]) => `${ORPHANS[cp]}×${n}`).join('  '));
