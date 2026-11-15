// Turns dist/ into a folder you can open by double-clicking index.html (no server, no Node).
// Browsers block module scripts on file:// addresses, so the script tag is made a classic one.
import { readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8')
  .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>')
  .replace(/ crossorigin(?=[ >])/g, '');
rmSync('standalone', { recursive: true, force: true });
cpSync('dist', 'standalone', { recursive: true });
writeFileSync('standalone/index.html', html);
console.log('standalone/ is ready. Open standalone/index.html');
