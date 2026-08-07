const fs = require('fs');
const path = require('path');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

// Let's inspect the sections of netflopp_beautified.js
// We can locate component functions and extract their source code or understand how they work.

console.log('File size:', content.length, 'bytes');

// Search for key functions/components
const keywords = [
  'Dynamic Touch Icon Generation Failed',
  'watch-together',
  'phimapi',
  'NetFlop',
  'Dicebear',
  'localStorage',
  'supabase'
];

for (const kw of keywords) {
  let pos = 0;
  let count = 0;
  while ((pos = content.indexOf(kw, pos)) !== -1) {
    count++;
    if (count === 1) {
      const line = content.slice(0, pos).split('\n').length;
      console.log(`First occurrence of "${kw}" at line ${line}`);
    }
    pos += kw.length;
  }
  console.log(`Total occurrences of "${kw}": ${count}`);
}
