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

export const STANDARD_TYPES: Record<string, number> = {
  '服标': 2,
  '寝标': 3,
  '国标': 1,
  '欧标': 4,
  '美标': 5,
  '日标': 6,
};

const CATEGORY_MAP: Record<string, Omit<CategoryPrices, 'name' | 'prices'>> = {
  '白鸭绒': { nameKr: '백오리털', nameEn: 'White Duck Down', type: 'duck', color: 'white' },
  '灰鸭绒': { nameKr: '회오리털', nameEn: 'Grey Duck Down', type: 'duck', color: 'grey' },
  '白鹅绒': { nameKr: '백거위털', nameEn: 'White Goose Down', type: 'goose', color: 'white' },
  '灰鹅绒': { nameKr: '회거위털', nameEn: 'Grey Goose Down', type: 'goose', color: 'grey' },
};

const GRADE_ORDER = ['70%', '80%', '90%', '95%'];

const CFD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Referer': 'https://www.cfd.com.cn/index.php?s=/Web/Market/platform.html',
};

// FALLBACK: 서标 기준 최근 데이터
const FALLBACK: PriceData = {
  updatedAt: '2026-07-03',
  fetchedAt: new Date().toISOString(),
  source: 'fallback',
  categories: [
    {
      name: '白鸭绒', nameKr: '백오리털', nameEn: 'White Duck Down', type: 'duck', color: 'white',
      prices: [
        { grade: '70%', prev: 399.03, current: 395.90, diff: -3.13, yoy: '-0.78%' },
        { grade: '80%', prev: 484.43, current: 481.13, diff: -3.30, yoy: '-0.68%' },
        { grade: '90%', prev: 580.89, current: 577.45, diff: -3.44, yoy: '-0.59%' },
        { grade: '95%', prev: 653.14, current: 649.57, diff: -3.57, yoy: '-0.55%' },
      ],
    },
    {
      name: '灰鸭绒', nameKr: '회오리털', nameEn: 'Grey Duck Down', type: 'duck', color: 'grey',
      prices: [
        { grade: '70%', prev: 383.27, current: 380.87, diff: -2.40, yoy: '-0.63%' },
        { grade: '80%', prev: 466.86, current: 464.34, diff: -2.52, yoy: '-0.54%' },
        { grade: '90%', prev: 561.35, current: 558.68, diff: -2.67, yoy: '-0.48%' },
        { grade: '95%', prev: 629.28, current: 626.49, diff: -2.79, yoy: '-0.44%' },
      ],
    },
    {
      name: '白鹅绒', nameKr: '백거위털', nameEn: 'White Goose Down', type: 'goose', color: 'white',
      prices: [
        { grade: '70%', prev: 690.71, current: 684.79, diff: -5.92, yoy: '-0.86%' },
        { grade: '80%', prev: 832.60, current: 825.44, diff: -7.16, yoy: '-0.86%' },
        { grade: '90%', prev: 1006.95, current: 998.90, diff: -8.05, yoy: '-0.80%' },
        { grade: '95%', prev: 1117.72, current: 1109.75, diff: -7.97, yoy: '-0.71%' },
      ],
    },
    {
      name: '灰鹅绒', nameKr: '회거위털', nameEn: 'Grey Goose Down', type: 'goose', color: 'grey',
      prices: [
        { grade: '70%', prev: 651.03, current: 645.18, diff: -5.85, yoy: '-0.90%' },
        { grade: '80%', prev: 776.34, current: 770.14, diff: -6.20, yoy: '-0.80%' },
        { grade: '90%', prev: 941.60, current: 934.18, diff: -7.42, yoy: '-0.79%' },
        { grade: '95%', prev: 1056.97, current: 1048.94, diff: -8.03, yoy: '-0.76%' },
      ],
    },
  ],
};

function parseTableHtml(html: string): PriceData | null {
  try {
    // getTable 응답은 <tr> 덩어리 → <table>로 감싸서 파싱
    const tableHtml = `<table>${html}</table>`;

    // 헤더 <th>에서 날짜 추출 → 마지막 날짜가 updatedAt
    const thDates = [...tableHtml.matchAll(/<div class="cell">(\d{4}-\d{2}-\d{2})<\/div>/g)].map(m => m[1]);
    const updatedAt = thDates.length > 0 ? thDates.reduce((a, b) => (a > b ? a : b)) : '';
    if (!updatedAt) return null;

    // <tr> 행 파싱
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

    const categoriesMap = new Map<string, CategoryPrices>();
    let currentCategory = '';

    for (const cells of rows) {
      const firstCell = cells[0];
      let grade: string;
      let priceStart: number;

      if (CATEGORY_MAP[firstCell]) {
        currentCategory = firstCell;
        if (!categoriesMap.has(currentCategory)) {
          categoriesMap.set(currentCategory, { name: currentCategory, ...CATEGORY_MAP[currentCategory], prices: [] });
        }
        grade = cells[1];
        priceStart = 2;
      } else if (firstCell === '' || firstCell === '查看') {
        grade = cells[1] ?? '';
        priceStart = 2;
      } else if (GRADE_ORDER.includes(firstCell)) {
        grade = firstCell;
        priceStart = 1;
      } else {
        continue;
      }

      if (!currentCategory || !GRADE_ORDER.includes(grade)) continue;

      const prev    = parseFloat(cells[priceStart]);
      const current = parseFloat(cells[priceStart + 1]);
      const diff    = parseFloat(cells[priceStart + 2]);
      const yoy     = cells[priceStart + 3] ?? '';

      if (isNaN(prev) || isNaN(current)) continue;

      categoriesMap.get(currentCategory)!.prices.push({ grade, prev, current, diff, yoy });
    }

    // 등급 순서 정렬
    for (const cat of categoriesMap.values()) {
      cat.prices.sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
    }

    const categories = [...categoriesMap.values()].filter(c => c.prices.length > 0);
    if (categories.length === 0) return null;

    return { updatedAt, fetchedAt: new Date().toISOString(), source: 'live', categories };
  } catch {
    return null;
  }
}

export async function fetchPrices(standard = '服标'): Promise<PriceData> {
  const type = STANDARD_TYPES[standard] ?? 2;
  const url = `https://www.cfd.com.cn/index.php?s=/Web/Data/getTable/&category=1&type=${type}&datetype=1`;

  try {
    const res = await fetch(url, { headers: CFD_HEADERS, cache: 'no-store' });
    if (!res.ok) return { ...FALLBACK, fetchedAt: new Date().toISOString() };

    const html = await res.text();
    const parsed = parseTableHtml(html);
    return parsed ?? { ...FALLBACK, fetchedAt: new Date().toISOString() };
  } catch {
    return { ...FALLBACK, fetchedAt: new Date().toISOString() };
  }
}
