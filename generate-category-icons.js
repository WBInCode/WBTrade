const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'Ikony na aplikację');
const OUTPUT_DIR = path.join(__dirname, 'apps', 'mobile', 'assets', 'images', 'categories');

// Map SVG filenames to output PNG filenames
// PNG names match the EXACT slugs used in production (from BaseLinker)
const FILE_MAP = {
  'Dla Dziecka.svg': 'dla-dziecka.png',
  'Dom.svg': 'dom.png',
  'Elektronika i GSM.svg': 'elektronika-i-gsm.png',
  'Gastronomia.svg': 'gastronomia.png',
  'Moda i Zdrowie.svg': 'moda-i-zdrowie.png',
  'Motoryzacja.svg': 'motoryzacja.png',
  'Narzędzia.svg': 'narzedzia.png',
  'Ogrodnictwo.svg': 'ogrodnictwo.png',
  'Outlet.svg': 'outlet.png',
  'Sport i turystyka.svg': 'sport-i-turystyka.png',
};

const SIZE = 1024; // px - very high res for crisp display at any density

async function convert() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const [svgFile, pngFile] of Object.entries(FILE_MAP)) {
    const svgPath = path.join(INPUT_DIR, svgFile);
    if (!fs.existsSync(svgPath)) {
      console.error(`SVG not found: ${svgPath}`);
      continue;
    }

    let svgData = fs.readFileSync(svgPath, 'utf-8');

    // Step 1: Get actual content bounding box
    const probe = new Resvg(svgData);
    const bbox = probe.innerBBox();
    if (!bbox) {
      console.error(`  No bbox for ${svgFile}, skipping`);
      continue;
    }
    console.log(`  Content bbox: x=${Math.round(bbox.x)} y=${Math.round(bbox.y)} w=${Math.round(bbox.width)} h=${Math.round(bbox.height)}`);

    // Step 2: Crop viewBox tightly around content with 5% padding
    const padding = Math.max(bbox.width, bbox.height) * 0.05;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    // Make it square based on the larger dimension + padding
    const side = Math.max(bbox.width, bbox.height) + padding * 2;
    const cropX = cx - side / 2;
    const cropY = cy - side / 2;

    svgData = svgData.replace(
      /viewBox="[^"]+"/,
      `viewBox="${cropX} ${cropY} ${side} ${side}"`
    );
    console.log(`  Cropped viewBox: ${cropX.toFixed(0)} ${cropY.toFixed(0)} ${side.toFixed(0)} ${side.toFixed(0)}`);

    // Boost stroke widths for better visibility at small display sizes
    svgData = svgData.replace(/stroke-width:\s*([\d.]+)/g, (match, w) => {
      return `stroke-width: ${parseFloat(w) * 1.5}`;
    });

    const resvg = new Resvg(svgData, {
      fitTo: { mode: 'width', value: SIZE },
      background: 'rgba(0,0,0,0)',
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    const outPath = path.join(OUTPUT_DIR, pngFile);
    fs.writeFileSync(outPath, pngBuffer);
    console.log(`✓ ${svgFile} → ${pngFile} (${pngBuffer.length} bytes, ${pngData.width}x${pngData.height})`);
  }
  console.log('\nDone! All category icons generated.');
}

convert().catch(console.error);
