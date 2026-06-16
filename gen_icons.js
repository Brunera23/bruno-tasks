// Gera apple-touch-icon.png (180x180) e manifest-icon.png (512x512)
// Mesma arte do manifest SVG: fundo azul #007AFF + check branco.
// Quadrado cheio, sem cantos arredondados — o iOS aplica a máscara sozinho.
const zlib = require('zlib');
const fs = require('fs');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const X = ax + t * dx - px, Y = ay + t * dy - py;
  return Math.sqrt(X * X + Y * Y);
}

function makeIcon(size, outFile) {
  const s = size / 512;
  // pontos do check no espaco 512 do SVG original
  const P = [[148, 270], [218, 336], [364, 176]].map(([x, y]) => [x * s, y * s]);
  const r = 20 * s; // stroke 40 / 2
  const BG = [0, 122, 255], FG = [255, 255, 255];
  const SS = [1 / 6, 3 / 6, 5 / 6]; // supersampling 3x3

  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filtro none
    for (let x = 0; x < size; x++) {
      let cov = 0;
      for (const oy of SS) for (const ox of SS) {
        const px = x + ox, py = y + oy;
        const d = Math.min(
          distSeg(px, py, P[0][0], P[0][1], P[1][0], P[1][1]),
          distSeg(px, py, P[1][0], P[1][1], P[2][0], P[2][1])
        );
        cov += Math.max(0, Math.min(1, r - d + 0.5));
      }
      cov /= 9;
      const o = row + 1 + x * 3;
      raw[o] = Math.round(BG[0] + (FG[0] - BG[0]) * cov);
      raw[o + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * cov);
      raw[o + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * cov);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(outFile, png);
  console.log(outFile, png.length, 'bytes');
}

makeIcon(180, 'apple-touch-icon.png');
makeIcon(512, 'manifest-icon.png');
