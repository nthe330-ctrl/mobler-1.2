/**
 * MOBLER SEARCH - PHASE 2C: LEGACY IDENTIFIER COMPATIBILITY LAYER
 * Exposes deterministic resolution from legacy code and database identifiers
 * to Phase 2B canonical taxonomy entries, preserving backward compatibility.
 */

import { defaultTaxonomyRegistry, TaxonomyRegistry } from '../TaxonomyRegistry';
import { COMPATIBILITY_MAPPINGS } from './compatibilityMap';
import {
  CompatibilityBaselineSnapshot,
  CompatibilityLookupResult,
  CompatibilityMapping,
  CompatibilityStatus
} from './types';

export class LegacyCompatibilityLayer {
  private static instance: LegacyCompatibilityLayer | null = null;

  private readonly mappings: Map<string, CompatibilityMapping>;
  private readonly registry: TaxonomyRegistry;

  constructor(
    mappings: CompatibilityMapping[] = COMPATIBILITY_MAPPINGS,
    registry: TaxonomyRegistry = defaultTaxonomyRegistry
  ) {
    this.mappings = new Map<string, CompatibilityMapping>();
    this.registry = registry;

    for (const m of mappings) {
      this.mappings.set(m.identifier, Object.freeze({ ...m }));
    }
  }

  public static getInstance(): LegacyCompatibilityLayer {
    if (!this.instance) {
      this.instance = new LegacyCompatibilityLayer();
    }
    return this.instance;
  }

  /**
   * Look up any legacy identifier. Returns full result including status,
   * canonical entry (if resolved), candidates (if split), or reason.
   */
  public resolve(identifier: string): CompatibilityLookupResult {
    const mapping = this.mappings.get(identifier);

    if (!mapping) {
      return {
        identifier,
        status: 'unmapped',
        canonical_id: null,
        entry: null,
        reason: 'Identifier not recognized in legacy inventory',
        resolved: false
      };
    }

    if (mapping.status === 'exact' && mapping.canonical_id) {
      const entry = this.registry.getEntry(mapping.canonical_id) || null;
      return {
        identifier,
        status: 'exact',
        canonical_id: mapping.canonical_id,
        entry,
        resolved: true
      };
    }

    return {
      identifier,
      status: mapping.status,
      canonical_id: null,
      entry: null,
      candidates: mapping.candidates,
      proposed_canonical_id: mapping.proposed_canonical_id,
      replacement_id: mapping.replacement_id,
      reason: mapping.reason,
      resolved: false
    };
  }

  /**
   * Convenience resolution for consumers needing a direct canonical_id string or null.
   * Only returns a canonical_id if exactly one canonical ID is resolved without ambiguity.
   */
  public resolveCanonicalId(identifier: string): string | null {
    const res = this.resolve(identifier);
    return res.resolved ? res.canonical_id : null;
  }

  /**
   * Static helper for direct consumer usage.
   */
  public static resolveCanonicalId(identifier: string): string | null {
    return this.getInstance().resolveCanonicalId(identifier);
  }

  /**
   * Return all registered mappings.
   */
  public getAllMappings(): CompatibilityMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Return mapping for a single identifier.
   */
  public getMapping(identifier: string): CompatibilityMapping | undefined {
    return this.mappings.get(identifier);
  }

  /**
   * Validate that all inventoried identifiers are present in the compatibility map.
   */
  public validateCompleteness(inventoriedIds: string[]): { missing: string[]; valid: boolean } {
    const missing: string[] = [];
    for (const id of inventoriedIds) {
      if (!this.mappings.has(id)) {
        missing.push(id);
      }
    }
    return {
      missing,
      valid: missing.length === 0
    };
  }

  /**
   * Generate baseline snapshot marked with pending human approval.
   */
  public getBaselineSnapshot(): CompatibilityBaselineSnapshot {
    const counts: Record<CompatibilityStatus, number> = {
      exact: 0,
      split_requires_review: 0,
      human_review_required: 0,
      unmapped: 0,
      deprecated: 0
    };

    const sortedMappings = Array.from(this.mappings.values()).sort((a, b) =>
      a.identifier.localeCompare(b.identifier)
    );

    for (const m of sortedMappings) {
      counts[m.status] = (counts[m.status] || 0) + 1;
    }

    return {
      schema_version: 'compat_v1.0',
      approval_status: 'pending human approval',
      generated_at: new Date().toISOString(),
      total_inventoried: this.mappings.size,
      counts_by_status: counts,
      mappings: sortedMappings
    };
  }
}

export const defaultCompatibilityLayer = LegacyCompatibilityLayer.getInstance();
