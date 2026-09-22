/**
 * /api/png/:type — text | lemon | solid
 * One dynamic serverless function for all generators.
 */
import {
  renderTextPng,
  renderLemonPng,
  renderSolidPng,
  sendPng,
} from '../../lib/png.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const type = String(req.query.type || '').toLowerCase();
  const q = req.query || {};

  let png;
  if (type === 'text') png = renderTextPng(q);
  else if (type === 'lemon') png = renderLemonPng(q);
  else if (type === 'solid') png = renderSolidPng(q);
  else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(404).json({
      error: 'Unknown generator',
      available: ['text', 'lemon', 'solid'],
      index: '/api/png',
    });
  }

  return sendPng(res, png, req);
}
