// JWT 서명 시크릿 — login/route.ts 와 proxy.ts 에서 공유
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'goose-down-index-secret-key-2026'
);
