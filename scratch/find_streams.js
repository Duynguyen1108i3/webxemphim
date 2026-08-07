const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const matches = [...content.matchAll(/(link_m3u8|link_embed|link|m3u8|embed)/gi)].map(m => m.index);
console.log('Total matches:', matches.length);

for (const idx of matches.slice(0, 10)) {
  console.log('Match at', idx, ':\n', content.slice(idx - 100, idx + 300));
  console.log('---');
}
