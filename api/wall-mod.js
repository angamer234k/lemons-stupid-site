async function redisJson(redisUrl, redisToken, path) {
  const r = await fetch(`${redisUrl}${path}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  return r.json();
}

async function readList(redisUrl, redisToken, key, limit = 50) {
  const data = await redisJson(redisUrl, redisToken, `/lrange/${key}/0/${limit - 1}`);
  const raw = data.result || [];
  const items = [];
  for (const item of raw) {
    try {
      const parsed = typeof item === 'string' ? JSON.parse(item) : item;
      if (parsed && parsed.message) items.push(parsed);
    } catch {
      // skip
    }
  }
  return items;
}

async function rewriteList(redisUrl, redisToken, key, items) {
  await redisJson(redisUrl, redisToken, `/del/${key}`);
  // push oldest first so newest ends up at head (lpush order)
  for (let i = items.length - 1; i >= 0; i--) {
    await fetch(`${redisUrl}/lpush/${key}/${encodeURIComponent(JSON.stringify(items[i]))}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
  }
  if (items.length > 50) {
    await redisJson(redisUrl, redisToken, `/ltrim/${key}/0/49`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  const password =
    body?.password ||
    req.query?.password ||
    req.headers['x-online-secret'] ||
    '';

  if (password !== secret) {
    return res.status(401).json({ error: 'wrong password' });
  }

  // GET → pending + live (admin view)
  if (req.method === 'GET') {
    try {
      const pending = await readList(redisUrl, redisToken, 'wall:pending', 50);
      const live = await readList(redisUrl, redisToken, 'wall', 50);
      return res.status(200).json({
        ok: true,
        pending,
        live,
        pendingCount: pending.length,
        liveCount: live.length,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to load mod lists' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = (body?.action || '').toString();
  const id = (body?.id || '').toString();

  try {
    if (action === 'approve') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const pending = await readList(redisUrl, redisToken, 'wall:pending', 50);
      const idx = pending.findIndex((m) => m.id === id);
      if (idx === -1) return res.status(404).json({ error: 'not found in pending' });
      const item = pending[idx];
      pending.splice(idx, 1);
      await rewriteList(redisUrl, redisToken, 'wall:pending', pending);

      const live = await readList(redisUrl, redisToken, 'wall', 50);
      live.unshift(item);
      await rewriteList(redisUrl, redisToken, 'wall', live.slice(0, 50));

      return res.status(200).json({ ok: true, action: 'approve', id });
    }

    if (action === 'reject') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const pending = await readList(redisUrl, redisToken, 'wall:pending', 50);
      const next = pending.filter((m) => m.id !== id);
      if (next.length === pending.length) {
        return res.status(404).json({ error: 'not found in pending' });
      }
      await rewriteList(redisUrl, redisToken, 'wall:pending', next);
      return res.status(200).json({ ok: true, action: 'reject', id });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const live = await readList(redisUrl, redisToken, 'wall', 50);
      const next = live.filter((m) => m.id !== id);
      if (next.length === live.length) {
        return res.status(404).json({ error: 'not found on wall' });
      }
      await rewriteList(redisUrl, redisToken, 'wall', next);
      return res.status(200).json({ ok: true, action: 'delete', id });
    }

    if (action === 'flush-live') {
      await redisJson(redisUrl, redisToken, '/del/wall');
      return res.status(200).json({ ok: true, action: 'flush-live' });
    }

    if (action === 'flush-pending') {
      await redisJson(redisUrl, redisToken, '/del/wall:pending');
      return res.status(200).json({ ok: true, action: 'flush-pending' });
    }

    return res.status(400).json({
      error: 'action must be approve | reject | delete | flush-live | flush-pending',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'mod action failed' });
  }
}
