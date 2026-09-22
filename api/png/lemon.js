/**
 * /api/png/lemon — random lemon PNG (pixel art vibes)
 * Query: size (64|128|256), seed
 */
import { makePng, fillRect, setPixel, clamp, sendPng } from './_png.js';

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawLemon(rgba, W, H, rng) {
  const cx = W / 2;
  const cy = H / 2 + H * 0.05;
  const rx = W * 0.32;
  const ry = H * 0.38;

  // soft bg tint
  const bgTint = 20 + Math.floor(rng() * 25);
  fillRect(rgba, W, 0, 0, W, H, 18 + bgTint, 18 + bgTint, 28 + bgTint);

  // lemon body (ellipse approx with fill)
  const lemonY = [253, 255, 148];
  const lemonDark = [220, 200, 60];
  const lemonLight = [255, 255, 200];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        // slight shading
        const shade = 0.75 + 0.35 * (1 - d) + 0.1 * Math.sin(dx * 4 + dy * 3);
        const r = Math.min(255, Math.floor(lemonY[0] * shade));
        const g = Math.min(255, Math.floor(lemonY[1] * shade));
        const b = Math.min(255, Math.floor(lemonY[2] * shade * 0.95));
        setPixel(rgba, W, x, y, r, g, b);
      }
    }
  }

  // highlight blob
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

  // stem
  const stemColor = [60, 120, 50];
  const sx = cx;
  const sy = cy - ry - H * 0.02;
  fillRect(rgba, W, Math.floor(sx - 2), Math.floor(sy - H * 0.08), 4, Math.floor(H * 0.1), stemColor[0], stemColor[1], stemColor[2]);

  // leaf
  const leaf = [80, 180, 70];
  const lx = sx + 4;
  const ly = sy - H * 0.04;
  for (let i = 0; i < 12; i++) {
    const px = Math.floor(lx + i * 1.2);
    const py = Math.floor(ly - Math.sin(i / 4) * 6);
    fillRect(rgba, W, px, py, 3, 2, leaf[0], leaf[1], leaf[2]);
  }

  // tiny seed dots (optional chaos)
  if (rng() > 0.4) {
    for (let i = 0; i < 3 + Math.floor(rng() * 4); i++) {
      const px = Math.floor(cx + (rng() - 0.5) * rx * 1.2);
      const py = Math.floor(cy + (rng() - 0.5) * ry * 1.2);
      const dx = (px - cx) / rx;
      const dy = (py - cy) / ry;
      if (dx * dx + dy * dy < 0.7) {
        setPixel(rgba, W, px, py, lemonDark[0], lemonDark[1], lemonDark[2]);
      }
    }
  }

  // subtle border ring
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.92 && d < 1.02) {
        setPixel(rgba, W, x, y, 200, 180, 50);
      }
    }
  }
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = req.query || {};
  let size = Number(q.size) || 128;
  if (![64, 128, 256].includes(size)) size = 128;
  size = clamp(size, 64, 256);

  const seed = q.seed != null ? Number(q.seed) || Date.now() : Date.now() ^ (Math.random() * 1e9);
  const rng = mulberry32(seed >>> 0);

  const W = size;
  const H = size;
  const rgba = Buffer.alloc(W * H * 4);
  // transparent-ish init then draw
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 30;
    rgba[i + 1] = 30;
    rgba[i + 2] = 42;
    rgba[i + 3] = 255;
  }

  drawLemon(rgba, W, H, rng);

  const png = makePng(W, H, rgba);
  return sendPng(res, png, req);
}
