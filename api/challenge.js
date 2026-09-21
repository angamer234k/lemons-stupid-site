// Random challenge image as PNG (Discord does NOT embed SVG)
import zlib from 'zlib';

const CHALLENGES = [
  'talk backwards for the next 10 messages',
  'only talk in emojis for 10 minutes',
  'act like a cat for 15 minutes',
  'reply only with questions for 10 messages',
  'speak in third person for 10 minutes',
  'no vowels allowed for the next 8 messages',
  'end every message with nya for 10 mins',
  'roleplay as a pirate for 15 minutes',
  'only use one-word replies for 10 messages',
  'type like a robot for the next 10 messages',
  'compliment everyone for 10 minutes',
  'talk only in rhymes for 8 messages',
  'act extremely formal for 15 minutes',
  'no capital letters for the next 10 messages',
  'start every sentence with honestly for 10 msgs',
  'pretend you are a lemon for 10 minutes',
  'answer everything with a meme format for 10 msgs',
  'whisper mode: all lowercase soft talk for 10 mins',
  'overly dramatic reactions only for 10 messages',
  'explain everything like they are 5 for 10 mins',
  'only speak in movie quotes for 8 messages',
  'act as a sports commentator for 10 minutes',
  'no slang allowed speak proper for 15 minutes',
  'replace every hello with greetings traveler',
  'meow at least once every message for 10 mins',
  'talk like an old wizard for 10 messages',
  'use at least 3 emojis every message for 10 mins',
  'deny being human for the next 10 messages',
  'narrate your life in chat for 10 minutes',
  'only reply with yes or no for 8 messages',
];

const PALETTES = [
  { bg: [30, 30, 42], fg: [253, 255, 148], accent: [75, 108, 165] },
  { bg: [15, 17, 21], fg: [127, 217, 98], accent: [91, 141, 239] },
  { bg: [44, 26, 58], fg: [255, 158, 205], accent: [192, 132, 252] },
  { bg: [26, 46, 26], fg: [163, 230, 53], accent: [34, 197, 94] },
  { bg: [26, 26, 46], fg: [103, 232, 249], accent: [129, 140, 248] },
  { bg: [42, 26, 26], fg: [252, 165, 165], accent: [249, 115, 22] },
];

// 5x7 bitmap font (uppercase + digits + basic punct)
const FONT = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x01, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0e],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x11, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x0e, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "'": [0x06, 0x06, 0x04, 0x00, 0x00, 0x00, 0x00],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ':': [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  ',': [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function setPixel(rgba, w, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  if (i + 3 >= rgba.length) return;
  rgba[i] = r;
  rgba[i + 1] = g;
  rgba[i + 2] = b;
  rgba[i + 3] = a;
}

function fillRect(rgba, w, x0, y0, rw, rh, r, g, b) {
  for (let y = y0; y < y0 + rh; y++) {
    for (let x = x0; x < x0 + rw; x++) setPixel(rgba, w, x, y, r, g, b);
  }
}

function drawChar(rgba, w, ch, x, y, scale, r, g, b) {
  const glyph = FONT[ch] || FONT['?'];
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (1 << (4 - col))) {
        fillRect(rgba, w, x + col * scale, y + row * scale, scale, scale, r, g, b);
      }
    }
  }
}

function charStep(scale) {
  return 5 * scale + scale;
}

function textWidth(str, scale) {
  return str.length * charStep(scale);
}

function drawText(rgba, w, str, cx, y, scale, r, g, b) {
  const s = String(str).toUpperCase();
  let x = Math.floor(cx - textWidth(s, scale) / 2);
  for (const ch of s) {
    drawChar(rgba, w, ch, x, y, scale, r, g, b);
    x += charStep(scale);
  }
}

function wrapText(str, scale, maxWidth) {
  const words = String(str).toUpperCase().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  const step = charStep(scale);
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (next.length * step <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      // hard-break very long words
      if (word.length * step > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if ((chunk.length + 1) * step > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4); // max 4 lines
}

function drawWrappedText(rgba, w, str, cx, y, scale, r, g, b, maxWidth) {
  const lines = wrapText(str, scale, maxWidth);
  const lineH = 7 * scale + scale * 2;
  const totalH = lines.length * lineH;
  let yy = y - Math.floor(totalH / 2) + scale;
  for (const line of lines) {
    drawText(rgba, w, line, cx, yy, scale, r, g, b);
    yy += lineH;
  }
}

function makePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const src = y * width * 4;
    const dst = y * (width * 4 + 1);
    raw[dst] = 0; // filter none
    rgba.copy(raw, dst + 1, src, src + width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderChallenge() {
  const W = 800;
  const H = 360;
  const { bg, fg, accent } = pick(PALETTES);
  const challenge = pick(CHALLENGES);
  const code = randomCode(5);
  const rgba = Buffer.alloc(W * H * 4);

  // background
  fillRect(rgba, W, 0, 0, W, H, bg[0], bg[1], bg[2]);

  // border
  const bw = 6;
  fillRect(rgba, W, 0, 0, W, bw, accent[0], accent[1], accent[2]);
  fillRect(rgba, W, 0, H - bw, W, bw, accent[0], accent[1], accent[2]);
  fillRect(rgba, W, 0, 0, bw, H, accent[0], accent[1], accent[2]);
  fillRect(rgba, W, W - bw, 0, bw, H, accent[0], accent[1], accent[2]);

  // noise dots
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() * (W - 20)) | 0;
    const y = (Math.random() * (H - 20)) | 0;
    const s = 2 + ((Math.random() * 8) | 0);
    const a = 30 + ((Math.random() * 50) | 0);
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= bw && py >= bw && px < W - bw && py < H - bw) {
          const idx = (py * W + px) * 4;
          rgba[idx] = Math.min(255, rgba[idx] + Math.floor(((fg[0] - rgba[idx]) * a) / 255));
          rgba[idx + 1] = Math.min(255, rgba[idx + 1] + Math.floor(((fg[1] - rgba[idx + 1]) * a) / 255));
          rgba[idx + 2] = Math.min(255, rgba[idx + 2] + Math.floor(((fg[2] - rgba[idx + 2]) * a) / 255));
        }
      }
    }
  }

  drawText(rgba, W, 'CHALLENGE', W / 2, 36, 3, accent[0], accent[1], accent[2]);
  drawWrappedText(rgba, W, challenge, W / 2, 160, 3, fg[0], fg[1], fg[2], W - 80);
  drawText(rgba, W, code, W / 2, 300, 3, accent[0], accent[1], accent[2]);

  return makePng(W, H, rgba);
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Content-Type', 'image/png');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const png = renderChallenge();
  res.setHeader('Content-Length', png.length);

  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(png);
}
