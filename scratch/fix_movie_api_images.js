const fs = require('fs');

const path = 'apps/frontend/src/lib/movieApi.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix proxyImageUrl to return direct URL without wsrv.nl wrapper
content = content.replace(
  `function proxyImageUrl(url: string): string {\n  if (!url) return "";\n  if (url.startsWith("data:")) return url;\n  return \`https://wsrv.nl/?url=\${encodeURIComponent(url)}&default=\${encodeURIComponent(url)}\`;\n}`,
  `function proxyImageUrl(url: string): string {\n  if (!url) return "";\n  if (url.startsWith("data:")) return url;\n  return url;\n}`
);

// Fallback in case of formatting differences
if (content.includes("https://wsrv.nl/?url=")) {
  content = content.replace(
    /return `https:\/\/wsrv\.nl\/\?url=\${encodeURIComponent\(url\)}&default=\${encodeURIComponent\(url\)}`;/g,
    'return url;'
  );
}

// 2. Replace free1.phim4k.lol with phimapi.com
content = content.replace(/https:\/\/free1\.phim4k\.lol\/danh-sach\/phim-moi-cap-nhat-v3/g, 'https://phimapi.com/danh-sach/phim-moi-cap-nhat');
content = content.replace(/https:\/\/free1\.phim4k\.lol\/v1\/api\/the-loai\//g, 'https://phimapi.com/v1/api/the-loai/');
content = content.replace(/https:\/\/free1\.phim4k\.lol\/v1\/api\/quoc-gia\//g, 'https://phimapi.com/v1/api/quoc-gia/');
content = content.replace(/https:\/\/free1\.phim4k\.lol\/v1\/api\/danh-sach\//g, 'https://phimapi.com/v1/api/danh-sach/');
content = content.replace(/https:\/\/free1\.phim4k\.lol\/v1\/api\/tim-kiem/g, 'https://phimapi.com/v1/api/tim-kiem');
content = content.replace(/https:\/\/free1\.phim4k\.lol\/phim\//g, 'https://phimapi.com/phim/');

fs.writeFileSync(path, content, 'utf8');
console.log('movieApi.ts updated successfully with direct image URLs and phimapi.com!');
