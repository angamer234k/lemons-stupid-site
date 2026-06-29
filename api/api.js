// app/api/gif/route.js (Next.js App Router)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  // Extract GIF ID
  let id = null;
  const mediaMatch = url.match(/media\.tenor\.com\/([^\/]+)\//);
  if (mediaMatch) {
    id = mediaMatch[1];
  } else {
    const viewMatch = url.match(/tenor\.com\/view\/[^\/]+\/([^\/]+)/);
    if (viewMatch) {
      id = viewMatch[1];
    }
  }

  if (!id) {
    return new Response('Could not extract GIF ID from the provided URL', { status: 400 });
  }

  const gifUrl = `https://media.tenor.com/${id}/tenor.gif`;

  // 302 redirect – clients fetch directly from Tenor's CDN
  return new Response(null, {
    status: 302,
    headers: {
      Location: gifUrl,
      'Cache-Control': 'public, max-age=3600', // optional: browser caches the redirect
    },
  });
}
