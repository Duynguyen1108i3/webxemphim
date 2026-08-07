const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

// Let's search for component definitions, state structures, API functions in netflopp_beautified.js
// We can find functions and JSX elements or object definitions.

console.log('Total length of netflopp_beautified.js:', content.length);

// Let's find Supabase key and config
const supabaseMatch = content.match(/createClient\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/);
if (supabaseMatch) {
  console.log('Supabase URL:', supabaseMatch[1]);
  console.log('Supabase Key:', supabaseMatch[2].slice(0, 15) + '...');
} else {
  // alternative search
  const matches = content.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
  console.log('Supabase match:', matches ? matches[0] : 'None');
}

// Let's find phimapi endpoints
const phimapiCalls = [...content.matchAll(/phimapi\.com\/([^\s"'`?]+)/g)].map(m => m[1]);
console.log('phimapi endpoints:', [...new Set(phimapiCalls)]);
