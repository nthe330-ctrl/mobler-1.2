import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  CostLedgerEntry, 
  SearchTraceSummary, 
  TelemetryRetentionConfig, 
  ReconciliationStatus,
  REFERENCE_UNIT_USD 
} from './types';
import { SearchTelemetry } from './SearchTelemetry';

const TELEMETRY_FILE_PATH = path.join(process.cwd(), 'mobler_telemetry.json');

export interface BaselineMetricStats {
  metric_name: string;
  sample_size: number;
  status: 'sufficient' | 'insufficient_data';
  p50?: number;
  p95?: number;
  max?: number;
  mean?: number;
  message?: string;
  raw_samples?: number[];
}

export interface BaselineReport {
  traffic_type: 'test_dev' | 'production';
  generated_at: string;
  min_required_sample_size: number;
  search_count: number;
  metrics: {
    provider_calls_per_search: BaselineMetricStats;
    total_search_latency_ms: BaselineMetricStats;
    provider_latency_ms: BaselineMetricStats;
    ai_latency_ms: BaselineMetricStats;
    candidate_count: BaselineMetricStats;
    cache_hit_rate_pct: BaselineMetricStats;
  };
}

export class CostLedger {
  private static inMemoryEntries: CostLedgerEntry[] = [];
  private static inMemorySummaries: Map<string, SearchTraceSummary> = new Map();
  private static writeQueue: CostLedgerEntry[] = [];
  private static isFlushing: boolean = false;
  private static config: TelemetryRetentionConfig = {
    retention_days: 30,
    max_ledger_entries: 50000,
    anonymize_queries: true,
    coarse_geo_precision_km: 2.0,
    min_benchmark_samples: 30
  };

  /**
   * Initializes Cost Ledger and loads existing persisted records
   */
  public static init(): void {
    try {
      if (fs.existsSync(TELEMETRY_FILE_PATH)) {
        const raw = fs.readFileSync(TELEMETRY_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.entries)) {
          this.inMemoryEntries = data.entries.slice(-this.config.max_ledger_entries);
        }
        if (Array.isArray(data.summaries)) {
          data.summaries.forEach((s: any) => {
            // Normalize legacy summary fields
            const normalizedSummary: SearchTraceSummary = {
              search_id: s.search_id,
              query_hash: s.query_hash || s.normalized_query_hash || 'empty_query',
              normalizer_version: s.normalizer_version || 'norm_v1.0',
              parser_version: s.parser_version || 'parse_v1.2',
              taxonomy_version: s.taxonomy_version || 'taxo_v16_canonical',
              geo_bucket_id: s.geo_bucket_id || 'city_unknown',
              bucket_precision_class: s.bucket_precision_class || 'COARSE_2KM',
              radius_class: s.radius_class || 'DISTRICT_5KM',
              started_at: s.started_at,
              completed_at: s.completed_at,
              provider_calls: s.provider_calls || 0,
              internal_cost_units: s.internal_cost_units ?? s.provider_cost_units ?? 0,
              ai_calls: s.ai_calls || 0,
              ai_tokens: s.ai_tokens || 0,
              token_count_source: s.token_count_source || 'estimated_from_text',
              estimated_usd: s.estimated_usd ?? s.estimated_total_cost_usd ?? 0,
              actual_usd: s.actual_usd ?? null,
              cache_hits: s.cache_hits || 0,
              cache_misses: s.cache_misses || 0,
              candidate_count: s.candidate_count || 0,
              deduplicated_count: s.deduplicated_count || 0,
              verified_count: s.verified_count || 0,
              final_result_count: s.final_result_count || 0,
              latency_ms: s.latency_ms || 0,
              step_latencies: s.step_latencies || {},
              success: s.success !== false,
              error_code: s.error_code,
              has_unresolved_fields: s.has_unresolved_fields || false
            };
            this.inMemorySummaries.set(normalizedSummary.search_id, normalizedSummary);
          });
        }
      }
      // Migrate any legacy plaintext geo coordinates on startup
      this.migrateGeoIdentifiers();
    } catch (err) {
      console.warn('[CostLedger] Failed to load persisted telemetry from disk (safe degradation):', err);
    }
  }

  /**
   * Migrates legacy readable geo identifiers (e.g. geo_10.78_106.70) to opaque salted SHA-256 hashes
   */
  public static migrateGeoIdentifiers(): { migrated_count: number; total_summaries: number } {
    let migratedCount = 0;
    const salt = 'mobler_geo_salt_v1';

    this.inMemorySummaries.forEach((summary) => {
      if (summary.geo_bucket_id && /^geo_\d+\.\d+_\d+\.\d+$/.test(summary.geo_bucket_id)) {
        const parts = summary.geo_bucket_id.replace('geo_', '').split('_');
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        const opaqueHash = crypto
          .createHash('sha256')
          .update(`${salt}_${lat.toFixed(2)}_${lng.toFixed(2)}`)
          .digest('hex')
          .substring(0, 10);

        summary.geo_bucket_id = `geo_bkt_${opaqueHash}`;
        summary.bucket_precision_class = 'COARSE_2KM';
        summary.radius_class = 'DISTRICT_5KM';
        summary.normalizer_version = 'norm_v1.0';
        summary.parser_version = 'parse_v1.2';
        summary.taxonomy_version = 'taxo_v16_canonical';
        migratedCount++;
      } else if (summary.geo_bucket_id && /^city_[a-z0-9_]+$/.test(summary.geo_bucket_id) && !summary.geo_bucket_id.includes('_bkt_')) {
        const cityNorm = summary.geo_bucket_id.replace('city_', '');
        const cityHash = crypto.createHash('sha256').update(`city_salt_${cityNorm}`).digest('hex').substring(0, 10);
        summary.geo_bucket_id = `city_bkt_${cityHash}`;
        summary.bucket_precision_class = 'DISTRICT_10KM';
        summary.radius_class = 'DISTRICT_5KM';
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      this.flushSync();
    }

    return {
      migrated_count: migratedCount,
      total_summaries: this.inMemorySummaries.size
    };
  }

  /**
   * Appends an entry to the cost ledger (non-blocking, buffered)
   */
  public static recordEntry(entry: CostLedgerEntry): void {
    try {
      this.inMemoryEntries.push(entry);
      this.writeQueue.push(entry);

      if (this.inMemoryEntries.length > this.config.max_ledger_entries) {
        this.inMemoryEntries = this.inMemoryEntries.slice(-this.config.max_ledger_entries);
      }

      this.scheduleFlush();
    } catch (err) {
      console.error('[CostLedger] Error recording telemetry entry:', err);
    }
  }

  /**
   * Records or updates a search trace summary
   */
  public static recordTraceSummary(summary: SearchTraceSummary): void {
    try {
      this.inMemorySummaries.set(summary.search_id, summary);
      this.scheduleFlush();
    } catch (err) {
      console.error('[CostLedger] Error recording trace summary:', err);
    }
  }

  /**
   * Synchronous flush to disk
   */
  public static flushSync(): void {
    try {
      const payload = {
        version: '2.0',
        updated_at: new Date().toISOString(),
        entries: this.inMemoryEntries.slice(-10000),
        summaries: Array.from(this.inMemorySummaries.values()).slice(-2000)
      };
      fs.writeFileSync(TELEMETRY_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      // Safe silent swallow
    }
  }

  /**
   * Asynchronous non-blocking flush to disk with throttle
   */
  private static scheduleFlush(): void {
    if (this.isFlushing) return;
    this.isFlushing = true;

    setTimeout(() => {
      try {
        this.flushSync();
      } catch (err) {
        // Safe silent swallow
      } finally {
        this.isFlushing = false;
      }
    }, 1500);
  }

  /**
   * Queries entries by search_id
   */
  public static getEntriesForSearch(searchId: string): CostLedgerEntry[] {
    return this.inMemoryEntries.filter(e => e.search_id === searchId);
  }

  /**
   * Queries search trace summary
   */
  public static getTraceSummary(searchId: string): SearchTraceSummary | undefined {
    return this.inMemorySummaries.get(searchId);
  }

  /**
   * Computes percentile helper
   */
  private static calculatePercentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Computes baseline statistics for a sample list, reporting "insufficient data (n=...)" if n < minSamples
   */
  private static computeMetricStats(name: string, samples: number[], minSamples: number = 30): BaselineMetricStats {
    const n = samples.length;
    if (n < minSamples) {
      return {
        metric_name: name,
        sample_size: n,
        status: 'insufficient_data',
        message: `insufficient data (n=${n}, minimum required=${minSamples})`,
        raw_samples: samples
      };
    }

    const sum = samples.reduce((acc, v) => acc + v, 0);
    const mean = Number((sum / n).toFixed(2));
    const p50 = this.calculatePercentile(samples, 50);
    const p95 = this.calculatePercentile(samples, 95);
    const max = Math.max(...samples);

    return {
      metric_name: name,
      sample_size: n,
      status: 'sufficient',
      p50,
      p95,
      max,
      mean,
      raw_samples: samples.slice(-50)
    };
  }

  /**
   * Produces baseline reporting separating test/dev from production traffic
   */
  public static getBaselineReport(isProduction: boolean = false, minSamples: number = 30): BaselineReport {
    const summaries = Array.from(this.inMemorySummaries.values());
    const entries = this.inMemoryEntries;

    const providerCallsSamples = summaries.map(s => s.provider_calls);
    const totalLatencySamples = summaries.map(s => s.latency_ms);
    const candidateSamples = summaries.map(s => s.candidate_count);

    // Provider latencies from ledger
    const providerLatencySamples = entries
      .filter(e => e.provider === 'google_places' || e.provider === 'google_maps')
      .map(e => e.latency_ms);

    // AI latencies from ledger
    const aiLatencySamples = entries
      .filter(e => e.ai_call)
      .map(e => e.latency_ms);

    // Cache hit rates per search
    const cacheHitRateSamples = summaries.map(s => {
      const total = s.cache_hits + s.cache_misses;
      return total > 0 ? Number(((s.cache_hits / total) * 100).toFixed(1)) : 0;
    });

    return {
      traffic_type: isProduction ? 'production' : 'test_dev',
      generated_at: new Date().toISOString(),
      min_required_sample_size: minSamples,
      search_count: summaries.length,
      metrics: {
        provider_calls_per_search: this.computeMetricStats('provider_calls_per_search', providerCallsSamples, minSamples),
        total_search_latency_ms: this.computeMetricStats('total_search_latency_ms', totalLatencySamples, minSamples),
        provider_latency_ms: this.computeMetricStats('provider_latency_ms', providerLatencySamples, minSamples),
        ai_latency_ms: this.computeMetricStats('ai_latency_ms', aiLatencySamples, minSamples),
        candidate_count: this.computeMetricStats('candidate_count', candidateSamples, minSamples),
        cache_hit_rate_pct: this.computeMetricStats('cache_hit_rate_pct', cacheHitRateSamples, minSamples)
      }
    };
  }

  /**
   * Computes aggregate cost and operational metrics for an observation window
   */
  public static getAggregateSummary(timeWindowHours: number = 24): {
    total_searches: number;
    successful_searches: number;
    failed_searches: number;
    total_provider_calls: number;
    total_internal_cost_units: number;
    total_ai_calls: number;
    total_ai_tokens: number;
    total_estimated_usd: number;
    total_actual_usd: number | null;
    average_latency_ms: number;
    cache_hit_rate_pct: number;
    unresolved_fields_count: number;
    provider_breakdown: Record<string, { calls: number; internal_units: number; estimated_usd: number }>;
    sku_breakdown: Record<string, { calls: number; internal_units: number; estimated_usd: number }>;
  } {
    const cutoff = Date.now() - timeWindowHours * 60 * 60 * 1000;
    const summaries = Array.from(this.inMemorySummaries.values()).filter(
      s => new Date(s.started_at).getTime() >= cutoff
    );

    const relevantEntries = this.inMemoryEntries.filter(
      e => new Date(e.timestamp).getTime() >= cutoff
    );

    const totalSearches = summaries.length;
    const successfulSearches = summaries.filter(s => s.success).length;
    const failedSearches = summaries.filter(s => !s.success).length;

    let totalProviderCalls = 0;
    let totalInternalCostUnits = 0;
    let totalAiCalls = 0;
    let totalAiTokens = 0;
    let totalEstimatedUsd = 0;
    let totalActualUsd: number | null = null;
    let totalLatency = 0;
    let totalCacheHits = 0;
    let totalCacheMisses = 0;
    let unresolvedFieldsCount = 0;

    const providerBreakdown: Record<string, { calls: number; internal_units: number; estimated_usd: number }> = {};
    const skuBreakdown: Record<string, { calls: number; internal_units: number; estimated_usd: number }> = {};

    for (const s of summaries) {
      totalProviderCalls += s.provider_calls;
      totalInternalCostUnits += s.internal_cost_units;
      totalAiCalls += s.ai_calls;
      totalAiTokens += s.ai_tokens;
      totalEstimatedUsd += s.estimated_usd;
      if (s.actual_usd !== null) {
        totalActualUsd = (totalActualUsd || 0) + s.actual_usd;
      }
      totalLatency += s.latency_ms;
      totalCacheHits += s.cache_hits;
      totalCacheMisses += s.cache_misses;
      if (s.has_unresolved_fields) {
        unresolvedFieldsCount++;
      }
    }

    for (const e of relevantEntries) {
      const p = e.provider;
      const sku = e.sku;
      const units = e.internal_cost_units ?? e.estimated_cost_units ?? 0;
      const usd = e.estimated_usd ?? e.estimated_currency_cost_usd ?? 0;

      if (!providerBreakdown[p]) {
        providerBreakdown[p] = { calls: 0, internal_units: 0, estimated_usd: 0 };
      }
      providerBreakdown[p].calls += 1;
      providerBreakdown[p].internal_units += units;
      providerBreakdown[p].estimated_usd += usd;

      if (!skuBreakdown[sku]) {
        skuBreakdown[sku] = { calls: 0, internal_units: 0, estimated_usd: 0 };
      }
      skuBreakdown[sku].calls += 1;
      skuBreakdown[sku].internal_units += units;
      skuBreakdown[sku].estimated_usd += usd;
    }

    const totalCacheEvents = totalCacheHits + totalCacheMisses;
    const cacheHitRatePct = totalCacheEvents > 0 ? Number(((totalCacheHits / totalCacheEvents) * 100).toFixed(1)) : 0;
    const avgLatency = totalSearches > 0 ? Math.round(totalLatency / totalSearches) : 0;

    return {
      total_searches: totalSearches,
      successful_searches: successfulSearches,
      failed_searches: failedSearches,
      total_provider_calls: totalProviderCalls,
      total_internal_cost_units: Number(totalInternalCostUnits.toFixed(2)),
      total_ai_calls: totalAiCalls,
      total_ai_tokens: totalAiTokens,
      total_estimated_usd: Number(totalEstimatedUsd.toFixed(4)),
      total_actual_usd: totalActualUsd !== null ? Number(totalActualUsd.toFixed(4)) : null,
      average_latency_ms: avgLatency,
      cache_hit_rate_pct: cacheHitRatePct,
      unresolved_fields_count: unresolvedFieldsCount,
      provider_breakdown: providerBreakdown,
      sku_breakdown: skuBreakdown
    };
  }

  /**
   * Reconciles estimated ledger costs against actual provider invoices
   */
  public static reconcileBilling(params: {
    billing_period: string;
    billing_source: string;
    actual_cost_usd: number;
    provider: string;
  }): {
    matched_entries_count: number;
    estimated_total_usd: number;
    actual_total_usd: number;
    variance_usd: number;
    reconciliation_status: ReconciliationStatus;
  } {
    const matchingEntries = this.inMemoryEntries.filter(
      e => e.provider === params.provider && (!e.billing_period || e.billing_period === params.billing_period)
    );

    const estimatedTotal = matchingEntries.reduce((sum, e) => sum + (e.estimated_usd ?? e.estimated_currency_cost_usd ?? 0), 0);
    const variance = params.actual_cost_usd - estimatedTotal;
    const status: ReconciliationStatus = Math.abs(variance) < 0.05 ? 'matched' : 'adjusted';

    matchingEntries.forEach(e => {
      e.billing_period = params.billing_period;
      e.billing_source = params.billing_source;
      e.actual_usd = (params.actual_cost_usd / (matchingEntries.length || 1));
      e.actual_cost_usd = e.actual_usd;
      e.reconciliation_status = status;
    });

    this.scheduleFlush();

    return {
      matched_entries_count: matchingEntries.length,
      estimated_total_usd: Number(estimatedTotal.toFixed(4)),
      actual_total_usd: params.actual_cost_usd,
      variance_usd: Number(variance.toFixed(4)),
      reconciliation_status: status
    };
  }
}

// Auto-initialize ledger on load
CostLedger.init();
