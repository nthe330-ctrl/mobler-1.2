/**
 * MOBLER SEARCH - PHASE 4: QUERY UNDERSTANDING CACHE & SINGLE-FLIGHT COALESCING
 * In-memory LRU cache storing internal_derived ParseResults (minus raw_query).
 * Deduplicates concurrent identical requests with a single-flight promise map.
 */

import crypto from 'crypto';
import { ParseResult } from './types';
import { ContractVersions } from '../contract/types';
import { QueryUnderstandingConfig } from './types';

export interface CacheEntryMetadata {
  data_owner: 'internal_derived';
  provider: 'none';
  policy_basis: 'internal_computation';
  ttl_ms: number;
  geographic_scope: 'none';
  version: string;
}

interface CacheEntry {
  result: ParseResult;
  expiresAt: number;
  metadata: CacheEntryMetadata;
}

export class QueryUnderstandingCache {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<ParseResult>>();
  private config: QueryUnderstandingConfig;

  constructor(config: QueryUnderstandingConfig) {
    this.config = config;
  }

  /**
   * Generates deterministic cache key.
   * Hard rule: NEVER include GPS coordinates, user identifiers, or raw_query in key.
   */
  public generateKey(
    normalizedQuery: string,
    language: string,
    searchMode: string,
    versions: ContractVersions,
    promptVersion: string
  ): string {
    const hash = crypto.createHash('sha256').update(normalizedQuery.trim().toLowerCase()).digest('hex').slice(0, 16);
    return [
      hash,
      language,
      searchMode,
      versions.contract,
      versions.taxonomy,
      versions.parser,
      versions.normalizer,
      promptVersion
    ].join(':');
  }

  public get(key: string): ParseResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);

    return JSON.parse(JSON.stringify(entry.result));
  }

  public set(
    key: string,
    result: ParseResult,
    isNegativeOrFallback: boolean = false
  ): void {
    // Evict oldest if capacity reached
    if (this.cache.size >= this.config.cacheMaxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const ttl = isNegativeOrFallback ? this.config.negativeCacheTtlMs : this.config.cacheTtlMs;
    
    // Sanitize: strip raw_query before caching
    const sanitizedResult: ParseResult = JSON.parse(JSON.stringify(result));
    if (sanitizedResult.intent) {
      delete (sanitizedResult.intent as any).raw_query;
    }

    const entry: CacheEntry = {
      result: sanitizedResult,
      expiresAt: Date.now() + ttl,
      metadata: {
        data_owner: 'internal_derived',
        provider: 'none',
        policy_basis: 'internal_computation',
        ttl_ms: ttl,
        geographic_scope: 'none',
        version: result.meta.versions.parser
      }
    };

    this.cache.set(key, entry);
  }

  /**
   * Single-flight execution: concurrent identical cache misses share exactly ONE promise.
   */
  public async executeSingleFlight(
    key: string,
    fn: () => Promise<ParseResult>
  ): Promise<ParseResult> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const flightPromise = (async () => {
      try {
        const res = await fn();
        return res;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, flightPromise);
    return flightPromise;
  }

  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}
