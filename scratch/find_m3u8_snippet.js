const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const m3u8Index = content.indexOf('link_m3u8');
console.log('Snippet around link_m3u8:\n', content.slice(m3u8Index - 200, m3u8Index + 1200));
