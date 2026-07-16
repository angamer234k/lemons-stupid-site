import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

async function fetchStats() {
  try {
    const res = await fetch('https://honeypot-stats.riskymh.dev/', { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch {}
  return { guilds: 69425, moderations: 367929, last7dModerations: 46927, last7dEngagedGuilds: 16383 };
}

export default async () => {
  const stats = await fetchStats();

  return new ImageResponse(
    <div style={{ background: '#0b0e14', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 48 }}>
      Honeypot Stats<br/>
      Guilds: {stats.guilds.toLocaleString()}
    </div>,
    { width: 1200, height: 600 }
  );
};
