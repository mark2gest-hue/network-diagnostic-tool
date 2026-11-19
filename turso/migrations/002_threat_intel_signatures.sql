-- Migrazione 002: Database Firme Threat Intelligence (CISA KEV + Cache OSV.dev)
-- Applicare su Turso via CLI: turso db shell <db-name> < turso/migrations/002_threat_intel_signatures.sql

CREATE TABLE IF NOT EXISTS threat_intel_meta (
    id TEXT PRIMARY KEY,
    catalog_version TEXT NOT NULL,
    date_released TEXT,
    total_kev INTEGER DEFAULT 0 NOT NULL,
    source_url TEXT NOT NULL,
    last_synced_at TEXT NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_threat_intel_kev_product ON threat_intel_kev(product);
CREATE INDEX IF NOT EXISTS idx_threat_intel_kev_vendor ON threat_intel_kev(vendor_project);
CREATE INDEX IF NOT EXISTS idx_threat_intel_kev_date ON threat_intel_kev(date_added);

CREATE TABLE IF NOT EXISTS threat_intel_osv_cache (
    cache_key TEXT PRIMARY KEY,
    ecosystem TEXT NOT NULL,
    package_name TEXT NOT NULL,
    version TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    cached_at TEXT NOT NULL
);
