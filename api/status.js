const BOT_HEALTH_URL = 'https://lemonsserver.wispbyte.app/health';
const BOT_HOST_URL = 'https://lemonsserver.wispbyte.app/api/host';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  let lastOnline = null;
  let wallCount = null;

  if (redisUrl && redisToken) {
    const headers = { Authorization: `Bearer ${redisToken}` };
    try {
      const [onlineRes, wallRes] = await Promise.all([
        fetch(`${redisUrl}/get/lastOnline`, { headers }),
        fetch(`${redisUrl}/llen/wall`, { headers }),
      ]);
      const onlineData = await onlineRes.json();
      lastOnline = onlineData.result ? Number(onlineData.result) : null;
      const wallData = await wallRes.json();
      wallCount = wallData.result != null ? Number(wallData.result) : null;
    } catch {
      // ignore redis errors
    }
  }

  let bot = null;
  let host = null;

  try {
    const r = await fetch(BOT_HEALTH_URL, { signal: AbortSignal.timeout(6000) });
    if (r.ok) bot = await r.json();
  } catch {
    // offline
  }

  try {
    const r = await fetch(BOT_HOST_URL, { signal: AbortSignal.timeout(6000) });
    if (r.ok) host = await r.json();
  } catch {
    // offline
  }

  const ONLINE_MS = 5 * 60 * 1000;
  const siteOnline = lastOnline != null && Date.now() - lastOnline < ONLINE_MS;

  return res.status(200).json({
    ok: true,
    site: {
      lastOnline,
      online: siteOnline,
    },
    mood: bot?.mood
      ? {
          text: bot.mood.text || '',
          emoji: bot.mood.emoji || '🍋',
          updatedAt: bot.mood.updatedAt || null,
        }
      : null,
    bot: bot
      ? {
          reachable: true,
          ready: !!bot.ready,
          hostOnline: !!bot.hostOnline,
          uptimeMs: bot.uptimeMs ?? null,
          messageProtocol: bot.messageProtocol ?? null,
        }
      : { reachable: false },
    host: host
      ? {
          online: !!host.online,
          description: host.description || '',
          todayUptimePercent: host.todayUptimePercent ?? null,
          todayChecks: host.todayChecks ?? null,
          currentStreakMs: host.currentStreakMs ?? null,
          checkIntervalMs: host.checkIntervalMs ?? null,
        }
      : null,
    wall: {
      messageCount: wallCount,
    },
    timestamp: Date.now(),
  });
}
