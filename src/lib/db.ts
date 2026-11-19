import { createClient } from '@libsql/client';

function getCleanDbConfig() {

  let rawUrl = (process.env.TURSO_DATABASE_URL || '').trim().replace(/[\r\n]+/g, '').replace(/^['"]|['"]$/g, '');
  let authToken = (process.env.TURSO_AUTH_TOKEN || '').trim().replace(/[\r\n]+/g, '').replace(/^['"]|['"]$/g, '');

  // Se l'URL fornito non è valido o contiene ancora spazi, usa il fallback SQLite
  if (!rawUrl || (!rawUrl.startsWith('libsql://') && !rawUrl.startsWith('https://') && !rawUrl.startsWith('http://') && !rawUrl.startsWith('file:'))) {
    rawUrl = process.env.NODE_ENV === 'production' ? 'file:/tmp/local.db' : 'file:local.db';
    authToken = '';
  }

  return {
    url: rawUrl,
    authToken: authToken || undefined,
  };
}

const dbConfig = getCleanDbConfig();

export const db = createClient({
  url: dbConfig.url,
  authToken: dbConfig.authToken,
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
        await db.execute(`
          CREATE TABLE IF NOT EXISTS threat_intel_meta (
            id TEXT PRIMARY KEY,
            catalog_version TEXT NOT NULL,
            date_released TEXT,
            total_kev INTEGER DEFAULT 0 NOT NULL,
            source_url TEXT NOT NULL,
            last_synced_at TEXT NOT NULL
          );
        `);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS threat_intel_kev (
            cve_id TEXT PRIMARY KEY,
            vendor_project TEXT NOT NULL,
            product TEXT NOT NULL,
            vulnerability_name TEXT NOT NULL,
            date_added TEXT NOT NULL,
            due_date TEXT,
            short_description TEXT,
            required_action TEXT,
            known_ransomware INTEGER DEFAULT 0 NOT NULL,
            cwes TEXT,
            updated_at TEXT DEFAULT (datetime('now')) NOT NULL
          );
        `);
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_threat_intel_kev_product ON threat_intel_kev(product);
        `);
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_threat_intel_kev_vendor ON threat_intel_kev(vendor_project);
        `);
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_threat_intel_kev_date ON threat_intel_kev(date_added);
        `);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS threat_intel_osv_cache (
            cache_key TEXT PRIMARY KEY,
            ecosystem TEXT NOT NULL,
            package_name TEXT NOT NULL,
            version TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            cached_at TEXT NOT NULL
          );
        `);
      } catch (err) {
        console.error('Failed to auto-init tables:', err);
      }
    })();
  }
  await initPromise;
}

