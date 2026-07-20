'use client';

import { useState, useEffect } from 'react';
import type { NewsItem } from '@/app/lib/types';
import { PAGE_SIZE, fmtPubDate } from './constants';

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
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-xs px-2.5 py-1 border border-black/10 text-black/40 hover:text-black hover:border-black/30 transition-colors"
      >
        기사 보기
      </a>
    </li>
  );
}

interface NewsConfig {
  id: string;
  title: string;
  apiPath: string;
  sourceNote: string;
  keywords: string[];
}

function NewsSectionBase({ title, apiPath, sourceNote, keywords }: NewsConfig) {
  const [activeKw, setActiveKw] = useState(keywords[0]);
  const [news, setNews]         = useState<NewsItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [page, setPage]         = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setPage(0);
    fetch(`${apiPath}?q=${encodeURIComponent(activeKw)}`)
      .then(r => r.json())
      .then(d => { setNews(d.news ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [apiPath, activeKw]);

  const totalPages = Math.ceil(news.length / PAGE_SIZE);
  const paged = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section>
      {/* 헤더 */}
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">NEWS</p>
        <h2 className="text-2xl font-black tracking-tight text-black mb-3">{title}</h2>
        {/* 키워드 탭 */}
        <div className="flex items-center gap-4 border-b border-black/8">
          {keywords.map(kw => (
            <button
              key={kw}
              onClick={() => setActiveKw(kw)}
              className={`pb-2 text-sm transition-colors border-b-2 -mb-px ${
                activeKw === kw
                  ? 'border-black text-black font-semibold'
                  : 'border-transparent text-black/35 hover:text-black/60'
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="border border-black/8 overflow-hidden" style={{ borderTop: '2px solid #111' }}>
        {loading && (
          <div className="flex items-center justify-center py-12 text-sm text-black/30">
            {activeKw} 뉴스를 불러오는 중...
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center justify-center py-12 text-sm text-black/30">
            뉴스를 가져오지 못했습니다.
          </div>
        )}
        {!loading && !error && news.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-black/30">
            표시할 뉴스가 없습니다.
          </div>
        )}
        {!loading && !error && news.length > 0 && (
          <ul className="divide-y divide-black/5">
            {paged.map((item, i) => (
              <NewsCard key={page * PAGE_SIZE + i} item={item} index={page * PAGE_SIZE + i} />
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="border-t border-black/5 py-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs font-bold px-3 py-1 border border-black/10 text-black/40 hover:text-black hover:border-black/30 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ borderRadius: 0 }}
            >← 이전</button>
            <span className="text-xs font-bold text-black/50 px-1">
              {page + 1} <span className="text-black/25 font-normal">/ {totalPages}</span>
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs font-bold px-3 py-1 border border-black/10 text-black/40 hover:text-black hover:border-black/30 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ borderRadius: 0 }}
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

export const NEWS_CONFIGS: NewsConfig[] = [
  {
    id: 'sec-news-kr',
    title: '국내 뉴스',
    apiPath: '/api/news-kr',
    sourceNote: '출처: 네이버 뉴스 검색 API · 국내 언론사 기준',
    keywords: ['거위털', '오리털', '구스이불'],
  },
  {
    id: 'sec-news',
    title: '해외 뉴스',
    apiPath: '/api/news',
    sourceNote: '출처: Google News RSS · 해외 영문 뉴스 기준',
    keywords: ['거위털', '오리털', '침구류'],
  },
];

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
