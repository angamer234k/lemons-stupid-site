/**
 * Shared pure-JS PNG helpers (outside /api so it doesn't count as a serverless fn)
 */
import zlib from 'zlib';

export const FONT = {
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
  '+': [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  '=': [0x00, 0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00],
  '/': [0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x10],
  '#': [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  '*': [0x00, 0x04, 0x15, 0x0e, 0x15, 0x04, 0x00],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '@': [0x0e, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0e],
  '_': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
};

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

export function setPixel(rgba, w, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  if (i + 3 >= rgba.length) return;
  rgba[i] = r;
  rgba[i + 1] = g;
  rgba[i + 2] = b;
  rgba[i + 3] = a;
}

export function fillRect(rgba, w, x0, y0, rw, rh, r, g, b, a = 255) {
  for (let y = y0; y < y0 + rh; y++) {
    for (let x = x0; x < x0 + rw; x++) setPixel(rgba, w, x, y, r, g, b, a);
  }
}

export function drawChar(rgba, w, ch, x, y, scale, r, g, b) {
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

export function charStep(scale) {
  return 5 * scale + scale;
}

export function textWidth(str, scale) {
  return str.length * charStep(scale);
}

export function drawText(rgba, w, str, cx, y, scale, r, g, b) {
  const s = String(str).toUpperCase();
  let x = Math.floor(cx - textWidth(s, scale) / 2);
  for (const ch of s) {
    drawChar(rgba, w, ch, x, y, scale, r, g, b);
    x += charStep(scale);
  }
}

export function drawTextLeft(rgba, w, str, x, y, scale, r, g, b) {
  const s = String(str).toUpperCase();
  for (const ch of s) {
    drawChar(rgba, w, ch, x, y, scale, r, g, b);
    x += charStep(scale);
  }
  return x;
}

export function drawTextRight(rgba, w, str, rightX, y, scale, r, g, b) {
  const s = String(str).toUpperCase();
  const x = rightX - textWidth(s, scale);
  drawTextLeft(rgba, w, s, x, y, scale, r, g, b);
}

export function wrapText(str, scale, maxWidth) {
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
      if (word.length * step > maxWidth) {
        let chunkStr = '';
        for (const ch of word) {
          if ((chunkStr.length + 1) * step > maxWidth) {
            lines.push(chunkStr);
            chunkStr = ch;
          } else {
            chunkStr += ch;
          }
        }
        line = chunkStr;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function makePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const src = y * width * 4;
    const dst = y * (width * 4 + 1);
    raw[dst] = 0;
    rgba.copy(raw, dst + 1, src, src + width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
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

export function parseHex(hex, fallback = [30, 30, 42]) {
  if (!hex || typeof hex !== 'string') return fallback;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n | 0));
}

export function sendPng(res, png, req) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', png.length);
  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(png);
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatDur(ms) {
  if (ms == null || Number.isNaN(ms) || ms < 0) return 'N/A';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return d + 'D ' + (h % 24) + 'H ' + (m % 60) + 'M';
  if (h > 0) return h + 'H ' + (m % 60) + 'M';
  if (m > 0) return m + 'M ' + (s % 60) + 'S';
  return s + 'S';
}

const BOT_HEALTH_URL = 'https://lemonsserver.wispbyte.app/health';
const BOT_HOST_URL = 'https://lemonsserver.wispbyte.app/api/host';

export async function fetchLiveStatus() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  let lastOnline = null;
  let wallCount = null;
  if (redisUrl && redisToken) {
    const headers = { Authorization: `Bearer ${redisToken}` };
    try {
      const [onlineRes, wallRes] = await Promise.all([
        fetch(`${redisUrl}/get/lastOnline`, { headers }),
        fetch(`${redisUrl}/llen/wall`, { headers }),
      ]);
      const onlineData = await onlineRes.json();
      lastOnline = onlineData.result ? Number(onlineData.result) : null;
      const wallData = await wallRes.json();
      wallCount = wallData.result != null ? Number(wallData.result) : null;
    } catch {
      // ignore
    }
  }

  let bot = null;
  let host = null;
  try {
    const r = await fetch(BOT_HEALTH_URL, { signal: AbortSignal.timeout(5000) });
    if (r.ok) bot = await r.json();
  } catch {
    // offline
  }
  try {
    const r = await fetch(BOT_HOST_URL, { signal: AbortSignal.timeout(5000) });
    if (r.ok) host = await r.json();
  } catch {
    // offline
  }

  const ONLINE_MS = 5 * 60 * 1000;
  return {
    site: {
      lastOnline,
      online: lastOnline != null && Date.now() - lastOnline < ONLINE_MS,
    },
    bot: bot
      ? {
          reachable: true,
          ready: !!bot.ready,
          uptimeMs: bot.uptimeMs ?? null,
          messageProtocol: bot.messageProtocol ?? null,
        }
      : { reachable: false },
    host: host
      ? {
          online: !!host.online,
          todayUptimePercent: host.todayUptimePercent ?? null,
          currentStreakMs: host.currentStreakMs ?? null,
          todayChecks: host.todayChecks ?? null,
        }
      : null,
    wall: { messageCount: wallCount },
  };
}

export function renderTextPng(q) {
  const text = String(q.t || q.text || 'lemon').slice(0, 200);
  const bg = parseHex(q.bg, [30, 30, 42]);
  const fg = parseHex(q.fg, [253, 255, 148]);
  const scale = clamp(Number(q.size) || 3, 1, 8);
  const step = charStep(scale);
  const lineH = 7 * scale + scale * 2;
  const pad = scale * 4;
  let W = q.w ? clamp(Number(q.w), 64, 1200) : null;
  let H = q.h ? clamp(Number(q.h), 32, 800) : null;
  const maxTextW = W ? W - pad * 2 : 800;
  const lines = wrapText(text, scale, maxTextW);
  const contentW = Math.max(...lines.map((l) => l.length * step), 40);
  const contentH = lines.length * lineH;
  if (!W) W = clamp(contentW + pad * 2, 64, 1200);
  if (!H) H = clamp(contentH + pad * 2, 32, 800);
  const rgba = Buffer.alloc(W * H * 4);
  fillRect(rgba, W, 0, 0, W, H, bg[0], bg[1], bg[2]);
  let y = Math.floor((H - contentH) / 2) + scale;
  for (const line of lines) {
    drawText(rgba, W, line, W / 2, y, scale, fg[0], fg[1], fg[2]);
    y += lineH;
  }
  return makePng(W, H, rgba);
}

export function renderLemonPng(q) {
  let size = Number(q.size) || 128;
  if (![64, 128, 256].includes(size)) size = 128;
  size = clamp(size, 64, 256);
  const seed = q.seed != null ? Number(q.seed) || Date.now() : Date.now() ^ (Math.random() * 1e9);
  const rng = mulberry32(seed >>> 0);
  const W = size;
  const H = size;
  const rgba = Buffer.alloc(W * H * 4);
  const bgTint = 20 + Math.floor(rng() * 25);
  fillRect(rgba, W, 0, 0, W, H, 18 + bgTint, 18 + bgTint, 28 + bgTint);

  const cx = W / 2;
  const cy = H / 2 + H * 0.05;
  const rx = W * 0.32;
  const ry = H * 0.38;
  const lemonY = [253, 255, 148];
  const lemonDark = [220, 200, 60];
  const lemonLight = [255, 255, 200];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        const shade = 0.75 + 0.35 * (1 - d) + 0.1 * Math.sin(dx * 4 + dy * 3);
        setPixel(
          rgba, W, x, y,
          Math.min(255, Math.floor(lemonY[0] * shade)),
          Math.min(255, Math.floor(lemonY[1] * shade)),
          Math.min(255, Math.floor(lemonY[2] * shade * 0.95))
        );
      }
    }
  }

  const hx = cx - rx * 0.35;
  const hy = cy - ry * 0.35;
  const hr = Math.min(rx, ry) * 0.28;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - hx) / hr;
      const dy = (y - hy) / (hr * 0.7);
      if (dx * dx + dy * dy <= 1) {
        const a = 0.45 * (1 - (dx * dx + dy * dy));
        const i = (y * W + x) * 4;
        rgba[i] = Math.min(255, rgba[i] + Math.floor((lemonLight[0] - rgba[i]) * a));
        rgba[i + 1] = Math.min(255, rgba[i + 1] + Math.floor((lemonLight[1] - rgba[i + 1]) * a));
        rgba[i + 2] = Math.min(255, rgba[i + 2] + Math.floor((lemonLight[2] - rgba[i + 2]) * a));
      }
    }
  }

  const stemColor = [60, 120, 50];
  const sx = cx;
  const sy = cy - ry - H * 0.02;
  fillRect(rgba, W, Math.floor(sx - 2), Math.floor(sy - H * 0.08), 4, Math.floor(H * 0.1), stemColor[0], stemColor[1], stemColor[2]);
  const leaf = [80, 180, 70];
  const lx = sx + 4;
  const ly = sy - H * 0.04;
  for (let i = 0; i < 12; i++) {
    const px = Math.floor(lx + i * 1.2);
    const py = Math.floor(ly - Math.sin(i / 4) * 6);
    fillRect(rgba, W, px, py, 3, 2, leaf[0], leaf[1], leaf[2]);
  }

  if (rng() > 0.4) {
    for (let i = 0; i < 3 + Math.floor(rng() * 4); i++) {
      const px = Math.floor(cx + (rng() - 0.5) * rx * 1.2);
      const py = Math.floor(cy + (rng() - 0.5) * ry * 1.2);
      const dx = (px - cx) / rx;
      const dy = (py - cy) / ry;
      if (dx * dx + dy * dy < 0.7) setPixel(rgba, W, px, py, lemonDark[0], lemonDark[1], lemonDark[2]);
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.92 && d < 1.02) setPixel(rgba, W, x, y, 200, 180, 50);
    }
  }

  return makePng(W, H, rgba);
}

export function renderSolidPng(q) {
  const color = parseHex(q.c || q.color, [103, 128, 159]);
  const W = clamp(Number(q.w) || 200, 1, 1200);
  const H = clamp(Number(q.h) || 200, 1, 1200);
  const label = q.t || q.text ? String(q.t || q.text).slice(0, 80) : null;
  const rgba = Buffer.alloc(W * H * 4);
  fillRect(rgba, W, 0, 0, W, H, color[0], color[1], color[2]);
  if (label) {
    const lum = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255;
    const fg = lum > 0.55 ? [20, 20, 30] : [253, 255, 148];
    const scale = Math.max(1, Math.min(4, Math.floor(Math.min(W, H) / 40)));
    const lines = wrapText(label, scale, W - scale * 4).slice(0, 4);
    const lineH = 7 * scale + scale * 2;
    let y = Math.floor((H - lines.length * lineH) / 2) + scale;
    for (const line of lines) {
      drawText(rgba, W, line, W / 2, y, scale, fg[0], fg[1], fg[2]);
      y += lineH;
    }
  }
  return makePng(W, H, rgba);
}

/** Discord-friendly bot uptime card */
export async function renderUptimePng() {
  const data = await fetchLiveStatus();
  const bot = data.bot || {};
  const up = !!bot.reachable;
  const ready = up && !!bot.ready;

  const W = 720;
  const H = 280;
  const bg = [30, 30, 42];
  const panel = [44, 55, 68];
  const accent = ready ? [74, 222, 128] : up ? [251, 191, 36] : [248, 113, 113];
  const fg = [253, 255, 148];
  const muted = [148, 163, 184];
  const white = [241, 245, 249];

  const rgba = Buffer.alloc(W * H * 4);
  fillRect(rgba, W, 0, 0, W, H, bg[0], bg[1], bg[2]);

  // accent border
  fillRect(rgba, W, 0, 0, W, 6, accent[0], accent[1], accent[2]);
  fillRect(rgba, W, 0, H - 6, W, 6, accent[0], accent[1], accent[2]);
  fillRect(rgba, W, 0, 0, 6, H, accent[0], accent[1], accent[2]);
  fillRect(rgba, W, W - 6, 0, 6, H, accent[0], accent[1], accent[2]);

  // inner panel
  fillRect(rgba, W, 24, 28, W - 48, H - 56, panel[0], panel[1], panel[2]);

  drawText(rgba, W, 'DISCORD BOT UPTIME', W / 2, 44, 2, muted[0], muted[1], muted[2]);

  const statusLabel = !up ? 'OFFLINE' : ready ? 'ONLINE' : 'NOT READY';
  drawText(rgba, W, statusLabel, W / 2, 78, 3, accent[0], accent[1], accent[2]);

  const uptimeStr = up ? formatDur(bot.uptimeMs) : '---';
  drawText(rgba, W, uptimeStr, W / 2, 130, 4, fg[0], fg[1], fg[2]);

  const proto = bot.messageProtocol != null ? 'PROTO V' + bot.messageProtocol : 'PROTO -';
  const readyStr = up ? (ready ? 'READY' : 'NOT READY') : 'DOWN';
  drawText(rgba, W, readyStr + '  ·  ' + proto, W / 2, 190, 2, white[0], white[1], white[2]);

  drawText(rgba, W, 'LEMON BOT', W / 2, 230, 2, muted[0], muted[1], muted[2]);

  return makePng(W, H, rgba);
}

/** Full status card: site, bot, host, wall */
export async function renderStatusPng() {
  const data = await fetchLiveStatus();
  const bot = data.bot || {};
  const host = data.host;
  const site = data.site || {};
  const wall = data.wall || {};

  const W = 800;
  const H = 400;
  const bg = [30, 30, 42];
  const panel = [44, 55, 68];
  const yellow = [253, 255, 148];
  const muted = [148, 163, 184];
  const white = [241, 245, 249];
  const green = [74, 222, 128];
  const red = [248, 113, 113];
  const amber = [251, 191, 36];
  const border = [75, 108, 165];

  const rgba = Buffer.alloc(W * H * 4);
  fillRect(rgba, W, 0, 0, W, H, bg[0], bg[1], bg[2]);
  fillRect(rgba, W, 0, 0, W, 5, border[0], border[1], border[2]);
  fillRect(rgba, W, 0, H - 5, W, 5, border[0], border[1], border[2]);
  fillRect(rgba, W, 0, 0, 5, H, border[0], border[1], border[2]);
  fillRect(rgba, W, W - 5, 0, 5, H, border[0], border[1], border[2]);

  drawText(rgba, W, 'LEMON STATUS', W / 2, 28, 3, yellow[0], yellow[1], yellow[2]);

  function row(label, value, y, valueColor) {
    fillRect(rgba, W, 40, y - 6, W - 80, 36, panel[0], panel[1], panel[2]);
    drawTextLeft(rgba, W, label, 56, y + 4, 2, muted[0], muted[1], muted[2]);
    drawTextRight(rgba, W, value, W - 56, y + 4, 2, valueColor[0], valueColor[1], valueColor[2]);
  }

  const botUp = !!bot.reachable;
  const botReady = botUp && !!bot.ready;
  const botColor = botReady ? green : botUp ? amber : red;
  const botVal = !botUp
    ? 'DOWN'
    : botReady
      ? 'UP  ' + formatDur(bot.uptimeMs)
      : 'NOT READY  ' + formatDur(bot.uptimeMs);

  const hostOn = host && host.online;
  const hostColor = host ? (hostOn ? green : red) : muted;
  const hostVal = !host
    ? 'UNKNOWN'
    : hostOn
      ? 'ONLINE  ' + (host.todayUptimePercent != null ? host.todayUptimePercent + '%' : '')
      : 'OFFLINE  STREAK ' + formatDur(host.currentStreakMs);

  const siteColor = site.online ? green : red;
  const siteVal = site.online ? 'ONLINE' : 'OFFLINE';

  const wallVal =
    wall.messageCount != null ? String(wall.messageCount) + ' MSGS' : 'N/A';

  row('SITE', siteVal, 80, siteColor);
  row('DISCORD BOT', botVal, 130, botColor);
  row('ROBLOX HOST', hostVal, 180, hostColor);
  row('WALL', wallVal, 230, white);

  const proto =
    bot.messageProtocol != null ? 'PROTOCOL V' + bot.messageProtocol : 'PROTOCOL -';
  drawText(rgba, W, proto, W / 2, 300, 2, muted[0], muted[1], muted[2]);
  drawText(rgba, W, 'LIVE  ·  LEMON', W / 2, 340, 2, yellow[0], yellow[1], yellow[2]);

  return makePng(W, H, rgba);
}
