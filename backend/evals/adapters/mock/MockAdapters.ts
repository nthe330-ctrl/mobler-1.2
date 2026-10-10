/**
 * TEST-ONLY MOCK ADAPTERS
 * Production code must never import from this file or directory.
 */

import { IntentProvider, PipelineProvider } from '../interfaces';
import { SearchIntent } from '../../../server/search/contract/types';
import {
  EvalContext,
  AdapterRunOptions,
  PipelineExecutionResult
} from '../../types';

export class MockIntentProvider implements IntentProvider {
  public readonly name = 'MockIntentProvider';
  public readonly version = '1.0.0-mock';

  constructor(
    private responder?: (query: string, context?: EvalContext) => SearchIntent
  ) {}

  public async provideIntent(
    query: string,
    context?: EvalContext,
    _options?: AdapterRunOptions
  ): Promise<SearchIntent> {
    if (this.responder) {
      return this.responder(query, context);
    }

    // Default mock valid contract search intent
    return {
      raw_query: query,
      normalized_query: query.trim().toLowerCase(),
      language: 'vi',
      search_mode: 'standard',
      intent: 'discover',
      confidence: 0.9,
      entities: [],
      location: null,
      requirements: [],
      ambiguities: [],
      parse_source: 'fast_path',
      versions: {
        contract: 'contract_v2.0',
        taxonomy: '2.0.0',
        parser: '1.0.0',
        normalizer: '1.0.0'
      }
    };
  }
}

export class MockPipelineProvider implements PipelineProvider {
  public readonly name = 'MockPipelineProvider';
  public readonly version = '1.0.0-mock';

  constructor(
    private responder?: (query: string, context?: EvalContext) => PipelineExecutionResult
  ) {}

  public async execute(
    query: string,
    context?: EvalContext,
    _options?: AdapterRunOptions
  ): Promise<PipelineExecutionResult> {
    if (this.responder) {
      return this.responder(query, context);
    }

    const mockIntent: SearchIntent = {
      raw_query: query,
      normalized_query: query.trim().toLowerCase(),
      language: 'vi',
      search_mode: 'standard',
      intent: 'discover',
      confidence: 0.95,
      entities: [],
      location: null,
      requirements: [],
      ambiguities: [],
      parse_source: 'fast_path',
      versions: {
        contract: 'contract_v2.0',
        taxonomy: '2.0.0',
        parser: '1.0.0',
        normalizer: '1.0.0'
      }
    };

    return {
      intent: mockIntent,
      plan: {
        queries: [query],
        estimated_cost_units: 1,
        coverage_features: []
      },
      retrieval: {
        results: [{ place_id: 'mock_p1', name: 'Mock Cafe' }],
        zero_result: false,
        total_candidates: 1,
        duplicate_count: 0,
        provider_calls: { priced: 1, unpriced: 0 },
        internal_cost_units: 1,
        ai_calls: 0,
        ai_tokens: 0,
        cache_hit: false,
        latency_ms: 25
      },
      latency_ms: 25
    };
  }
}

export class MockLiveProvider implements PipelineProvider {
  public readonly name = 'MockLiveProvider';
  public readonly version = '1.0.0-mock-live';

  private queryCount = 0;
  private accumulatedCostUsd = 0;

  public async execute(
    query: string,
    _context?: EvalContext,
    options?: AdapterRunOptions
  ): Promise<PipelineExecutionResult> {
    // 1. Enforce live flag requirement
    if (options?.mode === 'live' && !options?.allowLiveMode) {
      throw new Error('Live mode requires explicit allowLiveMode: true flag');
    }

    // 2. Enforce limits
    const maxQueries = options?.maxQueryCount ?? 10;
    const maxCost = options?.maxEstimatedCostUsd ?? 0.50;

    if (this.queryCount >= maxQueries) {
      throw new Error(`Live mode query cap reached (max=${maxQueries}, executed=${this.queryCount})`);
    }
    if (this.accumulatedCostUsd >= maxCost) {
      throw new Error(`Live mode cost cap reached (max=$${maxCost}, accumulated=$${this.accumulatedCostUsd.toFixed(2)})`);
    }

    // Simulate real provider query and cost
    this.queryCount++;
    const queryCost = 0.05; // $0.05 per query
    this.accumulatedCostUsd += queryCost;

    const mockIntent: SearchIntent = {
      raw_query: query,
      normalized_query: query.trim().toLowerCase(),
      language: 'vi',
      search_mode: 'standard',
      intent: 'discover',
      confidence: 0.9,
      entities: [],
      location: null,
      requirements: [],
      ambiguities: [],
      parse_source: 'ai',
      versions: {
        contract: 'contract_v2.0',
        taxonomy: '2.0.0',
        parser: '1.0.0',
        normalizer: '1.0.0'
      }
    };

    return {
      intent: mockIntent,
      retrieval: {
        results: [{ place_id: `live_place_${this.queryCount}` }],
        zero_result: false,
        total_candidates: 1,
        duplicate_count: 0,
        provider_calls: { priced: 1, unpriced: 0 },
        internal_cost_units: 2,
        ai_calls: 1,
        ai_tokens: 120,
        cache_hit: false,
        latency_ms: 120
      },
      latency_ms: 120
    };
  }

  public getQueryCount(): number {
    return this.queryCount;
  }

  public getAccumulatedCostUsd(): number {
    return this.accumulatedCostUsd;
  }
}
