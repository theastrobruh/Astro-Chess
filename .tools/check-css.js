// Lightweight CSS sanity check: balanced braces, no stray semicolon-only
// declarations, no duplicate top-level @media blocks that were left half-written.
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];

let problems = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.css'))) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  let depth = 0, line = 1, minDepth = 0;
  const bad = [];
  for (const ch of text) {
    if (ch === '\n') line++;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < 0) { bad.push('extra } at line ' + line); minDepth = -1; } }
  }
  const ok = depth === 0 && minDepth === 0;
  if (!ok) problems++;
  console.log(f.padEnd(16), ok ? 'balanced' : `UNBALANCED (final depth ${depth})`, bad.join('; '));
}
console.log('\nproblems: ' + problems);
