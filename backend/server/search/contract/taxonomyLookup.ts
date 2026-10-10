import { RequirementType } from './types';

/**
 * Interface for canonical taxonomy lookups.
 * In Phase 2A, this interface is defined for type safety and validation.
 * Full taxonomy hierarchy and storage is implemented in Phase 2B.
 */
export interface TaxonomyLookup {
  hasCanonicalId(canonicalId: string, type?: RequirementType): boolean;
  getCanonicalEntry?(canonicalId: string): { id: string; type: RequirementType; name?: string } | undefined;
}
