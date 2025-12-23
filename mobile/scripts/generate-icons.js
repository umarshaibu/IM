const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../assets/icon.svg');

// Android icon sizes
const androidSizes = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

// iOS icon sizes (filename: size in pixels)
const iosSizes = [
  { filename: 'Icon-20@2x.png', size: 40 },
  { filename: 'Icon-20@3x.png', size: 60 },
  { filename: 'Icon-29@2x.png', size: 58 },
  { filename: 'Icon-29@3x.png', size: 87 },
  { filename: 'Icon-40@2x.png', size: 80 },
  { filename: 'Icon-40@3x.png', size: 120 },
  { filename: 'Icon-60@2x.png', size: 120 },
  { filename: 'Icon-60@3x.png', size: 180 },
  { filename: 'Icon-1024.png', size: 1024 },
];

async function generateIcons() {
  console.log('Reading SVG file...');
  const svgBuffer = fs.readFileSync(SVG_PATH);

  // Generate Android icons
  console.log('\nGenerating Android icons...');
  for (const { name, size } of androidSizes) {
    const outputDir = path.join(__dirname, `../android/app/src/main/res/${name}`);

    // Square icon
    const squareOutput = path.join(outputDir, 'ic_launcher.png');
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(squareOutput);
    console.log(`  Created: ${name}/ic_launcher.png (${size}x${size})`);

    // Round icon (same image, Android handles masking)
    const roundOutput = path.join(outputDir, 'ic_launcher_round.png');
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(roundOutput);
    console.log(`  Created: ${name}/ic_launcher_round.png (${size}x${size})`);
  }

  // Generate iOS icons
  console.log('\nGenerating iOS icons...');
  const iosOutputDir = path.join(__dirname, '../ios/IM/Images.xcassets/AppIcon.appiconset');

  for (const { filename, size } of iosSizes) {
    const outputPath = path.join(iosOutputDir, filename);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created: ${filename} (${size}x${size})`);
  }

  // Update iOS Contents.json
  console.log('\nUpdating iOS Contents.json...');
  const contentsJson = {
    images: [
      { idiom: 'iphone', scale: '2x', size: '20x20', filename: 'Icon-20@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '20x20', filename: 'Icon-20@3x.png' },
      { idiom: 'iphone', scale: '2x', size: '29x29', filename: 'Icon-29@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '29x29', filename: 'Icon-29@3x.png' },
      { idiom: 'iphone', scale: '2x', size: '40x40', filename: 'Icon-40@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '40x40', filename: 'Icon-40@3x.png' },
      { idiom: 'iphone', scale: '2x', size: '60x60', filename: 'Icon-60@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '60x60', filename: 'Icon-60@3x.png' },
      { idiom: 'ios-marketing', scale: '1x', size: '1024x1024', filename: 'Icon-1024.png' },
    ],
    info: { author: 'xcode', version: 1 },
  };

  fs.writeFileSync(
    path.join(iosOutputDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('  Updated Contents.json');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
