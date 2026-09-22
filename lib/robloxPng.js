/** Roblox host uptime graph card */
import {
  makePng,
  fillRect,
  drawText,
  formatDur,
} from './png.js';

export async function renderRobloxPng(q = {}) {
  const period = String(q.period || '24h').toLowerCase();
  let host = null;
  try {
    const r = await fetch(
      `https://lemonsserver.wispbyte.app/api/host?period=${encodeURIComponent(period)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) host = await r.json();
  } catch {
    // offline
  }

  const W = 800;
  const H = 360;
  const bg = [30, 30, 42];
  const panel = [44, 55, 68];
  const yellow = [253, 255, 148];
  const muted = [148, 163, 184];
  const green = [74, 222, 128];
  const red = [248, 113, 113];
  const border = [75, 108, 165];

  const rgba = Buffer.alloc(W * H * 4);
  fillRect(rgba, W, 0, 0, W, H, bg[0], bg[1], bg[2]);
  fillRect(rgba, W, 0, 0, W, 5, border[0], border[1], border[2]);
  fillRect(rgba, W, 0, H - 5, W, 5, border[0], border[1], border[2]);
  fillRect(rgba, W, 0, 0, 5, H, border[0], border[1], border[2]);
  fillRect(rgba, W, W - 5, 0, 5, H, border[0], border[1], border[2]);

  drawText(rgba, W, 'ROBLOX HOST UPTIME', W / 2, 22, 2, yellow[0], yellow[1], yellow[2]);

  const online = !!(host && host.online);
  const accent = online ? green : red;
  const statusLabel = host ? (online ? 'ONLINE' : 'OFFLINE') : 'UNKNOWN';
  drawText(rgba, W, statusLabel, W / 2, 52, 3, accent[0], accent[1], accent[2]);

  const pct =
    host && host.periodUptimePercent != null
      ? host.periodUptimePercent
      : host && host.todayUptimePercent != null
        ? host.todayUptimePercent
        : null;
  const checks = host && (host.periodChecks != null ? host.periodChecks : host.todayChecks);
  const meta =
    (pct != null ? pct + '% UP' : 'NO DATA') +
    (checks != null ? '  ·  ' + checks + ' CHECKS' : '') +
    '  ·  ' + (host && host.period ? String(host.period).toUpperCase() : period.toUpperCase());
  drawText(rgba, W, meta, W / 2, 88, 2, muted[0], muted[1], muted[2]);

  const gx = 40;
  const gy = 120;
  const gw = W - 80;
  const gh = 180;
  fillRect(rgba, W, gx, gy, gw, gh, panel[0], panel[1], panel[2]);

  const samples = (host && host.samples) || [];
  if (samples.length < 2) {
    drawText(rgba, W, 'NO SAMPLES YET', W / 2, gy + gh / 2 - 8, 2, muted[0], muted[1], muted[2]);
    drawText(rgba, W, 'RESTART BOT AFTER DEPLOY', W / 2, gy + gh / 2 + 20, 2, muted[0], muted[1], muted[2]);
  } else {
    const n = samples.length;
    const barW = Math.max(1, Math.floor(gw / n));
    for (let i = 0; i < n; i++) {
      const on = !!samples[i].on;
      const x = gx + i * barW;
      const fullH = Math.floor(gh * 0.82);
      const h = on ? fullH : Math.floor(fullH * 0.22);
      const y = gy + gh - h - 8;
      fillRect(
        rgba, W, x, y, Math.max(1, barW - 1), h,
        on ? green[0] : red[0], on ? green[1] : red[1], on ? green[2] : red[2]
      );
    }
  }

  const streak = host && host.currentStreakMs != null ? formatDur(host.currentStreakMs) : '-';
  drawText(rgba, W, 'STREAK ' + streak, W / 2, 320, 2, yellow[0], yellow[1], yellow[2]);

  return makePng(W, H, rgba);
}
