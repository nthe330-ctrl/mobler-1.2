/**
 * MOBLER SEARCH - PHASE 3 EVALUATION HARNESS TYPES
 * Type definitions for Dataset, Partial Expectations, Providers, Metrics, and Comparison.
 */

import {
  RequirementPriority,
  RequirementPolarity,
  RequirementType,
  SearchIntent,
  SupportedQueryLanguage,
  SearchMode
} from '../server/search/contract/types';

// ==================== 1. DATASET TYPES ====================

export type EvalCategory =
  | 'experience_discovery'
  | 'attribute'
  | 'activity'
  | 'name_search'
  | 'location_variants'
  | 'exclusion'
  | 'ambiguous_term'
  | 'discovery_mode'
  | 'typos_unaccented_vi'
  | 'traditional_simplified'
  | 'adversarial';

export type EvalLanguage = 'vi' | 'zh-TW' | 'en' | 'th' | 'mixed';

export type LabelStatus = 'draft' | 'human_verified';

export interface EvalContext {
  simulated_gps_bucket?: string; // e.g. "geo_bucket_hcm_d1", NEVER real coordinates
  user_city?: string;
  ui_language?: string;
}

export interface ExpectedRequirementItem {
  id?: string;
  canonical_id?: string;
  type: RequirementType;
  priority: RequirementPriority;
  polarity: RequirementPolarity;
  value?: string;
}

export interface ExpectedAllowedExtraRequirement {
  canonical_id?: string;
  type?: RequirementType;
}

export interface ExpectedForbiddenRequirement {
  canonical_id?: string;
  type?: RequirementType;
  polarity?: RequirementPolarity;
}

export interface ExpectedRequirements {
  required?: ExpectedRequirementItem[];
  allowed_extra?: ExpectedAllowedExtraRequirement[];
  forbidden?: ExpectedForbiddenRequirement[];
}

export interface ExpectedLocation {
  scope?: string;
  strictness?: 'must' | 'should';
  entity_canonical?: string;
  has_location?: boolean;
}

export interface ExpectedAmbiguity {
  must_flag?: boolean;
  expected_candidates?: string[];
}

export interface ExpectedPlan {
  must_include_coverage?: string[];
  max_budget_units?: number;
  must_not_duplicate?: boolean;
}

export interface ExpectedRetrieval {
  allowed_place_ids?: string[];
  must_not_appear_place_ids?: string[];
  failure_conditions?: string[];
}

export interface ExpectedSearchQuality {
  intent?: string;
  language?: SupportedQueryLanguage;
  search_mode?: SearchMode;
  requirements?: ExpectedRequirements;
  location?: ExpectedLocation;
  ambiguities?: ExpectedAmbiguity;
  constraints?: Record<string, any>;
  plan?: ExpectedPlan;
  retrieval?: ExpectedRetrieval;
}

export interface EvalCase {
  id: string; // immutable unique identifier e.g. "eval_001"
  query: string;
  language: EvalLanguage;
  category: EvalCategory;
  search_mode: SearchMode;
  context?: EvalContext;
  expected: ExpectedSearchQuality;
  label_status: LabelStatus;
  labeled_by: string;
  labeled_at: string; // ISO 8601
  notes?: string;
}

export interface EvalDataset {
  dataset_version: string;
  schema_version: string;
  description: string;
  created_at: string;
  cases: EvalCase[];
}

// ==================== 2. ADAPTER TYPES ====================

export type AdapterExecutionMode = 'mock' | 'replay' | 'live';

export interface AdapterRunOptions {
  mode: AdapterExecutionMode;
  allowLiveMode?: boolean;
  maxQueryCount?: number;
  maxEstimatedCostUsd?: number;
  traceSession?: any;
}

export interface IntentProvider {
  name: string;
  version: string;
  provideIntent(query: string, context?: EvalContext, options?: AdapterRunOptions): Promise<SearchIntent>;
}

export interface LocationProvider {
  name: string;
  version: string;
  resolveLocation(query: string, context?: EvalContext, options?: AdapterRunOptions): Promise<any>;
}

export interface QueryPlanResult {
  queries: string[];
  estimated_cost_units: number;
  coverage_features: string[];
}

export interface PlanProvider {
  name: string;
  version: string;
  createPlan(intent: SearchIntent, context?: EvalContext, options?: AdapterRunOptions): Promise<QueryPlanResult>;
}

export interface RetrievalResultItem {
  place_id: string;
  name?: string;
  derived_features?: string[];
  score?: number;
}

export interface RetrievalResult {
  results: RetrievalResultItem[];
  zero_result: boolean;
  total_candidates: number;
  duplicate_count: number;
  provider_calls: {
    priced: number;
    unpriced: number;
  };
  internal_cost_units: number;
  ai_calls: number;
  ai_tokens: number;
  cache_hit: boolean;
  latency_ms: number;
}

export interface RetrievalProvider {
  name: string;
  version: string;
  retrieve(planOrIntent: QueryPlanResult | SearchIntent, options?: AdapterRunOptions): Promise<RetrievalResult>;
}

export interface PipelineExecutionResult {
  intent: SearchIntent;
  plan?: QueryPlanResult;
  retrieval?: RetrievalResult;
  latency_ms: number;
  crashed?: boolean;
  crash_error?: string;
}

export interface PipelineProvider {
  name: string;
  version: string;
  execute(query: string, context?: EvalContext, options?: AdapterRunOptions): Promise<PipelineExecutionResult>;
}

// ==================== 3. METRIC TYPES ====================

export interface WilsonInterval {
  lower: number;
  upper: number;
  center: number;
}

export interface RateMetric {
  k: number;
  n: number;
  rate: number;
  wilson_ci: WilsonInterval;
  status: 'sufficient' | 'insufficient_data';
}

export interface NumericSummaryMetric {
  sample_size: number;
  mean: number;
  p50: number;
  p95: number;
  max: number;
  status: 'sufficient' | 'insufficient_data';
}

export interface EvalCaseResult {
  case_id: string;
  query: string;
  language: EvalLanguage;
  category: EvalCategory;
  label_status: LabelStatus;
  passed: boolean;
  crashed: boolean;
  intent_match: boolean;
  language_match: boolean;
  must_precision: number;
  must_recall: number;
  should_recall: number;
  exclusion_correct: boolean;
  location_match: boolean;
  ambiguity_handled: boolean;
  contract_valid: boolean;
  zero_result?: boolean;
  duplicate_count?: number;
  latency_ms: number;
  cost_units?: number;
  priced_calls?: number;
  unpriced_calls?: number;
  ai_calls?: number;
  ai_tokens?: number;
  cache_hit?: boolean;
  failure_reasons: string[];
}

export interface AggregateMetrics {
  intent_accuracy: RateMetric;
  language_accuracy: RateMetric;
  must_precision: RateMetric;
  must_recall: RateMetric;
  should_recall: RateMetric;
  exclusion_correctness: RateMetric;
  location_accuracy: RateMetric;
  ambiguity_handled: RateMetric;
  contract_validity_rate: RateMetric;
  zero_result_rate: RateMetric;
  duplicate_rate: RateMetric;
  cache_hit_rate: RateMetric;
  adversarial_pass_rate: RateMetric;
  provider_calls_per_search: NumericSummaryMetric;
  cost_units_per_search: NumericSummaryMetric;
  ai_calls_per_search: NumericSummaryMetric;
  ai_tokens_per_search: NumericSummaryMetric;
  latency_ms: NumericSummaryMetric;
}

export interface SliceMetrics {
  total_cases: number;
  metrics: AggregateMetrics;
}

export interface EvalRunSummary {
  run_id: string;
  timestamp: string;
  dataset_version: string;
  dataset_hash: string;
  versions: {
    contract: string;
    taxonomy: string;
    parser: string;
    normalizer: string;
  };
  adapters: {
    intent?: string;
    location?: string;
    plan?: string;
    retrieval?: string;
    pipeline?: string;
  };
  mode: AdapterExecutionMode;
  total_cases: number;
  cases_passed: number;
  cases_failed: number;
  cases_crashed: number;
  cases_lacking_human_verification: number;
  cases_lacking_place_labels: number;
  overall: AggregateMetrics;
  by_label_status: {
    draft: SliceMetrics;
    human_verified: SliceMetrics;
  };
  by_language: Record<string, SliceMetrics>;
  by_category: Record<string, SliceMetrics>;
}

export interface EvalRunResult {
  summary: EvalRunSummary;
  case_results: EvalCaseResult[];
}

// ==================== 4. GATES AND COMPARISON TYPES ====================

export interface EvalGateConfig {
  no_must_regression_human_verified?: boolean; // default true
  min_contract_validity_rate?: number; // default 1.0 (100%)
  adversarial_no_crash?: boolean; // default true
  min_intent_accuracy?: number; // default undefined
  max_zero_result_rate?: number; // default undefined
}

export interface GateEvaluationResult {
  passed: boolean;
  gate_results: Array<{
    gate: string;
    passed: boolean;
    actual: any;
    expected: any;
    message: string;
  }>;
}

export interface MetricDelta {
  metric_name: string;
  runA_rate: number;
  runB_rate: number;
  delta: number;
  runA_ci: WilsonInterval;
  runB_ci: WilsonInterval;
  conclusion: 'improvement' | 'regression' | 'no reliable difference';
  reason: string;
}

export interface CaseDiff {
  case_id: string;
  query: string;
  category: EvalCategory;
  language: EvalLanguage;
  label_status: LabelStatus;
  type: 'regression' | 'fix' | 'both_passed' | 'both_failed';
  runA_passed: boolean;
  runB_passed: boolean;
  runA_failures: string[];
  runB_failures: string[];
}

export interface CompareResult {
  runA_id: string;
  runB_id: string;
  dataset_match: boolean;
  warning?: string;
  regressions: CaseDiff[];
  fixes: CaseDiff[];
  metric_deltas: MetricDelta[];
  summary: {
    total_regressions: number;
    total_fixes: number;
    net_improvement: number;
  };
}
