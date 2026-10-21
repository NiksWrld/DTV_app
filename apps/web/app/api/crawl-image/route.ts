import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DTVBot/1.0)' },
    });

    const html = await res.text();

    // Try og:image first
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogMatch?.[1]) {
      return NextResponse.json({ image_url: ogMatch[1] });
    }

    // Fallback: first <img> with src that looks like a real image
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp)[^"']*)["']/i);
    if (imgMatch?.[1]) {
      const src = imgMatch[1];
      const imageUrl = src.startsWith('http') ? src : new URL(src, url).toString();
      return NextResponse.json({ image_url: imageUrl });
    }

    return NextResponse.json({ image_url: null });
  } catch {
    return NextResponse.json({ image_url: null });
  }
}
