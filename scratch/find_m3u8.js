const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const m3u8Index = content.indexOf('link_m3u8');
console.log('link_m3u8 snippet:\n', content.slice(m3u8Index - 500, m3u8Index + 1500));
