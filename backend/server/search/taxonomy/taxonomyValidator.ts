/**
 * MOBLER SEARCH - TAXONOMY INTEGRITY VALIDATOR (PHASE 2B)
 * Enforces strict hierarchy, acyclicity, type-compatibility, immutability,
 * and provenance rules at registry load time and during CI tests.
 */

import { TaxonomyEntry, SynonymProvenance, TaxonomyType } from './types';
import { RequirementType } from '../contract/types';

export interface TaxonomyValidationError {
  canonical_id?: string;
  field?: string;
  message: string;
  code: string;
}

const ALLOWED_REQUIREMENT_TYPES: RequirementType[] = ['place_type', 'experience', 'activity', 'attribute'];
const ALLOWED_PROVENANCES: SynonymProvenance[] = ['curated', 'deterministic', 'native_review', 'imported', 'system'];
const ALLOWED_EVIDENCE_SOURCES = ['mobler_shop', 'mobler_review', 'mobler_checkin', 'mobler_tag'];

const VALID_PARENT_MATRIX: Record<TaxonomyType, TaxonomyType[]> = {
  place_type: ['place_type'],
  experience: ['place_type', 'experience'],
  activity: ['activity'],
  attribute: ['attribute']
};

export class TaxonomyValidator {
  /**
   * Validates the entire taxonomy registry dataset for structural and business rule integrity.
   */
  public static validateRegistry(
    entries: TaxonomyEntry[],
    tombstones: string[] = []
  ): { valid: boolean; errors: TaxonomyValidationError[] } {
    const errors: TaxonomyValidationError[] = [];
    const entryMap = new Map<string, TaxonomyEntry>();
    const idSet = new Set<string>();

    // 1. Check uniqueness and format of canonical_id
    for (const entry of entries) {
      if (!entry.canonical_id || typeof entry.canonical_id !== 'string') {
        errors.push({
          message: 'Entry is missing canonical_id',
          code: 'MISSING_CANONICAL_ID'
        });
        continue;
      }

      if (!/^[a-z0-9_]+$/.test(entry.canonical_id)) {
        errors.push({
          canonical_id: entry.canonical_id,
          field: 'canonical_id',
          message: `canonical_id '${entry.canonical_id}' must be lowercase ascii alphanumeric with underscores`,
          code: 'INVALID_CANONICAL_ID_FORMAT'
        });
      }

      if (idSet.has(entry.canonical_id)) {
        errors.push({
          canonical_id: entry.canonical_id,
          field: 'canonical_id',
          message: `Duplicate canonical_id '${entry.canonical_id}' found in registry`,
          code: 'DUPLICATE_CANONICAL_ID'
        });
      }
      idSet.add(entry.canonical_id);
      entryMap.set(entry.canonical_id, entry);

      // Check requirement type
      if (!ALLOWED_REQUIREMENT_TYPES.includes(entry.type)) {
        errors.push({
          canonical_id: entry.canonical_id,
          field: 'type',
          message: `Invalid requirement type '${entry.type}' for canonical_id '${entry.canonical_id}'`,
          code: 'INVALID_REQUIREMENT_TYPE'
        });
      }
    }

    // 2. Validate Tombstones
    for (const tombstoneId of tombstones) {
      const existing = entryMap.get(tombstoneId);
      if (existing && !existing.deprecated) {
        errors.push({
          canonical_id: tombstoneId,
          field: 'deprecated',
          message: `Tombstoned ID '${tombstoneId}' is defined as active (deprecated must be true)`,
          code: 'TOMBSTONE_ACTIVE_VIOLATION'
        });
      }
    }

    // 3. Detailed per-entry validations
    for (const entry of entries) {
      // Deprecation rules
      if (entry.deprecated) {
        if (entry.deprecated_by) {
          const replacement = entryMap.get(entry.deprecated_by);
          if (!replacement) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: 'deprecated_by',
              message: `deprecated_by target '${entry.deprecated_by}' does not exist in registry`,
              code: 'INVALID_DEPRECATED_BY_TARGET'
            });
          } else if (replacement.deprecated) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: 'deprecated_by',
              message: `deprecated_by target '${entry.deprecated_by}' is itself deprecated (cascading deprecation forbidden)`,
              code: 'DEPRECATED_BY_CHAIN_TARGET_DEPRECATED'
            });
          }
        }
      }

      // Hierarchy validation (is_a)
      if (entry.parent_id) {
        if (entry.parent_id === entry.canonical_id) {
          errors.push({
            canonical_id: entry.canonical_id,
            field: 'parent_id',
            message: `Entry '${entry.canonical_id}' cannot be its own parent`,
            code: 'SELF_PARENT_CYCLE'
          });
        }

        const parent = entryMap.get(entry.parent_id);
        if (!parent) {
          errors.push({
            canonical_id: entry.canonical_id,
            field: 'parent_id',
            message: `Parent ID '${entry.parent_id}' for '${entry.canonical_id}' does not exist`,
            code: 'MISSING_PARENT_ENTRY'
          });
        } else {
          if (parent.deprecated) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: 'parent_id',
              message: `Parent '${entry.parent_id}' is deprecated; active entries cannot have deprecated parents`,
              code: 'DEPRECATED_PARENT'
            });
          }

          // Check child -> parent type matrix
          const allowedParentTypes = VALID_PARENT_MATRIX[entry.type] || [];
          if (!allowedParentTypes.includes(parent.type)) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: 'parent_id',
              message: `Invalid hierarchy: type '${entry.type}' cannot have parent of type '${parent.type}'`,
              code: 'INVALID_HIERARCHY_TYPE_COMBINATION'
            });
          }
        }
      }

      // Attribute Opposites
      if (entry.opposite_of) {
        if (entry.type !== 'attribute') {
          errors.push({
            canonical_id: entry.canonical_id,
            field: 'opposite_of',
            message: `opposite_of is only allowed on 'attribute' entries`,
            code: 'OPPOSITE_NON_ATTRIBUTE'
          });
        } else {
          const opposite = entryMap.get(entry.opposite_of);
          if (!opposite || opposite.type !== 'attribute') {
            errors.push({
              canonical_id: entry.canonical_id,
              field: 'opposite_of',
              message: `opposite_of target '${entry.opposite_of}' must exist and be an attribute`,
              code: 'INVALID_OPPOSITE_TARGET'
            });
          }
        }
      }

      // Attribute Verifiable_By
      if (entry.verifiable_by) {
        if (entry.type !== 'attribute') {
          errors.push({
            canonical_id: entry.canonical_id,
            field: 'verifiable_by',
            message: `verifiable_by is only allowed on 'attribute' entries`,
            code: 'VERIFIABLE_NON_ATTRIBUTE'
          });
        } else {
          for (const source of entry.verifiable_by) {
            if (!ALLOWED_EVIDENCE_SOURCES.includes(source)) {
              errors.push({
                canonical_id: entry.canonical_id,
                field: 'verifiable_by',
                message: `Invalid evidence source '${source}' in verifiable_by`,
                code: 'INVALID_EVIDENCE_SOURCE'
              });
            }
          }
        }
      }

      // Synonyms validation
      if (Array.isArray(entry.synonyms)) {
        for (let i = 0; i < entry.synonyms.length; i++) {
          const syn = entry.synonyms[i];
          if (!ALLOWED_PROVENANCES.includes(syn.provenance)) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: `synonyms[${i}].provenance`,
              message: `Invalid synonym provenance '${syn.provenance}'. AI generated terms are strictly forbidden without native/curated review.`,
              code: 'INVALID_SYNONYM_PROVENANCE'
            });
          }

          if (typeof syn.confidence !== 'number' || syn.confidence < 0 || syn.confidence > 1) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: `synonyms[${i}].confidence`,
              message: `Synonym confidence must be a number in [0, 1]`,
              code: 'INVALID_SYNONYM_CONFIDENCE'
            });
          }

          if (!syn.term || typeof syn.term !== 'string') {
            errors.push({
              canonical_id: entry.canonical_id,
              field: `synonyms[${i}].term`,
              message: `Synonym term must be a non-empty string`,
              code: 'EMPTY_SYNONYM_TERM'
            });
          }
        }
      }

      // Names / Translations validation
      if (entry.names && typeof entry.names === 'object') {
        for (const [lang, locName] of Object.entries(entry.names)) {
          if (!locName || typeof locName.text !== 'string' || locName.text.trim() === '') {
            errors.push({
              canonical_id: entry.canonical_id,
              field: `names.${lang}.text`,
              message: `Localized name for language '${lang}' must not be empty`,
              code: 'EMPTY_LOCALIZED_NAME'
            });
          }

          if (locName.translation_status === 'verified') {
            if (!locName.reviewer || locName.reviewer.trim() === '') {
              errors.push({
                canonical_id: entry.canonical_id,
                field: `names.${lang}.reviewer`,
                message: `Verified translation for '${lang}' requires a recorded reviewer`,
                code: 'MISSING_VERIFIED_REVIEWER'
              });
            }
          }
        }
      }
    }

    // 4. Hierarchy Depth and Cycle Check
    for (const entry of entries) {
      if (entry.parent_id) {
        const visited = new Set<string>([entry.canonical_id]);
        let currentId: string | undefined = entry.parent_id;
        let depth = 1;

        while (currentId) {
          if (visited.has(currentId)) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: 'parent_id',
              message: `Cycle detected in taxonomy hierarchy: ${Array.from(visited).join(' -> ')} -> ${currentId}`,
              code: 'HIERARCHY_CYCLE_DETECTED'
            });
            break;
          }

          visited.add(currentId);
          depth++;

          if (depth > 4) {
            errors.push({
              canonical_id: entry.canonical_id,
              field: 'parent_id',
              message: `Taxonomy hierarchy depth exceeded max limit of 4 (depth=${depth})`,
              code: 'HIERARCHY_DEPTH_EXCEEDED'
            });
            break;
          }

          const currentEntry = entryMap.get(currentId);
          currentId = currentEntry?.parent_id;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
