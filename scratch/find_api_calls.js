const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

// Search for fetch or API calls
const fetchMatches = [...content.matchAll(/fetch\s*\(\s*[`"']([^`"']+)`?/g)].map(m => m[1]);
console.log('Fetch calls sample:', [...new Set(fetchMatches)].slice(0, 40));

// Search for string occurrences of 'phim', 'danh-sach', 'v1/api'
const phimStrings = [...content.matchAll(/["']([^"']*phim[^"']*)["']/gi)].map(m => m[1]);
console.log('Phim strings sample:', [...new Set(phimStrings)].slice(0, 40));
