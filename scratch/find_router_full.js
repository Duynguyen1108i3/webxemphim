const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const routerIndex = content.lastIndexOf('path: "/"');
console.log('Full router section:\n', content.slice(routerIndex - 1000, routerIndex + 2500));
