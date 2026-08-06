export default async function handler(req, res) {
  // CORS (same-origin is fine, but this makes it easier to test)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const secret = process.env.ONLINE_SECRET;

  if (!url || !token) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  // ── GET → return last online timestamp ──────────────────────────
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${url}/get/lastOnline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      // Upstash returns { result: "value" } or { result: null }
      const ts = data.result ? Number(data.result) : null;
      return res.status(200).json({ lastOnline: ts });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to read' });
    }
  }

  // ── POST → update last online (requires password) ───────────────
  if (req.method === 'POST') {
    let body = req.body;

    // Vercel sometimes needs manual parse
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const password = body?.password;

    if (!secret) {
      return res.status(500).json({ error: 'ONLINE_SECRET not set' });
    }

    if (password !== secret) {
      return res.status(401).json({ error: 'wrong password 👀' });
    }

    const now = Date.now();

    try {
      await fetch(`${url}/set/lastOnline/${now}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.status(200).json({ ok: true, lastOnline: now });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
