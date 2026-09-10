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
  for (let i = items.length - 1; i >= 0; i--) {
    await fetch(`${redisUrl}/lpush/${key}/${encodeURIComponent(JSON.stringify(items[i]))}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
  }
  if (items.length > 50) {
    await redisJson(redisUrl, redisToken, `/ltrim/${key}/0/49`);
  }
}

/** Match by real id, or idx:N for entries that never got an id. */
function removeFromList(list, id) {
  if (id != null && String(id).startsWith('idx:')) {
    const n = Number(String(id).slice(4));
    if (!Number.isFinite(n) || n < 0 || n >= list.length) return null;
    const next = list.slice();
    next.splice(n, 1);
    return next;
  }
  const sid = String(id || '');
  if (!sid) return null;
  const next = list.filter((m) => String(m.id || '') !== sid);
  if (next.length === list.length) return null;
  return next;
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

  if (req.method === 'GET') {
    try {
      const pending = await readList(redisUrl, redisToken, 'wall:pending', 50);
      const live = await readList(redisUrl, redisToken, 'wall', 50);
      // surface stable keys for UI (idx:N when id missing)
      const tag = (arr) =>
        arr.map((m, i) => ({
          ...m,
          id: m.id || null,
          key: m.id ? String(m.id) : `idx:${i}`,
        }));
      return res.status(200).json({
        ok: true,
        pending: tag(pending),
        live: tag(live),
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
  const id = (body?.id || body?.key || '').toString();

  try {
    if (action === 'approve') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const pending = await readList(redisUrl, redisToken, 'wall:pending', 50);
      let item = null;
      let nextPending = null;
      if (id.startsWith('idx:')) {
        const n = Number(id.slice(4));
        if (!Number.isFinite(n) || n < 0 || n >= pending.length) {
          return res.status(404).json({ error: 'not found in pending' });
        }
        item = pending[n];
        nextPending = pending.slice();
        nextPending.splice(n, 1);
      } else {
        const idx = pending.findIndex((m) => String(m.id) === id);
        if (idx === -1) return res.status(404).json({ error: 'not found in pending' });
        item = pending[idx];
        nextPending = pending.slice();
        nextPending.splice(idx, 1);
      }
      await rewriteList(redisUrl, redisToken, 'wall:pending', nextPending);

      const live = await readList(redisUrl, redisToken, 'wall', 50);
      live.unshift(item);
      await rewriteList(redisUrl, redisToken, 'wall', live.slice(0, 50));

      return res.status(200).json({ ok: true, action: 'approve', id });
    }

    if (action === 'reject') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const pending = await readList(redisUrl, redisToken, 'wall:pending', 50);
      const next = removeFromList(pending, id);
      if (!next) return res.status(404).json({ error: 'not found in pending' });
      await rewriteList(redisUrl, redisToken, 'wall:pending', next);
      return res.status(200).json({ ok: true, action: 'reject', id });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const live = await readList(redisUrl, redisToken, 'wall', 50);
      const next = removeFromList(live, id);
      if (!next) return res.status(404).json({ error: 'not found on wall' });
      await rewriteList(redisUrl, redisToken, 'wall', next);
      if (!String(id).startsWith('idx:')) {
        await redisJson(redisUrl, redisToken, `/del/wall:reply:${encodeURIComponent(id)}`);
      }
      return res.status(200).json({ ok: true, action: 'delete', id });
    }

    if (action === 'reply') {
      if (!id || String(id).startsWith('idx:')) {
        return res.status(400).json({ error: 'real id required for reply' });
      }
      const text = (body?.text || '').toString().trim().slice(0, 1000);
      if (!text) return res.status(400).json({ error: 'text required' });

      const reply = {
        text,
        timestamp: Date.now(),
        author: 'lemon',
      };
      await fetch(
        `${redisUrl}/set/wall:reply:${encodeURIComponent(id)}/${encodeURIComponent(JSON.stringify(reply))}`,
        { headers: { Authorization: `Bearer ${redisToken}` } }
      );
      return res.status(200).json({ ok: true, action: 'reply', id, reply });
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
      error: 'action must be approve | reject | delete | reply | flush-live | flush-pending',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'mod action failed' });
  }
}
