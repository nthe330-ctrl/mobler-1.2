/**
 * MOBLER SEARCH - PHASE 4: QUERY UNDERSTANDING INTENT ADAPTER
 * Adapter integrating QueryUnderstandingEngine into the Phase 3 evaluation harness.
 * Supports:
 *   (a) fast-path only (allow_ai: false)
 *   (b) fast-path + mock AI adapter
 *   (c) live AI mode (strictly gated by allowLiveMode, query cap, and cost cap)
 */

import { IntentProvider } from './interfaces';
import { SearchIntent } from '../../server/search/contract/types';
import { EvalContext, AdapterRunOptions } from '../types';
import { QueryUnderstandingEngine } from '../../server/search/understanding/QueryUnderstandingEngine';
import { ParseResult } from '../../server/search/understanding/types';

export const intentMetaMap = new WeakMap<SearchIntent, {
  meta: ParseResult['meta'];
  expansion_candidates?: ParseResult['expansion_candidates'];
}>();

export type Phase4AdapterMode = 'fast_path_only' | 'mock_ai' | 'live_ai';

export class Phase4QueryUnderstandingAdapter implements IntentProvider {
  public readonly name: string;
  public readonly version = '1.0.0-phase4';
  private engine: QueryUnderstandingEngine;
  private adapterMode: Phase4AdapterMode;
  private liveQueryCount = 0;
  private estimatedLiveCostUsd = 0;

  constructor(mode: Phase4AdapterMode = 'fast_path_only') {
    this.adapterMode = mode;
    this.name = `Phase4QueryUnderstanding[${mode}]`;

    this.engine = new QueryUnderstandingEngine({
      enabled: true,
      aiEnabled: mode === 'live_ai' || mode === 'mock_ai'
    });
  }

  public getEngine(): QueryUnderstandingEngine {
    return this.engine;
  }

  public async provideIntent(
    query: string,
    context?: EvalContext,
    options?: AdapterRunOptions
  ): Promise<SearchIntent> {
    const isLive = this.adapterMode === 'live_ai' || (options?.mode === 'live' && options?.allowLiveMode);
    const isFastPathOnly = this.adapterMode === 'fast_path_only';

    if (isLive) {
      if (!options?.allowLiveMode) {
        throw new Error('Live mode is disabled by default. Requires explicit allowLiveMode: true flag.');
      }
      const maxQueries = options?.maxQueryCount ?? 10;
      const maxCost = options?.maxEstimatedCostUsd ?? 0.50;
      if (this.liveQueryCount >= maxQueries) {
        throw new Error(`Live mode query cap reached (${this.liveQueryCount}/${maxQueries})`);
      }
      if (this.estimatedLiveCostUsd >= maxCost) {
        throw new Error(`Live mode cost cap reached ($${this.estimatedLiveCostUsd.toFixed(3)}/$${maxCost})`);
      }
      this.liveQueryCount++;
      this.estimatedLiveCostUsd += 0.005;
    }

    let mockAiResponse: any = undefined;
    if (this.adapterMode === 'mock_ai') {
      mockAiResponse = this.generateDeterministicMockAi(query);
    }

    const parseResult: ParseResult = await this.engine.parse({
      raw_query: query,
      context: {
        gps_present: Boolean(context?.user_city || context?.simulated_gps_bucket),
        ui_language: context?.ui_language,
        search_mode: (context as any)?.search_mode || 'standard'
      },
      options: {
        allow_ai: !isFastPathOnly,
        mock_ai_response: isLive ? undefined : mockAiResponse
      }
    });

    const intent = parseResult.intent;
    intentMetaMap.set(intent, {
      meta: parseResult.meta,
      expansion_candidates: parseResult.expansion_candidates
    });

    return intent;
  }

  /**
   * Generates deterministic mock AI answers for vague discovery or ambiguous queries
   * to evaluate the hybrid pipeline offline without external Gemini API dependencies.
   */
  private generateDeterministicMockAi(query: string): any {
    const lower = query.toLowerCase();

    // Vague photography / check-in / living-virtual
    if (lower.includes('sống ảo') || lower.includes('chụp ảnh') || lower.includes('độc lạ') || lower.includes('aesthetic') || lower.includes('打卡') || lower.includes('好拍')) {
      return {
        intent: 'search_by_activity',
        requirements: [
          { canonical_id: 'photography', type: 'activity', priority: 'must', polarity: 'include' },
          { canonical_id: 'cute', type: 'attribute', priority: 'should', polarity: 'include' }
        ],
        expansion_candidates: [
          { query_text: `${query} photo spots`, language: 'en', rationale_code: 'ai_semantic_expansion' }
        ]
      };
    }

    // Vague chill / secret / hidden gem
    if (lower.includes('chill') || lower.includes('hidden gem') || lower.includes('chữa lành') || lower.includes('私房') || lower.includes('秘境') || lower.includes('ลับ')) {
      return {
        intent: 'search_by_experience',
        requirements: [
          { canonical_id: 'quiet_work', type: 'experience', priority: 'should', polarity: 'include' },
          { canonical_id: 'cozy_modern', type: 'experience', priority: 'should', polarity: 'include' }
        ],
        expansion_candidates: [
          { query_text: `${query} quiet cozy spots`, language: 'en', rationale_code: 'ai_semantic_expansion' }
        ]
      };
    }

    // Vague date / romantic spot
    if (lower.includes('hẹn hò') || lower.includes('romantic') || lower.includes('tâm sự') || lower.includes('約會')) {
      return {
        intent: 'search_by_experience',
        requirements: [
          { canonical_id: 'dating_cozy', type: 'experience', priority: 'must', polarity: 'include' },
          { canonical_id: 'romantic', type: 'attribute', priority: 'should', polarity: 'include' }
        ],
        expansion_candidates: []
      };
    }

    // Default discovery
    return {
      intent: 'discover',
      requirements: [],
      expansion_candidates: []
    };
  }
}
