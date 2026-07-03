import type { NewsItem } from '@/app/lib/types';

export function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];

    const get = (tag: string) => {
      const t = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's'));
      return t ? t[1].trim() : '';
    };

    const title = get('title');
    const link = get('link') || block.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
    const pubDate = get('pubDate');
    const source = get('source') || get('channel') || '';

    if (title && link) items.push({ title, link, pubDate, source });
  }
  return items;
}
