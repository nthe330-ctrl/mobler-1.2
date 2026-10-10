/**
 * MOBLER SEARCH - PHASE 2C COMPATIBILITY TEST SUITE
 * Verifies legacy identifier inventory completeness, status enforcement,
 * registry resolution, and non-breaking sample consumer lookup path.
 */

import fs from 'fs';
import path from 'path';
import { defaultTaxonomyRegistry } from '../TaxonomyRegistry';
import {
  defaultCompatibilityLayer,
  LegacyCompatibilityLayer
} from './LegacyCompatibilityLayer';
import { COMPATIBILITY_MAPPINGS } from './compatibilityMap';
import { CompatibilityBaselineSnapshot } from './types';
import { TaxonomyService } from '../../../../../shared/services/taxonomy/TaxonomyService';

export interface TestResultItem {
  testName: string;
  passed: boolean;
  details?: string;
}

export interface CompatibilityTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
}

export async function runCompatibilityTestSuite(): Promise<CompatibilityTestSuiteSummary> {
  const results: TestResultItem[] = [];

  function assert(name: string, condition: boolean, message: string = '') {
    if (condition) {
      results.push({ testName: name, passed: true });
    } else {
      results.push({ testName: name, passed: false, details: message });
    }
  }

  const inventoryPath = path.resolve(__dirname, '../../../../tests/fixtures/legacy-id-inventory.json');
  const inventoryData: Array<{ identifier: string; where_found: string[]; count: number }> =
    JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

  const snapshotPath = path.resolve(__dirname, 'snapshots/compatibility_baseline_snapshot.json');
  const snapshotData: CompatibilityBaselineSnapshot =
    JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  // 1. Inventory File Format & Completeness
  assert(
    'Inventory fixture has entries and each contains strictly { identifier, where_found, count }',
    inventoryData.length >= 83 &&
      inventoryData.every(item => {
        const keys = Object.keys(item).sort();
        return (
          keys.length === 3 &&
          keys[0] === 'count' &&
          keys[1] === 'identifier' &&
          keys[2] === 'where_found' &&
          typeof item.identifier === 'string' &&
          Array.isArray(item.where_found) &&
          item.where_found.length > 0 &&
          typeof item.count === 'number' &&
          item.count > 0
        );
      })
  );

  const inventoriedIds = inventoryData.map(i => i.identifier);
  const validation = defaultCompatibilityLayer.validateCompleteness(inventoriedIds);
  assert(
    'Every inventoried legacy identifier is registered in the compatibility map',
    validation.valid && validation.missing.length === 0,
    `Missing: ${validation.missing.join(', ')}`
  );

  assert(
    'Compatibility layer mappings match inventory 1:1',
    defaultCompatibilityLayer.getAllMappings().length === inventoryData.length
  );

  // 2. Status Invariants: exact
  const exactMappings = COMPATIBILITY_MAPPINGS.filter(m => m.status === 'exact');
  assert(
    'Status "exact" mappings exist and resolve to exactly one canonical_id in 2B TaxonomyRegistry',
    exactMappings.length >= 50 &&
      exactMappings.every(m => {
        if (!m.canonical_id) return false;
        const res = defaultCompatibilityLayer.resolve(m.identifier);
        if (!res.resolved || res.canonical_id !== m.canonical_id) return false;
        const entry = defaultTaxonomyRegistry.getEntry(m.canonical_id);
        return entry !== null && entry.canonical_id === m.canonical_id;
      })
  );

  // 3. Status Invariants: split_requires_review
  const splitMappings = COMPATIBILITY_MAPPINGS.filter(m => m.status === 'split_requires_review');
  assert(
    'Status "split_requires_review" never resolves silently and provides candidate canonical IDs in registry',
    splitMappings.length >= 7 &&
      splitMappings.every(m => {
        if (m.canonical_id !== undefined) return false; // Must not resolve silently
        if (!m.candidates || m.candidates.length < 2) return false;
        if (!m.reason || m.reason.trim().length === 0) return false;
        const res = defaultCompatibilityLayer.resolve(m.identifier);
        if (res.resolved || res.canonical_id !== null) return false;
        return m.candidates.every(cand => defaultTaxonomyRegistry.getEntry(cand) !== null);
      })
  );

  // 4. Status Invariants: human_review_required
  const reviewMappings = COMPATIBILITY_MAPPINGS.filter(m => m.status === 'human_review_required');
  assert(
    'Status "human_review_required" provides clear reason and proposed mapping without silent resolution',
    reviewMappings.length >= 8 &&
      reviewMappings.every(m => {
        if (m.canonical_id !== undefined) return false;
        if (!m.reason || m.reason.trim().length === 0) return false;
        const res = defaultCompatibilityLayer.resolve(m.identifier);
        if (res.resolved || res.canonical_id !== null) return false;
        if (m.proposed_canonical_id) {
          return defaultTaxonomyRegistry.getEntry(m.proposed_canonical_id) !== null;
        }
        return true;
      })
  );

  // 5. Status Invariants: unmapped
  const unmapped = COMPATIBILITY_MAPPINGS.filter(m => m.status === 'unmapped');
  assert(
    'Status "unmapped" documents reasons for out-of-scope operational attributes',
    unmapped.length >= 6 &&
      unmapped.every(m => {
        if (m.canonical_id !== undefined) return false;
        if (!m.reason || m.reason.trim().length === 0) return false;
        const res = defaultCompatibilityLayer.resolve(m.identifier);
        return !res.resolved && res.canonical_id === null;
      })
  );

  // 6. Status Invariants: deprecated
  const deprecated = COMPATIBILITY_MAPPINGS.filter(m => m.status === 'deprecated');
  assert(
    'Status "deprecated" provides replacement canonical ID in registry and migration rationale',
    deprecated.length >= 3 &&
      deprecated.every(m => {
        if (m.canonical_id !== undefined) return false;
        if (!m.replacement_id || !m.reason) return false;
        const res = defaultCompatibilityLayer.resolve(m.identifier);
        if (res.resolved || res.canonical_id !== null) return false;
        return defaultTaxonomyRegistry.getEntry(m.replacement_id) !== null;
      })
  );

  // 7. Sample Consumer Non-breaking Lookup Path
  const sampleResolvedCat = TaxonomyService.resolveCanonical('Cat Café');
  const sampleResolvedCharging = TaxonomyService.resolveCanonical('Chỗ sạc');
  const sampleResolvedWifi = TaxonomyService.resolveCanonical('Wi-Fi');
  const sampleResolvedWorkFriendly = TaxonomyService.resolveCanonical('work_friendly');
  const sampleResolvedBoardGame = TaxonomyService.resolveCanonical('Board Game Café');

  assert(
    'Sample consumer TaxonomyService.resolveCanonical resolves exact legacy UI models and amenities',
    sampleResolvedCat === 'cat_cafe' &&
      sampleResolvedCharging === 'power_outlet' &&
      sampleResolvedWifi === 'wifi' &&
      sampleResolvedWorkFriendly === 'work_friendly' &&
      sampleResolvedBoardGame === 'board_game_cafe',
    `cat: ${sampleResolvedCat}, charging: ${sampleResolvedCharging}, wifi: ${sampleResolvedWifi}`
  );

  const splitRetro = LegacyCompatibilityLayer.resolveCanonicalId('Retro');
  const splitVintage = LegacyCompatibilityLayer.resolveCanonicalId('Vintage');
  const unmappedWc = LegacyCompatibilityLayer.resolveCanonicalId('WC');
  assert(
    'Ambiguous and unmapped legacy keys safely yield null via resolveCanonicalId',
    splitRetro === null && splitVintage === null && unmappedWc === null
  );

  // 8. Original legacy methods remain unmodified and functional
  const origModel = TaxonomyService.mapUiModelToId('Cat Café');
  const origAmenity = TaxonomyService.mapUiAmenityToId('Chỗ sạc');
  assert(
    'Existing legacy methods on TaxonomyService remain intact and functional',
    origModel === 'cat_cafe' && origAmenity === 'charging_station'
  );

  // 9. Baseline Snapshot Integrity
  const counts = snapshotData.counts_by_status;
  const computedTotal =
    counts.exact +
    counts.split_requires_review +
    counts.human_review_required +
    counts.unmapped +
    counts.deprecated;

  assert(
    'Baseline snapshot carries explicit "pending human approval" status and matches inventory total',
    snapshotData.schema_version === 'compat_v1.0' &&
      snapshotData.approval_status === 'pending human approval' &&
      snapshotData.total_inventoried === inventoryData.length &&
      snapshotData.mappings.length === inventoryData.length &&
      computedTotal === snapshotData.total_inventoried
  );

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results
  };
}
