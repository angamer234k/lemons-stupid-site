const DEFAULT_PERKS = {
  noSlowmode: true,
  maxChars: 2000,
  maxImageMB: 2.5,
  wallHighlight: true,
  canPublic: true,
  autoApproveWall: true,
  vipLounge: true,
};

const SITE_BASE = 'https://лемон.space';

function parseInviteValue(raw) {
  if (!raw) return null;
  if (raw === '1' || raw === 1) {
    return { active: true, label: null, perks: { ...DEFAULT_PERKS } };
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || parsed.active === false) return null;
    return {
      active: true,
      label: parsed.label ? String(parsed.label).slice(0, 32) : null,
      perks: { ...DEFAULT_PERKS, ...(parsed.perks || {}) },
    };
  } catch {
    return { active: true, label: null, perks: { ...DEFAULT_PERKS } };
  }
}

function linksFor(token) {
  const q = encodeURIComponent(token);
  return {
    link: `${SITE_BASE}/message?token=${q}`,
    vipLink: `${SITE_BASE}/vip?token=${q}`,
  };
}

function sanitizePerks(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  if (typeof input.noSlowmode === 'boolean') out.noSlowmode = input.noSlowmode;
  if (typeof input.wallHighlight === 'boolean') out.wallHighlight = input.wallHighlight;
  if (typeof input.canPublic === 'boolean') out.canPublic = input.canPublic;
  if (typeof input.autoApproveWall === 'boolean') out.autoApproveWall = input.autoApproveWall;
  if (typeof input.vipLounge === 'boolean') out.vipLounge = input.vipLounge;
  if (input.maxChars != null) {
    const n = Number(input.maxChars);
    if (Number.isFinite(n) && n >= 100 && n <= 5000) out.maxChars = Math.floor(n);
  }
  if (input.maxImageMB != null) {
    const n = Number(input.maxImageMB);
    if (Number.isFinite(n) && n >= 0.5 && n <= 5) out.maxImageMB = Math.round(n * 10) / 10;
  }
  return out;
}

async function redisGet(redisUrl, redisToken, key) {
  const r = await fetch(`${redisUrl}/get/${key}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  return r.json();
}

async function setInvite(redisUrl, redisToken, token, payload, expiresIn) {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  let setUrl = `${redisUrl}/set/invite:${encodeURIComponent(token)}/${encoded}`;
  if (expiresIn && expiresIn > 0) {
    setUrl += `?EX=${Math.floor(expiresIn)}`;
  }
  await fetch(setUrl, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
      const data = await redisGet(redisUrl, redisToken, `invite:${encodeURIComponent(token)}`);
      const invite = parseInviteValue(data.result);
      return res.status(200).json({
        token,
        valid: !!invite,
        label: invite?.label || null,
        perks: invite ? invite.perks : null,
        ...linksFor(token),
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
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      const data = await r.json();
      const tokens = data.result || [];

      const active = [];
      for (const t of tokens) {
        const checkData = await redisGet(redisUrl, redisToken, `invite:${encodeURIComponent(t)}`);
        const invite = parseInviteValue(checkData.result);

        if (invite) {
          const ttlRes = await fetch(`${redisUrl}/ttl/invite:${encodeURIComponent(t)}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });
          const ttlData = await ttlRes.json();
          active.push({
            token: t,
            ttl: ttlData.result,
            label: invite.label,
            perks: invite.perks,
            ...linksFor(t),
          });
        } else {
          await fetch(`${redisUrl}/srem/invite:tokens/${encodeURIComponent(t)}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });
        }
      }

      return res.status(200).json({ tokens: active });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list tokens' });
    }
  }

  // ── POST → create ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const expiresIn = body?.expiresIn ? Number(body.expiresIn) : null;
    const perks = { ...DEFAULT_PERKS, ...sanitizePerks(body?.perks) };
    const label = body?.label ? String(body.label).trim().slice(0, 32) : null;
    const newToken = generateUUIDv7();
    const payload = { active: true, label, perks };

    try {
      await setInvite(redisUrl, redisToken, newToken, payload, expiresIn > 0 ? expiresIn : null);
      await fetch(`${redisUrl}/sadd/invite:tokens/${encodeURIComponent(newToken)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });

      return res.status(200).json({
        ok: true,
        token: newToken,
        expiresIn: expiresIn > 0 ? expiresIn : null,
        label,
        perks,
        ...linksFor(newToken),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create token' });
    }
  }

  // ── PATCH → edit existing invite ────────────────────────────────
  if (req.method === 'PATCH') {
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    try {
      const checkData = await redisGet(redisUrl, redisToken, `invite:${encodeURIComponent(token)}`);
      const existing = parseInviteValue(checkData.result);
      if (!existing) {
        return res.status(404).json({ error: 'invite not found' });
      }

      const nextPerks = { ...existing.perks, ...sanitizePerks(body?.perks) };
      let nextLabel = existing.label;
      if (body?.label !== undefined) {
        nextLabel = body.label === null || body.label === ''
          ? null
          : String(body.label).trim().slice(0, 32);
      }

      const payload = { active: true, label: nextLabel, perks: nextPerks };

      // expiry: number > 0 = seconds from now; -1 = permanent; omit = keep current TTL
      let expiresIn = null;
      let permanent = false;
      if (body?.expiresIn !== undefined && body?.expiresIn !== null) {
        const n = Number(body.expiresIn);
        if (n === -1) permanent = true;
        else if (Number.isFinite(n) && n > 0) expiresIn = Math.floor(n);
      } else {
        // preserve remaining TTL if any
        const ttlRes = await fetch(`${redisUrl}/ttl/invite:${encodeURIComponent(token)}`, {
          headers: { Authorization: `Bearer ${redisToken}` },
        });
        const ttlData = await ttlRes.json();
        if (typeof ttlData.result === 'number' && ttlData.result > 0) {
          expiresIn = ttlData.result;
        }
      }

      await setInvite(
        redisUrl,
        redisToken,
        token,
        payload,
        permanent ? null : expiresIn
      );

      // ensure still in set
      await fetch(`${redisUrl}/sadd/invite:tokens/${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });

      const ttlRes = await fetch(`${redisUrl}/ttl/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      const ttlData = await ttlRes.json();

      return res.status(200).json({
        ok: true,
        token,
        label: nextLabel,
        perks: nextPerks,
        ttl: ttlData.result,
        ...linksFor(token),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update invite' });
    }
  }

  // ── DELETE → revoke ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    try {
      await fetch(`${redisUrl}/del/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      await fetch(`${redisUrl}/srem/invite:tokens/${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
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
