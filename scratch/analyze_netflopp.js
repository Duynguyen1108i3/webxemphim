const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

// Find paths
const paths = [...content.matchAll(/path:\s*"([^"]+)"/g)].map(m => m[1]);
console.log('Routes found in netflopp:', [...new Set(paths)]);

// Find API endpoints or URLs
const urls = [...content.matchAll(/https?:\/\/[^\s"'`<>]+/g)].map(m => m[0]);
console.log('URLs found in netflopp:', [...new Set(urls)].slice(0, 30));

// Find Supabase or env references
const envs = [...content.matchAll(/import\.meta\.env\.[A-Z0-9_]+/g)].map(m => m[0]);
console.log('Envs:', [...new Set(envs)]);

// Find storage keys
const storageKeys = [...content.matchAll(/localStorage\.getItem\(["']([^"']+)["']\)/g)].map(m => m[1]);
console.log('Storage keys:', [...new Set(storageKeys)]);
