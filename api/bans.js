async function smembers(redisUrl, redisToken, key) {
  const r = await fetch(`${redisUrl}/smembers/${key}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  const data = await r.json();
  return data.result || [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const secret = process.env.ONLINE_SECRET;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ error: 'Redis not configured' });
  }
  if (!secret) {
    return res.status(500).json({ error: 'ONLINE_SECRET not set' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const password = body?.password || req.query?.password || '';
  if (password !== secret) {
    return res.status(401).json({ error: 'wrong password' });
  }

  if (req.method === 'GET') {
    try {
      const [names, tokens, ips] = await Promise.all([
        smembers(redisUrl, redisToken, 'ban:names'),
        smembers(redisUrl, redisToken, 'ban:tokens'),
        smembers(redisUrl, redisToken, 'ban:ips'),
      ]);
      return res.status(200).json({ ok: true, names, tokens, ips });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list bans' });
    }
  }

  const type = (body?.type || '').toString(); // names | tokens | ips
  const value = (body?.value || '').toString().trim();

  if (!['names', 'tokens', 'ips'].includes(type)) {
    return res.status(400).json({ error: 'type must be names | tokens | ips' });
  }
  if (!value || value.length > 200) {
    return res.status(400).json({ error: 'value required (max 200)' });
  }

  const key = `ban:${type}`;
  const stored =
    type === 'names' ? value.toLowerCase() : value;

  try {
    if (req.method === 'POST') {
      await fetch(`${redisUrl}/sadd/${key}/${encodeURIComponent(stored)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      return res.status(200).json({ ok: true, action: 'add', type, value: stored });
    }
    if (req.method === 'DELETE') {
      await fetch(`${redisUrl}/srem/${key}/${encodeURIComponent(stored)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      return res.status(200).json({ ok: true, action: 'remove', type, value: stored });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'ban update failed' });
  }
}
