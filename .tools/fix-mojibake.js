// Repairs mojibake at the character level, resynchronising on damage.
//
// The sources are valid UTF-8 but contain strings that were once read as
// Windows-1252 and re-encoded, so a real "—" shows up as "â" + U+0080 +
// U+0094. A byte-level rewrite would double-encode the file, so this works on
// characters: map each character back to the cp1252 byte it represents, then
// decode those bytes as UTF-8.
//
// When a byte cannot start a valid sequence the decoder emits it as a single
// Latin-1 character and moves on, so one damaged spot cannot poison the rest
// of the file. Genuine Unicode (═ ─ → ★ ✦ ♟) is not representable in cp1252
// and is copied through untouched.
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

function charToByte(ch) {
  const cp = ch.codePointAt(0);
  if (cp <= 0xFF) return cp;
  return REV[cp] !== undefined ? REV[cp] : null;
}

/** Convert a run of characters to its byte string, decoding UTF-8 and
 *  resynchronising whenever a sequence is invalid. */
function decodeRun(bytes) {
  let out = '';
  let i = 0;
  let decoded = 0;
  let resyncs = 0;

  while (i < bytes.length) {
    const b = bytes[i];
    let need = 0;
    if (b >= 0xF0 && b <= 0xF4) need = 4;
    else if (b >= 0xE0 && b <= 0xEF) need = 3;
    else if (b >= 0xC2 && b <= 0xDF) need = 2;

    if (need > 1 && i + need <= bytes.length &&
        bytes.slice(i + 1, i + need).every(c => c >= 0x80 && c <= 0xBF)) {
      const seq = bytes.slice(i, i + need);
      let cp;
      if (need === 2) cp = ((seq[0] & 0x1F) << 6) | (seq[1] & 0x3F);
      else if (need === 3) cp = ((seq[0] & 0x0F) << 12) | ((seq[1] & 0x3F) << 6) | (seq[2] & 0x3F);
      else cp = ((seq[0] & 0x07) << 18) | ((seq[1] & 0x3F) << 12) | ((seq[2] & 0x3F) << 6) | (seq[3] & 0x3F);

      const valid = cp >= 0x80 && !(cp >= 0xD800 && cp <= 0xDFFF) && cp <= 0x10FFFF;
      if (valid) { out += String.fromCodePoint(cp); i += need; decoded++; continue; }
    }

    // Invalid: treat this single byte as a Latin-1 character and carry on.
    out += String.fromCharCode(b);
    i++;
    resyncs++;
  }
  return { out, decoded, resyncs };
}

function repair(text) {
  const chars = Array.from(text);
  let out = '';
  let i = 0;
  const samples = [];

  while (i < chars.length) {
    if (charToByte(chars[i]) === null) { out += chars[i]; i++; continue; }

    let j = i;
    while (j < chars.length && charToByte(chars[j]) !== null) j++;

    const run = chars.slice(i, j);
    const bytes = run.map(charToByte);
    const { out: decoded, resyncs } = decodeRun(bytes);

    if (samples.length < 5 && decoded !== run.join('')) {
      samples.push(`"${run.slice(0, 12).join('')}"→"${Array.from(decoded).slice(0, 12).join('')}"${resyncs ? '(+' + resyncs + ' skipped)' : ''}`);
    }
    out += decoded;
    i = j;
  }
  return { out, samples };
}

const dryRun = process.argv.includes('--dry-run');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));

for (const rel of files) {
  const file = path.join(ROOT, rel);
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { console.log(rel.padEnd(28), 'MISSING'); continue; }
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const { out, samples } = repair(text);
  if (out === text) { console.log(rel.padEnd(28), 'no change'); continue; }

  if (!dryRun) fs.writeFileSync(file, out, 'utf8');
  console.log(rel.padEnd(28), (dryRun ? 'WOULD FIX' : 'fixed').padEnd(10),
    `bytes ${Buffer.byteLength(text)} → ${Buffer.byteLength(out)}  ${samples.join(' ')}`);
}
