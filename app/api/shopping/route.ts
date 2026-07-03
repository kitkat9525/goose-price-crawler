import { NextResponse } from 'next/server';

export const revalidate = 3600;

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
}

export interface ShoppingItem {
  title: string;
  link: string;
  image: string;
  lprice: number;
  mallName: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') ?? '구스이불';

  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ items: [], error: 'naver_key_missing' });
  }

  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=20&sort=sim`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ items: [] });

    const json = await res.json();
    const items: ShoppingItem[] = (json.items ?? []).map((item: {
      title: string; link: string; image: string; lprice: string; mallName: string;
    }) => ({
      title: stripHtml(item.title),
      link: item.link,
      image: item.image,
      lprice: parseInt(item.lprice, 10) || 0,
      mallName: item.mallName,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
