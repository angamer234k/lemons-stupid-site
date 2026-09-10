const DEFAULT_INVITE_PERKS = {
  noSlowmode: true,
  maxChars: 2000,
  maxImageMB: 2.5,
  wallHighlight: true,
  canPublic: true,
  autoApproveWall: true,
  vipLounge: true,
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
      label: parsed.label ? String(parsed.label).slice(0, 32) : null,
      perks: { ...DEFAULT_INVITE_PERKS, ...(parsed.perks || {}) },
    };
  } catch {
    return { active: true, perks: { ...DEFAULT_INVITE_PERKS } };
  }
}

function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function clientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return xf || req.headers['x-real-ip'] || 'unknown';
}

async function isBanned(redisUrl, redisToken, { name, token, ip }) {
  try {
    const [namesRes, tokensRes, ipsRes] = await Promise.all([
      fetch(`${redisUrl}/smembers/ban:names`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      }),
      fetch(`${redisUrl}/smembers/ban:tokens`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      }),
      fetch(`${redisUrl}/smembers/ban:ips`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      }),
    ]);
    const names = (await namesRes.json()).result || [];
    const tokens = (await tokensRes.json()).result || [];
    const ips = (await ipsRes.json()).result || [];

    const nameL = (name || '').toLowerCase();
    for (const n of names) {
      if (n && nameL.includes(String(n).toLowerCase())) return 'name';
    }
    if (token && tokens.includes(token)) return 'token';
    if (ip && ips.includes(ip)) return 'ip';
  } catch (err) {
    console.error('ban check error', err);
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
  const ip = clientIp(req);

  if (!message) return res.status(400).json({ error: 'message is required' });
  if (!name) name = 'Anonymous';

  const banned = await isBanned(redisUrl, redisToken, { name, token, ip });
  if (banned) {
    return res.status(403).json({ error: 'blocked' });
  }

  let hasValidToken = false;
  // baseline = no invite
  let perks = {
    noSlowmode: false,
    maxChars: 1000,
    maxImageMB: 1.5,
    wallHighlight: false,
    canPublic: true,
    autoApproveWall: false,
    vipLounge: false,
  };

  if (token) {
    try {
      const tokenRes = await fetch(`${redisUrl}/get/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      const tokenData = await tokenRes.json();
      const invite = parseInviteValue(tokenData.result);
      if (invite) {
        hasValidToken = true;
        // invite.perks already merged with defaults in parseInviteValue,
        // then stored flags override — use them as source of truth
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

  let hasImage = false;
  const maxImageChars = perks.maxImageMB * 1024 * 1024 * 1.4;
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

  // rate limit unless invite + noSlowmode
  if (!hasValidToken || !perks.noSlowmode) {
    const rateKey = hasValidToken
      ? `rate:token:${token}`
      : `rate:ip:${encodeURIComponent(ip)}`;
    try {
      const rateRes = await fetch(`${redisUrl}/get/${rateKey}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      const rateData = await rateRes.json();
      if (rateData.result) {
        return res.status(429).json({ error: 'slow down — wait 30 seconds between messages' });
      }
      await fetch(`${redisUrl}/set/${rateKey}/1?EX=30`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch (err) {
      console.error('Rate limit error:', err);
    }
  }

  if (isPublic && perks.canPublic === false) isPublic = false;

  const timestamp = Date.now();
  const id = makeId();
  const entry = {
    id,
    name,
    message,
    timestamp,
    token: hasValidToken ? token : null,
    hasImage: !!hasImage,
    public: isPublic,
    invited: hasValidToken,
    ip: ip !== 'unknown' ? ip : null,
  };

  try {
    await fetch(`${redisUrl}/lpush/messages/${encodeURIComponent(JSON.stringify(entry))}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    await fetch(`${redisUrl}/ltrim/messages/0/49`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
  } catch (err) {
    console.error('Store error:', err);
    return res.status(500).json({ error: 'Failed to store message' });
  }

  let wallStatus = null;
  if (isPublic) {
    const wallEntry = {
      id,
      name,
      message,
      timestamp,
      invited: hasValidToken && !!perks.wallHighlight,
      hasImage: !!hasImage,
    };
    // strict: only auto-live when flag is explicitly true
    const autoLive = hasValidToken && perks.autoApproveWall === true;
    const listKey = autoLive ? 'wall' : 'wall:pending';
    wallStatus = autoLive ? 'live' : 'pending';

    try {
      await fetch(`${redisUrl}/lpush/${listKey}/${encodeURIComponent(JSON.stringify(wallEntry))}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      await fetch(`${redisUrl}/ltrim/${listKey}/0/49`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch (err) {
      console.error('Wall store error:', err);
      wallStatus = null;
    }
  }

  if (nudgeSecret) {
    try {
      const nudgeBody = {
        secret: nudgeSecret,
        name,
        message,
        timestamp,
        id,
        invited: hasValidToken,
        public: isPublic,
        wallStatus,
      };
      if (hasImage && image) {
        nudgeBody.image = image;
        nudgeBody.imageName = imageName;
      }
      await fetch('https://lemonsserver.wispbyte.app/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nudgeBody),
        signal: AbortSignal.timeout(15000),
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
    wallStatus,
    perks: hasValidToken ? perks : undefined,
  });
}
