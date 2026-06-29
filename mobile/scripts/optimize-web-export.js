// Post-processes the `expo export --platform web` output for a faster, smoother
// first load on GitHub Pages. Run with the export dir as argv[2]
// (e.g. `node scripts/optimize-web-export.js dist/app`). Idempotent.
//
// Two changes, both in index.html:
//   1. A brand-green pre-mount paint so the very first frame is the splash
//      colour instead of a white flash (no "static screen" before the splash).
//   2. <link rel="modulepreload"> for every JS chunk, so the browser fetches
//      the lazy Root chunk in parallel with the entry bundle instead of waiting
//      for the entry to execute and request it. Shaves the load-to-interactive
//      gap on a cold visit.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || 'dist/app';
const indexPath = path.join(dir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Derive the JS base path from the entry <script src="…"> already in the file.
const scriptMatch = html.match(/<script[^>]+src="([^"]+\/_expo\/static\/js\/web\/)[^"]+\.js"[^>]*>/);
const jsBase = scriptMatch ? scriptMatch[1] : null;

const links = [];

if (jsBase) {
  const jsDir = path.join(dir, '_expo', 'static', 'js', 'web');
  const files = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter(f => f.endsWith('.js')) : [];
  for (const f of files) {
    links.push(`  <link rel="modulepreload" href="${jsBase}${f}">`);
  }
}

let head = '';
if (!html.includes('jap-prepaint')) {
  head += '  <style id="jap-prepaint">html,body{background-color:#2E9E57}#root{background-color:#2E9E57}</style>\n';
}
if (links.length && !html.includes('rel="modulepreload"')) {
  head += links.join('\n') + '\n';
}

if (head) {
  html = html.replace('</head>', head + '</head>');
  fs.writeFileSync(indexPath, html);
  console.log(`optimize-web-export: injected pre-paint + ${links.length} modulepreload hint(s) into ${indexPath}`);
} else {
  console.log('optimize-web-export: already optimized, nothing to do');
}
