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

const KW_QUERIES: Record<string, string[]> = {
  '거위털': ['goose down feather market price', 'goose down raw material supply'],
  '오리털': ['duck down feather industry', 'duck down textile import export'],
  '침구류': ['down bedding duvet comforter', 'down filling feather trade'],
};
const DEFAULT_QUERIES = [
  'goose down feather market price',
  'duck down feather industry',
  'down bedding duvet comforter',
  'goose down raw material supply',
  'duck down textile import export',
  'down filling feather trade',
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kw = searchParams.get('q');
  const queries = kw && KW_QUERIES[kw] ? KW_QUERIES[kw] : DEFAULT_QUERIES;

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
