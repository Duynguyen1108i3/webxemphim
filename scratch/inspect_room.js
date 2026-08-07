const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

// Find Supabase calls or room/watch-together calls
const roomIndex = content.indexOf('watch-together');
console.log('Room / Watch together section around line:', content.slice(0, roomIndex).split('\n').length);
console.log('Room snippet:\n', content.slice(roomIndex - 500, roomIndex + 2000));
