import sigunguData from '@/data/sigungu.json';

export const BUSAN_SIGUNGU = [
  '26110', '26140', '26170', '26200', '26230', '26260',
  '26290', '26320', '26350', '26380', '26410', '26440',
  '26470', '26500', '26530', '26710',
];

export const SIGUNGU_NAME: Record<string, string> = Object.fromEntries(
  (sigunguData as { code: string; name: string }[]).map((s) => [s.code, s.name])
);

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
