// SQLite DB 클라이언트
// - 로컬: file:./feedbacks.db (프로젝트 루트, 영구 저장)
// - Vercel: 환경변수 TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (turso.tech 무료 플랜)
//
// Turso 설정 방법:
//   1. https://turso.tech 가입 (GitHub 로그인)
//   2. turso db create goose-feedback
//   3. turso db show goose-feedback → URL 복사
//   4. turso db tokens create goose-feedback → Token 복사
//   5. .env.local 에 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN 추가
//   6. Vercel 환경변수에도 동일하게 추가

import { createClient } from '@libsql/client';

let _client: ReturnType<typeof createClient> | null = null;
let _initialized = false;

function getClient() {
  if (_client) return _client;
  _client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? 'file:feedbacks.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _client;
}

async function initDb() {
  if (_initialized) return;
  _initialized = true;

  const db = getClient();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      content    TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT    NOT NULL UNIQUE,
      password TEXT    NOT NULL
    )
  `);

  // 기본 계정 시드 (없을 때만)
  await db.execute(`
    INSERT OR IGNORE INTO users (username, password) VALUES ('goosechoi', 'choiinyeong')
  `);
}

export async function verifyUser(username: string, password: string): Promise<boolean> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: `SELECT id FROM users WHERE username = ? AND password = ? LIMIT 1`,
    args: [username, password],
  });
  return result.rows.length > 0;
}

export async function insertFeedback(content: string) {
  await initDb();
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO feedbacks (content, created_at) VALUES (?, ?)`,
    args: [content, new Date().toISOString()],
  });
}

export async function getAllFeedbacks() {
  await initDb();
  const db = getClient();
  const result = await db.execute(
    `SELECT id, content, created_at as createdAt FROM feedbacks ORDER BY id DESC LIMIT 100`
  );
  return result.rows as unknown as { id: number; content: string; createdAt: string }[];
}
