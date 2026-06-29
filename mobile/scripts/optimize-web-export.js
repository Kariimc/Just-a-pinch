// Post-processes the `expo export --platform web` output for a faster, smoother
// first load on GitHub Pages. Run with the export dir as argv[2]
// (e.g. `node scripts/optimize-web-export.js dist/app`). Idempotent.
//
// Changes to index.html:
//   1. Brand-green pre-mount paint applied as early as possible: an inline
//      background on <html>/<body> (no stylesheet parse needed) plus a <style>
//      injected as the FIRST node in <head>, so the first paint is the splash
//      colour in the first frame — no white flash, no "static screen".
//   2. <link rel="modulepreload"> for every JS chunk so the lazy Root chunk
//      downloads in parallel with the entry bundle instead of after it executes.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || 'dist/app';
const indexPath = path.join(dir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const GREEN = '#2E9E57';

// 1a. Inline background on the root elements — painted before any CSS parses.
if (!/<html[^>]*data-jap-paint/.test(html)) {
  html = html.replace(/<html\b([^>]*)>/, `<html$1 data-jap-paint style="background-color:${GREEN}">`);
  html = html.replace(/<body\b([^>]*)>/, `<body$1 style="background-color:${GREEN}">`);
}

// 1b. Pre-paint <style> as the very first child of <head>.
if (!html.includes('jap-prepaint')) {
  html = html.replace(
    /<head\b([^>]*)>/,
    `<head$1>\n    <style id="jap-prepaint">html,body{background-color:${GREEN}}#root{background-color:${GREEN}}</style>`,
  );
}

// 2. modulepreload the lazy Root (screens) chunk so it downloads in parallel
//    with the entry bundle instead of after it executes. The entry chunks are
//    already <script>-loaded, and other lazy chunks (e.g. the deferred Sentry
//    SDK) are intentionally NOT preloaded — they're post-interactive and would
//    only compete for the first-load bandwidth that matters for time-to-interactive.
const scriptMatch = html.match(/<script[^>]+src="([^"]+\/_expo\/static\/js\/web\/)[^"]+\.js"[^>]*>/);
const jsBase = scriptMatch ? scriptMatch[1] : null;
if (jsBase && !html.includes('rel="modulepreload"')) {
  const jsDir = path.join(dir, '_expo', 'static', 'js', 'web');
  const files = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter(f => /^Root-.*\.js$/.test(f)) : [];
  const links = files.map(f => `  <link rel="modulepreload" href="${jsBase}${f}">`);
  if (links.length) html = html.replace('</head>', links.join('\n') + '\n</head>');
  console.log(`optimize-web-export: ${links.length} modulepreload hint(s)`);
}

fs.writeFileSync(indexPath, html);
console.log(`optimize-web-export: done → ${indexPath}`);
