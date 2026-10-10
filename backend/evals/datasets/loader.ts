/**
 * MOBLER SEARCH - DATASET LOADER & INTEGRITY VERIFIER
 * Loads versioned datasets, computes cryptographic SHA-256 content hashes,
 * verifies schema and contract validity via 2A validator, and guarantees
 * case ID uniqueness and immutability against snapshot records.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EvalDataset, EvalCase } from '../types';
import { validateRequirement, validateLocationIntent } from '../../server/search/contract/validator';
import { TaxonomyRegistry } from '../../server/search/taxonomy/TaxonomyRegistry';

export interface DatasetValidationResult {
  valid: boolean;
  dataset_version: string;
  dataset_hash: string;
  total_cases: number;
  draft_cases: number;
  human_verified_cases: number;
  cases_lacking_place_labels: number;
  languages_covered: string[];
  categories_covered: string[];
  errors: string[];
}

export class DatasetLoader {
  private static taxonomyRegistry: TaxonomyRegistry = new TaxonomyRegistry();

  /**
   * Computes SHA-256 hash of dataset content (normalized JSON string).
   */
  public static computeDatasetHash(content: string | object): string {
    const rawString = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('sha256').update(rawString).digest('hex');
  }

  /**
   * Loads dataset from path and computes hash.
   */
  public static loadDataset(filePath: string): { dataset: EvalDataset; hash: string } {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Dataset file not found at: ${resolvedPath}`);
    }

    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    const dataset: EvalDataset = JSON.parse(fileContent);
    const hash = this.computeDatasetHash(dataset);

    return { dataset, hash };
  }

  /**
   * Validates dataset integrity:
   * 1. Unique and immutable case IDs
   * 2. Schema compliance
   * 3. Every expected requirement block valid under 2A validator
   * 4. Every canonical ID exists in 2B taxonomy
   * 5. Categories and languages coverage
   */
  public static validateDataset(dataset: EvalDataset): DatasetValidationResult {
    const errors: string[] = [];
    const seenIds = new Set<string>();
    const languages = new Set<string>();
    const categories = new Set<string>();

    let draftCount = 0;
    let humanVerifiedCount = 0;
    let casesLackingPlaceLabels = 0;

    const taxonomyLookup = this.taxonomyRegistry;

    dataset.cases.forEach((item: EvalCase, idx: number) => {
      // 1. ID uniqueness
      if (!item.id || typeof item.id !== 'string') {
        errors.push(`Case index ${idx} is missing a string ID`);
      } else if (seenIds.has(item.id)) {
        errors.push(`Duplicate case ID detected: ${item.id}`);
      } else {
        seenIds.add(item.id);
      }

      // Query checks
      if (typeof item.query !== 'string') {
        errors.push(`Case ${item.id}: query must be a string`);
      }

      // Language and Category
      languages.add(item.language);
      categories.add(item.category);

      // Label status count
      if (item.label_status === 'human_verified') {
        humanVerifiedCount++;
      } else {
        draftCount++;
      }

      // Place labels count
      const allowedPlaces = item.expected?.retrieval?.allowed_place_ids;
      if (!allowedPlaces || allowedPlaces.length === 0) {
        casesLackingPlaceLabels++;
      }

      // 2. Validate expected requirements via 2A validator
      const reqs = item.expected?.requirements;
      if (reqs?.required) {
        reqs.required.forEach((r, rIdx) => {
          // Check requirement structure with 2A validator
          const synthReq = {
            id: r.id || `req_${rIdx}`,
            type: r.type,
            canonical_id: r.canonical_id,
            value: r.value,
            priority: r.priority,
            polarity: r.polarity,
            source: 'deterministic' as const,
            confidence: 1.0
          };
          const valRes = validateRequirement(synthReq, `case[${item.id}].req[${rIdx}]`, { taxonomyLookup });
          if (valRes.length > 0) {
            errors.push(`Case ${item.id} required req ${rIdx} validation error: ${valRes.map(e => e.message).join('; ')}`);
          }

          // 3. Ensure canonical IDs exist in 2B registry (unless type is name)
          if (r.canonical_id && !this.taxonomyRegistry.hasCanonicalId(r.canonical_id, r.type)) {
            errors.push(`Case ${item.id} canonical_id '${r.canonical_id}' not found in 2B taxonomy for type '${r.type}'`);
          }
        });
      }

      if (reqs?.allowed_extra) {
        reqs.allowed_extra.forEach((ae, aeIdx) => {
          if (ae.canonical_id && !this.taxonomyRegistry.hasCanonicalId(ae.canonical_id, ae.type)) {
            errors.push(`Case ${item.id} allowed_extra '${ae.canonical_id}' not found in 2B taxonomy`);
          }
        });
      }

      if (reqs?.forbidden) {
        reqs.forbidden.forEach((f, fIdx) => {
          if (f.canonical_id && !this.taxonomyRegistry.hasCanonicalId(f.canonical_id, f.type)) {
            errors.push(`Case ${item.id} forbidden '${f.canonical_id}' not found in 2B taxonomy`);
          }
        });
      }

      // 4. Validate Location intent if specified
      if (item.expected?.location && item.expected.location.has_location !== false) {
        const synthLoc = {
          source: 'explicit' as const,
          scope: item.expected.location.scope || 'city',
          strictness: item.expected.location.strictness || 'must',
          radius_meters: 1000,
          radius_source: 'system_default' as const,
          confidence: 0.9
        };
        const locRes = validateLocationIntent(synthLoc, `case[${item.id}].location`);
        if (locRes.length > 0) {
          errors.push(`Case ${item.id} location validation error: ${locRes.map(e => e.message).join('; ')}`);
        }
      }
    });

    const datasetHash = this.computeDatasetHash(dataset);

    return {
      valid: errors.length === 0,
      dataset_version: dataset.dataset_version,
      dataset_hash: datasetHash,
      total_cases: dataset.cases.length,
      draft_cases: draftCount,
      human_verified_cases: humanVerifiedCount,
      cases_lacking_place_labels: casesLackingPlaceLabels,
      languages_covered: Array.from(languages),
      categories_covered: Array.from(categories),
      errors
    };
  }

  /**
   * Verifies dataset against saved snapshot to ensure no case IDs were altered or deleted.
   */
  public static verifyAgainstSnapshot(dataset: EvalDataset, snapshotPath: string): { matches: boolean; mismatchReason?: string } {
    const resolvedPath = path.resolve(snapshotPath);
    if (!fs.existsSync(resolvedPath)) {
      return { matches: false, mismatchReason: `Snapshot file not found at ${resolvedPath}` };
    }

    const snapshot = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
    if (snapshot.total_cases !== dataset.cases.length) {
      return {
        matches: false,
        mismatchReason: `Case count mismatch: dataset has ${dataset.cases.length}, snapshot expected ${snapshot.total_cases}`
      };
    }

    const snapshotCaseIds: string[] = snapshot.case_ids;
    for (let i = 0; i < dataset.cases.length; i++) {
      if (dataset.cases[i].id !== snapshotCaseIds[i]) {
        return {
          matches: false,
          mismatchReason: `Case ID mismatch at index ${i}: dataset '${dataset.cases[i].id}' vs snapshot '${snapshotCaseIds[i]}'`
        };
      }
    }

    return { matches: true };
  }
}
