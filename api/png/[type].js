/**
 * /api/png/:type — text | lemon | solid | uptime | status | roblox
 */
import {
  renderTextPng,
  renderLemonPng,
  renderSolidPng,
  renderUptimePng,
  renderStatusPng,
  renderRobloxPng,
  sendPng,
} from '../../lib/png.js';

export default async function handler(req, res) {
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

  try {
    let png;
    if (type === 'text') png = renderTextPng(q);
    else if (type === 'lemon') png = renderLemonPng(q);
    else if (type === 'solid') png = renderSolidPng(q);
    else if (type === 'uptime') png = await renderUptimePng();
    else if (type === 'status') png = await renderStatusPng();
    else if (type === 'roblox') png = await renderRobloxPng(q);
    else {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(404).json({
        error: 'Unknown generator',
        available: ['text', 'lemon', 'solid', 'uptime', 'status', 'roblox'],
        index: '/api/png',
      });
    }

    return sendPng(res, png, req);
  } catch (err) {
    console.error(err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'Failed to render PNG' });
  }
}
