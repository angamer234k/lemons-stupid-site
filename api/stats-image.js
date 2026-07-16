// pages/api/stats-image.js
import { ImageResponse } from '@vercel/og';
import WebSocket from 'ws';

export const config = {
  runtime: 'nodejs', // important: WebSocket needs Node.js, not Edge
};

// Helper: wait for first message from WebSocket
function fetchStatsFromWS() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://honeypot-stats.riskymh.dev/ws');
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout'));
    }, 5000); // 5s timeout

    ws.on('open', () => {
      // Wait for the first message
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data);
        clearTimeout(timeout);
        ws.close();
        resolve(parsed);
      } catch {
        // ignore non-JSON
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      reject(new Error('WebSocket closed without data'));
    });
  });
}

export default async function handler(req) {
  try {
    const stats = await fetchStatsFromWS();

    // Extract key values
    const guilds = stats.guilds ?? stats.guild_count ?? stats.servers ?? 0;
    const users = stats.users ?? stats.members ?? stats.user_count ?? 0;
    const cpu = stats.cpu ?? stats.cpu_usage ?? 0;
    const memory = stats.memory ?? stats.ram ?? stats.mem ?? 0;
    const uptime = stats.uptime ?? stats.uptime_seconds ?? 0;

    // Format uptime
    const uptimeStr = uptime > 3600
      ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
      : `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`;

    // Build the image with @vercel/og
    return new ImageResponse(
      (
        <div
          style={{
            background: '#0b0e14',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '50px 60px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div
              style={{
                background: 'linear-gradient(145deg, #5865f2, #4752c4)',
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
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

          {/* Stats grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              flex: 1,
            }}
          >
            <StatCard label="Guilds" value={guilds} />
            <StatCard label="Users" value={users} />
            <StatCard label="CPU" value={`${cpu.toFixed(1)}%`} />
            <StatCard label="Memory" value={`${memory.toFixed(1)} MB`} />
          </div>

          {/* Footer with timestamp */}
          <div
            style={{
              marginTop: 24,
              borderTop: '1px solid #1e2838',
              paddingTop: 16,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#4a5f7a',
            }}
          >
            <span>Uptime: {uptimeStr}</span>
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
    console.error('Image generation error:', error);
    // Fallback image with error message
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
            fontSize: 24,
            flexDirection: 'column',
            gap: 12,
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

// Helper component for each stat card
function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: '#111821',
        border: '1px solid #1a2436',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: '#5a6f8a' }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 600, color: '#f0f4ff', marginTop: 4 }}>
        {typeof value === 'number' && Number.isInteger(value) ? value.toLocaleString() : value}
      </div>
    </div>
  );
}