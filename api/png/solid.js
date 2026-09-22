/**
 * /api/png/solid — solid color / placeholder PNG
 * Query: c (hex), w, h, t (optional label)
 */
import {
  makePng,
  fillRect,
  drawText,
  wrapText,
  charStep,
  parseHex,
  clamp,
  sendPng,
} from './_png.js';

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
  const color = parseHex(q.c || q.color, [103, 128, 159]); // #67809f site blue
  const W = clamp(Number(q.w) || 200, 1, 1200);
  const H = clamp(Number(q.h) || 200, 1, 1200);
  const label = q.t || q.text ? String(q.t || q.text).slice(0, 80) : null;

  const rgba = Buffer.alloc(W * H * 4);
  fillRect(rgba, W, 0, 0, W, H, color[0], color[1], color[2]);

  if (label) {
    // pick contrasting text color (simple luminance)
    const lum = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255;
    const fg = lum > 0.55 ? [20, 20, 30] : [253, 255, 148];

    const scale = Math.max(1, Math.min(4, Math.floor(Math.min(W, H) / 40)));
    const maxW = W - scale * 4;
    const lines = wrapText(label, scale, maxW).slice(0, 4);
    const lineH = 7 * scale + scale * 2;
    const totalH = lines.length * lineH;
    let y = Math.floor((H - totalH) / 2) + scale;

    for (const line of lines) {
      drawText(rgba, W, line, W / 2, y, scale, fg[0], fg[1], fg[2]);
      y += lineH;
    }
  }

  const png = makePng(W, H, rgba);
  return sendPng(res, png, req);
}
