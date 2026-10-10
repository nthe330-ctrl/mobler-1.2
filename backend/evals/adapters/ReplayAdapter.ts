/**
 * MOBLER SEARCH - REPLAY ADAPTER
 * Deterministic recorded-response replay for retrieval and query planning.
 *
 * COMPLIANCE MANDATE:
 * Stored recordings must not persist Google Place Content beyond what docs/compliance allows:
 * strictly place_ids and Mobler-derived fields.
 * Prohibited fields (reviews, photos, editorial summaries, formatted addresses, ratings, etc.)
 * are completely rejected.
 */

import { RetrievalProvider, PlanProvider } from './interfaces';
import { SearchIntent } from '../../server/search/contract/types';
import {
  QueryPlanResult,
  RetrievalResult,
  RetrievalResultItem,
  AdapterRunOptions
} from '../types';

export const PROHIBITED_GOOGLE_FIELDS = [
  'editorial_summary',
  'reviews',
  'photos',
  'formatted_address',
  'rating',
  'user_ratings_total',
  'international_phone_number',
  'website',
  'opening_hours',
  'geometry',
  'utc_offset_minutes'
] as const;

export interface CompliantRecordedRetrieval {
  query_hash: string;
  results: RetrievalResultItem[];
  provider_calls: {
    priced: number;
    unpriced: number;
  };
  internal_cost_units: number;
  ai_calls: number;
  ai_tokens: number;
  latency_ms: number;
}

export class ReplayAdapter implements RetrievalProvider, PlanProvider {
  public readonly name = 'ReplayAdapter';
  public readonly version = '1.0.0-compliant';

  private recordings: Map<string, CompliantRecordedRetrieval> = new Map();

  constructor(initialRecordings?: Record<string, CompliantRecordedRetrieval>) {
    if (initialRecordings) {
      this.loadRecordings(initialRecordings);
    }
  }

  /**
   * Statically verifies that recording objects adhere strictly to compliance rules.
   */
  public static verifyRecordingsCompliance(rawRecordings: Record<string, any>): {
    compliant: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const [key, recording] of Object.entries(rawRecordings)) {
      if (!recording) continue;

      // Check top-level keys
      for (const prohibited of PROHIBITED_GOOGLE_FIELDS) {
        if (prohibited in recording) {
          violations.push(`Recording for '${key}' contains prohibited field '${prohibited}'`);
        }
      }

      // Check results array
      if (Array.isArray(recording.results)) {
        for (let i = 0; i < recording.results.length; i++) {
          const item = recording.results[i];
          if (!item) continue;
          for (const prohibited of PROHIBITED_GOOGLE_FIELDS) {
            if (prohibited in item) {
              violations.push(`Recording '${key}' item [${i}] contains prohibited field '${prohibited}'`);
            }
          }
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  public loadRecordings(rawRecordings: Record<string, CompliantRecordedRetrieval>): void {
    const compliance = ReplayAdapter.verifyRecordingsCompliance(rawRecordings);
    if (!compliance.compliant) {
      throw new Error(`Compliance violation in replay recordings: ${compliance.violations.join('; ')}`);
    }

    for (const [key, val] of Object.entries(rawRecordings)) {
      this.recordings.set(key, val);
    }
  }

  public async createPlan(intent: SearchIntent, _context?: any, _options?: AdapterRunOptions): Promise<QueryPlanResult> {
    return {
      queries: [intent.raw_query],
      estimated_cost_units: 1,
      coverage_features: intent.requirements.map(r => r.canonical_id || r.value || '')
    };
  }

  public async retrieve(
    planOrIntent: QueryPlanResult | SearchIntent,
    _options?: AdapterRunOptions
  ): Promise<RetrievalResult> {
    const key = 'raw_query' in planOrIntent ? planOrIntent.raw_query : (planOrIntent as QueryPlanResult).queries[0];
    const recorded = this.recordings.get(key) || this.recordings.get(key.toLowerCase().trim());

    if (recorded) {
      const results = recorded.results || [];
      const placeIds = new Set<string>();
      let duplicates = 0;
      for (const r of results) {
        if (placeIds.has(r.place_id)) {
          duplicates++;
        } else {
          placeIds.add(r.place_id);
        }
      }

      return {
        results,
        zero_result: results.length === 0,
        total_candidates: results.length,
        duplicate_count: duplicates,
        provider_calls: recorded.provider_calls || { priced: 1, unpriced: 0 },
        internal_cost_units: recorded.internal_cost_units || 1,
        ai_calls: recorded.ai_calls || 0,
        ai_tokens: recorded.ai_tokens || 0,
        cache_hit: true,
        latency_ms: recorded.latency_ms || 15
      };
    }

    // Default mock fallback for unrecorded queries in replay mode
    return {
      results: [],
      zero_result: true,
      total_candidates: 0,
      duplicate_count: 0,
      provider_calls: { priced: 0, unpriced: 1 },
      internal_cost_units: 0,
      ai_calls: 0,
      ai_tokens: 0,
      cache_hit: false,
      latency_ms: 10
    };
  }
}
