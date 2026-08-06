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

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'message too long (max 1000 characters)' });
  }

  if (!name) name = 'Anonymous';

  // ── Global rate limit (30 seconds) ──────────────────────────────
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
    // continue anyway if rate limit fails
  }

  const timestamp = Date.now();
  const entry = {
    name,
    message,
    timestamp
  };

  // ── Store message in Redis list ─────────────────────────────────
  try {
    // LPUSH messages <json>
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
      await fetch('http://78.154.103.13:15612/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: nudgeSecret,
          name,
          message,
          timestamp
        }),
        // short timeout so the user doesn't wait forever
        signal: AbortSignal.timeout(8000)
      });
    } catch (err) {
      // Don't fail the request if nudge is down — message is already stored
      console.error('Nudge failed (message still saved):', err.message);
    }
  }

  return res.status(200).json({ ok: true });
}
