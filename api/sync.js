/** Shared protocol version for site <-> bot message pipeline (images, etc). Bump both sides together. */
export const MESSAGE_PROTOCOL = 2;

const BOT_HEALTH_URL = 'https://lemonsserver.wispbyte.app/health';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const site = MESSAGE_PROTOCOL;
  let bot = null;
  let botReachable = false;
  let botError = null;

  try {
    const r = await fetch(BOT_HEALTH_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const data = await r.json();
      botReachable = true;
      bot = data.messageProtocol ?? null;
    } else {
      botError = `bot health ${r.status}`;
    }
  } catch (err) {
    botError = err.message || 'bot unreachable';
  }

  const inSync = botReachable && bot !== null && bot === site;

  return res.status(200).json({
    ok: inSync,
    site,
    bot,
    botReachable,
    error: inSync
      ? null
      : !botReachable
        ? 'bot offline or unreachable — try again later'
        : bot === null
          ? 'bot is missing messageProtocol (outdated bot code)'
          : `site v${site} and bot v${bot} are out of sync — lemon needs to update`,
  });
}
