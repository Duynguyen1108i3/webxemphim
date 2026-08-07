const fs = require('fs');

const path = 'apps/frontend/src/components/VideoPlayer.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  if (lower.includes("dramahay.xyz") || lower.includes("phim4k.dpdns.org") || lower.includes("/stream/hls")) {`;
const replacement = `  if (lower.includes(".m3u8") || lower.includes("kkphim") || lower.includes("dramahay.xyz") || lower.includes("phim4k.dpdns.org") || lower.includes("/stream/hls")) {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('VideoPlayer.tsx updated successfully!');
} else {
  console.log('Target not found in VideoPlayer.tsx');
}
