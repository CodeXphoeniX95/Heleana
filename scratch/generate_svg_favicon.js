const fs = require('fs');
const path = require('path');

const logoBuffer = fs.readFileSync(path.join(__dirname, '../web/public/logo.png'));
const base64Logo = logoBuffer.toString('base64');

// Create self-contained SVG with circular clip path
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="256" />
    </clipPath>
  </defs>
  <image width="512" height="512" href="data:image/png;base64,${base64Logo}" clip-path="url(#circleClip)" />
</svg>`;

const webSvg = path.join(__dirname, '../web/public/logo-rounded.svg');
const adminSvg = path.join(__dirname, '../admin-web/public/logo-rounded.svg');

fs.writeFileSync(webSvg, svgContent);
fs.writeFileSync(adminSvg, svgContent);

console.log('Successfully created self-contained circular SVG favicons!');
