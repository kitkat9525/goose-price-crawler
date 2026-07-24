// 로컬: file:./feedbacks.db / Vercel: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
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

  await db.execute(`
    INSERT OR IGNORE INTO users (username, password) VALUES ('goosechoi', 'choiinyeong')
  `);

  // ── 구독자 스냅샷
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subscriber_snapshots (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id   TEXT NOT NULL,
      date         TEXT NOT NULL,
      subscribers  INTEGER NOT NULL,
      UNIQUE(channel_id, date)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS busan_lodging_cache (
      bjdong_key TEXT PRIMARY KEY,
      cached_at  TEXT NOT NULL,
      data       TEXT NOT NULL
    )
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

// ── 구독자 스냅샷 ──────────────────────────────────────────────────────────────

export async function upsertSubscriberSnapshot(channelId: string, subscribers: number) {
  await initDb();
  const db = getClient();
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  await db.execute({
    sql: `INSERT INTO subscriber_snapshots (channel_id, date, subscribers)
          VALUES (?, ?, ?)
          ON CONFLICT(channel_id, date) DO UPDATE SET subscribers = excluded.subscribers`,
    args: [channelId, date, subscribers],
  });
}

export async function getSubscriberSnapshots(channelId: string, days = 30) {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: `SELECT date, subscribers FROM subscriber_snapshots
          WHERE channel_id = ?
          ORDER BY date ASC
          LIMIT ?`,
    args: [channelId, days],
  });
  return result.rows as unknown as { date: string; subscribers: number }[];
}

export async function getAllFeedbacks() {
  await initDb();
  const db = getClient();
  const result = await db.execute(
    `SELECT id, content, created_at as createdAt FROM feedbacks ORDER BY id DESC LIMIT 100`
  );
  return result.rows as unknown as { id: number; content: string; createdAt: string }[];
}

// ── 부산 숙박시설 캐시 ────────────────────────────────────────────────────────

export async function getLodgingCacheAll(): Promise<{ bjdongKey: string; cachedAt: string; data: unknown[] }[]> {
  await initDb();
  const db = getClient();
  const result = await db.execute(`SELECT bjdong_key, cached_at, data FROM busan_lodging_cache`);
  return result.rows.map((r) => ({
    bjdongKey: r.bjdong_key as string,
    cachedAt: r.cached_at as string,
    data: JSON.parse(r.data as string),
  }));
}

export async function setLodgingCacheRow(bjdongKey: string, cachedAt: string, data: unknown[]) {
  await initDb();
  const db = getClient();
  await db.execute({
    sql: `INSERT OR REPLACE INTO busan_lodging_cache (bjdong_key, cached_at, data) VALUES (?, ?, ?)`,
    args: [bjdongKey, cachedAt, JSON.stringify(data)],
  });
}
