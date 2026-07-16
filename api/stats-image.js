import { ImageResponse } from '@vercel/og';
import WebSocket from 'ws';

export const runtime = 'nodejs'; // WebSocket needs Node.js

function fetchStats() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://honeypot-stats.riskymh.dev/ws');
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout'));
    }, 5000);

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data);
        clearTimeout(timeout);
        ws.close();
        resolve(parsed);
      } catch {
        // ignore non‑JSON
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    });
  });
}

export async function GET() {
  try {
    const stats = await fetchStats();

    // Extract the specific fields we care about
    const guilds = stats.guilds ?? 0;
    const moderations = stats.moderations ?? 0;
    const last7dModerations = stats.last7dModerations ?? 0;
    const last7dEngaged = stats.last7dEngagedGuilds ?? 0;

    // Optional: grab the latest daily stats (if you want)
    const latestDaily = stats.dailyStats?.[stats.dailyStats.length - 1] ?? null;
    const latestDate = latestDaily ? latestDaily.date : '';
    const latestMods = latestDaily ? latestDaily.moderations : 0;
    const latestEngaged = latestDaily ? latestDaily.engagedGuilds : 0;

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

          {/* Stats grid – 4 cards */}
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

          {/* Optional: show latest daily stat as a bonus */}
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
              <span>📅 Latest day ({latestDate})</span>
              <span>Moderations: {latestMods.toLocaleString()}</span>
              <span>Engaged Guilds: {latestEngaged.toLocaleString()}</span>
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
            <span>Updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 600,
      }
    );
  } catch (error) {
    console.error('Image error:', error);
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

// Helper component for stat cards
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