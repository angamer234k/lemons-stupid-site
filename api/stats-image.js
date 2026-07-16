export const config = { runtime: 'edge' };

export default async function handler() {
  const stats = {
    guilds: 69425,
    moderations: 367929
  };

  return new Response(
    `<svg width="1200" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="600" fill="#0b0e14"/>
      <text x="600" y="250" font-size="60" fill="#f0f4ff" text-anchor="middle" font-weight="700">Honeypot Bot Stats</text>
      <text x="600" y="350" font-size="48" fill="#5865f2" text-anchor="middle">Guilds: ${stats.guilds.toLocaleString()}</text>
      <text x="600" y="420" font-size="48" fill="#f0f4ff" text-anchor="middle">Moderations: ${stats.moderations.toLocaleString()}</text>
      <text x="600" y="520" font-size="24" fill="#5a6f8a" text-anchor="middle">Live • Updated just now</text>
    </svg>`,
    {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    }
  );
}
