export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const secret = process.env.ONLINE_SECRET;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  if (!secret) {
    return res.status(500).json({ error: 'ONLINE_SECRET not set' });
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const password = body?.password || req.query?.password;
  const token = (body?.token || req.query?.token || '').toString().trim();

  if (password !== secret) {
    return res.status(401).json({ error: 'wrong password 👀' });
  }

  // ── POST → create / refresh a token ─────────────────────────────
  if (req.method === 'POST') {
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    // optional expiry in seconds (default: no expiry)
    const expiresIn = body?.expiresIn ? Number(body.expiresIn) : null;

    try {
      let url = `${redisUrl}/set/invite:${encodeURIComponent(token)}/1`;
      if (expiresIn && expiresIn > 0) {
        url += `?EX=${expiresIn}`;
      }

      await fetch(url, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });

      return res.status(200).json({
        ok: true,
        token,
        expiresIn: expiresIn || null,
        link: `https://лемон.space/message?token=${encodeURIComponent(token)}`
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create token' });
    }
  }

  // ── DELETE → revoke a token ─────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    try {
      await fetch(`${redisUrl}/del/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });

      return res.status(200).json({ ok: true, revoked: token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to revoke token' });
    }
  }

  // ── GET → check if a token is valid ─────────────────────────────
  if (req.method === 'GET') {
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    try {
      const r = await fetch(`${redisUrl}/get/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const data = await r.json();

      return res.status(200).json({
        token,
        valid: !!data.result
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to check token' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
