const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const lines = content.split('\n');
console.log('Lines 6500 to 6700:\n', lines.slice(6499, 6700).join('\n'));
