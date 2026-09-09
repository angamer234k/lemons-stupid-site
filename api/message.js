const DEFAULT_INVITE_PERKS = {
  noSlowmode: true,
  maxChars: 2000,
  maxImageMB: 2.5,
  wallHighlight: true,
  canPublic: true,
};

function parseInviteValue(raw) {
  if (!raw) return null;
  if (raw === '1' || raw === 1) {
    return { active: true, perks: { ...DEFAULT_INVITE_PERKS } };
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || parsed.active === false) return null;
    return {
      active: true,
      perks: { ...DEFAULT_INVITE_PERKS, ...(parsed.perks || {}) },
    };
  } catch {
    return { active: true, perks: { ...DEFAULT_INVITE_PERKS } };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const nudgeSecret = process.env.NUDGE_SECRET;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  let name = (body.name || '').toString().trim().slice(0, 50);
  let message = (body.message || '').toString().trim();
  let token = (body.token || '').toString().trim();
  let image = body.image || null;
  let imageName = (body.imageName || 'image.png').toString().slice(0, 80);
  let isPublic = !!body.public;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!name) name = 'Anonymous';

  // ── Check invite token ──────────────────────────────────────────
  let hasValidToken = false;
  let perks = {
    noSlowmode: false,
    maxChars: 1000,
    maxImageMB: 1.5,
    wallHighlight: false,
    canPublic: true,
  };

  if (token) {
    try {
      const tokenRes = await fetch(`${redisUrl}/get/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const tokenData = await tokenRes.json();
      const invite = parseInviteValue(tokenData.result);
      if (invite) {
        hasValidToken = true;
        perks = { ...perks, ...invite.perks };
      }
    } catch (err) {
      console.error('Token check error:', err);
    }
  }

  if (message.length > perks.maxChars) {
    return res.status(400).json({
      error: 'message too long (max ' + perks.maxChars + ' characters)',
    });
  }

  // image validation
  let hasImage = false;
  const maxImageChars = perks.maxImageMB * 1024 * 1024 * 1.4; // base64 overhead-ish
  if (image && typeof image === 'string') {
    if (image.length > maxImageChars) {
      return res.status(400).json({
        error: 'image too large (max ~' + perks.maxImageMB + ' MB)',
      });
    }
    if (image.startsWith('data:image/') || /^[A-Za-z0-9+/=\s]+$/.test(image.slice(0, 200))) {
      hasImage = true;
    } else {
      return res.status(400).json({ error: 'invalid image data' });
    }
  } else {
    image = null;
  }

  // rate limit — skipped with noSlowmode invite
  if (!hasValidToken || !perks.noSlowmode) {
    try {
      const rateRes = await fetch(`${redisUrl}/get/rate:message`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const rateData = await rateRes.json();

      if (rateData.result) {
        return res.status(429).json({ error: 'slow down — wait 30 seconds between messages' });
      }

      await fetch(`${redisUrl}/set/rate:message/1?EX=30`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
    } catch (err) {
      console.error('Rate limit error:', err);
    }
  }

  if (isPublic && perks.canPublic === false) {
    isPublic = false;
  }

  const timestamp = Date.now();
  const entry = {
    name,
    message,
    timestamp,
    token: hasValidToken ? token : null,
    hasImage: !!hasImage,
    public: isPublic,
    invited: hasValidToken,
  };

  // private inbox list (always)
  try {
    await fetch(`${redisUrl}/lpush/messages/${encodeURIComponent(JSON.stringify(entry))}`, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
    await fetch(`${redisUrl}/ltrim/messages/0/49`, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
  } catch (err) {
    console.error('Store error:', err);
    return res.status(500).json({ error: 'Failed to store message' });
  }

  // public wall list (opt-in)
  if (isPublic) {
    const wallEntry = {
      name,
      message,
      timestamp,
      invited: hasValidToken && !!perks.wallHighlight,
      hasImage: !!hasImage,
    };
    try {
      await fetch(`${redisUrl}/lpush/wall/${encodeURIComponent(JSON.stringify(wallEntry))}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      await fetch(`${redisUrl}/ltrim/wall/0/49`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
    } catch (err) {
      console.error('Wall store error:', err);
    }
  }

  // nudge bot
  if (nudgeSecret) {
    try {
      const nudgeBody = {
        secret: nudgeSecret,
        name,
        message,
        timestamp,
        invited: hasValidToken,
        public: isPublic,
      };
      if (hasImage && image) {
        nudgeBody.image = image;
        nudgeBody.imageName = imageName;
      }

      await fetch('https://lemonsserver.wispbyte.app/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nudgeBody),
        signal: AbortSignal.timeout(15000)
      });
    } catch (err) {
      console.error('Nudge failed (message still saved):', err.message);
    }
  }

  return res.status(200).json({
    ok: true,
    invited: hasValidToken,
    hasImage: !!hasImage,
    public: isPublic,
  });
}
