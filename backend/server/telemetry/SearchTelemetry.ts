import crypto from 'crypto';
import { CostProfileConfig } from './CostProfileConfig';
import { CostLedger } from './CostLedger';
import { 
  CostLedgerEntry, 
  SearchTraceSummary, 
  TelemetryEventType, 
  ProviderName,
  PrecisionClass,
  RadiusClass,
  TokenCountSource,
  REFERENCE_UNIT_USD 
} from './types';
import { sanitizeSearchIntentForTelemetry } from '../search/contract/helpers';
import type { SearchIntent } from '../search/contract/types';

export const CURRENT_NORMALIZER_VERSION = 'norm_v1.0';
export const CURRENT_PARSER_VERSION = 'parse_v2.0';
export const CURRENT_TAXONOMY_VERSION = 'taxo_v16_canonical';

export class SearchTraceSession {
  public readonly searchId: string;
  public readonly startedAt: number;
  public readonly startedIso: string;
  public readonly queryHash: string;
  public readonly normalizerVersion: string;
  public readonly parserVersion: string;
  public readonly taxonomyVersion: string;
  public readonly geoBucketId: string;
  public readonly bucketPrecisionClass: PrecisionClass;
  public readonly radiusClass: RadiusClass;

  private stepStarts: Map<string, number> = new Map();
  private stepLatencies: Record<string, number> = {};

  private providerCalls: number = 0;
  private internalCostUnits: number = 0;
  private aiCalls: number = 0;
  private aiTokens: number = 0;
  private lastTokenSource?: TokenCountSource;
  private estimatedUsd: number = 0;
  private actualUsd: number | null = null;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private candidateCount: number = 0;
  private deduplicatedCount: number = 0;
  private verifiedCount: number = 0;
  private finalResultCount: number = 0;
  private isCompleted: boolean = false;
  private hasUnresolvedFields: boolean = false;
  private sanitizedIntent?: Omit<SearchIntent, 'raw_query'>;

  constructor(params: {
    rawQuery?: string;
    latitude?: number | null;
    longitude?: number | null;
    city?: string;
    radiusMeters?: number;
    normalizerVersion?: string;
    parserVersion?: string;
    taxonomyVersion?: string;
  }) {
    this.searchId = `src_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.startedAt = Date.now();
    this.startedIso = new Date().toISOString();
    this.queryHash = SearchTelemetry.hashQuery(params.rawQuery || '');
    this.normalizerVersion = params.normalizerVersion || CURRENT_NORMALIZER_VERSION;
    this.parserVersion = params.parserVersion || CURRENT_PARSER_VERSION;
    this.taxonomyVersion = params.taxonomyVersion || CURRENT_TAXONOMY_VERSION;

    const geoResult = SearchTelemetry.resolveGeoBucket(params.latitude, params.longitude, params.city, params.radiusMeters);
    this.geoBucketId = geoResult.bucket_id;
    this.bucketPrecisionClass = geoResult.bucket_precision_class;
    this.radiusClass = geoResult.radius_class;

    // Record search_started event
    this.recordEvent({
      event_type: 'search_started',
      provider: 'system',
      operation: 'search_init',
      api_method: 'POST /api/search',
      sku: 'SKU_SYSTEM_INTERNAL',
      cache_hit: false,
      internal_cost_units: 0,
      estimated_usd: 0,
      actual_usd: null,
      ai_call: false,
      latency_ms: 0,
      success: true
    });

    this.startStep('total_search');
  }

  /**
   * Starts timing a specific processing step
   */
  public startStep(stepName: string): void {
    this.stepStarts.set(stepName, Date.now());
  }

  /**
   * Concludes timing a specific step and saves its duration
   */
  public endStep(stepName: string): number {
    const startTime = this.stepStarts.get(stepName);
    if (!startTime) return 0;
    const duration = Date.now() - startTime;
    this.stepLatencies[stepName] = duration;
    this.stepStarts.delete(stepName);
    return duration;
  }

  /**
   * Records a query processing event
   */
  public recordQueryProcessed(params: {
    intentType: string;
    marketLanguage: string;
    latencyMs: number;
  }): void {
    this.recordEvent({
      event_type: 'query_processed',
      provider: 'system',
      operation: `intent:${params.intentType}`,
      api_method: 'QueryUnderstandingService.analyze',
      sku: 'SKU_SYSTEM_INTERNAL',
      cache_hit: false,
      internal_cost_units: 0,
      estimated_usd: 0,
      actual_usd: null,
      ai_call: false,
      latency_ms: params.latencyMs,
      success: true
    });
  }

  /**
   * Records cache interactions
   */
  public recordCacheHit(cacheName: string, cacheKey: string, latencyMs: number = 0): void {
    this.cacheHits += 1;
    this.recordEvent({
      event_type: 'cache_hit',
      provider: 'system',
      operation: `cache_lookup:${cacheName}`,
      api_method: 'memory_cache.get',
      sku: 'SKU_CACHE_HIT',
      cache_hit: true,
      internal_cost_units: 0,
      estimated_usd: 0,
      actual_usd: null,
      ai_call: false,
      latency_ms: latencyMs,
      success: true
    });
  }

  public recordCacheMiss(cacheName: string, cacheKey: string, latencyMs: number = 0): void {
    this.cacheMisses += 1;
    this.recordEvent({
      event_type: 'cache_miss',
      provider: 'system',
      operation: `cache_lookup:${cacheName}`,
      api_method: 'memory_cache.get',
      sku: 'SKU_CACHE_MISS',
      cache_hit: false,
      internal_cost_units: 0,
      estimated_usd: 0,
      actual_usd: null,
      ai_call: false,
      latency_ms: latencyMs,
      success: true
    });
  }

  /**
   * Records a provider API request / response lifecycle with explicit SKU resolution
   */
  public recordProviderCall(params: {
    provider: ProviderName;
    operation: string;
    apiMethod: string;
    fieldMask?: string;
    latencyMs: number;
    success: boolean;
    resultCount?: number;
    errorCode?: string;
    errorMessage?: string;
  }): void {
    this.providerCalls += 1;

    let internalUnits = 0;
    let estimatedUsd = 0;
    let sku = 'SKU_PROVIDER_UNKNOWN';
    let isUnresolved = false;
    let unresolvedFields: string[] | undefined;

    if (params.provider === 'google_places') {
      const resolved = CostProfileConfig.resolveGooglePlacesSku(params.operation, params.fieldMask || '');
      sku = resolved.sku;
      internalUnits = resolved.internalCostUnits;
      estimatedUsd = resolved.estimatedCostUsd;
      isUnresolved = resolved.isUnresolvedField;
      unresolvedFields = resolved.unresolvedFields;
      if (isUnresolved) {
        this.hasUnresolvedFields = true;
      }
    } else if (params.provider === 'google_maps') {
      sku = 'SKU_GEOCODING';
      internalUnits = 5.0;
      estimatedUsd = 0.005;
    }

    this.internalCostUnits += internalUnits;
    this.estimatedUsd += estimatedUsd;

    const fieldMaskHash = params.fieldMask 
      ? crypto.createHash('sha256').update(params.fieldMask).digest('hex').substring(0, 12)
      : undefined;

    this.recordEvent({
      event_type: params.success ? 'provider_response' : 'provider_request',
      provider: params.provider,
      operation: params.operation,
      api_method: params.apiMethod,
      field_mask: params.fieldMask,
      field_mask_hash: fieldMaskHash,
      sku,
      is_unresolved_field: isUnresolved,
      unresolved_fields: unresolvedFields,
      cache_hit: false,
      internal_cost_units: internalUnits,
      estimated_usd: estimatedUsd,
      actual_usd: null,
      ai_call: false,
      latency_ms: params.latencyMs,
      success: params.success,
      error_code: params.errorCode,
      error_message: params.errorMessage
    });
  }

  /**
   * Records an AI / LLM request and token usage
   */
  public recordAiCall(params: {
    model: string;
    operation: string;
    inputTokens?: number;
    outputTokens?: number;
    tokenCountSource?: TokenCountSource;
    latencyMs: number;
    success: boolean;
    errorCode?: string;
  }): void {
    this.aiCalls += 1;
    const inTok = params.inputTokens || 0;
    const outTok = params.outputTokens || 0;
    const totalTokens = inTok + outTok;
    this.aiTokens += totalTokens;
    const tokenSource: TokenCountSource = params.tokenCountSource || 'estimated_from_text';
    this.lastTokenSource = tokenSource;

    const cost = CostProfileConfig.calculateAiCost(params.model, inTok, outTok);
    this.internalCostUnits += cost.internalCostUnits;
    this.estimatedUsd += cost.estimatedUsd;

    this.recordEvent({
      event_type: params.success ? 'ai_response' : 'ai_request',
      provider: 'gemini',
      operation: params.operation,
      api_method: `ai.models.generateContent:${params.model}`,
      sku: cost.sku,
      cache_hit: false,
      internal_cost_units: cost.internalCostUnits,
      estimated_usd: cost.estimatedUsd,
      actual_usd: null,
      ai_call: true,
      ai_model: cost.model,
      ai_input_tokens: inTok,
      ai_output_tokens: outTok,
      token_count_source: tokenSource,
      is_token_estimated: tokenSource === 'estimated_from_text',
      latency_ms: params.latencyMs,
      success: params.success,
      error_code: params.errorCode
    });
  }

  /**
   * Records candidate counts at different stages
   */
  public recordCandidateCounts(counts: {
    candidateCount?: number;
    deduplicatedCount?: number;
    verifiedCount?: number;
    finalResultCount?: number;
  }): void {
    if (typeof counts.candidateCount === 'number') this.candidateCount = counts.candidateCount;
    if (typeof counts.deduplicatedCount === 'number') this.deduplicatedCount = counts.deduplicatedCount;
    if (typeof counts.verifiedCount === 'number') this.verifiedCount = counts.verifiedCount;
    if (typeof counts.finalResultCount === 'number') this.finalResultCount = counts.finalResultCount;
  }

  /**
   * Sets and sanitizes canonical SearchIntent for telemetry.
   * Explicitly strips request-scoped raw_query before saving in telemetry payload.
   */
  public setSearchIntent(intent: SearchIntent): void {
    if (!intent) return;
    this.sanitizedIntent = sanitizeSearchIntentForTelemetry(intent);
  }

  /**
   * Concludes the search trace successfully
   */
  public complete(): SearchTraceSummary {
    if (this.isCompleted) return this.generateSummary(true);
    this.isCompleted = true;

    this.endStep('total_search');
    const totalLatency = Date.now() - this.startedAt;

    this.recordEvent({
      event_type: 'search_completed',
      provider: 'system',
      operation: 'search_complete',
      api_method: 'POST /api/search',
      sku: 'SKU_SYSTEM_INTERNAL',
      cache_hit: this.cacheHits > 0,
      internal_cost_units: 0,
      estimated_usd: 0,
      actual_usd: null,
      ai_call: false,
      latency_ms: totalLatency,
      success: true
    });

    const summary = this.generateSummary(true);
    CostLedger.recordTraceSummary(summary);
    return summary;
  }

  /**
   * Concludes the search trace with an error
   */
  public fail(errorCode: string, errorMessage?: string): SearchTraceSummary {
    if (this.isCompleted) return this.generateSummary(false, errorCode);
    this.isCompleted = true;

    this.endStep('total_search');
    const totalLatency = Date.now() - this.startedAt;

    this.recordEvent({
      event_type: 'search_failed',
      provider: 'system',
      operation: 'search_failed',
      api_method: 'POST /api/search',
      sku: 'SKU_SYSTEM_INTERNAL',
      cache_hit: false,
      internal_cost_units: 0,
      estimated_usd: 0,
      actual_usd: null,
      ai_call: false,
      latency_ms: totalLatency,
      success: false,
      error_code: errorCode,
      error_message: errorMessage
    });

    const summary = this.generateSummary(false, errorCode);
    CostLedger.recordTraceSummary(summary);
    return summary;
  }

  private generateSummary(success: boolean, errorCode?: string): SearchTraceSummary {
    return {
      search_id: this.searchId,
      query_hash: this.queryHash,
      normalizer_version: this.normalizerVersion,
      parser_version: this.parserVersion,
      taxonomy_version: this.taxonomyVersion,
      geo_bucket_id: this.geoBucketId,
      bucket_precision_class: this.bucketPrecisionClass,
      radius_class: this.radiusClass,
      started_at: this.startedIso,
      completed_at: new Date().toISOString(),
      provider_calls: this.providerCalls,
      internal_cost_units: Number(this.internalCostUnits.toFixed(4)),
      ai_calls: this.aiCalls,
      ai_tokens: this.aiTokens,
      token_count_source: this.lastTokenSource,
      estimated_usd: Number(this.estimatedUsd.toFixed(6)),
      actual_usd: this.actualUsd,
      // Backward compatibility aliases
      normalized_query_hash: this.queryHash,
      provider_cost_units: Number(this.internalCostUnits.toFixed(4)),
      verification_cost_units: 0,
      estimated_total_cost_usd: Number(this.estimatedUsd.toFixed(6)),
      cache_hits: this.cacheHits,
      cache_misses: this.cacheMisses,
      candidate_count: this.candidateCount,
      deduplicated_count: this.deduplicatedCount,
      verified_count: this.verifiedCount,
      final_result_count: this.finalResultCount,
      latency_ms: Date.now() - this.startedAt,
      step_latencies: { ...this.stepLatencies },
      success,
      error_code: errorCode,
      has_unresolved_fields: this.hasUnresolvedFields,
      sanitized_intent: this.sanitizedIntent
    };
  }

  private recordEvent(entry: Omit<CostLedgerEntry, 'id' | 'search_id' | 'timestamp' | 'reconciliation_status'>): void {
    try {
      const fullEntry: CostLedgerEntry = {
        id: `cle_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        search_id: this.searchId,
        timestamp: new Date().toISOString(),
        reconciliation_status: 'unreconciled',
        // Backward compatibility mappings
        estimated_cost_units: entry.internal_cost_units,
        estimated_currency_cost_usd: entry.estimated_usd,
        actual_cost_usd: entry.actual_usd ?? undefined,
        ...entry
      };
      CostLedger.recordEntry(fullEntry);
    } catch (err) {
      console.warn('[SearchTelemetry] Swallowed telemetry event error:', err);
    }
  }
}

export class SearchTelemetry {
  /**
   * Initializes a new search trace
   */
  public static startTrace(params: {
    rawQuery?: string;
    latitude?: number | null;
    longitude?: number | null;
    city?: string;
    radiusMeters?: number;
    normalizerVersion?: string;
    parserVersion?: string;
    taxonomyVersion?: string;
  }): SearchTraceSession {
    return new SearchTraceSession(params);
  }

  /**
   * Hashes user search query using SHA-256 (16 chars) to preserve privacy
   */
  public static hashQuery(query: string): string {
    const normalized = (query || '').trim().toLowerCase();
    if (!normalized) return 'empty_query';
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Generates an opaque geographic bucket hash from coarse grid (>=2km cell size)
   * Prevents raw or rounded coordinates from leaking in telemetry storage
   */
  public static resolveGeoBucket(
    lat?: number | null, 
    lng?: number | null, 
    city?: string, 
    radiusMeters?: number
  ): {
    bucket_id: string;
    bucket_precision_class: PrecisionClass;
    radius_class: RadiusClass;
  } {
    // 1. Resolve Radius Class
    let radiusClass: RadiusClass = 'UNKNOWN';
    if (typeof radiusMeters === 'number' && radiusMeters > 0) {
      if (radiusMeters <= 600) radiusClass = 'WALKING_500M';
      else if (radiusMeters <= 2000) radiusClass = 'NEIGHBORHOOD_1KM';
      else if (radiusMeters <= 10000) radiusClass = 'DISTRICT_5KM';
      else radiusClass = 'METRO_25KM';
    } else {
      radiusClass = 'DISTRICT_5KM'; // Default typical urban search radius
    }

    // 2. Resolve Opaque Bucket ID
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      // 0.02 deg grid corresponds to ~2.2km cell size
      const step = 0.02;
      const gridLat = Math.floor(lat / step) * step;
      const gridLng = Math.floor(lng / step) * step;
      
      const salt = 'mobler_geo_salt_v1';
      const opaqueHash = crypto
        .createHash('sha256')
        .update(`${salt}_${gridLat.toFixed(2)}_${gridLng.toFixed(2)}`)
        .digest('hex')
        .substring(0, 10);

      return {
        bucket_id: `geo_bkt_${opaqueHash}`,
        bucket_precision_class: 'COARSE_2KM',
        radius_class: radiusClass
      };
    }

    const cityNorm = (city || 'unknown').trim().toLowerCase().replace(/\s+/g, '_');
    const cityHash = crypto.createHash('sha256').update(`city_salt_${cityNorm}`).digest('hex').substring(0, 10);
    return {
      bucket_id: `city_bkt_${cityHash}`,
      bucket_precision_class: 'DISTRICT_10KM',
      radius_class: radiusClass
    };
  }
}
