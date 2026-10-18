const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function processPNG(inputPath, outputPath, cornerRadiusPct = 0.22) {
  const buffer = fs.readFileSync(inputPath);
  
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('Not a valid PNG file');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }

    offset += 12 + length;
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel + 1;
  const radius = Math.round(Math.min(width, height) * cornerRadiusPct);

  const rawPixels = Buffer.alloc(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const filterType = decompressed[rowStart];

    for (let x = 0; x < width; x++) {
      const srcIdx = rowStart + 1 + x * bytesPerPixel;
      const dstIdx = (y * width + x) * bytesPerPixel;

      let r = decompressed[srcIdx];
      let g = decompressed[srcIdx + 1];
      let b = decompressed[srcIdx + 2];
      let a = decompressed[srcIdx + 3];

      if (filterType === 1) { // Sub
        if (x > 0) {
          const prevDst = (y * width + (x - 1)) * bytesPerPixel;
          r = (r + rawPixels[prevDst]) & 0xff;
          g = (g + rawPixels[prevDst + 1]) & 0xff;
          b = (b + rawPixels[prevDst + 2]) & 0xff;
          a = (a + rawPixels[prevDst + 3]) & 0xff;
        }
      } else if (filterType === 2) { // Up
        if (y > 0) {
          const upDst = ((y - 1) * width + x) * bytesPerPixel;
          r = (r + rawPixels[upDst]) & 0xff;
          g = (g + rawPixels[upDst + 1]) & 0xff;
          b = (b + rawPixels[upDst + 2]) & 0xff;
          a = (a + rawPixels[upDst + 3]) & 0xff;
        }
      }

      rawPixels[dstIdx] = r;
      rawPixels[dstIdx + 1] = g;
      rawPixels[dstIdx + 2] = b;
      rawPixels[dstIdx + 3] = a;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dist = 0;
      let isCorner = false;

      if (x < radius && y < radius) {
        dist = Math.hypot(x - radius, y - radius);
        isCorner = true;
      } else if (x >= width - radius && y < radius) {
        dist = Math.hypot(x - (width - radius - 1), y - radius);
        isCorner = true;
      } else if (x < radius && y >= height - radius) {
        dist = Math.hypot(x - radius, y - (height - radius - 1));
        isCorner = true;
      } else if (x >= width - radius && y >= height - radius) {
        dist = Math.hypot(x - (width - radius - 1), y - (height - radius - 1));
        isCorner = true;
      }

      if (isCorner) {
        const dstIdx = (y * width + x) * bytesPerPixel;
        if (dist > radius) {
          rawPixels[dstIdx + 3] = 0;
        } else if (dist > radius - 1.5) {
          const alphaFactor = 1 - (dist - (radius - 1.5)) / 1.5;
          rawPixels[dstIdx + 3] = Math.round(rawPixels[dstIdx + 3] * Math.max(0, Math.min(1, alphaFactor)));
        }
      }
    }
  }

  const filteredData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    filteredData[y * stride] = 0;
    rawPixels.copy(filteredData, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const newIDATData = zlib.deflateSync(filteredData);
  const outChunks = [];
  
  outChunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  outChunks.push(createChunk('IHDR', ihdr));

  outChunks.push(createChunk('IDAT', newIDATData));
  outChunks.push(createChunk('IEND', Buffer.alloc(0)));

  fs.writeFileSync(outputPath, Buffer.concat(outChunks));
  console.log(`Generated: ${outputPath}`);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeInt32BE(crc, 8 + len);
  return buf;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return crc ^ -1;
}

const inputLogo = path.join(__dirname, '../web/public/logo.png');

const webPublic = path.join(__dirname, '../web/public');
const adminPublic = path.join(__dirname, '../admin-web/public');

const roundedLogoWeb = path.join(webPublic, 'logo-rounded.png');
const roundedLogoAdmin = path.join(adminPublic, 'logo-rounded.png');

processPNG(inputLogo, roundedLogoWeb, 0.22);
fs.copyFileSync(roundedLogoWeb, roundedLogoAdmin);

// Copy rounded icon to apple-touch-icon.png in both
fs.copyFileSync(roundedLogoWeb, path.join(webPublic, 'apple-touch-icon.png'));
fs.copyFileSync(roundedLogoWeb, path.join(adminPublic, 'apple-touch-icon.png'));

console.log('Successfully created all rounded icons for web and admin!');
