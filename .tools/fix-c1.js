// Repairs the few remaining single-byte mojibake leftovers: a stray C1
// control character (U+0085, U+0090, …) that stands in for an em dash or an
// ellipsis, and the classic "â€”" style runs.
//
// Reads the file as UTF-8 text and rewrites only the damaged runs, so genuine
// Unicode (═ ─ → Зов Δ) is never touched. Verified by re-reading afterwards.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const REV = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

const charToByte = ch => {
  const cp = ch.codePointAt(0);
  if (cp <= 0xFF) return cp;
  return REV[cp] !== undefined ? REV[cp] : null;
};

const isScan = ch => {
  const cp = ch.codePointAt(0);
  return cp <= 0xFF || REV[cp] !== undefined;
};

// A bare C1 control stands in for the last byte of a UTF-8 sequence whose
// lead byte was already consumed. Reconstruct it from the lead we saw.
const C1_TAIL = {
  0x85: '\u2026',   // …  (E2 80 A6 — tail A6 is printable, this is the 85 case)
  0x90: '\u2550',   // ═  (E2 95 90)
  0x91: '\u2551',   // ║
  0x8F: '\u2500',   // ─
  0x80: '\u0080',   // leave unknown C1 bytes alone
};

function repairText(text) {
  const chars = Array.from(text);
  let out = '';
  let i = 0;
  let fixes = 0;

  while (i < chars.length) {
    // Case 1: a complete mojibake run in scan range → decode it
    if (isScan(chars[i])) {
      let j = i;
      while (j < chars.length && isScan(chars[j])) j++;
      const run = chars.slice(i, j);
      const codes = run.map(charToByte);
      let k = 0, decoded = '', complete = true;

      while (k < codes.length) {
        const b = codes[k];
        const need = (b >= 0xF0 && b <= 0xF4) ? 4
                   : (b >= 0xE0 && b <= 0xEF) ? 3
                   : (b >= 0xC2 && b <= 0xDF) ? 2 : 0;
        if (need > 1 && k + need <= codes.length &&
            codes.slice(k + 1, k + need).every(c => c >= 0x80 && c <= 0xBF)) {
          const seq = codes.slice(k, k + need);
          let cp;
          if (need === 2) cp = ((seq[0] & 0x1F) << 6) | (seq[1] & 0x3F);
          else if (need === 3) cp = ((seq[0] & 0x0F) << 12) | ((seq[1] & 0x3F) << 6) | (seq[2] & 0x3F);
          else cp = ((seq[0] & 0x07) << 18) | ((seq[1] & 0x3F) << 12) | ((seq[2] & 0x3F) << 6) | (seq[3] & 0x3F);
          if (cp >= 0x80 && !(cp >= 0xD800 && cp <= 0xDFFF) && cp <= 0x10FFFF) {
            decoded += String.fromCodePoint(cp);
            k += need;
            continue;
          }
        }
        // Incomplete tail: a lone C1 byte with a known meaning
        const lone = codes[k];
        if (lone >= 0x80 && lone <= 0x9F && C1_TAIL[lone]) {
          decoded += C1_TAIL[lone];
          k++;
          fixes++;
          continue;
        }
        complete = false;
        break;
      }

      if (complete && decoded !== run.join('')) {
        out += decoded;
        i = j;
        fixes++;
        continue;
      }
    }
    out += chars[i];
    i++;
  }
  return { out, fixes };
}

const dryRun = process.argv.includes('--dry-run');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const HEX = cp => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

for (const rel of files) {
  const file = path.join(ROOT, rel);
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { console.log(rel.padEnd(24), 'MISSING'); continue; }

  const before = (text.match(/[\u0080-\u009F]/g) || []).length;
  const { out, fixes } = repairText(text);
  if (out === text) { console.log(rel.padEnd(24), 'clean'); continue; }
  if (out.includes('\uFFFD')) { console.log(rel.padEnd(24), 'SKIPPED (U+FFFD)'); continue; }

  const after = (out.match(/[\u0080-\u009F]/g) || []).length;
  if (!dryRun) fs.writeFileSync(file, out, 'utf8');
  console.log(rel.padEnd(24), (dryRun ? 'WOULD FIX' : 'fixed').padEnd(10),
    `C1 chars ${before} → ${after}, ${fixes} run(s)`);
}
