/**
 * MOBLER SEARCH - PHASE 3 EVALUATION HARNESS ACCEPTANCE TEST SUITE
 * Validates all 16 acceptance criteria for Phase 3:
 * 1. Dataset schema validity
 * 2. Every expected block passes the 2A validator
 * 3. All canonical_ids exist in the 2B registry
 * 4. Case ids unique and immutable against snapshot
 * 5. Draft vs human_verified counted separately
 * 6. Every language and category has cases
 * 7. Metric computation on a synthetic run with known answers
 * 8. Wilson interval mathematical sanity checks
 * 9. Small-n slice prints "insufficient data"
 * 10. compare() detects an injected regression and an injected fix
 * 11. compare() refuses mismatched dataset hashes unless forced
 * 12. Gate failure detection and reporting
 * 13. Live mode safety guards (refuses without flag, stops at cost cap)
 * 14. Replay compliance (rejects prohibited Google Place Content)
 * 15. No test-only code imported by production (grep)
 * 16. Integration with BaselineAdapter and 2C compatibility
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { DatasetLoader } from './datasets/loader';
import { calculateWilsonInterval, buildRateMetric, formatRateMetric } from './metrics/wilson';
import { EvalMetricCalculator } from './metrics/evaluator';
import { compareRuns } from './compare';
import { EvalGateEnforcer } from './gates';
import { EvalRunner } from './runner';
import { BaselineIntentAdapter } from './adapters/BaselineAdapter';
import { ReplayAdapter, PROHIBITED_GOOGLE_FIELDS } from './adapters/ReplayAdapter';
import { MockIntentProvider, MockLiveProvider } from './adapters/mock/MockAdapters';
import { EvalCase, EvalRunResult } from './types';
import { SearchIntent } from '../server/search/contract/types';

interface TestAssertionResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runEvalTestSuite(): Promise<{ total: number; passed: number; failed: number; results: TestAssertionResult[] }> {
  const results: TestAssertionResult[] = [];

  function assert(name: string, condition: boolean, errorMsg?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: errorMsg || 'Assertion failed' });
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1-6: Dataset Validation
    // -------------------------------------------------------------
    const datasetPath = path.resolve(__dirname, 'datasets/dataset_v1.0.json');
    const snapshotPath = path.resolve(__dirname, 'datasets/snapshots/dataset_v1.0.snapshot.json');
    const { dataset, hash } = DatasetLoader.loadDataset(datasetPath);
    const validation = DatasetLoader.validateDataset(dataset);

    // 1. Dataset schema validity
    assert('1. Dataset schema validity', validation.valid && dataset.cases.length >= 60 && dataset.cases.length <= 100, `Validation errors: ${validation.errors.join('; ')}`);

    // 2. Every expected block passes the 2A validator
    assert('2. Every expected block passes 2A validator', validation.errors.length === 0, `Errors: ${validation.errors.slice(0, 3).join('; ')}`);

    // 3. All canonical_ids exist in the 2B registry
    const canonicalErrors = validation.errors.filter(e => e.includes('canonical_id'));
    assert('3. All canonical_ids exist in 2B registry', canonicalErrors.length === 0, `Canonical ID errors: ${canonicalErrors.join('; ')}`);

    // 4. Case ids unique and immutable against snapshot
    const snapshotCheck = DatasetLoader.verifyAgainstSnapshot(dataset, snapshotPath);
    assert('4. Case ids unique and immutable against snapshot', snapshotCheck.matches, snapshotCheck.mismatchReason);

    // 5. Draft vs human_verified counted separately
    assert(
      '5. Draft vs human_verified counted separately',
      validation.draft_cases > 0 && validation.human_verified_cases > 0 && validation.draft_cases + validation.human_verified_cases === dataset.cases.length,
      `Draft: ${validation.draft_cases}, Human: ${validation.human_verified_cases}, Total: ${dataset.cases.length}`
    );

    // 6. Every language and category has cases
    const requiredLangs = ['vi', 'zh-TW', 'en', 'th', 'mixed'];
    const requiredCategories = [
      'experience_discovery',
      'attribute',
      'activity',
      'name_search',
      'location_variants',
      'exclusion',
      'ambiguous_term',
      'discovery_mode',
      'typos_unaccented_vi',
      'traditional_simplified',
      'adversarial'
    ];
    const missingLangs = requiredLangs.filter(l => !validation.languages_covered.includes(l));
    const missingCats = requiredCategories.filter(c => !validation.categories_covered.includes(c));
    assert(
      '6. Every language and category has cases',
      missingLangs.length === 0 && missingCats.length === 0,
      `Missing langs: ${missingLangs.join(', ')}, Missing categories: ${missingCats.join(', ')}`
    );

    // -------------------------------------------------------------
    // Test 7: Metric computation on a synthetic run with known answers
    // -------------------------------------------------------------
    const synthCases: EvalCase[] = [
      {
        id: 'synth_1',
        query: 'cat cafe',
        language: 'en',
        category: 'experience_discovery',
        search_mode: 'standard',
        expected: {
          intent: 'search_by_experience',
          language: 'en',
          requirements: {
            required: [{ type: 'experience', canonical_id: 'cat_cafe', priority: 'must', polarity: 'include' }]
          }
        },
        label_status: 'human_verified',
        labeled_by: 'tester',
        labeled_at: '2026-09-19T00:00:00Z'
      },
      {
        id: 'synth_2',
        query: 'quiet place',
        language: 'en',
        category: 'attribute',
        search_mode: 'standard',
        expected: {
          intent: 'search_by_attribute',
          language: 'en',
          requirements: {
            required: [{ type: 'attribute', canonical_id: 'quiet', priority: 'must', polarity: 'include' }]
          }
        },
        label_status: 'draft',
        labeled_by: 'tester',
        labeled_at: '2026-09-19T00:00:00Z'
      }
    ];

    // Case 1 passes, Case 2 fails intent
    const synthResult1 = EvalMetricCalculator.evaluateCase(synthCases[0], {
      intent: {
        raw_query: 'cat cafe',
        normalized_query: 'cat cafe',
        language: 'en',
        search_mode: 'standard',
        intent: 'search_by_experience',
        confidence: 1.0,
        entities: [],
        location: null,
        ambiguities: [],
        parse_source: 'fast_path',
        versions: {
          contract: 'contract_v2.0',
          taxonomy: '2.0.0',
          parser: '1.0.0',
          normalizer: '1.0.0'
        },
        requirements: [{ id: 'r1', type: 'experience', canonical_id: 'cat_cafe', priority: 'must', polarity: 'include', source: 'deterministic', confidence: 1.0 }]
      }
    });

    const synthResult2 = EvalMetricCalculator.evaluateCase(synthCases[1], {
      intent: {
        raw_query: 'quiet place',
        normalized_query: 'quiet place',
        language: 'en',
        search_mode: 'standard',
        intent: 'wrong_intent', // mismatch!
        confidence: 1.0,
        entities: [],
        location: null,
        ambiguities: [],
        parse_source: 'fast_path',
        versions: {
          contract: 'contract_v2.0',
          taxonomy: '2.0.0',
          parser: '1.0.0',
          normalizer: '1.0.0'
        },
        requirements: [{ id: 'r1', type: 'attribute', canonical_id: 'quiet', priority: 'must', polarity: 'include', source: 'deterministic', confidence: 1.0 }]
      }
    });

    const sliceMetrics = EvalMetricCalculator.computeSliceMetrics(synthCases, [synthResult1, synthResult2]);
    assert(
      '7. Metric computation on synthetic run with exact known answers',
      synthResult1.passed === true &&
      synthResult2.passed === false &&
      sliceMetrics.metrics.intent_accuracy.k === 1 &&
      sliceMetrics.metrics.intent_accuracy.n === 2 &&
      sliceMetrics.metrics.intent_accuracy.rate === 0.5 &&
      sliceMetrics.metrics.contract_validity_rate.rate === 1.0,
      `Exact numbers mismatch: intent_accuracy = ${sliceMetrics.metrics.intent_accuracy.k}/${sliceMetrics.metrics.intent_accuracy.n}`
    );

    // -------------------------------------------------------------
    // Test 8: Wilson interval sanity checks
    // -------------------------------------------------------------
    const ci0 = calculateWilsonInterval(0, 10);
    const ci100 = calculateWilsonInterval(10, 10);
    const ciMid = calculateWilsonInterval(50, 100);

    assert(
      '8. Wilson interval sanity checks (bounds within [0,1], center correctness)',
      ci0.lower >= 0 && ci0.upper <= 1 &&
      ci100.lower >= 0 && ci100.upper <= 1 &&
      ciMid.center === 0.5 && ciMid.lower > 0.39 && ciMid.upper < 0.61,
      `Wilson intervals sanity failed: ci0=${JSON.stringify(ci0)}, ciMid=${JSON.stringify(ciMid)}`
    );

    // -------------------------------------------------------------
    // Test 9: Small-n slice prints "insufficient data"
    // -------------------------------------------------------------
    const smallRate = buildRateMetric(3, 5, 10);
    const formattedSmall = formatRateMetric(smallRate, 10);
    assert(
      '9. Small-n slice prints insufficient data (n < 10)',
      smallRate.status === 'insufficient_data' && formattedSmall.includes('insufficient data (n=5)'),
      `Formatted string was: '${formattedSmall}'`
    );

    // -------------------------------------------------------------
    // Test 10: compare() detects an injected regression and fix
    // -------------------------------------------------------------
    const runA: EvalRunResult = {
      summary: {
        run_id: 'run_A',
        timestamp: new Date().toISOString(),
        dataset_version: 'v1',
        dataset_hash: 'hash_123',
        versions: { contract: '2.0.0', taxonomy: '2.0.0', parser: '1.0', normalizer: '1.0' },
        adapters: { intent: 'test' },
        mode: 'mock',
        total_cases: 2,
        cases_passed: 1,
        cases_failed: 1,
        cases_crashed: 0,
        cases_lacking_human_verification: 1,
        cases_lacking_place_labels: 2,
        overall: sliceMetrics.metrics,
        by_label_status: { draft: sliceMetrics, human_verified: sliceMetrics },
        by_language: {},
        by_category: {}
      },
      case_results: [
        { ...synthResult1, passed: true },
        { ...synthResult2, passed: false }
      ]
    };

    const runB: EvalRunResult = {
      summary: {
        ...runA.summary,
        run_id: 'run_B'
      },
      case_results: [
        { ...synthResult1, passed: false, failure_reasons: ['Injected regression'] }, // Regressed!
        { ...synthResult2, passed: true, failure_reasons: [] } // Fixed!
      ]
    };

    const comparison = compareRuns(runA, runB);
    assert(
      '10. compare() detects an injected regression and an injected fix',
      comparison.regressions.length === 1 &&
      comparison.regressions[0].case_id === 'synth_1' &&
      comparison.fixes.length === 1 &&
      comparison.fixes[0].case_id === 'synth_2',
      `Regressions: ${comparison.regressions.length}, Fixes: ${comparison.fixes.length}`
    );

    // -------------------------------------------------------------
    // Test 11: compare() refuses mismatched dataset hashes unless forced
    // -------------------------------------------------------------
    const runMismatched: EvalRunResult = {
      ...runB,
      summary: {
        ...runB.summary,
        dataset_hash: 'different_hash_999'
      }
    };

    let refusedError = false;
    try {
      compareRuns(runA, runMismatched, { force: false });
    } catch (e: any) {
      if (e.message.includes('Refusing to compare runs with mismatched dataset hashes')) {
        refusedError = true;
      }
    }

    const forcedCompare = compareRuns(runA, runMismatched, { force: true });
    assert(
      '11. compare() refuses mismatched dataset hashes unless forced',
      refusedError && forcedCompare.warning !== undefined,
      `Refused error: ${refusedError}, forced warning: ${forcedCompare.warning}`
    );

    // -------------------------------------------------------------
    // Test 12: Gate failure detection
    // -------------------------------------------------------------
    const failingGateRun: EvalRunResult = {
      ...runA,
      summary: {
        ...runA.summary,
        overall: {
          ...runA.summary.overall,
          contract_validity_rate: buildRateMetric(8, 10) // 80% < 100%
        }
      }
    };
    const gateEval = EvalGateEnforcer.evaluateGates(failingGateRun);
    assert(
      '12. Gate failure returns passed: false and reports violated gates',
      gateEval.passed === false && gateEval.gate_results.some(g => g.gate === 'min_contract_validity_rate' && !g.passed),
      `Gate evaluation output: ${JSON.stringify(gateEval)}`
    );

    // -------------------------------------------------------------
    // Test 13: Live mode safety guards (refuses without flag, stops at cost cap)
    // -------------------------------------------------------------
    const mockLiveProvider = new MockLiveProvider();
    let refusedLive = false;
    try {
      await mockLiveProvider.execute('test query', undefined, { mode: 'live', allowLiveMode: false });
    } catch (e: any) {
      if (e.message.includes('Live mode requires explicit allowLiveMode: true flag')) {
        refusedLive = true;
      }
    }

    // Test live cap stop
    let capReached = false;
    try {
      for (let i = 0; i < 15; i++) {
        await mockLiveProvider.execute(`test query ${i}`, undefined, {
          mode: 'live',
          allowLiveMode: true,
          maxQueryCount: 3,
          maxEstimatedCostUsd: 0.15
        });
      }
    } catch (e: any) {
      if (e.message.includes('Live mode query cap reached') || e.message.includes('Live mode cost cap reached')) {
        capReached = true;
      }
    }

    assert(
      '13. Live mode refuses without flag and stops at query/cost cap',
      refusedLive && capReached && mockLiveProvider.getQueryCount() <= 3,
      `Refused: ${refusedLive}, Cap reached: ${capReached}, queries: ${mockLiveProvider.getQueryCount()}`
    );

    // -------------------------------------------------------------
    // Test 14: Replay recordings contain no Google Place Content fields beyond allowed ones
    // -------------------------------------------------------------
    const validRecording = {
      'cat cafe': {
        query_hash: 'hash_cat',
        results: [{ place_id: 'p_1', name: 'Cat Lounge', derived_features: ['cat_cafe'] }],
        provider_calls: { priced: 1, unpriced: 0 },
        internal_cost_units: 1,
        ai_calls: 0,
        ai_tokens: 0,
        latency_ms: 20
      }
    };
    const complianceValid = ReplayAdapter.verifyRecordingsCompliance(validRecording);

    const violatingRecording = {
      'violating query': {
        query_hash: 'hash_bad',
        editorial_summary: 'Forbidden Google editorial summary', // Prohibited!
        results: [
          {
            place_id: 'p_bad',
            reviews: [{ text: 'Google review' }] // Prohibited!
          }
        ]
      }
    };
    const complianceViolating = ReplayAdapter.verifyRecordingsCompliance(violatingRecording);

    assert(
      '14. Replay recordings contain no Google Place Content fields beyond allowed ones',
      complianceValid.compliant && !complianceViolating.compliant && complianceViolating.violations.length >= 2,
      `Valid compliance: ${complianceValid.compliant}, Violating detected: ${complianceViolating.violations.length}`
    );

    // -------------------------------------------------------------
    // Test 15: No test-only code imported by production (grep)
    // -------------------------------------------------------------
    const serverFiles = fs.readdirSync(path.resolve(__dirname, '../server'), { recursive: true }) as string[];
    let productionImportsMock = false;
    for (const f of serverFiles) {
      if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.js')) && !f.includes('test')) {
        const content = fs.readFileSync(path.resolve(__dirname, '../server', f), 'utf-8');
        if (content.includes('evals/adapters/mock') || content.includes('MockAdapters')) {
          productionImportsMock = true;
          break;
        }
      }
    }
    assert(
      '15. No test-only code imported by production',
      !productionImportsMock,
      'Production code under server/ imported test-only mock adapters'
    );

    // -------------------------------------------------------------
    // Test 16: BaselineAdapter execution and 2C compatibility
    // -------------------------------------------------------------
    const baselineAdapter = new BaselineIntentAdapter();
    const baselineIntent = await baselineAdapter.provideIntent('quán cà phê mèo quận 1');
    const hasCatReq = baselineIntent.requirements.some(r => r.canonical_id === 'cat_cafe' && r.priority === 'must');

    assert(
      '16. BaselineAdapter integrates with 2C compatibility layer without changing search behavior',
      baselineIntent.versions.contract === 'contract_v2.0' && hasCatReq && baselineIntent.intent === 'search_by_experience',
      `Baseline intent result: ${JSON.stringify(baselineIntent)}`
    );

  } catch (err: any) {
    results.push({ name: 'Unexpected exception in test runner', passed: false, error: err?.message || String(err) });
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results
  };
}
