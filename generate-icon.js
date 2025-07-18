// Simple script to generate placeholder icons
const fs = require('fs');
const path = require('path');

// Create a simple colored square as PNG
const createIcon = (size) => {
  // PNG header and simple colored square
  const png = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, size, // width
    0x00, 0x00, 0x00, size, // height
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc
    0x90, 0x91, 0x68, 0x36, // CRC (placeholder)
    0x00, 0x00, 0x00, 0x01, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0xD7, 0x63, 0x00, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  return png;
};

// Placeholder text icon
const textIcon = `<svg width="SIZE" height="SIZE" xmlns="http://www.w3.org/2000/svg">
  <rect width="SIZE" height="SIZE" rx="4" fill="#8B5CF6"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="FONTSIZE" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">T</text>
</svg>`;

const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const svg = textIcon.replace(/SIZE/g, size).replace('FONTSIZE', Math.floor(size * 0.6));
  const fileName = path.join(__dirname, 'public', 'icon', `${size}.png`);
  
  // For now, create a simple text file as placeholder
  fs.writeFileSync(fileName.replace('.png', '.svg'), svg);
  console.log(`Created ${fileName}`);
});

console.log('Icon placeholders created. You need to convert SVG to PNG for Chrome extension.');