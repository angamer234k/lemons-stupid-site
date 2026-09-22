/**
 * /api/png — index of PNG generators
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
        path: '/api/png/uptime',
        description: 'Live discord bot uptime card (PNG, discord-embed friendly)',
        example: '/api/png/uptime',
      },
      {
        path: '/api/png/status',
        description: 'Live status card: site · bot · roblox host · wall msgs',
        example: '/api/png/status',
      },
      {
        path: '/api/png/text',
        description: 'Render text as a PNG (bitmap font)',
        params: {
          t: 'text to render',
          bg: 'background hex',
          fg: 'foreground hex',
          size: 'font scale 1-8',
          w: 'width',
          h: 'height',
        },
        example: '/api/png/text?t=hello%20lemon&fg=fdff94',
      },
      {
        path: '/api/png/lemon',
        description: 'Random lemon art PNG',
        example: '/api/png/lemon?size=128',
      },
      {
        path: '/api/png/solid',
        description: 'Solid color placeholder PNG',
        example: '/api/png/solid?c=fdff94&w=300&h=150&t=placeholder',
      },
    ],
  });
}
