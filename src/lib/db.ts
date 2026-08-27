import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || (process.env.NODE_ENV === 'production' ? 'file:/tmp/local.db' : 'file:local.db');
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({
  url,
  authToken,
});

let initPromise: Promise<void> | null = null;

export async function ensureTables() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')) NOT NULL
          );
        `);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS test_history (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            test_type TEXT NOT NULL,
            target TEXT,
            results TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')) NOT NULL
          );
        `);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            target TEXT NOT NULL,
            environment TEXT DEFAULT 'production' NOT NULL,
            criticality TEXT DEFAULT 'high' NOT NULL,
            owner TEXT,
            tags TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')) NOT NULL
          );
        `);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS finding_statuses (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            target TEXT NOT NULL,
            finding_id TEXT NOT NULL,
            status TEXT DEFAULT 'open' NOT NULL,
            notes TEXT,
            updated_at TEXT DEFAULT (datetime('now')) NOT NULL
          );
        `);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS webhook_configs (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            provider TEXT DEFAULT 'slack' NOT NULL,
            url TEXT NOT NULL,
            enabled INTEGER DEFAULT 1 NOT NULL,
            created_at TEXT DEFAULT (datetime('now')) NOT NULL
          );
        `);
      } catch (err) {
        console.error('Failed to auto-init tables:', err);
      }
    })();
  }
  await initPromise;
}

