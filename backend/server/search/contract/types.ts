/**
 * MOBLER SEARCH - CANONICAL SEARCH CONTRACT (PHASE 2A)
 * Core TypeScript definitions and enums for SearchIntent, Requirement, Evidence, Location, Entities, and Versions.
 */

import {
  CURRENT_NORMALIZER_VERSION,
  CURRENT_PARSER_VERSION,
  CURRENT_TAXONOMY_VERSION
} from '../../telemetry/SearchTelemetry';

export {
  CURRENT_NORMALIZER_VERSION,
  CURRENT_PARSER_VERSION,
  CURRENT_TAXONOMY_VERSION
};

// ==================== C8: VERSIONS ====================
export const CURRENT_CONTRACT_VERSION = 'contract_v2.0';

export const CURRENT_CONTRACT_VERSIONS = {
  contract: CURRENT_CONTRACT_VERSION,
  taxonomy: CURRENT_TAXONOMY_VERSION,
  parser: CURRENT_PARSER_VERSION,
  normalizer: CURRENT_NORMALIZER_VERSION
} as const;

export interface ContractVersions {
  contract: string;
  taxonomy: string;
  parser: string;
  normalizer: string;
}

// ==================== C1: LANGUAGE ====================
export type SupportedQueryLanguage = 'vi' | 'zh-TW' | 'en' | 'th' | string;

// ==================== C2: INTENT TYPES ====================
export type IntentType =
  | 'discover'
  | 'nearby'
  | 'search_by_name'
  | 'search_by_location'
  | 'search_by_experience'
  | 'search_by_attribute'
  | 'search_by_activity'
  | 'booking'
  | 'recommendation'
  | 'revisit'
  | 'navigation'
  | string;

export type SearchMode = 'standard' | 'discovery';

export type ParseSource = 'fast_path' | 'cache' | 'ai' | 'fallback';

// ==================== C5: SEARCH ENTITY ====================
export type EntityType =
  | 'business'
  | 'neighborhood'
  | 'district'
  | 'city'
  | 'landmark'
  | 'station'
  | 'university'
  | 'mall'
  | 'street'
  | 'place_type'
  | 'experience';

export type EntitySource = 'deterministic' | 'ai' | 'system';

export interface SearchEntity {
  entity_type: EntityType;
  canonical_value: string;
  original_text: string;
  confidence: number; // [0, 1] heuristic score
  source: EntitySource;
}

// ==================== C4: LOCATION INTENT ====================
export type LocationSource = 'gps' | 'explicit' | 'resolved_entity';
export type LocationScope = 'point' | 'neighborhood' | 'district' | 'city' | 'region' | 'viewport' | 'unconstrained' | string;
export type RadiusSource = 'user' | 'system_default';
export type LocationStrictness = 'must' | 'should';

export interface LocationIntent {
  source: LocationSource;
  scope: LocationScope;
  radius_meters?: number;
  radius_source: RadiusSource;
  resolved_entity?: SearchEntity;
  strictness: LocationStrictness;
  confidence: number; // [0, 1] heuristic score
}

// ==================== C3: REQUIREMENT ====================
export type RequirementType = 'place_type' | 'experience' | 'activity' | 'attribute' | 'name';
export type RequirementPriority = 'must' | 'should' | 'optional';
export type RequirementPolarity = 'include' | 'exclude';
export type RequirementSource = 'deterministic' | 'ai' | 'system';

export interface Requirement {
  id: string;
  type: RequirementType;
  canonical_id?: string;
  value?: string;
  priority: RequirementPriority;
  polarity: RequirementPolarity;
  confidence: number; // [0, 1] heuristic score
  source: RequirementSource;
  original_text?: string;
}

export interface SearchAmbiguity {
  text: string;
  candidate_ids: string[];
}

// ==================== C2: SEARCH INTENT ====================
export interface SearchIntent {
  /**
   * raw_query is request-scoped only: NEVER persisted, never sent to telemetry or cache keys;
   * only its hash may be stored.
   */
  raw_query?: string;
  normalized_query: string;
  language: SupportedQueryLanguage;
  secondary_languages?: SupportedQueryLanguage[];
  intent: IntentType;
  entities: SearchEntity[];
  location: LocationIntent | null;
  requirements: Requirement[];
  constraints?: Record<string, any>;
  search_mode: SearchMode;
  ambiguities: SearchAmbiguity[];
  parse_source: ParseSource;
  confidence: number; // [0, 1] heuristic score
  versions: ContractVersions;
}

// ==================== C7: EVIDENCE ====================
export type EvidenceStatus = 'verified' | 'likely' | 'mixed' | 'negative' | 'unknown';

export type EvidenceSourceType =
  | 'mobler_review'
  | 'mobler_checkin'
  | 'mobler_tag'
  | 'mobler_visit'
  | 'mobler_booking'
  | 'mobler_shop'
  | 'google_provider'
  | 'deterministic'
  | 'ai_inference'
  | 'system';

export type EvidenceDataOwner = 'mobler_first_party' | 'google_provider' | 'internal_derived';

export interface Evidence {
  feature_id: string;
  status: EvidenceStatus;
  positive_count: number;
  negative_count: number;
  confidence: number; // [0, 1] heuristic score
  source_type: EvidenceSourceType;
  evidence_count?: number;
  evidence_refs?: string[];
  data_owner: EvidenceDataOwner;
  derived_from?: EvidenceSourceType[];
  persistable: boolean;
  compliance_review_ref?: string;
  created_at?: string;
  version?: string;
}
