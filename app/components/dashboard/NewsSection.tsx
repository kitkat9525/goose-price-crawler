'use client';

import { useState, useEffect } from 'react';
import type { NewsItem } from '@/app/lib/types';
import { KEY, KEY_BG, KEY_BORDER, PAGE_SIZE, fmtPubDate } from './constants';
import { SectionLabel } from './SectionLabel';

// ─── 뉴스 카드 ───────────────────────────────────
function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  return (
    <li className="flex items-start gap-4 px-5 py-3.5 hover:bg-black/[0.02] transition-colors">
      <span className="text-xs text-black/20 mt-0.5 w-5 shrink-0 text-right">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <a href={item.link} target="_blank" rel="noopener noreferrer"
          className="text-sm font-medium text-black/80 hover:text-black transition-colors leading-snug line-clamp-2">
          {item.title}
        </a>
        <div className="flex items-center gap-2 mt-1">
          {item.source && <span className="text-xs text-black/30">{item.source}</span>}
          {item.source && item.pubDate && <span className="text-black/15 text-xs">·</span>}
          {item.pubDate && <span className="text-xs text-black/25">{fmtPubDate(item.pubDate)}</span>}
        </div>
      </div>
      <a href={item.link} target="_blank" rel="noopener noreferrer"
        className="shrink-0 text-xs px-2.5 py-1 rounded-md border transition-colors"
        style={{ borderColor: KEY_BORDER, color: KEY }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = KEY_BG; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}>
        기사 보기
      </a>
    </li>
  );
}

// ─── 뉴스 섹션 ───────────────────────────────────
function NewsSectionBase({ title, subtitle, apiPath, sourceNote }: {
  title: string; subtitle: string; apiPath: string; sourceNote: string;
}) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [page, setPage]       = useState(0);

  useEffect(() => {
    fetch(apiPath)
      .then(r => r.json())
      .then(d => { setNews(d.news ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [apiPath]);

  const totalPages = Math.ceil(news.length / PAGE_SIZE);
  const paged = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageBtnStyle = (disabled: boolean) =>
    disabled
      ? { borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' }
      : { borderColor: KEY, color: KEY };

  return (
    <section>
      <SectionLabel title={title} sub={subtitle} />
      <div className="rounded-xl border border-black/8 overflow-hidden" style={{ borderTop: `2px solid ${KEY}` }}>
        {loading && <div className="flex items-center justify-center py-12 text-sm text-black/30">뉴스를 불러오는 중...</div>}
        {!loading && error && <div className="flex items-center justify-center py-12 text-sm text-black/30">뉴스를 가져오지 못했습니다.</div>}
        {!loading && !error && news.length === 0 && <div className="flex items-center justify-center py-12 text-sm text-black/30">표시할 뉴스가 없습니다.</div>}
        {!loading && !error && news.length > 0 && (
          <ul className="divide-y divide-black/5">
            {paged.map((item, i) => <NewsCard key={page * PAGE_SIZE + i} item={item} index={page * PAGE_SIZE + i} />)}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="border-t border-black/5 py-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs font-medium px-3 py-1 rounded-md border transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={pageBtnStyle(page === 0)}
            >← 이전</button>
            <span className="text-xs font-medium text-black/50 px-1">
              {page + 1} <span className="text-black/25 font-normal">/ {totalPages}</span>
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs font-medium px-3 py-1 rounded-md border transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={pageBtnStyle(page === totalPages - 1)}
            >다음 →</button>
          </div>
        )}
        <div className="px-5 py-2.5 border-t border-black/5 bg-black/[0.015]">
          <p className="text-xs text-black/25">{sourceNote}</p>
        </div>
      </div>
    </section>
  );
}

// ─── 뉴스 설정 ───────────────────────────────────
export const NEWS_CONFIGS = [
  { id: 'sec-news-kr', title: '국내 뉴스', subtitle: '거위털 · 오리털 · 구스이불', apiPath: '/api/news-kr', sourceNote: '출처: 네이버 뉴스 검색 API · 국내 언론사 기준' },
  { id: 'sec-news',    title: '해외 뉴스', subtitle: '거위털 · 오리털 · 침구류',   apiPath: '/api/news',    sourceNote: '출처: Google News RSS · 해외 영문 뉴스 기준' },
] as const;

export function NewsSections() {
  return (
    <div id="sec-news-kr" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {NEWS_CONFIGS.map(cfg => (
        <div key={cfg.id}>
          <NewsSectionBase {...cfg} />
        </div>
      ))}
    </div>
  );
}
