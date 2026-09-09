const DEFAULT_PERKS = {
  noSlowmode: true,
  maxChars: 2000,
  maxImageMB: 2.5,
  wallHighlight: true,
  canPublic: true,
};

function parseInviteValue(raw) {
  if (!raw) return null;
  // legacy: value was just "1"
  if (raw === '1' || raw === 1) {
    return { active: true, perks: { ...DEFAULT_PERKS } };
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || parsed.active === false) return null;
    return {
      active: true,
      perks: { ...DEFAULT_PERKS, ...(parsed.perks || {}) },
    };
  } catch {
    return { active: true, perks: { ...DEFAULT_PERKS } };
  }
}

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
    return res.status(501).json({ error: 'Redis not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const password = body?.password || req.query?.password;
  const token = (body?.token || req.query?.token || '').toString().trim();

  // ── Public validity check (no password) ─────────────────────────
  if (req.method === 'GET' && token && !password) {
    try {
      const r = await fetch(`${redisUrl}/get/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const data = await r.json();
      const invite = parseInviteValue(data.result);
      return res.status(200).json({
        token,
        valid: !!invite,
        perks: invite ? invite.perks : null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to check token' });
    }
  }

  if (!secret) {
    return res.status(500).json({ error: 'ONLINE_SECRET not set' });
  }

  if (password !== secret) {
    return res.status(449).json({ error: 'retry with a correct password' });
  }

  // ── GET → list active tokens ────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${redisUrl}/smembers/invite:tokens`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const data = await r.json();
      const tokens = data.result || [];

      const active = [];
      for (const t of tokens) {
        const check = await fetch(`${redisUrl}/get/invite:${encodeURIComponent(t)}`, {
          headers: { Authorization: `Bearer ${redisToken}` }
        });
        const checkData = await check.json();
        const invite = parseInviteValue(checkData.result);

        if (invite) {
          const ttlRes = await fetch(`${redisUrl}/ttl/invite:${encodeURIComponent(t)}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
          });
          const ttlData = await ttlRes.json();
          active.push({
            token: t,
            ttl: ttlData.result,
            perks: invite.perks,
            link: `https://лемон.space/message?token=${encodeURIComponent(t)}`
          });
        } else {
          await fetch(`${redisUrl}/srem/invite:tokens/${encodeURIComponent(t)}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
          });
        }
      }

      return res.status(200).json({ tokens: active });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list tokens' });
    }
  }

  // ── POST → create a new UUIDv7 token ────────────────────────────
  if (req.method === 'POST') {
    const expiresIn = body?.expiresIn ? Number(body.expiresIn) : null;
    const perks = { ...DEFAULT_PERKS, ...(body?.perks || {}) };
    const newToken = generateUUIDv7();
    const payload = JSON.stringify({ active: true, perks });

    try {
      let setUrl = `${redisUrl}/set/invite:${encodeURIComponent(newToken)}/${encodeURIComponent(payload)}`;
      if (expiresIn && expiresIn > 0) {
        setUrl += `?EX=${expiresIn}`;
      }

      await fetch(setUrl, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });

      await fetch(`${redisUrl}/sadd/invite:tokens/${encodeURIComponent(newToken)}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });

      return res.status(200).json({
        ok: true,
        token: newToken,
        expiresIn: expiresIn || null,
        perks,
        link: `https://лемон.space/message?token=${encodeURIComponent(newToken)}`
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

      await fetch(`${redisUrl}/srem/invite:tokens/${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });

      return res.status(200).json({ ok: true, revoked: token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to revoke token' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function generateUUIDv7() {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');

  const rand = crypto.getRandomValues(new Uint8Array(10));
  let randHex = '';
  for (const b of rand) randHex += b.toString(16).padStart(2, '0');

  return (
    timeHex.slice(0, 8) + '-' +
    timeHex.slice(8, 12) + '-7' +
    randHex.slice(0, 3) + '-' +
    ((parseInt(randHex.slice(3, 5), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') +
    randHex.slice(5, 7) + '-' +
    randHex.slice(7, 19)
  );
}
