-- Schema Turso (LibSQL / SQLite) per Network Diagnostic Tool
-- Esegui questo script nella dashboard Turso (Query / Shell) o via CLI: turso db shell network-diag-db < turso/schema.sql

-- Tabella Utenti
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL
);

-- Tabella Storico Test
CREATE TABLE IF NOT EXISTS test_history (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    test_type TEXT NOT NULL, -- 'external', 'internal', 'security'
    target TEXT,             -- dominio o IP
    results TEXT NOT NULL,   -- dati JSON dei risultati
    created_at TEXT DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON test_history(created_at);
