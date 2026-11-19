import { db, ensureTables } from '@/lib/db';

const DEFAULT_KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_VULN_URL = 'https://api.osv.dev/v1/vulns/';
const OSV_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ThreatIntelStatus {
  synced: boolean;
  catalogVersion: string | null;
  dateReleased: string | null;
  totalKev: number;
  osvCachedCount: number;
  sourceUrl: string;
  lastSyncedAt: string | null;
  isStale: boolean;
}

export interface KevEntry {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string | null;
  shortDescription: string;
  requiredAction: string;
  knownRansomware: boolean;
  cwes: string[];
}

export interface StackCheckItem {
  ecosystem: string;
  name: string;
  version: string;
}

export interface ThreatIntelVulnItem {
  id: string;
  cveId: string | null;
  severity: ThreatSeverity;
  summary: string;
  published: string | null;
  fixedVersion: string | null;
  url: string;
  inCisaKev: boolean;
  knownRansomware: boolean;
  kevDueDate: string | null;
  kevRequiredAction: string | null;
}

export interface StackCheckResultItem {
  ecosystem: string;
  name: string;
  version: string;
  cached: boolean;
  vulnerabilities: ThreatIntelVulnItem[];
  criticalCount: number;
  kevMatchesCount: number;
}

export interface StackCheckResponse {
  status: 'ok' | 'warning' | 'fail';
  checkedCount: number;
  totalVulnerabilities: number;
  criticalCount: number;
  kevMatchesCount: number;
  osvOffline: boolean;
  catalogStatus: ThreatIntelStatus;
  results: StackCheckResultItem[];
}

export interface BannerThreatMatch {
  header: string;
  bannerValue: string;
  product: string;
  version: string;
  matchType: 'exact_cve' | 'kev_product_advisory';
  confidence: number;
  cveId: string | null;
  osvId?: string;
  severity: ThreatSeverity;
  inCisaKev: boolean;
  knownRansomware: boolean;
  summary: string;
  requiredAction: string;
  url: string;
}

export interface BannerThreatIntelReport {
  checked: boolean;
  exposedVersionCount: number;
  matches: BannerThreatMatch[];
  note: string;
  catalogStatus: ThreatIntelStatus;
}

interface RawOsvCacheItem {
  id: string;
  cveId: string | null;
  severity: ThreatSeverity;
  summary: string;
  published: string | null;
  fixedVersion: string | null;
  url: string;
}

function getKevSourceUrl(): string {
  const custom = (process.env.THREAT_INTEL_KEV_FEED_URL || '').trim();
  return custom || DEFAULT_KEV_URL;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSeverity(detail: Record<string, unknown>): ThreatSeverity {
  const dbSpec = (detail.database_specific || {}) as Record<string, unknown>;
  const dbSev = String(dbSpec.severity || '').toUpperCase();
  const sevArr = Array.isArray(detail.severity)
    ? (detail.severity as Array<{ type?: string; score?: string }>)
    : [];
  const ubuntuSev = String(
    sevArr.find((s) => s.type === 'Ubuntu')?.score || ''
  ).toUpperCase();
  const explicit = dbSev || ubuntuSev;

  if (explicit === 'CRITICAL') return 'critical';
  if (explicit === 'HIGH') return 'high';
  if (explicit === 'MEDIUM' || explicit === 'MODERATE') return 'medium';
  if (explicit === 'LOW') return 'low';

  for (const s of sevArr) {
    const vec = String(s.score || '');
    if (!vec.includes('AV:')) continue;
    const highCount = (vec.match(/(?:C:H|I:H|A:H|VC:H|VI:H|VA:H)/g) || []).length;
    if (vec.includes('AV:N') && vec.includes('PR:N') && highCount >= 2) {
      return 'critical';
    }
    if (vec.includes('AV:N') && highCount >= 1) {
      return 'high';
    }
    if (highCount >= 1) return 'medium';
  }
  return 'medium';
}

function extractCveId(id: string, detail: Record<string, unknown>): string | null {
  const aliases = Array.isArray(detail.aliases) ? (detail.aliases as unknown[]) : [];
  for (const a of aliases) {
    if (typeof a === 'string' && /^CVE-\d{4}-\d+$/i.test(a)) {
      return a.toUpperCase();
    }
  }
  if (/^CVE-\d{4}-\d+$/i.test(id)) return id.toUpperCase();
  if (id.startsWith('UBUNTU-CVE-')) return id.replace(/^UBUNTU-/, '').toUpperCase();
  return null;
}

function extractFixedVersion(detail: Record<string, unknown>): string | null {
  const affected = Array.isArray(detail.affected)
    ? (detail.affected as Array<Record<string, unknown>>)
    : [];
  for (const entry of affected) {
    const ranges = Array.isArray(entry.ranges)
      ? (entry.ranges as Array<{ events?: Array<{ fixed?: string }> }>)
      : [];
    for (const r of ranges) {
      const events = Array.isArray(r.events) ? r.events : [];
      for (const ev of events) {
        if (ev.fixed && typeof ev.fixed === 'string') return ev.fixed;
      }
    }
  }
  return null;
}

export async function getThreatIntelStatus(): Promise<ThreatIntelStatus> {
  const sourceUrl = getKevSourceUrl();
  try {
    await ensureTables();
    const metaRes = await db.execute({
      sql: 'SELECT catalog_version, date_released, total_kev, source_url, last_synced_at FROM threat_intel_meta WHERE id = ?',
      args: ['cisa_kev'],
    });
    const cacheRes = await db.execute(
      'SELECT COUNT(*) AS cnt FROM threat_intel_osv_cache'
    );
    const osvCachedCount = Number(cacheRes.rows[0]?.cnt ?? 0);

    if (metaRes.rows.length === 0) {
      return {
        synced: false,
        catalogVersion: null,
        dateReleased: null,
        totalKev: 0,
        osvCachedCount,
        sourceUrl,
        lastSyncedAt: null,
        isStale: true,
      };
    }

    const row = metaRes.rows[0];
    const lastSyncedAt = row.last_synced_at ? String(row.last_synced_at) : null;
    const syncedMs = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN;
    const isStale = Number.isNaN(syncedMs) || Date.now() - syncedMs > OSV_CACHE_TTL_MS;

    return {
      synced: true,
      catalogVersion: row.catalog_version ? String(row.catalog_version) : null,
      dateReleased: row.date_released ? String(row.date_released) : null,
      totalKev: Number(row.total_kev ?? 0),
      osvCachedCount,
      sourceUrl: row.source_url ? String(row.source_url) : sourceUrl,
      lastSyncedAt,
      isStale,
    };
  } catch {
    return {
      synced: false,
      catalogVersion: null,
      dateReleased: null,
      totalKev: 0,
      osvCachedCount: 0,
      sourceUrl,
      lastSyncedAt: null,
      isStale: true,
    };
  }
}

export async function syncCisaKevCatalog(): Promise<ThreatIntelStatus> {
  await ensureTables();
  const sourceUrl = getKevSourceUrl();
  const headers: Record<string, string> = {
    'User-Agent': 'NetworkDiag-ThreatIntel/1.0 (+https://aiutiamoci.cloud)',
    Accept: 'application/json',
  };
  const feedToken = (process.env.THREAT_INTEL_FEED_TOKEN || '').trim();
  if (feedToken) {
    headers.Authorization = `Bearer ${feedToken}`;
  }

  const res = await fetchWithTimeout(sourceUrl, { method: 'GET', headers }, 15000);
  if (!res.ok) {
    throw new Error(`Errore fetch catalogo CISA KEV: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    catalogVersion?: string;
    dateReleased?: string;
    vulnerabilities?: Array<Record<string, unknown>>;
  };

  if (!data || !Array.isArray(data.vulnerabilities)) {
    throw new Error('Payload CISA KEV non valido (array vulnerabilities assente)');
  }

  const vulns = data.vulnerabilities;
  const nowIso = new Date().toISOString();
  const CHUNK_SIZE = 200;

  for (let i = 0; i < vulns.length; i += CHUNK_SIZE) {
    const chunk = vulns.slice(i, i + CHUNK_SIZE);
    const stmts = chunk
      .filter((v) => typeof v.cveID === 'string' && v.cveID.trim().length > 0)
      .map((v) => ({
        sql: `INSERT OR REPLACE INTO threat_intel_kev (
          cve_id, vendor_project, product, vulnerability_name,
          date_added, due_date, short_description, required_action,
          known_ransomware, cwes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          String(v.cveID).trim().toUpperCase(),
          String(v.vendorProject || 'Unknown').trim(),
          String(v.product || 'Unknown').trim(),
          String(v.vulnerabilityName || v.cveID).trim(),
          String(v.dateAdded || '').trim(),
          v.dueDate ? String(v.dueDate).trim() : null,
          String(v.shortDescription || '').trim(),
          String(v.requiredAction || '').trim(),
          v.knownRansomwareCampaignUse === 'Known' ? 1 : 0,
          JSON.stringify(Array.isArray(v.cwes) ? v.cwes : []),
          nowIso,
        ],
      }));

    if (stmts.length > 0) {
      await db.batch(stmts, 'write');
    }
  }

  const catalogVersion = String(data.catalogVersion || nowIso.slice(0, 10));
  const dateReleased = data.dateReleased ? String(data.dateReleased) : null;

  await db.execute({
    sql: `INSERT OR REPLACE INTO threat_intel_meta (
      id, catalog_version, date_released, total_kev, source_url, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['cisa_kev', catalogVersion, dateReleased, vulns.length, sourceUrl, nowIso],
  });

  return getThreatIntelStatus();
}

export async function lookupKevByCveIds(
  cveIds: string[]
): Promise<Map<string, KevEntry>> {
  const map = new Map<string, KevEntry>();
  const cleanIds = Array.from(
    new Set(
      cveIds
        .map((c) => c.trim().toUpperCase())
        .filter((c) => /^CVE-\d{4}-\d+$/.test(c))
    )
  );
  if (cleanIds.length === 0) return map;

  try {
    await ensureTables();
    const CHUNK = 100;
    for (let i = 0; i < cleanIds.length; i += CHUNK) {
      const slice = cleanIds.slice(i, i + CHUNK);
      const placeholders = slice.map(() => '?').join(', ');
      const res = await db.execute({
        sql: `SELECT cve_id, vendor_project, product, vulnerability_name, date_added, due_date, short_description, required_action, known_ransomware, cwes
              FROM threat_intel_kev
              WHERE cve_id IN (${placeholders})`,
        args: slice,
      });
      for (const row of res.rows) {
        let parsedCwes: string[] = [];
        try {
          parsedCwes = row.cwes ? (JSON.parse(String(row.cwes)) as string[]) : [];
        } catch {
          parsedCwes = [];
        }
        const entry: KevEntry = {
          cveId: String(row.cve_id),
          vendorProject: String(row.vendor_project),
          product: String(row.product),
          vulnerabilityName: String(row.vulnerability_name),
          dateAdded: String(row.date_added),
          dueDate: row.due_date ? String(row.due_date) : null,
          shortDescription: String(row.short_description || ''),
          requiredAction: String(row.required_action || ''),
          knownRansomware: Number(row.known_ransomware) === 1,
          cwes: parsedCwes,
        };
        map.set(entry.cveId, entry);
      }
    }
  } catch {
    return map;
  }

  return map;
}

function makeOsvCacheKey(item: StackCheckItem): string {
  return `${item.ecosystem.trim()}::${item.name.trim()}::${item.version.trim()}`;
}

export async function checkStackWithOsvAndKev(
  rawItems: StackCheckItem[]
): Promise<StackCheckResponse> {
  await ensureTables();
  const items = rawItems
    .slice(0, 50)
    .map((i) => ({
      ecosystem: i.ecosystem.trim(),
      name: i.name.trim(),
      version: i.version.trim(),
    }))
    .filter((i) => i.ecosystem && i.name && i.version);

  const nowMs = Date.now();
  const cachedMap = new Map<string, RawOsvCacheItem[]>();
  const missIndices: number[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const key = makeOsvCacheKey(item);
    try {
      const res = await db.execute({
        sql: 'SELECT payload_json, cached_at FROM threat_intel_osv_cache WHERE cache_key = ?',
        args: [key],
      });
      if (res.rows.length > 0) {
        const cachedAtMs = Date.parse(String(res.rows[0].cached_at || ''));
        if (!Number.isNaN(cachedAtMs) && nowMs - cachedAtMs < OSV_CACHE_TTL_MS) {
          const parsed = JSON.parse(String(res.rows[0].payload_json || '[]')) as RawOsvCacheItem[];
          cachedMap.set(key, Array.isArray(parsed) ? parsed : []);
          continue;
        }
      }
    } catch {
      // Ignora errori cache puntuali
    }
    missIndices.push(idx);
  }

  let osvOffline = false;
  if (missIndices.length > 0) {
    try {
      const queries = missIndices.map((idx) => ({
        package: {
          name: items[idx].name,
          ecosystem: items[idx].ecosystem,
        },
        version: items[idx].version,
      }));

      const batchRes = await fetchWithTimeout(
        OSV_BATCH_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries }),
        },
        5000
      );

      if (!batchRes.ok) {
        osvOffline = true;
      } else {
        const batchJson = (await batchRes.json()) as {
          results?: Array<{ vulns?: Array<{ id?: string; modified?: string }> }>;
        };
        const results = Array.isArray(batchJson.results) ? batchJson.results : [];

        // Raccogli ID unici (max 25 dettagli per richiesta)
        const uniqueIds = new Set<string>();
        const idsByMissPos: string[][] = [];
        for (let rIdx = 0; rIdx < missIndices.length; rIdx++) {
          const vulns = Array.isArray(results[rIdx]?.vulns) ? results[rIdx].vulns! : [];
          const list: string[] = [];
          for (const v of vulns) {
            if (v?.id) {
              list.push(v.id);
              if (uniqueIds.size < 25) uniqueIds.add(v.id);
            }
          }
          idsByMissPos.push(list);
        }

        const detailMap = new Map<string, RawOsvCacheItem>();
        const idsToFetch = Array.from(uniqueIds);
        const CONCURRENCY = 5;
        for (let i = 0; i < idsToFetch.length; i += CONCURRENCY) {
          const batchIds = idsToFetch.slice(i, i + CONCURRENCY);
          await Promise.all(
            batchIds.map(async (vulnId) => {
              try {
                const dRes = await fetchWithTimeout(
                  `${OSV_VULN_URL}${encodeURIComponent(vulnId)}`,
                  { method: 'GET' },
                  4000
                );
                if (!dRes.ok) return;
                const d = (await dRes.json()) as Record<string, unknown>;
                const cveId = extractCveId(vulnId, d);
                const summary = String(
                  d.summary || (typeof d.details === 'string' ? d.details.slice(0, 260) : vulnId)
                ).trim();
                detailMap.set(vulnId, {
                  id: vulnId,
                  cveId,
                  severity: normalizeSeverity(d),
                  summary,
                  published: typeof d.published === 'string' ? d.published : null,
                  fixedVersion: extractFixedVersion(d),
                  url: `https://osv.dev/vulnerability/${encodeURIComponent(vulnId)}`,
                });
              } catch {
                // Fallimento dettaglio singolo non bloccante
              }
            })
          );
        }

        const cachedIso = new Date().toISOString();
        for (let rIdx = 0; rIdx < missIndices.length; rIdx++) {
          const item = items[missIndices[rIdx]];
          const key = makeOsvCacheKey(item);
          const list: RawOsvCacheItem[] = [];
          for (const id of idsByMissPos[rIdx] || []) {
            const det = detailMap.get(id);
            if (det) {
              list.push(det);
            } else {
              list.push({
                id,
                cveId: /^CVE-\d{4}-\d+$/i.test(id)
                  ? id.toUpperCase()
                  : id.startsWith('UBUNTU-CVE-')
                  ? id.replace(/^UBUNTU-/, '').toUpperCase()
                  : null,
                severity: 'medium',
                summary: `Vulnerabilità rilevata (${id}) — verifica dettagli su OSV.dev.`,
                published: null,
                fixedVersion: null,
                url: `https://osv.dev/vulnerability/${encodeURIComponent(id)}`,
              });
            }
          }
          cachedMap.set(key, list);

          try {
            await db.execute({
              sql: `INSERT OR REPLACE INTO threat_intel_osv_cache (
                cache_key, ecosystem, package_name, version, payload_json, cached_at
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              args: [key, item.ecosystem, item.name, item.version, JSON.stringify(list), cachedIso],
            });
          } catch {
            // Non blocca la risposta
          }
        }
      }
    } catch {
      osvOffline = true;
    }
  }

  // Cross-check locale 0 ms contro CISA KEV su tutti i CVE ID trovati
  const allCves: string[] = [];
  for (const list of Array.from(cachedMap.values())) {
    for (const v of list) {
      if (v.cveId) allCves.push(v.cveId);
    }
  }
  const kevMap = await lookupKevByCveIds(allCves);

  let totalVulnerabilities = 0;
  let criticalCount = 0;
  let kevMatchesCount = 0;

  const finalResults: StackCheckResultItem[] = items.map((item, idx) => {
    const key = makeOsvCacheKey(item);
    const wasCached = !missIndices.includes(idx);
    const rawList = cachedMap.get(key) || [];

    let itemCritical = 0;
    let itemKev = 0;

    const vulnerabilities: ThreatIntelVulnItem[] = rawList.map((v) => {
      const kev = v.cveId ? kevMap.get(v.cveId) : undefined;
      const inCisaKev = Boolean(kev);
      const severity: ThreatSeverity = inCisaKev ? 'critical' : v.severity;
      if (severity === 'critical') itemCritical++;
      if (inCisaKev) itemKev++;
      return {
        ...v,
        severity,
        inCisaKev,
        knownRansomware: Boolean(kev?.knownRansomware),
        kevDueDate: kev?.dueDate || null,
        kevRequiredAction: kev?.requiredAction || null,
      };
    });

    vulnerabilities.sort((a, b) => {
      if (a.inCisaKev !== b.inCisaKev) return a.inCisaKev ? -1 : 1;
      const rank: Record<ThreatSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return rank[b.severity] - rank[a.severity];
    });

    totalVulnerabilities += vulnerabilities.length;
    criticalCount += itemCritical;
    kevMatchesCount += itemKev;

    return {
      ecosystem: item.ecosystem,
      name: item.name,
      version: item.version,
      cached: wasCached,
      vulnerabilities,
      criticalCount: itemCritical,
      kevMatchesCount: itemKev,
    };
  });

  const catalogStatus = await getThreatIntelStatus();
  const status: StackCheckResponse['status'] =
    kevMatchesCount > 0 || criticalCount > 0
      ? 'fail'
      : totalVulnerabilities > 0
      ? 'warning'
      : 'ok';

  return {
    status,
    checkedCount: items.length,
    totalVulnerabilities,
    criticalCount,
    kevMatchesCount,
    osvOffline,
    catalogStatus,
    results: finalResults,
  };
}

function parseBannerProductVersion(value: string): { product: string; version: string; distroHint: string | null } | null {
  const m = value.match(/([a-zA-Z0-9._-]+)[\/_\s]+(\d+\.\d+(?:\.\d+)*(?:-[a-zA-Z0-9.+~]+)?)/);
  if (!m) return null;
  const product = m[1].trim();
  const version = m[2].trim();
  const lower = value.toLowerCase();
  let distroHint: string | null = null;
  if (lower.includes('ubuntu') && version.includes('ubuntu')) {
    distroHint = 'Ubuntu:24.04:LTS';
  }
  return { product, version, distroHint };
}

export async function checkBannerDisclosures(
  disclosures: Array<{ header: string; value: string; hasVersion: boolean }>
): Promise<BannerThreatIntelReport> {
  const catalogStatus = await getThreatIntelStatus();
  const exposed = disclosures.filter((d) => d.hasVersion);

  if (exposed.length === 0) {
    return {
      checked: true,
      exposedVersionCount: 0,
      matches: [],
      note: 'Nessuna versione esposta nei banner HTTP (buona pratica). Usa il Check Stack/SBOM per verificare CVE sulle librerie interne.',
      catalogStatus,
    };
  }

  const matches: BannerThreatMatch[] = [];
  const exactStackCandidates: Array<{
    disclosure: { header: string; value: string };
    item: StackCheckItem;
  }> = [];

  for (const d of exposed) {
    const parsed = parseBannerProductVersion(d.value);
    if (!parsed) continue;
    const prodLower = parsed.product.toLowerCase();

    // 1. Se il banner espone un package mappabile con certezza su OSV (es. Next.js, Express o pacchetto Ubuntu completo)
    if (prodLower === 'next.js' || prodLower === 'nextjs') {
      exactStackCandidates.push({
        disclosure: d,
        item: { ecosystem: 'npm', name: 'next', version: parsed.version },
      });
    } else if (prodLower === 'express') {
      exactStackCandidates.push({
        disclosure: d,
        item: { ecosystem: 'npm', name: 'express', version: parsed.version },
      });
    } else if (parsed.distroHint && prodLower === 'nginx') {
      exactStackCandidates.push({
        disclosure: d,
        item: { ecosystem: parsed.distroHint, name: 'nginx', version: parsed.version },
      });
    }

    // 2. Ricerca locale nella cache CISA KEV per prodotto (marcata come advisory di prodotto, mai falso exploit certo)
    if (catalogStatus.synced && prodLower.length >= 3) {
      try {
        const res = await db.execute({
          sql: `SELECT cve_id, vendor_project, product, vulnerability_name, short_description, required_action, known_ransomware
                FROM threat_intel_kev
                WHERE LOWER(product) LIKE ? OR LOWER(vendor_project) LIKE ?
                ORDER BY date_added DESC
                LIMIT 5`,
          args: [`%${prodLower}%`, `%${prodLower}%`],
        });
        for (const row of res.rows) {
          const cveId = String(row.cve_id);
          matches.push({
            header: d.header,
            bannerValue: d.value,
            product: `${String(row.vendor_project)} ${String(row.product)}`.trim(),
            version: parsed.version,
            matchType: 'kev_product_advisory',
            confidence: 0.6,
            cveId,
            severity: 'high',
            inCisaKev: true,
            knownRansomware: Number(row.known_ransomware) === 1,
            summary: String(row.short_description || row.vulnerability_name || cveId),
            requiredAction: String(row.required_action || 'Verificare che la versione installata includa la patch ufficiale del vendor.'),
            url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
          });
        }
      } catch {
        // Query locale non bloccante
      }
    }
  }

  if (exactStackCandidates.length > 0) {
    try {
      const checkRes = await checkStackWithOsvAndKev(
        exactStackCandidates.map((c) => c.item)
      );
      checkRes.results.forEach((resItem, idx) => {
        const sourceDisclosure = exactStackCandidates[idx]?.disclosure;
        if (!sourceDisclosure) return;
        for (const v of resItem.vulnerabilities.slice(0, 5)) {
          matches.push({
            header: sourceDisclosure.header,
            bannerValue: sourceDisclosure.value,
            product: resItem.name,
            version: resItem.version,
            matchType: 'exact_cve',
            confidence: 0.95,
            cveId: v.cveId,
            osvId: v.id,
            severity: v.severity,
            inCisaKev: v.inCisaKev,
            knownRansomware: v.knownRansomware,
            summary: v.summary,
            requiredAction:
              v.kevRequiredAction ||
              (v.fixedVersion
                ? `Aggiornare ${resItem.name} almeno alla versione ${v.fixedVersion}.`
                : `Verificare patch di sicurezza ufficiale per ${resItem.name}.`),
            url: v.url,
          });
        }
      });
    } catch {
      // Non blocca gli header
    }
  }

  return {
    checked: true,
    exposedVersionCount: exposed.length,
    matches,
    note:
      matches.length > 0
        ? `Rilevate ${matches.length} corrispondenze CVE/KEV sui banner con versione esposta.`
        : catalogStatus.synced
        ? 'Nessuna corrispondenza CVE/KEV diretta sui banner analizzati.'
        : 'Database firme CISA KEV non ancora sincronizzato localmente: esegui Aggiorna Firme per il cross-check offline.',
    catalogStatus,
  };
}
