// Random challenge image (SVG) — no deps
const CHALLENGES = [
  'touch grass',
  'drink water',
  'pet a cat',
  'say hi to lemon',
  'blink twice',
  'count to 3',
  'not a robot?',
  'prove you exist',
  'find the lemon',
  'be so real',
  'no cap',
  'skill issue?',
  'ratio free zone',
  'go outside',
  'breathe once',
];

const COLORS = [
  ['#1e1e2a', '#fdff94', '#4b6ca5'],
  ['#0f1115', '#7fd962', '#5b8def'],
  ['#2c1a3a', '#ff9ecd', '#c084fc'],
  ['#1a2e1a', '#a3e635', '#22c55e'],
  ['#1a1a2e', '#67e8f9', '#818cf8'],
  ['#2a1a1a', '#fca5a5', '#f97316'],
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [bg, fg, accent] = pick(COLORS);
  const challenge = pick(CHALLENGES);
  const code = randomCode(5);
  const noise = Array.from({ length: 12 }, () => ({
    x: Math.random() * 400,
    y: Math.random() * 160,
    r: 4 + Math.random() * 18,
    o: 0.08 + Math.random() * 0.15,
  }));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160">
  <rect width="400" height="160" fill="${bg}" rx="12"/>
  <rect x="4" y="4" width="392" height="152" fill="none" stroke="${accent}" stroke-width="2" rx="10" opacity="0.6"/>
  ${noise.map((n) => `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" fill="${fg}" opacity="${n.o.toFixed(2)}"/>`).join('')}
  <text x="200" y="48" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="14" font-weight="600" fill="${accent}" letter-spacing="2">CHALLENGE</text>
  <text x="200" y="88" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="28" font-weight="800" fill="${fg}">${challenge}</text>
  <text x="200" y="128" text-anchor="middle" font-family="ui-monospace,monospace" font-size="20" font-weight="700" fill="${accent}" letter-spacing="6">${code}</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.status(200).send(svg);
}