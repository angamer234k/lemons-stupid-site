/**
 * /api/png — index of PNG generators
 * All pure JS, no deps, same style as /api/challenge
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    ok: true,
    generators: [
      {
        path: '/api/png/text',
        description: 'Render text as a PNG (bitmap font)',
        params: {
          t: 'text to render (required)',
          bg: 'background hex, e.g. 1e1e2a (default: site dark)',
          fg: 'foreground hex, e.g. fdff94 (default: lemon yellow)',
          size: 'font scale 1-8 (default: 3)',
          w: 'width 64-1200 (default: auto)',
          h: 'height 32-800 (default: auto)',
        },
        example: '/api/png/text?t=hello%20lemon&fg=fdff94',
      },
      {
        path: '/api/png/lemon',
        description: 'Random lemon / citrus vibes PNG',
        params: {
          seed: 'optional number for reproducible lemon',
          size: '64 | 128 | 256 (default: 128)',
        },
        example: '/api/png/lemon?size=128',
      },
      {
        path: '/api/png/solid',
        description: 'Solid color placeholder PNG',
        params: {
          c: 'hex color without # (default: 67809f)',
          w: 'width 1-1200 (default: 200)',
          h: 'height 1-1200 (default: 200)',
          t: 'optional label text',
        },
        example: '/api/png/solid?c=fdff94&w=300&h=150&t=placeholder',
      },
    ],
  });
}
