import { cellBounds, cellCenter, parseCellId } from '../../../shared/locality';
import { ALL_ADAPTERS, configuredAdapters } from './adapters';
import { SourceAdapter } from './adapters/types';
import { localityConfig } from './config';
import { ingestCandidates } from './ingest';
import { settleAwaitingRequests } from './queue';
import { localityStore } from './store';
import { EnrichmentRequest } from './types';
import { recordUsage, sanitizeError, usageToday } from './usage';
import { onLocalityChanged } from './events';

/**
 * Queue worker. Runs inside the API process (the JSON store has a single writer),
 * on its own timer, with bounded concurrency, per-attempt timeout, retry with
 * exponential backoff, per-source daily budgets and a circuit breaker.
 * Clients never trigger a source directly — they only create queue entries.
 */
interface SourceHealth {
  consecutive_failures: number;
  open_until?: number;
  last_error?: string;
  last_success_at?: string;
}

const health = new Map<string, SourceHealth>();
let running = 0;
let paused = process.env.LOCALITY_WORKER_PAUSED === 'true';
let timer: NodeJS.Timeout | null = null;
let lastTickAt: string | null = null;
let currentJobs: string[] = [];

function h(id: string): SourceHealth {
  if (!health.has(id)) health.set(id, { consecutive_failures: 0 });
  return health.get(id)!;
}

function sourceAvailability(a: SourceAdapter): { ok: boolean; reason?: string } {
  const st = a.status();
  if (!st.enabled) return { ok: false, reason: st.reason };
  const hs = h(a.id);
  if (hs.open_until && hs.open_until > Date.now()) return { ok: false, reason: `Circuit breaker mở đến ${new Date(hs.open_until).toISOString()}` };
  if (usageToday(`source_call.${a.id}`) >= localityConfig.sourceDailyLimit) return { ok: false, reason: 'Đã hết hạn mức gọi trong ngày' };
  return { ok: true };
}

function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fn(ctrl.signal).finally(() => clearTimeout(t));
}

export async function processRequest(req: EnrichmentRequest): Promise<void> {
  const cell = parseCellId(req.cell_id);
  const now = new Date();
  req.state = 'running';
  req.attempts++;
  req.started_at = now.toISOString();
  req.updated_at = req.started_at;
  localityStore.save();

  if (!cell) {
    req.state = 'failed';
    req.last_error = 'Ô khu vực không hợp lệ';
    req.finished_at = new Date().toISOString();
    localityStore.save();
    return;
  }

  const job = { cell_id: cell.id, bounds: cellBounds(cell), center: cellCenter(cell), keyword: req.keyword };
  const adapters = configuredAdapters();
  const errors: string[] = [];
  const skipped: string[] = [];
  const succeeded: string[] = [];
  let anyAvailable = false;
  const total = { candidates: 0, cafes: 0, passed: 0, disqualified: 0, merged: 0, created: 0 };

  for (const adapter of adapters) {
    const avail = sourceAvailability(adapter);
    if (!avail.ok) {
      skipped.push(`${adapter.id}: ${avail.reason}`);
      continue;
    }
    anyAvailable = true;
    if (!req.sources_tried.includes(adapter.id)) req.sources_tried.push(adapter.id);
    const hs = h(adapter.id);
    try {
      recordUsage(`source_call.${adapter.id}`);
      const result = await withTimeout(signal => adapter.fetch(job, signal), localityConfig.jobTimeoutMs);
      const s = ingestCandidates(adapter.id, result.candidates, result.origin, req.id);
      total.candidates += s.candidates;
      total.cafes += s.cafes;
      total.passed += s.passed;
      total.disqualified += s.disqualified;
      total.merged += s.merged;
      total.created += s.created;
      if (s.skipped_rights) errors.push(`${adapter.id}: bỏ qua ${s.skipped_rights} bản ghi vì nguồn chưa có quyền lưu dữ liệu`);
      hs.consecutive_failures = 0;
      hs.open_until = undefined;
      hs.last_success_at = new Date().toISOString();
      succeeded.push(adapter.id);
    } catch (err) {
      const msg = sanitizeError(err);
      hs.consecutive_failures++;
      hs.last_error = msg;
      if (hs.consecutive_failures >= localityConfig.circuitFailureThreshold) {
        hs.open_until = Date.now() + localityConfig.circuitOpenMs;
        recordUsage(`source_circuit_open.${adapter.id}`);
        console.warn(`[locality] circuit opened for ${adapter.id}: ${msg}`);
      }
      recordUsage(`source_error.${adapter.id}`);
      errors.push(`${adapter.id}: ${msg}`);
    }
  }

  const finishedAt = new Date().toISOString();
  req.updated_at = finishedAt;
  req.result = total;
  req.skipped_sources = skipped;
  req.last_error = errors.length ? errors.join(' | ').slice(0, 600) : undefined;

  if (succeeded.length > 0) {
    // The cell has been scanned: mark coverage so nobody triggers the same scan again.
    const fresh_until = new Date(Date.now() + localityConfig.cellFreshDays * 86400000).toISOString();
    const existing = localityStore.data.coverage.find(c => c.cell_id === cell.id && c.category === 'cafe');
    const cov = { cell_id: cell.id, category: 'cafe' as const, scanned_at: finishedAt, fresh_until, sources: succeeded, candidates_found: total.candidates };
    if (existing) Object.assign(existing, cov);
    else localityStore.data.coverage.push(cov);
    req.state = total.passed > 0 ? 'awaiting_review' : 'completed';
    req.finished_at = finishedAt;
  } else if (!anyAvailable) {
    // Nothing can serve this request — fail clearly instead of retrying forever.
    req.state = 'failed';
    req.finished_at = finishedAt;
    req.last_error = `Không có nguồn dữ liệu khả dụng: ${skipped.join(' | ')}`.slice(0, 600);
  } else if (req.attempts < req.max_attempts) {
    req.state = 'queued';
    req.next_attempt_at = new Date(Date.now() + localityConfig.backoffBaseMs * 4 ** (req.attempts - 1)).toISOString();
  } else {
    req.state = 'failed';
    req.finished_at = finishedAt;
  }
  localityStore.save();
  recordUsage(`locality.job_${req.state}`);
  onLocalityChanged();
}

export async function tick(): Promise<number> {
  lastTickAt = new Date().toISOString();
  if (paused) return 0;
  settleAwaitingRequests();
  const now = new Date().toISOString();
  const slots = Math.max(0, localityConfig.workerConcurrency - running);
  if (slots === 0) return 0;
  const due = localityStore.data.requests
    .filter(r => r.state === 'queued' && r.next_attempt_at <= now)
    .sort((a, b) => a.next_attempt_at.localeCompare(b.next_attempt_at))
    .slice(0, slots);
  await Promise.all(
    due.map(async r => {
      running++;
      currentJobs.push(r.id);
      try {
        await processRequest(r);
      } catch (err) {
        r.state = 'queued';
        r.last_error = sanitizeError(err);
        r.next_attempt_at = new Date(Date.now() + localityConfig.backoffBaseMs).toISOString();
        localityStore.save();
      } finally {
        running--;
        currentJobs = currentJobs.filter(id => id !== r.id);
      }
    })
  );
  return due.length;
}

/** Requests left "running" by a crash are put back in the queue on start-up. */
function recoverInterrupted() {
  for (const r of localityStore.data.requests) {
    if (r.state === 'running') {
      r.state = 'queued';
      r.next_attempt_at = new Date().toISOString();
    }
  }
  localityStore.save();
}

export function startWorker() {
  if (!localityConfig.workerEnabled || timer) return;
  recoverInterrupted();
  timer = setInterval(() => {
    tick().catch(err => console.warn('[locality] worker tick failed:', sanitizeError(err)));
  }, localityConfig.workerIntervalMs);
  timer.unref();
}

export function setPaused(value: boolean) {
  paused = value;
}

export function workerStatus() {
  const configured = new Set(configuredAdapters().map(a => a.id));
  const adapters = ALL_ADAPTERS.map(a => {
    const st = a.status();
    const hs = h(a.id);
    const avail = sourceAvailability(a);
    return {
      id: a.id,
      label: a.label,
      configured: configured.has(a.id),
      enabled: st.enabled,
      available: avail.ok,
      reason: avail.reason,
      calls_today: usageToday(`source_call.${a.id}`),
      daily_limit: localityConfig.sourceDailyLimit,
      consecutive_failures: hs.consecutive_failures,
      circuit_open_until: hs.open_until ? new Date(hs.open_until).toISOString() : null,
      last_error: hs.last_error,
      last_success_at: hs.last_success_at
    };
  });
  return {
    enabled: localityConfig.workerEnabled,
    paused,
    running,
    current_jobs: currentJobs,
    concurrency: localityConfig.workerConcurrency,
    interval_ms: localityConfig.workerIntervalMs,
    last_tick_at: lastTickAt,
    adapters
  };
}
