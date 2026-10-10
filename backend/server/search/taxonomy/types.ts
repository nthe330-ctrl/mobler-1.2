import { RequirementType, EvidenceSourceType } from '../contract/types';

export type TaxonomyType = 'place_type' | 'experience' | 'activity' | 'attribute';

export type LanguageCode = 'vi' | 'zh-TW' | 'en' | 'th' | 'zh-CN' | 'ja' | 'ko';

export type TranslationStatus = 'verified' | 'draft' | 'needs_native_review';

export type SynonymProvenance = 'curated' | 'deterministic' | 'native_review' | 'imported' | 'system';

export type RelationType = 'is_a' | 'related';

export interface LocalizedName {
  text: string;
  translation_status: TranslationStatus;
  reviewer?: string; // required if verified via curated review
}

export interface SynonymEntry {
  language: LanguageCode | string;
  term: string;
  normalized_term: string;
  confidence: number; // [0, 1] heuristic score, never AI probability
  provenance: SynonymProvenance;
  ambiguous?: boolean;
}

export interface TaxonomyEntry {
  canonical_id: string; // immutable, lowercase ascii snake_case
  type: TaxonomyType; // 'place_type' | 'experience' | 'activity' | 'attribute'
  names: Record<string, LocalizedName>;
  synonyms: SynonymEntry[];
  related_terms: string[];
  exclusions: string[];
  parent_id?: string;
  relation_type?: RelationType; // is_a or related
  opposite_of?: string; // for attributes (e.g. quiet <-> crowded)
  verifiable_by?: EvidenceSourceType[]; // for attributes (never assume Google can supply them)
  verification_rules_ref?: string; // opaque string reference, no logic
  deprecated: boolean;
  deprecated_by?: string;
  taxonomy_version: string;
}

export interface TaxonomyLookupResult {
  canonical_id: string;
  type: TaxonomyType;
  confidence: number;
  ambiguous?: boolean;
  matched_term: string;
  language?: string;
  provenance: SynonymProvenance;
}

export interface TaxonomySnapshotEntry {
  canonical_id: string;
  type: TaxonomyType;
  deprecated: boolean;
  deprecated_by?: string;
  parent_id?: string;
  relation_type?: RelationType;
}

export interface TaxonomySnapshot {
  status: 'pending human approval' | 'approved';
  taxonomy_version: string;
  normalizer_version: string;
  total_entries: number;
  type_counts: Record<TaxonomyType, number>;
  entries: Record<string, TaxonomySnapshotEntry>;
  tombstones: string[];
  generated_at: string;
}

export interface TaxonomySummary {
  total_entries: number;
  active_entries: number;
  deprecated_entries: number;
  type_counts: Record<TaxonomyType, number>;
  translations: {
    verified: number;
    draft: number;
    needs_native_review: number;
  };
  tombstones_count: number;
}
