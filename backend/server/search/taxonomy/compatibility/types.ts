/**
 * MOBLER SEARCH - PHASE 2C: LEGACY IDENTIFIER COMPATIBILITY TYPES
 */

import { TaxonomyEntry } from '../types';

export type CompatibilityStatus =
  | 'exact'
  | 'deprecated'
  | 'unmapped'
  | 'human_review_required'
  | 'split_requires_review';

export interface CompatibilityMapping {
  identifier: string;
  status: CompatibilityStatus;
  canonical_id?: string;
  candidates?: string[];
  proposed_canonical_id?: string;
  replacement_id?: string;
  reason?: string;
  where_found?: string[];
}

export interface CompatibilityLookupResult {
  identifier: string;
  status: CompatibilityStatus;
  canonical_id: string | null;
  entry?: TaxonomyEntry | null;
  candidates?: string[];
  proposed_canonical_id?: string;
  replacement_id?: string;
  reason?: string;
  resolved: boolean;
}

export interface CompatibilityBaselineSnapshot {
  schema_version: string;
  approval_status: 'pending human approval' | 'approved';
  generated_at: string;
  total_inventoried: number;
  counts_by_status: Record<CompatibilityStatus, number>;
  mappings: CompatibilityMapping[];
}
