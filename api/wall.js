export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  const limit = Math.min(Math.max(Number(req.query?.limit) || 40, 1), 50);

  try {
    const r = await fetch(`${redisUrl}/lrange/wall/0/${limit - 1}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const data = await r.json();
    const raw = data.result || [];

    const messages = [];
    for (const item of raw) {
      try {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        if (!parsed || !parsed.message) continue;
        messages.push({
          name: (parsed.name || 'Anonymous').toString().slice(0, 50),
          message: parsed.message.toString().slice(0, 2000),
          timestamp: Number(parsed.timestamp) || null,
          invited: !!parsed.invited,
          hasImage: !!parsed.hasImage,
        });
      } catch {
        // skip bad entries
      }
    }

    return res.status(200).json({ ok: true, messages, count: messages.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load wall' });
  }
}
