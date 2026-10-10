import { localityStore } from './store';

/**
 * Per-day counters for every external call and for searches served internally.
 * Counter names:
 *   google.places_text_search / google.place_photo / google.geocoding  — paid Google calls actually made
 *   source_call.<adapter>                                              — locality adapter calls (osm, file_import…)
 *   locality.search, locality.search_complete, locality.search_incomplete
 *   locality.google_calls_avoided_est                                   — estimate, see LOCALITY_GOOGLE_CALLS_PER_SEARCH
 */
const KEEP_DAYS = 90;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordUsage(counter: string, amount = 1) {
  const data = localityStore.data;
  const d = today();
  let day = data.usage.find(u => u.date === d);
  if (!day) {
    day = { date: d, counters: {} };
    data.usage.push(day);
    data.usage.sort((a, b) => a.date.localeCompare(b.date));
    if (data.usage.length > KEEP_DAYS) data.usage.splice(0, data.usage.length - KEEP_DAYS);
  }
  day.counters[counter] = (day.counters[counter] || 0) + amount;
  localityStore.save();
}

export function usageToday(counter: string): number {
  return localityStore.data.usage.find(u => u.date === today())?.counters[counter] || 0;
}

export function usageSummary(days = 14) {
  const recent = localityStore.data.usage.slice(-days);
  const totals: Record<string, number> = {};
  recent.forEach(d => Object.entries(d.counters).forEach(([k, v]) => (totals[k] = (totals[k] || 0) + v)));
  return { days: recent, totals };
}

/** Remove anything that looks like a credential before it is logged or stored. */
export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/([?&](key|token|api_key|apikey|access_token|password)=)[^&\s]+/gi, '$1***')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, '$1***')
    .replace(/(cookie[:=]\s*)[^\s;]+/gi, '$1***')
    .slice(0, 300);
}
