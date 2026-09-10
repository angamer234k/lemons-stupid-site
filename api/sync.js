/** Shared protocol version for site <-> bot message pipeline (images, etc). */
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

  try {
    const r = await fetch(BOT_HEALTH_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const data = await r.json();
      botReachable = true;
      bot = data.messageProtocol ?? null;
    }
  } catch {
    // bot unreachable
  }

  // exact match
  if (botReachable && bot !== null && bot === site) {
    return res.status(200).json({
      ok: true,
      allow: true,
      soft: false,
      site,
      bot,
      botReachable: true,
      warning: null,
      error: null,
    });
  }

  // site ahead of bot → still allow, warn (minor desync / bot not bumped yet)
  if (botReachable && bot !== null && site > bot) {
    return res.status(200).json({
      ok: false,
      allow: true,
      soft: true,
      site,
      bot,
      botReachable: true,
      warning:
        'site is a bit ahead of the bot (site v' +
        site +
        ' · bot v' +
        bot +
        '). messages still work — some features might lag.',
      error: null,
    });
  }

  // bot offline / missing protocol / bot ahead of site → hard block
  let error;
  if (!botReachable) {
    error = 'bot offline or unreachable — try again later';
  } else if (bot === null) {
    error = 'bot is missing messageProtocol (outdated bot code)';
  } else {
    error =
      'site v' + site + ' and bot v' + bot + ' are out of sync — lemon needs to update';
  }

  return res.status(200).json({
    ok: false,
    allow: false,
    soft: false,
    site,
    bot,
    botReachable,
    warning: null,
    error,
  });
}
