/**
 * /api/png/text — render text as PNG
 * Query: t (text), bg, fg, size, w, h
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
  const text = String(q.t || q.text || 'lemon').slice(0, 200);
  const bg = parseHex(q.bg, [30, 30, 42]);
  const fg = parseHex(q.fg, [253, 255, 148]);
  const scale = clamp(Number(q.size) || 3, 1, 8);

  const step = charStep(scale);
  const lineH = 7 * scale + scale * 2;
  const pad = scale * 4;

  // auto size or user size
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

  const png = makePng(W, H, rgba);
  return sendPng(res, png, req);
}
