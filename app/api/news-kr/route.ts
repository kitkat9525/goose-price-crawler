import { NextResponse } from 'next/server';
import type { NewsItem } from '@/app/lib/types';
import { parseRss } from '@/app/lib/utils/rss';

export const revalidate = 1800;

// ──────────────────────────────────────────────
// 네이버 뉴스 검색 API
// 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
// developers.naver.com 에서 발급
// ──────────────────────────────────────────────
function stripHtml(s: string) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// 도메인 → 언론사명 매핑
const DOMAIN_MAP: Record<string, string> = {
  // ── 통신사 ──
  'yonhapnews.co.kr': '연합뉴스',
  'yna.co.kr': '연합뉴스',
  'news1.kr': '뉴스1',
  'newsis.com': '뉴시스',

  // ── 전국 일간지 ──
  'chosun.com': '조선일보',
  'donga.com': '동아일보',
  'joongang.co.kr': '중앙일보',
  'joins.com': '중앙일보',
  'hani.co.kr': '한겨레',
  'khan.co.kr': '경향신문',
  'seoul.co.kr': '서울신문',
  'hankookilbo.com': '한국일보',
  'munhwa.com': '문화일보',
  'segye.com': '세계일보',
  'kukminilbo.co.kr': '국민일보',
  'naeil.com': '내일신문',
  'asiatoday.co.kr': '아시아투데이',

  // ── 경제 일간지 ──
  'hankyung.com': '한국경제',
  'mk.co.kr': '매일경제',
  'mt.co.kr': '머니투데이',
  'edaily.co.kr': '이데일리',
  'fnnews.com': '파이낸셜뉴스',
  'asiae.co.kr': '아시아경제',
  'heraldcorp.com': '헤럴드경제',
  'sedaily.com': '서울경제',
  'ajunews.com': '아주경제',
  'etoday.co.kr': '이투데이',
  'dailiang.co.kr': '대한경제',
  'the-stock.co.kr': '더스탁',
  'newspim.com': '뉴스핌',
  'bizwatch.co.kr': '비즈워치',
  'thebell.co.kr': '더벨',
  'bloter.net': '블로터',

  // ── 방송 ──
  'kbs.co.kr': 'KBS',
  'mbc.co.kr': 'MBC',
  'sbs.co.kr': 'SBS',
  'jtbc.co.kr': 'JTBC',
  'ytn.co.kr': 'YTN',
  'mbn.co.kr': 'MBN',
  'tvchosun.com': 'TV조선',
  'channela.com': '채널A',
  'ichannela.com': '채널A',
  'yonhapnewstv.co.kr': '연합뉴스TV',
  'cbci.co.kr': 'CBS',
  'nocutnews.co.kr': '노컷뉴스',

  // ── IT / 테크 ──
  'etnews.com': '전자신문',
  'zdnet.co.kr': 'ZDNet Korea',
  'inews24.com': '아이뉴스24',
  'itchosun.com': 'IT조선',
  'ddaily.co.kr': '디지털데일리',
  'dt.co.kr': '디지털타임스',
  'aitimes.com': 'AI타임스',
  'boannews.com': '보안뉴스',
  'datanet.co.kr': '데이터넷',
  'ciokorea.com': 'CIO Korea',
  'techm.kr': '테크M',
  'venturesquare.net': '벤처스퀘어',
  'startuptoday.co.kr': '스타트업투데이',

  // ── 인터넷 / 포털 기반 ──
  'ohmynews.com': '오마이뉴스',
  'pressian.com': '프레시안',
  'mediatoday.co.kr': '미디어오늘',
  'newstapa.org': '뉴스타파',
  'kukinews.com': '쿠키뉴스',
  'dailian.co.kr': '데일리안',
  'wikitree.co.kr': '위키트리',
  'topstarnews.net': '톱스타뉴스',
  'breaknews.com': '브레이크뉴스',
  'sisajournal.com': '시사저널',
  'sisain.co.kr': '시사IN',
  'weekly.chosun.com': '주간조선',
  'junggi.co.kr': '중기이코노미스트',
  'industrynews.co.kr': '인더스트리뉴스',

  // ── 전문지 ──
  'agrinet.co.kr': '한국농업신문',
  'nongmin.com': '농민신문',
  'koit.co.kr': '정보통신신문',
  'electimes.com': '전기신문',
  'chemicaltoday.kr': '케미컬뉴스',
  'fashionseoul.com': '패션서울',
  'apparelnews.co.kr': '어패럴뉴스',
  'ktnews.com': '한국섬유신문',
  'fibre2fashion.com': 'Fibre2Fashion',
};

function extractSource(originallink: string): string {
  try {
    const hostname = new URL(originallink).hostname.replace(/^www\./, '');
    for (const [domain, name] of Object.entries(DOMAIN_MAP)) {
      if (hostname.endsWith(domain)) return name;
    }
    // 매핑 없으면 의미있는 도메인 파트 추출
    // .co.kr / .or.kr / .ne.kr 등 2단계 ccTLD 처리
    const parts = hostname.split('.');
    const secondLevel = parts[parts.length - 2];
    if (['co', 'or', 'ne', 'go', 'ac', 're', 'pe'].includes(secondLevel)) {
      return parts[parts.length - 3] ?? hostname;
    }
    return secondLevel ?? hostname;
  } catch {
    return '';
  }
}

async function fetchNaver(query: string, clientId: string, clientSecret: string): Promise<NewsItem[]> {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&sort=date`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.items ?? []).map((item: { title: string; originallink: string; link: string; pubDate: string }) => ({
      title: stripHtml(item.title),
      link: item.originallink || item.link,
      pubDate: item.pubDate,
      source: extractSource(item.originallink || item.link),
    }));
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// 폴백: Google News RSS (키 없을 때)
// ──────────────────────────────────────────────
async function fetchGoogleRss(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:1y')}&hl=ko&gl=KR&ceid=KR:ko`;
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

// ──────────────────────────────────────────────
// GET
// ──────────────────────────────────────────────
export async function GET() {
  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  const queries = ['거위털', '오리털', '구스이불', '구스다운', '덕다운', '우모 수입', '침구 원자재'];

  let all: NewsItem[];

  if (clientId && clientSecret) {
    const results = await Promise.all(queries.map(q => fetchNaver(q, clientId, clientSecret)));
    all = results.flat();
  } else {
    const results = await Promise.all(queries.map(fetchGoogleRss));
    all = results.flat();
  }

  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const unique = all
    .filter(item => {
      const key = item.title.slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      if (item.pubDate) {
        const t = new Date(item.pubDate).getTime();
        if (!isNaN(t) && t < oneYearAgo) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 100);

  return NextResponse.json({ news: unique, source: clientId ? 'naver' : 'google' });
}
