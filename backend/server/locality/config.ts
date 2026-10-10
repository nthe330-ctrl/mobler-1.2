/**
 * Locality data configuration. Every value can be overridden with an env var;
 * defaults follow the product requirements (cafés only, ≥3 photos, ≥10 reviews).
 */
const num = (name: string, def: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
};
const bool = (name: string, def: boolean) => {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
};
const list = (name: string, def: string[]) => {
  const v = process.env[name];
  return v ? v.split(',').map(s => s.trim()).filter(Boolean) : def;
};

const isProd = process.env.NODE_ENV === 'production';

export const localityConfig = {
  // ---- quality gate ----
  minPhotos: num('LOCALITY_MIN_PHOTOS', 3),
  minReviews: num('LOCALITY_MIN_REVIEWS', 10),
  /** Normalised category labels accepted as "quán cà phê". */
  allowedCategories: list('LOCALITY_ALLOWED_CATEGORIES', [
    'cafe', 'coffee shop', 'coffee', 'quan ca phe', 'ca phe', 'specialty coffee', 'coffee roastery', 'bakery cafe'
  ]),
  /** Categories that mean "not a café" when they are the only/primary category. */
  conflictingCategories: list('LOCALITY_CONFLICTING_CATEGORIES', [
    'restaurant', 'nha hang', 'quan an', 'fast food', 'bar', 'pub', 'night club', 'store', 'shop', 'supermarket',
    'convenience store', 'hotel', 'bubble tea', 'tra sua', 'food court'
  ]),
  /** Too generic to prove anything on their own. */
  genericCategories: list('LOCALITY_GENERIC_CATEGORIES', ['establishment', 'point of interest', 'food', 'place', 'store', 'business']),

  // ---- freshness ----
  /** A scanned cell counts as covered for this long. */
  cellFreshDays: num('LOCALITY_CELL_FRESH_DAYS', 30),
  /** Do not rescan the same cell/category/keyword more often than this. */
  requestCooldownHours: num('LOCALITY_REQUEST_COOLDOWN_HOURS', 24),
  /** Reviews/photos are not refreshed more often than this, even if a rescan happens. */
  mediaRefreshDays: num('LOCALITY_MEDIA_REFRESH_DAYS', 30),

  // ---- search ----
  searchCacheTtlMs: num('LOCALITY_SEARCH_CACHE_TTL_SEC', 60) * 1000,
  maxPageSize: 50,
  defaultPageSize: 20,
  /** May the customer app still fall back to the paid Google search when internal data is incomplete? */
  allowGoogleFallback: bool('LOCALITY_ALLOW_GOOGLE_FALLBACK', true),

  // ---- queue & worker ----
  workerEnabled: bool('LOCALITY_WORKER_ENABLED', true),
  workerIntervalMs: num('LOCALITY_WORKER_INTERVAL_SEC', 5) * 1000,
  workerConcurrency: num('LOCALITY_WORKER_CONCURRENCY', 1),
  jobTimeoutMs: num('LOCALITY_JOB_TIMEOUT_SEC', 25) * 1000,
  maxAttempts: num('LOCALITY_MAX_ATTEMPTS', 3),
  backoffBaseMs: num('LOCALITY_BACKOFF_BASE_SEC', 60) * 1000,
  maxQueued: num('LOCALITY_MAX_QUEUED', 500),
  /** Enrichment requests one requester (user or anonymous client) may create per hour. */
  requesterHourlyLimit: num('LOCALITY_REQUESTER_HOURLY_LIMIT', 20),
  /** Manual "refresh" presses per requester per hour. */
  manualRefreshHourlyLimit: num('LOCALITY_MANUAL_REFRESH_HOURLY_LIMIT', 3),

  // ---- sources ----
  /** Source adapters to try, in order. */
  sources: list('LOCALITY_SOURCES', isProd ? ['osm', 'file_import'] : ['mock_dev', 'osm', 'file_import']),
  devMockEnabled: !isProd && bool('LOCALITY_DEV_MOCK', true),
  osmEnabled: bool('LOCALITY_OSM_ENABLED', true),
  osmEndpoint: process.env.LOCALITY_OSM_ENDPOINT || 'https://overpass-api.de/api/interpreter',
  importDir: process.env.LOCALITY_IMPORT_DIR || '',
  /** Daily call budget per source; the worker stops calling a source once it is used up. */
  sourceDailyLimit: num('LOCALITY_SOURCE_DAILY_LIMIT', 200),
  circuitFailureThreshold: num('LOCALITY_CIRCUIT_FAILURES', 3),
  circuitOpenMs: num('LOCALITY_CIRCUIT_OPEN_MIN', 15) * 60 * 1000,

  /** Rough number of Google Text Search calls one unserved area search costs (used for "avoided" estimates). */
  googleCallsPerAreaSearch: num('LOCALITY_GOOGLE_CALLS_PER_SEARCH', 1)
};

export type LocalityConfig = typeof localityConfig;
