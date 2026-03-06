const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const assets = path.join(__dirname, 'apps', 'mobile', 'assets', 'images');

// Fix data:img/png -> data:image/png (non-standard MIME)
function fixSvg(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/data:img\/png/g, 'data:image/png');
}

function renderSvg(svgStr, outPath, width) {
  const r = new Resvg(svgStr, { fitTo: { mode: 'width', value: width } });
  const png = r.render().asPng();
  fs.writeFileSync(outPath, png);
  console.log(`${path.basename(outPath)}: ${png.length} bytes`);
}

// === 1.svg -> App icons (already 1024x1024 square) ===
const svg1 = fixSvg(path.join(__dirname, '1.svg'));
renderSvg(svg1, path.join(assets, 'icon.png'), 1024);
renderSvg(svg1, path.join(assets, 'adaptive-icon.png'), 1024);
renderSvg(svg1, path.join(assets, 'favicon.png'), 48);
renderSvg(svg1, path.join(assets, 'splash-icon.png'), 200);

// === 10.svg -> Chat mascot avatar ===
// Original is 1024x1536 (portrait). Crop to top-center square for avatar use.
let svg10 = fixSvg(path.join(__dirname, '10.svg'));
// Shift viewBox to crop: take area from y=128 (skip top margin) 1024x1024 square
svg10 = svg10.replace('viewBox="0 0 1024 1536"', 'viewBox="0 128 1024 1024"');
svg10 = svg10.replace('height="1536"', 'height="1024"');
renderSvg(svg10, path.join(assets, 'wubus-chat.png'), 200);

console.log('\nAll icons generated!');
