import crypto from 'crypto';
import { normalizeText } from '../../../shared/locality';
import { localityConfig } from './config';
import { localityStore } from './store';
import { EnrichmentRequest } from './types';
import { recordUsage } from './usage';

export const ACTIVE_STATES = ['queued', 'running'] as const;

/** Generic café words do not make a different scan — they collapse into the same request. */
const GENERIC_KEYWORDS = new Set(['', 'cafe', 'coffee', 'ca phe', 'quan ca phe', 'quan cafe', 'coffee shop', 'cafe shop', 'cofee']);

export function normalizeKeyword(keyword?: string): string {
  const k = normalizeText(keyword || '');
  if (GENERIC_KEYWORDS.has(k)) return '';
  // Sources scan a whole cell for cafés; per-keyword scans are opt-in to avoid duplicate jobs.
  return process.env.LOCALITY_KEYWORD_JOBS === 'true' ? k.slice(0, 60) : '';
}

export function idempotencyKey(cellId: string, keyword: string) {
  return `${cellId}|cafe|${keyword}`;
}

export function coverageFor(cellId: string) {
  return localityStore.data.coverage.find(c => c.cell_id === cellId && c.category === 'cafe');
}

export function activeRequestFor(key: string) {
  return localityStore.data.requests.find(r => r.idempotency_key === key && (ACTIVE_STATES as readonly string[]).includes(r.state));
}

function hourlyCount(requester: string, trigger?: EnrichmentRequest['trigger']) {
  const since = Date.now() - 3600_000;
  let n = 0;
  for (const r of localityStore.data.requests) {
    if (trigger && r.trigger !== trigger) continue;
    for (const q of r.requesters) if (q.requester === requester && new Date(q.at).getTime() > since) n++;
  }
  return n;
}

export type EnqueueOutcome =
  | { kind: 'queued'; request: EnrichmentRequest }
  | { kind: 'joined'; request: EnrichmentRequest }
  | { kind: 'fresh' }
  | { kind: 'cooldown'; until: string; request?: EnrichmentRequest }
  | { kind: 'rate_limited' }
  | { kind: 'queue_full' };

/**
 * Create (or join) the enrichment request for one cell. Idempotent: the same
 * cell + category + keyword never has more than one active request, a fresh
 * cell is never rescanned, and a cell is not rescanned within the cooldown.
 */
export function enqueueCell(opts: {
  cellId: string;
  keyword?: string;
  requester: string;
  trigger: EnrichmentRequest['trigger'];
  force?: boolean; // admin
}): EnqueueOutcome {
  const keyword = normalizeKeyword(opts.keyword);
  const key = idempotencyKey(opts.cellId, keyword);
  const now = new Date();
  const nowIso = now.toISOString();
  const data = localityStore.data;

  const active = activeRequestFor(key);
  if (active) {
    if (!active.requesters.some(r => r.requester === opts.requester)) {
      active.requesters.push({ requester: opts.requester, at: nowIso });
      if (active.requesters.length > 50) active.requesters.splice(0, active.requesters.length - 50);
    }
    active.request_count++;
    active.updated_at = nowIso;
    localityStore.save();
    recordUsage('locality.request_coalesced');
    return { kind: 'joined', request: active };
  }

  if (!opts.force) {
    const cov = coverageFor(opts.cellId);
    if (cov && new Date(cov.fresh_until) > now && opts.trigger !== 'manual_refresh') return { kind: 'fresh' };

    const last = data.requests
      .filter(r => r.idempotency_key === key)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (last) {
      const until = new Date(new Date(last.finished_at || last.created_at).getTime() + localityConfig.requestCooldownHours * 3600_000);
      // A failed request may be retried after the cooldown too — never hammer a source.
      if (until > now) return { kind: 'cooldown', until: until.toISOString(), request: last };
    }

    const limit = opts.trigger === 'manual_refresh' ? localityConfig.manualRefreshHourlyLimit : localityConfig.requesterHourlyLimit;
    if (hourlyCount(opts.requester, opts.trigger === 'manual_refresh' ? 'manual_refresh' : undefined) >= limit) {
      recordUsage('locality.request_rate_limited');
      return { kind: 'rate_limited' };
    }
  }

  const queued = data.requests.filter(r => r.state === 'queued').length;
  if (queued >= localityConfig.maxQueued) return { kind: 'queue_full' };

  const request: EnrichmentRequest = {
    id: `req_${crypto.randomBytes(6).toString('hex')}`,
    idempotency_key: key,
    cell_id: opts.cellId,
    category: 'cafe',
    keyword,
    state: 'queued',
    trigger: opts.trigger,
    requesters: [{ requester: opts.requester, at: nowIso }],
    request_count: 1,
    attempts: 0,
    max_attempts: localityConfig.maxAttempts,
    next_attempt_at: nowIso,
    sources_tried: [],
    created_at: nowIso,
    updated_at: nowIso
  };
  data.requests.push(request);
  // Keep the request log bounded.
  if (data.requests.length > 5000) {
    const keep = data.requests.filter(r => (ACTIVE_STATES as readonly string[]).includes(r.state) || r.state === 'awaiting_review');
    const rest = data.requests.filter(r => !keep.includes(r)).slice(-4000);
    data.requests = [...rest, ...keep];
  }
  localityStore.save();
  recordUsage('locality.request_created');
  return { kind: 'queued', request };
}

/** Requests awaiting review become completed once no place from them is still pending. */
export function settleAwaitingRequests() {
  const pendingByReq = new Set<string>();
  for (const p of localityStore.data.places) if (p.status === 'pending_review') p.request_ids.forEach(id => pendingByReq.add(id));
  let changed = false;
  for (const r of localityStore.data.requests) {
    if (r.state === 'awaiting_review' && !pendingByReq.has(r.id)) {
      r.state = 'completed';
      r.updated_at = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) localityStore.save();
}
