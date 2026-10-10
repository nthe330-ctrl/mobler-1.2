/**
 * MOBLER SEARCH - MULTILINGUAL TAXONOMY REGISTRY (PHASE 2B)
 * Centralized, immutable, multilingual taxonomy registry.
 * Implements TaxonomyLookup for contract validation and provides
 * term lookup, hierarchy traversal, synonym matching, and snapshots.
 */

import { RequirementType } from '../contract/types';
import { TaxonomyLookup } from '../contract/taxonomyLookup';
import {
  TaxonomyEntry,
  TaxonomyLookupResult,
  TaxonomySnapshot,
  TaxonomySnapshotEntry,
  TaxonomyType,
  TaxonomySummary
} from './types';
import {
  CANONICAL_TAXONOMY_ENTRIES,
  CURRENT_TAXONOMY_VERSION,
  TOMBSTONED_CANONICAL_IDS
} from './registryData';
import {
  CURRENT_NORMALIZER_VERSION,
  generateLookupKeys,
  normalizeTerm
} from './normalization';
import { TaxonomyValidator } from './taxonomyValidator';

export class TaxonomyRegistry implements TaxonomyLookup {
  private readonly version: string;
  private normalizerVersion: string;
  private readonly entries: Map<string, TaxonomyEntry>;
  private readonly tombstones: Set<string>;

  // Normalized key -> array of candidate entries
  private termIndex: Map<string, TaxonomyLookupResult[]>;

  constructor(
    entries: TaxonomyEntry[] = CANONICAL_TAXONOMY_ENTRIES,
    tombstones: string[] = TOMBSTONED_CANONICAL_IDS,
    version: string = CURRENT_TAXONOMY_VERSION,
    normalizerVersion: string = CURRENT_NORMALIZER_VERSION
  ) {
    this.version = version;
    this.normalizerVersion = normalizerVersion;
    this.entries = new Map<string, TaxonomyEntry>();
    this.tombstones = new Set<string>(tombstones);
    this.termIndex = new Map<string, TaxonomyLookupResult[]>();

    // Validate integrity on instantiation
    const validation = TaxonomyValidator.validateRegistry(entries, tombstones);
    if (!validation.valid) {
      const errorMsg = validation.errors.map(e => `[${e.code}] ${e.message}`).join(', ');
      throw new Error(`TaxonomyRegistry integrity validation failed: ${errorMsg}`);
    }

    for (const entry of entries) {
      this.entries.set(entry.canonical_id, Object.freeze({ ...entry }));
    }

    this.buildTermIndex();
  }

  /**
   * Builds the inverted term index for fast term -> canonical ID resolution.
   */
  private buildTermIndex(): void {
    this.termIndex.clear();

    for (const entry of this.entries.values()) {
      if (entry.deprecated) continue;

      // 1. Index canonical_id itself
      const canonicalKey = normalizeTerm(entry.canonical_id, this.normalizerVersion);
      this.addIndexEntry(canonicalKey, {
        canonical_id: entry.canonical_id,
        type: entry.type,
        confidence: 1.0,
        matched_term: entry.canonical_id,
        provenance: 'deterministic'
      });

      // 2. Index Localized Names
      if (entry.names) {
        for (const [lang, locName] of Object.entries(entry.names)) {
          if (!locName || !locName.text) continue;
          const { keys } = generateLookupKeys(locName.text, lang, this.normalizerVersion);
          for (const key of keys) {
            this.addIndexEntry(key, {
              canonical_id: entry.canonical_id,
              type: entry.type,
              confidence: locName.translation_status === 'verified' ? 1.0 : 0.9,
              matched_term: locName.text,
              language: lang,
              provenance: locName.translation_status === 'verified' ? 'curated' : 'imported'
            });
          }
        }
      }

      // 3. Index Synonyms
      if (Array.isArray(entry.synonyms)) {
        for (const syn of entry.synonyms) {
          if (!syn.term) continue;
          const { keys } = generateLookupKeys(syn.term, syn.language, this.normalizerVersion);
          for (const key of keys) {
            this.addIndexEntry(key, {
              canonical_id: entry.canonical_id,
              type: entry.type,
              confidence: syn.confidence,
              matched_term: syn.term,
              language: syn.language,
              provenance: syn.provenance
            });
          }
        }
      }
    }

    // Flag ambiguous entries where 1 normalized term resolves to multiple canonical IDs
    for (const [, results] of this.termIndex.entries()) {
      const distinctCanonicalIds = new Set(results.map(r => r.canonical_id));
      if (distinctCanonicalIds.size > 1) {
        for (const res of results) {
          res.ambiguous = true;
        }
      }
    }
  }

  private addIndexEntry(key: string, result: TaxonomyLookupResult): void {
    if (!key) return;
    const existing = this.termIndex.get(key) || [];
    // Avoid duplicate entries for the exact same canonical_id and matched_term
    const exists = existing.some(
      e => e.canonical_id === result.canonical_id && e.matched_term === result.matched_term
    );
    if (!exists) {
      existing.push(result);
      this.termIndex.set(key, existing);
    }
  }

  /**
   * Rebuilds the term index with an updated normalizer version.
   */
  public rebuildIndex(newNormalizerVersion: string = CURRENT_NORMALIZER_VERSION): void {
    this.normalizerVersion = newNormalizerVersion;
    this.buildTermIndex();
  }

  // =========================================================================
  // TaxonomyLookup implementation (for Phase 2A/2B Search Contract Validator)
  // =========================================================================

  public hasCanonicalId(canonicalId: string, type?: RequirementType): boolean {
    const entry = this.entries.get(canonicalId);
    if (!entry || entry.deprecated) {
      return false;
    }
    if (type && entry.type !== type) {
      return false;
    }
    return true;
  }

  public getCanonicalEntry(canonicalId: string): { id: string; type: RequirementType; name?: string } | undefined {
    const entry = this.entries.get(canonicalId);
    if (!entry || entry.deprecated) {
      return undefined;
    }
    const enName = entry.names.en?.text || entry.names['zh-TW']?.text;
    return {
      id: entry.canonical_id,
      type: entry.type,
      name: enName
    };
  }

  // =========================================================================
  // Full Registry Query APIs
  // =========================================================================

  public getEntry(canonicalId: string): TaxonomyEntry | undefined {
    return this.entries.get(canonicalId);
  }

  public getAllActiveEntries(): TaxonomyEntry[] {
    return Array.from(this.entries.values()).filter(e => !e.deprecated);
  }

  public getAllEntries(): TaxonomyEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Looks up a term in any language and returns all candidate matches.
   * Never silently chooses one when ambiguous.
   */
  public lookupTerm(term: string, language?: string): TaxonomyLookupResult[] {
    if (!term || typeof term !== 'string') return [];
    const normalizedKey = normalizeTerm(term, this.normalizerVersion);
    const directMatches = this.termIndex.get(normalizedKey) || [];

    if (directMatches.length > 0) {
      return directMatches;
    }

    // Try multi-key expansion (simplified/traditional or unaccented)
    const { keys } = generateLookupKeys(term, language, this.normalizerVersion);
    const results: TaxonomyLookupResult[] = [];
    const seen = new Set<string>();

    for (const k of keys) {
      const matches = this.termIndex.get(k) || [];
      for (const m of matches) {
        const dedupeKey = `${m.canonical_id}_${m.matched_term}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          results.push(m);
        }
      }
    }

    if (new Set(results.map(r => r.canonical_id)).size > 1) {
      results.forEach(r => (r.ambiguous = true));
    }

    return results;
  }

  /**
   * Traverses `is_a` parent links up to the root ancestor.
   * Returns list of ancestor canonical IDs from closest parent to root.
   */
  public getAncestors(canonicalId: string): string[] {
    const ancestors: string[] = [];
    const visited = new Set<string>([canonicalId]);
    let current = this.entries.get(canonicalId);

    while (current && current.parent_id) {
      const parentId = current.parent_id;
      if (visited.has(parentId)) {
        break; // Guard against cycles
      }
      visited.add(parentId);
      ancestors.push(parentId);
      current = this.entries.get(parentId);
    }

    return ancestors;
  }

  /**
   * Traverses hierarchy downwards to find all descendant canonical IDs.
   */
  public getDescendants(canonicalId: string): string[] {
    const descendants: string[] = [];
    for (const [id, entry] of this.entries.entries()) {
      if (id === canonicalId || entry.deprecated) continue;
      const ancestors = this.getAncestors(id);
      if (ancestors.includes(canonicalId)) {
        descendants.push(id);
      }
    }
    return descendants;
  }

  /**
   * Returns the opposite attribute ID if defined (e.g. quiet <-> crowded).
   */
  public getOpposite(attributeId: string): string | undefined {
    const entry = this.entries.get(attributeId);
    if (!entry || entry.type !== 'attribute') return undefined;
    return entry.opposite_of;
  }

  /**
   * Returns verifiable evidence source types for an attribute.
   */
  public getVerifiableSources(attributeId: string) {
    const entry = this.entries.get(attributeId);
    if (!entry || entry.type !== 'attribute') return [];
    return entry.verifiable_by || [];
  }

  /**
   * Returns list of tombstoned IDs.
   */
  public getTombstones(): string[] {
    return Array.from(this.tombstones);
  }

  /**
   * Generates a complete serializable snapshot of the taxonomy registry.
   */
  public getSnapshot(status: 'pending human approval' | 'approved' = 'pending human approval'): TaxonomySnapshot {
    const entriesRecord: Record<string, TaxonomySnapshotEntry> = {};
    const typeCounts: Record<TaxonomyType, number> = {
      place_type: 0,
      experience: 0,
      activity: 0,
      attribute: 0
    };

    for (const [id, entry] of this.entries.entries()) {
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
      entriesRecord[id] = {
        canonical_id: entry.canonical_id,
        type: entry.type,
        deprecated: entry.deprecated,
        deprecated_by: entry.deprecated_by,
        parent_id: entry.parent_id,
        relation_type: entry.relation_type
      };
    }

    return {
      status,
      taxonomy_version: this.version,
      normalizer_version: this.normalizerVersion,
      total_entries: this.entries.size,
      type_counts: typeCounts,
      entries: entriesRecord,
      tombstones: Array.from(this.tombstones),
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Returns summary counts of entries, types, and translation statuses.
   */
  public getSummaryCounts(): TaxonomySummary {
    let verifiedCount = 0;
    let draftCount = 0;
    let needsReviewCount = 0;

    const typeCounts: Record<TaxonomyType, number> = {
      place_type: 0,
      experience: 0,
      activity: 0,
      attribute: 0
    };

    let activeCount = 0;
    let deprecatedCount = 0;

    for (const entry of this.entries.values()) {
      if (entry.deprecated) {
        deprecatedCount++;
      } else {
        activeCount++;
      }

      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;

      if (entry.names) {
        for (const loc of Object.values(entry.names)) {
          if (loc.translation_status === 'verified') verifiedCount++;
          else if (loc.translation_status === 'draft') draftCount++;
          else if (loc.translation_status === 'needs_native_review') needsReviewCount++;
        }
      }
    }

    return {
      total_entries: this.entries.size,
      active_entries: activeCount,
      deprecated_entries: deprecatedCount,
      type_counts: typeCounts,
      translations: {
        verified: verifiedCount,
        draft: draftCount,
        needs_native_review: needsReviewCount
      },
      tombstones_count: this.tombstones.size
    };
  }
}

// Global default singleton registry instance
export const defaultTaxonomyRegistry = new TaxonomyRegistry();
