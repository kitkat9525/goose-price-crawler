import { NextResponse } from 'next/server';
import type { NewsItem } from '@/app/lib/types';
import { parseRss } from '@/app/lib/utils/rss';

export const revalidate = 1800;

async function fetchFeed(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    return parseRss(await res.text());
  } catch {
    return [];
  }
}

export async function GET() {
  const queries = [
    'goose down feather market price',
    'duck down feather industry',
    'down bedding duvet comforter',
    'goose down raw material supply',
    'duck down textile import export',
    'down filling feather trade',
  ];

  const results = await Promise.all(queries.map(fetchFeed));
  const all = results.flat();

  const seen = new Set<string>();
  const unique = all
    .filter(item => {
      const key = item.title.slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 100);

  return NextResponse.json({ news: unique });
}
