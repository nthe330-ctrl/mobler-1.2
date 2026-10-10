/**
 * MOBLER SEARCH - PHASE 4: QUERY UNDERSTANDING ENGINE
 * Orchestrates deterministic fast-path, cache lookup, single-flight AI escalation,
 * strict 2A contract validation, and 1B telemetry tracking.
 */

import { ParseRequest, ParseResult, QueryUnderstandingConfig } from './types';
import { DEFAULT_QUERY_UNDERSTANDING_CONFIG } from './config';
import { FastPathParser } from './fastPath';
import { EscalationEngine } from './escalation';
import { QueryUnderstandingCache } from './queryCache';
import { AiQueryCaller } from './aiCaller';
import { defaultTaxonomyRegistry, TaxonomyRegistry } from '../taxonomy/TaxonomyRegistry';
import { validateSearchIntent } from '../contract/validator';
import { SearchTraceSession, SearchTelemetry } from '../../telemetry/SearchTelemetry';
import { sanitizeSearchIntentForTelemetry } from '../contract/helpers';

export class QueryUnderstandingEngine {
  private config: QueryUnderstandingConfig;
  private registry: TaxonomyRegistry;
  private cache: QueryUnderstandingCache;

  constructor(
    config: Partial<QueryUnderstandingConfig> = {},
    registry: TaxonomyRegistry = defaultTaxonomyRegistry
  ) {
    this.config = { ...DEFAULT_QUERY_UNDERSTANDING_CONFIG, ...config };
    this.registry = registry;
    this.cache = new QueryUnderstandingCache(this.config);
  }

  public getCache(): QueryUnderstandingCache {
    return this.cache;
  }

  public getConfig(): QueryUnderstandingConfig {
    return this.config;
  }

  /**
   * Main entry point for query parsing.
   * Conforms strictly to Phase 4 input/output contract.
   */
  public async parse(
    request: ParseRequest,
    traceSession?: SearchTraceSession
  ): Promise<ParseResult> {
    const startTime = Date.now();
    const stepLatencies: Record<string, number> = {};

    const rawQuery = request.raw_query || '';
    const context = request.context || { gps_present: false };
    const options = request.options || {};

    // -------------------------------------------------------------------------
    // Step 1 & 2 & 3: Fast-Path Parsing (Normalize + LangDetect + FastPath)
    // -------------------------------------------------------------------------
    const t0 = Date.now();
    const fastPath = FastPathParser.parse(
      rawQuery,
      context,
      this.registry,
      this.config
    );
    stepLatencies['fast_path'] = Date.now() - t0;

    // -------------------------------------------------------------------------
    // Step 4: Escalation Decision
    // -------------------------------------------------------------------------
    const t1 = Date.now();
    const escalation = EscalationEngine.evaluate(fastPath, this.config);
    stepLatencies['escalation'] = Date.now() - t1;

    // If fast-path is sufficient and no escalation reason exists:
    if (!escalation.shouldEscalate) {
      // Validate with 2A validator
      const val = validateSearchIntent(fastPath.intent, { taxonomyLookup: this.registry });
      if (!val.valid) {
        throw new Error(`Validator rejected fast-path intent: ${val.errors.map(e => e.message).join('; ')}`);
      }

      const result: ParseResult = {
        intent: fastPath.intent,
        expansion_candidates: [],
        meta: {
          path: 'fast_path',
          ai_called: false,
          escalation_reasons: [],
          versions: fastPath.intent.versions,
          latency_ms: Date.now() - startTime,
          step_latencies: stepLatencies,
          tokens_used: 0
        }
      };

      if (traceSession) {
        traceSession.setSearchIntent(sanitizeSearchIntentForTelemetry(result.intent) as any);
      }

      return result;
    }

    // -------------------------------------------------------------------------
    // Step 5: Cache Lookup (Before AI call)
    // -------------------------------------------------------------------------
    const cacheKey = this.cache.generateKey(
      fastPath.intent.normalized_query,
      fastPath.intent.language,
      fastPath.intent.search_mode,
      fastPath.intent.versions,
      this.config.promptVersion
    );

    const t2 = Date.now();
    const cached = this.cache.get(cacheKey);
    stepLatencies['cache_lookup'] = Date.now() - t2;

    if (cached) {
      if (traceSession) {
        traceSession.recordCacheHit('query_cache', cacheKey, stepLatencies['cache_lookup']);
      }

      // Reattach request-scoped raw_query
      cached.intent.raw_query = rawQuery;
      cached.meta.path = 'cache';
      cached.meta.ai_called = false;
      cached.meta.tokens_used = 0;
      cached.meta.latency_ms = Date.now() - startTime;
      cached.meta.step_latencies = stepLatencies;

      if (traceSession) {
        traceSession.setSearchIntent(sanitizeSearchIntentForTelemetry(cached.intent) as any);
      }

      return cached;
    } else {
      if (traceSession) {
        traceSession.recordCacheMiss('query_cache', cacheKey, stepLatencies['cache_lookup']);
      }
    }

    // -------------------------------------------------------------------------
    // Step 6 & 7: Single-Flight AI Escalation (if allowed and enabled)
    // -------------------------------------------------------------------------
    const allowAi = (options.allow_ai !== false) && (this.config.aiEnabled || Boolean(options.mock_ai_response));

    if (!allowAi) {
      // AI escalation blocked by feature flag or options; fallback to deterministic intent
      const val = validateSearchIntent(fastPath.intent, { taxonomyLookup: this.registry });
      if (!val.valid) {
        throw new Error(`Validator rejected fast-path fallback intent: ${val.errors.map(e => e.message).join('; ')}`);
      }

      const result: ParseResult = {
        intent: fastPath.intent,
        expansion_candidates: [],
        meta: {
          path: 'fast_path',
          ai_called: false,
          escalation_reasons: escalation.escalationReasons,
          versions: fastPath.intent.versions,
          latency_ms: Date.now() - startTime,
          step_latencies: stepLatencies,
          tokens_used: 0
        }
      };

      if (traceSession) {
        traceSession.setSearchIntent(sanitizeSearchIntentForTelemetry(result.intent) as any);
      }

      return result;
    }

    // Execute single-flight AI call
    const parseResult = await this.cache.executeSingleFlight(cacheKey, async () => {
      const t3 = Date.now();
      const aiResult = await AiQueryCaller.call(
        fastPath.intent,
        fastPath.residualWords,
        this.registry,
        this.config,
        traceSession,
        options.mock_ai_response
      );
      stepLatencies['ai_call'] = Date.now() - t3;

      // -----------------------------------------------------------------------
      // Step 8: Strict Contract Validation
      // -----------------------------------------------------------------------
      const val = validateSearchIntent(aiResult.updatedIntent, { taxonomyLookup: this.registry });
      if (!val.valid) {
        throw new Error(`Contract validator rejected AI intent: ${val.errors.map(e => e.message).join('; ')}`);
      }

      const finalPath = aiResult.fallbackTriggered ? 'fallback' : 'ai';

      const res: ParseResult = {
        intent: aiResult.updatedIntent,
        expansion_candidates: aiResult.expansionCandidates,
        meta: {
          path: finalPath,
          ai_called: aiResult.aiCalled,
          escalation_reasons: escalation.escalationReasons,
          versions: aiResult.updatedIntent.versions,
          latency_ms: Date.now() - startTime,
          step_latencies: stepLatencies,
          tokens_used: aiResult.tokensUsed
        }
      };

      // Store in cache (shorter TTL if fallback)
      this.cache.set(cacheKey, res, aiResult.fallbackTriggered);

      return res;
    });

    // Attach raw_query and trace
    parseResult.intent.raw_query = rawQuery;
    parseResult.meta.latency_ms = Date.now() - startTime;
    parseResult.meta.step_latencies = stepLatencies;

    if (traceSession) {
      traceSession.setSearchIntent(sanitizeSearchIntentForTelemetry(parseResult.intent) as any);
    }

    return parseResult;
  }
}

export const defaultQueryUnderstandingEngine = new QueryUnderstandingEngine();
