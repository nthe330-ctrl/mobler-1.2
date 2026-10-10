/**
 * MOBLER SEARCH - PHASE 4: QUERY UNDERSTANDING TYPES
 * Input & Output contract definitions conforming to docs/SEARCH_CONTRACT.md.
 */

import {
  SearchIntent,
  SearchMode,
  ContractVersions,
  SupportedQueryLanguage,
  RequirementPriority
} from '../contract/types';

export interface ParseRequestContext {
  gps_present: boolean;
  ui_language?: string;
  search_mode?: SearchMode;
}

export interface ParseRequestOptions {
  allow_ai?: boolean;
  mock_ai_response?: any;
}

/**
 * Request-scoped input to Phase 4 Query Understanding.
 * Hard rule: Precise GPS coordinates are NOT part of parsing (delegated to Phase 5).
 * Only the boolean flag gps_present is passed.
 */
export interface ParseRequest {
  raw_query: string; // request-scoped only, NEVER persisted or sent to telemetry
  context: ParseRequestContext;
  options?: ParseRequestOptions;
}

/**
 * Expansion candidate produced by the single-flight AI call.
 * Max 10, UNSCORED, NOT executed. Scored and selected in Phase 6.
 */
export interface ExpansionCandidate {
  query_text: string;
  language: string;
  rationale_code: string;
}

export interface ParseResultMeta {
  path: 'fast_path' | 'cache' | 'ai' | 'fallback';
  ai_called: boolean;
  escalation_reasons: string[];
  versions: ContractVersions;
  latency_ms: number;
  step_latencies?: Record<string, number>;
  tokens_used?: number;
}

/**
 * Output of Phase 4 Query Understanding.
 * The intent field is strictly validated against the 2A validator.
 */
export interface ParseResult {
  intent: SearchIntent;
  expansion_candidates?: ExpansionCandidate[];
  meta: ParseResultMeta;
}

export interface PriorityRulesConfig {
  place_type: RequirementPriority;
  experience: RequirementPriority;
  activity: RequirementPriority;
  attribute: RequirementPriority;
  name: RequirementPriority;
  exclude: RequirementPriority;
}

export interface QueryUnderstandingConfig {
  enabled: boolean;
  aiEnabled: boolean;
  maxQueryLength: number;
  promptVersion: string;
  aiModel: string;
  aiTimeoutMs: number;
  cacheTtlMs: number;
  negativeCacheTtlMs: number;
  cacheMaxEntries: number;
  priorityRules: PriorityRulesConfig;
  confidenceThreshold: number;
  residualWordThreshold: number;
}
