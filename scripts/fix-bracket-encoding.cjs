// Fix dynasty-2026-bracket.json encoding (strip BOM, ensure valid JSON)
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../public/dynasty-2026-bracket.json');
if (!fs.existsSync(file)) {
  console.error('Run npm run generate:2026-bracket first');
  process.exit(1);
}
let buf = fs.readFileSync(file);
let s;
// PowerShell redirect can produce UTF-16 LE (BOM 0xFF 0xFE or null bytes between ASCII chars)
if ((buf[0] === 0xFF && buf[1] === 0xFE) || (buf[1] === 0 && buf[3] === 0 && buf.length >= 4)) {
  s = buf.toString('utf16le');
} else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
  s = buf.subarray(3).toString('utf8');
} else {
  s = buf.toString('utf8').replace(/^\uFEFF/, '');
}
const start = s.indexOf('{');
if (start > 0) s = s.slice(start);
try {
  JSON.parse(s);
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}
fs.writeFileSync(file, s, { encoding: 'utf8' });
console.log('Fixed encoding');
