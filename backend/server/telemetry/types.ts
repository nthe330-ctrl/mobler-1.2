export type TelemetryEventType =
  | 'search_started'
  | 'query_processed'
  | 'cache_hit'
  | 'cache_miss'
  | 'provider_request'
  | 'provider_response'
  | 'verification_started'
  | 'verification_completed'
  | 'ai_request'
  | 'ai_response'
  | 'search_completed'
  | 'search_failed';

export type ProviderName = 'google_places' | 'google_maps' | 'gemini' | 'internal_db' | 'system';

export type ReconciliationStatus = 'unreconciled' | 'matched' | 'adjusted' | 'unknown';

export type VerificationStatus = 'verified' | 'unverified';

export type TokenCountSource = 'reported_by_provider' | 'estimated_from_text';

export type PrecisionClass = 'COARSE_2KM' | 'COARSE_5KM' | 'DISTRICT_10KM' | 'METRO_25KM' | 'UNKNOWN';

export type RadiusClass = 'WALKING_500M' | 'NEIGHBORHOOD_1KM' | 'DISTRICT_5KM' | 'METRO_25KM' | 'UNKNOWN';

export const REFERENCE_UNIT_USD = 0.001; // 1 internal unit = $0.001 USD reference baseline

export interface PublishedListPrice {
  amount: number;
  unit_description: string;
  price_per_request_usd?: number;
  price_per_1m_input_tokens_usd?: number;
  price_per_1m_output_tokens_usd?: number;
}

export interface AccountLevelFreeTier {
  monthly_free_requests?: number;
  monthly_free_tokens?: number;
  monthly_free_usd_credit?: number;
  note: string;
}

export interface CostProfile {
  provider: ProviderName;
  operation: string;
  sku: string;
  field_mask?: string;
  published_list_price: PublishedListPrice;
  account_level_free_tier: AccountLevelFreeTier;
  internal_cost_units_per_call: number; // calculated against REFERENCE_UNIT_USD
  estimated_cost_per_call_usd: number;  // list price per call
  pricing_version: string;
  effective_from: string;
  source_url: string;
  retrieved_at: string;
  verification_status: VerificationStatus;
}

export interface CostLedgerEntry {
  id: string;
  search_id: string;
  timestamp: string;
  provider: ProviderName;
  operation: string;
  api_method: string;
  field_mask?: string;
  field_mask_hash?: string;
  sku: string;
  is_unresolved_field?: boolean;
  unresolved_fields?: string[];
  event_type: TelemetryEventType;
  cache_hit: boolean;
  internal_cost_units: number;
  estimated_usd: number;
  actual_usd: number | null;
  // Legacy aliases for backwards compatibility
  estimated_cost_units?: number;
  estimated_currency_cost_usd?: number;
  actual_cost_usd?: number;
  ai_call: boolean;
  ai_model?: string;
  ai_input_tokens?: number;
  ai_output_tokens?: number;
  token_count_source?: TokenCountSource;
  is_token_estimated?: boolean;
  latency_ms: number;
  success: boolean;
  error_code?: string;
  error_message?: string;
  reconciliation_status: ReconciliationStatus;
  billing_period?: string;
  billing_source?: string;
}

export interface StepLatencyRecord {
  step: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
}

export interface SearchTraceSummary {
  search_id: string;
  query_hash: string;
  normalizer_version: string;
  parser_version: string;
  taxonomy_version: string;
  geo_bucket_id: string;
  bucket_precision_class: PrecisionClass;
  radius_class: RadiusClass;
  started_at: string;
  completed_at: string;
  provider_calls: number;
  internal_cost_units: number;
  ai_calls: number;
  ai_tokens: number;
  token_count_source?: TokenCountSource;
  estimated_usd: number;
  actual_usd: number | null;
  // Legacy aliases for backwards compatibility
  normalized_query_hash?: string;
  provider_cost_units?: number;
  verification_cost_units?: number;
  estimated_total_cost_usd?: number;
  cache_hits: number;
  cache_misses: number;
  candidate_count: number;
  deduplicated_count: number;
  verified_count: number;
  final_result_count: number;
  latency_ms: number;
  step_latencies: Record<string, number>;
  success: boolean;
  error_code?: string;
  has_unresolved_fields?: boolean;
  sanitized_intent?: Record<string, any>;
}

export interface TelemetryRetentionConfig {
  retention_days: number;
  max_ledger_entries: number;
  anonymize_queries: boolean;
  coarse_geo_precision_km: number;
  min_benchmark_samples: number;
}

