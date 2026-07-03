export interface PriceEntry {
  grade: string;
  prev: number;
  current: number;
  diff: number;
  yoy: string;
}

export interface CategoryPrices {
  name: string;
  nameKr: string;
  nameEn: string;
  type: 'goose' | 'duck';
  color: 'white' | 'grey';
  prices: PriceEntry[];
}

export interface PriceData {
  updatedAt: string;
  fetchedAt: string;
  source: 'live' | 'fallback';
  categories: CategoryPrices[];
}

const CATEGORY_MAP: Record<string, Omit<CategoryPrices, 'name' | 'prices'>> = {
  '白鸭绒': { nameKr: '백오리털', nameEn: 'White Duck Down', type: 'duck', color: 'white' },
  '灰鸭绒': { nameKr: '회오리털', nameEn: 'Grey Duck Down', type: 'duck', color: 'grey' },
  '白鹅绒': { nameKr: '백거위털', nameEn: 'White Goose Down', type: 'goose', color: 'white' },
  '灰鹅绒': { nameKr: '회거위털', nameEn: 'Grey Goose Down', type: 'goose', color: 'grey' },
};

// 최근 수동 확인된 폴백 데이터 (2026-06-26 기준)
const FALLBACK: PriceData = {
  updatedAt: '2026-06-26',
  fetchedAt: new Date().toISOString(),
  source: 'fallback',
  categories: [
    {
      name: '白鸭绒', nameKr: '백오리털', nameEn: 'White Duck Down', type: 'duck', color: 'white',
      prices: [
        { grade: '70%', prev: 401.98, current: 399.03, diff: -2.95, yoy: '-0.73%' },
        { grade: '80%', prev: 488.02, current: 484.43, diff: -3.59, yoy: '-0.74%' },
        { grade: '90%', prev: 584.54, current: 580.89, diff: -3.65, yoy: '-0.62%' },
        { grade: '95%', prev: 657.41, current: 653.14, diff: -4.27, yoy: '-0.65%' },
      ],
    },
    {
      name: '灰鸭绒', nameKr: '회오리털', nameEn: 'Grey Duck Down', type: 'duck', color: 'grey',
      prices: [
        { grade: '70%', prev: 386.41, current: 383.27, diff: -3.14, yoy: '-0.81%' },
        { grade: '80%', prev: 470.75, current: 466.86, diff: -3.89, yoy: '-0.83%' },
        { grade: '90%', prev: 565.09, current: 561.35, diff: -3.74, yoy: '-0.66%' },
        { grade: '95%', prev: 633.82, current: 629.28, diff: -4.54, yoy: '-0.72%' },
      ],
    },
    {
      name: '白鹅绒', nameKr: '백거위털', nameEn: 'White Goose Down', type: 'goose', color: 'white',
      prices: [
        { grade: '70%', prev: 695.65, current: 690.71, diff: -4.94, yoy: '-0.71%' },
        { grade: '80%', prev: 838.46, current: 832.60, diff: -5.86, yoy: '-0.70%' },
        { grade: '90%', prev: 1013.54, current: 1006.95, diff: -6.59, yoy: '-0.65%' },
        { grade: '95%', prev: 1124.93, current: 1117.72, diff: -7.21, yoy: '-0.64%' },
      ],
    },
    {
      name: '灰鹅绒', nameKr: '회거위털', nameEn: 'Grey Goose Down', type: 'goose', color: 'grey',
      prices: [
        { grade: '70%', prev: 656.03, current: 651.03, diff: -5.00, yoy: '-0.76%' },
        { grade: '80%', prev: 782.27, current: 776.34, diff: -5.93, yoy: '-0.76%' },
        { grade: '90%', prev: 948.04, current: 941.60, diff: -6.44, yoy: '-0.68%' },
        { grade: '95%', prev: 1064.03, current: 1056.97, diff: -7.06, yoy: '-0.66%' },
      ],
    },
  ],
};

const GRADES = ['70%', '80%', '90%', '95%'];

function parseCFDHtml(html: string): PriceData | null {
  try {
    const dateMatch = html.match(/更新日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    const updatedAt = dateMatch?.[1];
    if (!updatedAt) return null;

    // 白鸭绒 이 포함된 테이블 찾기
    const anchorIdx = html.indexOf('白鸭绒');
    if (anchorIdx === -1) return null;

    const tableOpenIdx = html.lastIndexOf('<table', anchorIdx);
    if (tableOpenIdx === -1) return null;
    const tableCloseIdx = html.indexOf('</table>', anchorIdx);
    if (tableCloseIdx === -1) return null;

    const tableHtml = html.slice(tableOpenIdx, tableCloseIdx + 8);

    // 행 파싱
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: string[][] = [];
    let trMatch;
    while ((trMatch = trRe.exec(tableHtml)) !== null) {
      const rowHtml = trMatch[1];
      const cells: string[] = [];
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      while ((tdMatch = tdRe.exec(rowHtml)) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length >= 5) rows.push(cells);
    }

    if (rows.length === 0) return null;

    const categoriesMap: Map<string, CategoryPrices> = new Map();
    let currentCategory = '';

    for (const cells of rows) {
      const firstCell = cells[0];
      let grade: string;
      let priceStart: number;

      if (CATEGORY_MAP[firstCell]) {
        currentCategory = firstCell;
        if (!categoriesMap.has(currentCategory)) {
          categoriesMap.set(currentCategory, {
            name: currentCategory,
            ...CATEGORY_MAP[currentCategory],
            prices: [],
          });
        }
        grade = cells[1];
        priceStart = 2;
      } else if (firstCell === '') {
        // 빈 셀 = rowspan으로 카테고리 병합된 경우
        grade = cells[1];
        priceStart = 2;
      } else if (GRADES.includes(firstCell)) {
        // 카테고리 셀이 생략된 경우
        grade = firstCell;
        priceStart = 1;
      } else {
        continue;
      }

      if (!currentCategory || !GRADES.includes(grade)) continue;

      const prev = parseFloat(cells[priceStart]);
      const current = parseFloat(cells[priceStart + 1]);
      const diff = parseFloat(cells[priceStart + 2]);
      const yoy = cells[priceStart + 3] ?? '';

      if (isNaN(prev) || isNaN(current)) continue;

      categoriesMap.get(currentCategory)!.prices.push({ grade, prev, current, diff, yoy });
    }

    const categories = [...categoriesMap.values()].filter(c => c.prices.length > 0);
    if (categories.length === 0) return null;

    return { updatedAt, fetchedAt: new Date().toISOString(), source: 'live', categories };
  } catch {
    return null;
  }
}

export async function fetchPrices(): Promise<PriceData> {
  try {
    const res = await fetch(
      'https://www.cfd.com.cn/index.php?s=/Web/Market/platform.html',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Referer: 'https://www.cfd.com.cn/',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return { ...FALLBACK, fetchedAt: new Date().toISOString() };

    const html = await res.text();
    const parsed = parseCFDHtml(html);
    return parsed ?? { ...FALLBACK, fetchedAt: new Date().toISOString() };
  } catch {
    return { ...FALLBACK, fetchedAt: new Date().toISOString() };
  }
}
