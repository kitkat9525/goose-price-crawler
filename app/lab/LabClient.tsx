'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import Script from 'next/script';
import { BuildingPermitItem } from '@/types/building';

export interface LabClientProps {
  naverClientId: string;
}

const KEY = '#AA8E5C';

interface BjdongGroup {
  bjdongKey: string;
  name: string;
  lat: number;
  lng: number;
  items: BuildingPermitItem[];
}

interface ProgressEvent {
  current: number;
  total: number;
  sigunguName: string;
  bjdongName: string;
}

const SIGUNGU_ZOOM_THRESHOLD = 12;

const SIGUNGU_NAME: Record<string, string> = {
  '26110': '중구', '26140': '서구', '26170': '동구', '26200': '영도구',
  '26230': '부산진구', '26260': '동래구', '26290': '남구', '26320': '북구',
  '26350': '해운대구', '26380': '사하구', '26410': '금정구', '26440': '강서구',
  '26470': '연제구', '26500': '수영구', '26530': '사상구', '26710': '기장군',
};

const formatDate = (d: string) =>
  !d?.trim() ? '—' : `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;

const formatNum = (n: number | string) =>
  n == null || n === '' ? '—' : Number(n).toLocaleString('ko-KR');

function getItemFields(item: BuildingPermitItem): [string, string][] {
  return [
    ['대지위치', item.platPlc],
    ['건축구분', item.archGbCdNm],
    ['주용도', item.mainPurpsCdNm],
    ['대지면적', `${formatNum(item.platArea)} ㎡`],
    ['건축면적', `${formatNum(item.archArea)} ㎡`],
    ['건폐율', `${formatNum(item.bcRat)} %`],
    ['연면적', `${formatNum(item.totArea)} ㎡`],
    ['용적률', `${formatNum(item.vlRat)} %`],
    ['세대수', formatNum(item.hhldCnt)],
    ['호수', formatNum(item.hoCnt)],
    ['총주차수', formatNum(item.totPkngCnt)],
    ['착공예정일', formatDate(item.stcnsSchedDay)],
    ['실제착공일', formatDate(item.realStcnsDay)],
    ['건축허가일', formatDate(item.archPmsDay)],
    ['사용승인일', formatDate(item.useAprDay)],
  ];
}

const CELL: React.CSSProperties = {
  padding: '10px 16px 10px 0',
  fontSize: 12,
  color: '#111',
  borderBottom: '1px solid #ebebeb',
  verticalAlign: 'top',
};

const TH: React.CSSProperties = {
  ...CELL,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  color: 'rgba(17,17,17,0.35)',
  textTransform: 'uppercase' as const,
  borderBottom: '1px solid #111',
  paddingBottom: 8,
};

export default function LabClient({ naverClientId }: LabClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);

  const [groups, setGroups] = useState<BjdongGroup[]>([]);
  const [selected, setSelected] = useState<BjdongGroup | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => { setExpandedIdx(null); }, [selected]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const coordsRes = await fetch('/busan-bjdong-coords.json').catch(() => null);
        const coords: Record<string, { lat: number; lng: number; name: string }> =
          coordsRes ? await coordsRes.json() : {};

        const res = await fetch('/api/busan-lodging');
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done || cancelled) break;
          buf += decoder.decode(value, { stream: true });
          const blocks = buf.split('\n\n');
          buf = blocks.pop() ?? '';

          for (const block of blocks) {
            const event = block.match(/^event: (\w+)/m)?.[1];
            const raw = block.match(/^data: (.+)/m)?.[1];
            if (!event || !raw) continue;
            const data = JSON.parse(raw);

            if (event === 'progress') {
              setProgress(data);
            } else if (event === 'done') {
              const map = new Map<string, BjdongGroup>();
              for (const item of data.data as BuildingPermitItem[]) {
                const key = item.sigunguCd + item.bjdongCd;
                if (!map.has(key)) {
                  const coord = coords[key];
                  map.set(key, {
                    bjdongKey: key,
                    name: coord?.name ?? item.bjdongCd,
                    lat: coord?.lat ?? 35.18,
                    lng: coord?.lng ?? 129.07,
                    items: [],
                  });
                }
                map.get(key)!.items.push(item);
              }
              setGroups(Array.from(map.values()));
              setLoading(false);
              setProgress(null);
            } else if (event === 'error') {
              setError(data.message);
              setLoading(false);
            }
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '알 수 없는 오류');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const initMap = useCallback(() => {
    const naver = (window as unknown as { naver: { maps: { Map: new (...a: unknown[]) => unknown; LatLng: new (...a: unknown[]) => unknown; Marker: new (...a: unknown[]) => unknown; Point: new (...a: unknown[]) => unknown; Event: { addListener: (...a: unknown[]) => unknown } } } }).naver;
    if (!naver || !mapContainerRef.current) return;
    const map = new naver.maps.Map(mapContainerRef.current, {
      center: new naver.maps.LatLng(35.14, 129.05),
      zoom: 13,
      minZoom: 9,
    });
    mapRef.current = map;
    naver.maps.Event.addListener(map, 'zoom_changed', () => {
      setMapZoom((map as { getZoom: () => number }).getZoom());
    });
  }, []);

  useEffect(() => {
    const naver = (window as unknown as { naver?: { maps: { Marker: new (...a: unknown[]) => { setMap: (m: unknown) => void }; LatLng: new (...a: unknown[]) => unknown; Point: new (...a: unknown[]) => unknown; Event: { addListener: (...a: unknown[]) => unknown } } } }).naver;
    if (!naver || !mapRef.current || groups.length === 0) return;

    markersRef.current.forEach((m) => (m as { setMap: (v: null) => void }).setMap(null));
    markersRef.current = [];

    const map = mapRef.current as { setZoom: (z: number) => void; setCenter: (p: unknown) => void };

    const addMarker = (lat: number, lng: number, count: number, label: string, onClick: () => void) => {
      const digits = String(count).length;
      const base = mapZoom >= SIGUNGU_ZOOM_THRESHOLD ? 40 : 52;
      const size = base + (digits - 1) * 8;
      const fs = Math.round(size * 0.33);
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(lat, lng),
        map: mapRef.current,
        title: label,
        icon: {
          content: `<div style="background:#111;color:#fff;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${count}</div>`,
          anchor: new naver.maps.Point(size / 2, size / 2),
        },
      });
      naver.maps.Event.addListener(marker, 'click', onClick);
      markersRef.current.push(marker);
    };

    if (mapZoom < SIGUNGU_ZOOM_THRESHOLD) {
      const sigunguMap = new Map<string, { lat: number; lng: number; count: number; n: number }>();
      groups.forEach((g) => {
        const cd = g.bjdongKey.slice(0, 5);
        const s = sigunguMap.get(cd) ?? { lat: 0, lng: 0, count: 0, n: 0 };
        sigunguMap.set(cd, { lat: s.lat + g.lat, lng: s.lng + g.lng, count: s.count + g.items.length, n: s.n + 1 });
      });
      sigunguMap.forEach((s, cd) => {
        const lat = s.lat / s.n;
        const lng = s.lng / s.n;
        addMarker(lat, lng, s.count, SIGUNGU_NAME[cd] ?? cd, () => {
          map.setZoom(SIGUNGU_ZOOM_THRESHOLD);
          map.setCenter(new naver.maps.LatLng(lat, lng));
        });
      });
    } else {
      groups.forEach((group) => {
        addMarker(group.lat, group.lng, group.items.length, group.name, () => setSelected(group));
      });
    }
  }, [groups, mapZoom]);

  const totalLodging = groups.reduce((s, g) => s + g.items.length, 0);
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  const randomSample = useMemo(() => {
    const all = groups.flatMap((g) => g.items);
    if (all.length <= 1000) return all;
    return [...all].sort(() => Math.random() - 0.5).slice(0, 1000);
  }, [groups]);

  const tableHeaders = ['#', '건물명', '주소', '주용도', '건축구분', '대지(㎡)', '건축(㎡)', '허가일', '승인일'];
  const renderRow = (item: BuildingPermitItem, idx: number, clickable = false, isOpen = false, onToggle?: () => void) => (
    <Fragment key={idx}>
      <tr
        onClick={clickable ? onToggle : undefined}
        style={{ borderBottom: '1px solid #ebebeb', cursor: clickable ? 'pointer' : 'default',
          background: isOpen ? '#fafafa' : 'transparent' }}
      >
        <td style={{ ...CELL, color: 'rgba(17,17,17,0.3)', width: 32 }}>{idx + 1}</td>
        <td style={{ ...CELL, fontWeight: 700, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.bldNm || '—'}</td>
        <td style={{ ...CELL, color: 'rgba(17,17,17,0.55)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.platPlc || '—'}</td>
        <td style={{ ...CELL, whiteSpace: 'nowrap' }}>{item.mainPurpsCdNm || '—'}</td>
        <td style={{ ...CELL, whiteSpace: 'nowrap', color: 'rgba(17,17,17,0.55)' }}>{item.archGbCdNm || '—'}</td>
        <td style={{ ...CELL, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNum(item.platArea)}</td>
        <td style={{ ...CELL, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNum(item.archArea)}</td>
        <td style={{ ...CELL, textAlign: 'center', color: 'rgba(17,17,17,0.55)' }}>{formatDate(item.archPmsDay)}</td>
        <td style={{ ...CELL, textAlign: 'center', color: 'rgba(17,17,17,0.55)' }}>{formatDate(item.useAprDay)}</td>
      </tr>
      {isOpen && (
        <tr style={{ background: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
          <td colSpan={9} style={{ padding: '16px 0 16px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 32px' }}>
              {getItemFields(item).map(([label, val]) => (
                <div key={label} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <span style={{ color: 'rgba(17,17,17,0.35)', flexShrink: 0 }}>{label}</span>
                  <span style={{ color: '#111' }}>{val || '—'}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', color: '#111', fontFamily: 'inherit', overflow: 'hidden' }}>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverClientId}`}
        strategy="afterInteractive"
        onLoad={initMap}
      />

      {/* 헤더 */}
      <header style={{ borderBottom: '1px solid #ebebeb', padding: '16px 32px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>LAB · 실험실</p>
          <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, color: '#111' }}>구초 대동여지도</h1>
        </div>
        {!loading && !error && (
          <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>
            숙박시설 <strong style={{ color: '#111' }}>{formatNum(totalLodging)}</strong>건
          </span>
        )}
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 지도 */}
        <div ref={mapContainerRef} style={{ width: '50%', borderRight: '1px solid #ebebeb', flexShrink: 0, position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.92)', zIndex: 10, gap: 12, padding: '0 40px' }}>
              {progress ? (
                <>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{progress.sigunguName} · {progress.bjdongName}</p>
                  <div style={{ width: '100%', maxWidth: 240, background: '#ebebeb', borderRadius: 2, height: 2 }}>
                    <div style={{ background: KEY, height: 2, borderRadius: 2, width: `${pct}%`, transition: 'width 150ms' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>{progress.current} / {progress.total} ({pct}%)</p>
                </>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.4)' }}>데이터 로드 중…</p>
              )}
            </div>
          )}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <p style={{ fontSize: 12, color: '#c0392b' }}>{error}</p>
            </div>
          )}
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            {selected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <button onClick={() => setSelected(null)} style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← 전체</button>
                  <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.3, color: '#111' }}>{selected.name}</h2>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>{formatNum(selected.items.length)}건</span>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.3, color: '#111' }}>&nbsp;</h2>
                <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>{formatNum(randomSample.length)}건</span>
              </>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {tableHeaders.map((h) => (
                    <th key={h} style={{ ...TH, textAlign: h === '대지(㎡)' || h === '건축(㎡)' ? 'right' : h === '허가일' || h === '승인일' ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected
                  ? selected.items.map((item, idx) =>
                      renderRow(item, idx, true, expandedIdx === idx, () => setExpandedIdx(expandedIdx === idx ? null : idx))
                    )
                  : randomSample.map((item, idx) => renderRow(item, idx))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
