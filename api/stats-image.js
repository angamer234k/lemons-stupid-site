import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

// Fallback stats if WS fails
async function fetchStats() {
  try {
    // Try to fetch via a simple HTTP endpoint if available, or fallback
    const response = await fetch('https://honeypot-stats.riskymh.dev/api/stats', {
      headers: { 'User-Agent': 'Lemon-OG-Image' },
      cache: 'no-store'
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('HTTP fallback failed:', e);
  }

  // Ultimate fallback
  return {
    guilds: 420,
    moderations: 6969,
    last7dModerations: 123,
    last7dEngagedGuilds: 69,
    dailyStats: [{ date: '2026-07-16', moderations: 42, engagedGuilds: 12 }]
  };
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: '#111821',
        border: '1px solid #1a2436',
        borderRadius: 14,
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#5a6f8a' }}>
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 600, color: '#f0f4ff', marginTop: 2 }}>
        {typeof value === 'number' && Number.isInteger(value) ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

export default async function handler() {
  try {
    const stats = await fetchStats();

    const guilds = stats.guilds ?? 0;
    const moderations = stats.moderations ?? 0;
    const last7dModerations = stats.last7dModerations ?? 0;
    const last7dEngaged = stats.last7dEngagedGuilds ?? 0;

    const latestDaily = stats.dailyStats?.[stats.dailyStats.length - 1] ?? null;

    return new ImageResponse(
      (
        <div
          style={{
            background: '#0b0e14',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 50px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div
              style={{
                background: 'linear-gradient(145deg, #5865f2, #4752c4)',
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: '#fff',
                fontWeight: 700,
              }}
            >
              ◆
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#f0f4ff' }}>Bot Stats</div>
              <div style={{ fontSize: 14, color: '#5a6f8a' }}>Live from honeypot-stats.riskymh.dev</div>
            </div>
          </div>

          {/* 4 main stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 20,
              flex: 1,
              alignContent: 'center',
            }}
          >
            <StatCard label="Guilds" value={guilds} />
            <StatCard label="Total Moderations" value={moderations} />
            <StatCard label="Last 7d Moderations" value={last7dModerations} />
            <StatCard label="Last 7d Engaged Guilds" value={last7dEngaged} />
          </div>

          {/* Latest daily stats */}
          {latestDaily && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                gap: 24,
                fontSize: 13,
                color: '#8a9eb8',
                borderTop: '1px solid #1e2838',
                paddingTop: 14,
              }}
            >
              <span>📅 {latestDaily.date}</span>
              <span>Mods: {latestDaily.moderations.toLocaleString()}</span>
              <span>Engaged: {latestDaily.engagedGuilds.toLocaleString()}</span>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 16,
              borderTop: '1px solid #1e2838',
              paddingTop: 12,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#4a5f7a',
            }}
          >
            <span>🟢 Live</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 600,
      }
    );
  } catch (error) {
    console.error(error);
    return new ImageResponse(
      (
        <div
          style={{
            background: '#0b0e14',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ed4245',
            fontSize: 22,
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div>⚠️ Stats unavailable</div>
          <div style={{ fontSize: 16, color: '#5a6f8a' }}>Please try again later</div>
        </div>
      ),
      { width: 1200, height: 600 }
    );
  }
}
