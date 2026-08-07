const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const apiIndex = content.indexOf('getNewMovies');
console.log('API Service section around line:', content.slice(0, apiIndex).split('\n').length);
console.log('API Service snippet:\n', content.slice(apiIndex - 1000, apiIndex + 1500));
