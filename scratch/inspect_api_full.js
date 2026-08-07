const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const apiIndex = content.indexOf('tt = {');
console.log(content.slice(apiIndex, apiIndex + 3000));
