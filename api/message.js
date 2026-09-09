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

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  let name = (body.name || '').toString().trim().slice(0, 50);
  let message = (body.message || '').toString().trim();
  let token = (body.token || '').toString().trim();
  let image = body.image || null; // data URL or raw base64
  let imageName = (body.imageName || 'image.png').toString().slice(0, 80);

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'message too long (max 1000 characters)' });
  }

  if (!name) name = 'Anonymous';

  // Basic image validation (optional)
  let hasImage = false;
  if (image && typeof image === 'string') {
    // Expect data:image/...;base64,... or pure base64
    const maxChars = 2.2 * 1024 * 1024; // ~1.5MB binary after base64 overhead
    if (image.length > maxChars) {
      return res.status(400).json({ error: 'image too large (max ~1.5 MB)' });
    }
    if (image.startsWith('data:image/') || /^[A-Za-z0-9+/=\s]+$/.test(image.slice(0, 200))) {
      hasImage = true;
    } else {
      return res.status(400).json({ error: 'invalid image data' });
    }
  } else {
    image = null;
  }

  // ── Check invite token (bypasses rate limit) ─────────────────────
  let hasValidToken = false;

  if (token) {
    try {
      const tokenRes = await fetch(`${redisUrl}/get/invite:${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const tokenData = await tokenRes.json();
      if (tokenData.result) {
        hasValidToken = true;
      }
    } catch (err) {
      console.error('Token check error:', err);
    }
  }

  // ── Global rate limit (30 seconds) — skipped if valid token ─────
  if (!hasValidToken) {
    try {
      const rateRes = await fetch(`${redisUrl}/get/rate:message`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const rateData = await rateRes.json();

      if (rateData.result) {
        return res.status(429).json({ error: 'slow down — wait 30 seconds between messages' });
      }

      // set rate key with 30s expiry
      await fetch(`${redisUrl}/set/rate:message/1?EX=30`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
    } catch (err) {
      console.error('Rate limit error:', err);
    }
  }

  const timestamp = Date.now();
  const entry = {
    name,
    message,
    timestamp,
    token: hasValidToken ? token : null,
    hasImage: !!hasImage
  };

  // ── Store message in Redis list (no full image — too big) ───────
  try {
    await fetch(`${redisUrl}/lpush/messages/${encodeURIComponent(JSON.stringify(entry))}`, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });

    // Keep only last 50 messages
    await fetch(`${redisUrl}/ltrim/messages/0/49`, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
  } catch (err) {
    console.error('Store error:', err);
    return res.status(500).json({ error: 'Failed to store message' });
  }

  // ── Nudge the Node server ───────────────────────────────────────
  if (nudgeSecret) {
    try {
      const nudgeBody = {
        secret: nudgeSecret,
        name,
        message,
        timestamp,
        invited: hasValidToken
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

  return res.status(200).json({ ok: true, invited: hasValidToken, hasImage: !!hasImage });
}
