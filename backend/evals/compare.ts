/**
 * MOBLER SEARCH - RUN COMPARISON & REGRESSION DETECTOR
 * Performs paired per-case diffs, regression and fix tracking, metric deltas with
 * Wilson intervals, and enforces dataset hash consistency unless explicitly forced.
 */

import { EvalRunResult, CompareResult, CaseDiff, MetricDelta } from './types';
import { intervalsOverlap, DEFAULT_MIN_SAMPLE_SIZE } from './metrics/wilson';

export interface CompareOptions {
  force?: boolean;
}

export function compareRuns(
  runA: EvalRunResult,
  runB: EvalRunResult,
  options: CompareOptions = {}
): CompareResult {
  const hashA = runA.summary.dataset_hash;
  const hashB = runB.summary.dataset_hash;
  const datasetMatch = hashA === hashB;

  let warning: string | undefined = undefined;
  if (!datasetMatch) {
    if (!options.force) {
      throw new Error(
        `Refusing to compare runs with mismatched dataset hashes: runA='${hashA.substring(0, 8)}...' vs runB='${hashB.substring(0, 8)}...'. Use force: true to override.`
      );
    }
    warning = `Forced comparison between mismatched dataset hashes: runA='${hashA.substring(0, 8)}...' vs runB='${hashB.substring(0, 8)}...'`;
  }

  // Map case results by ID
  const mapA = new Map(runA.case_results.map(r => [r.case_id, r]));
  const mapB = new Map(runB.case_results.map(r => [r.case_id, r]));

  const regressions: CaseDiff[] = [];
  const fixes: CaseDiff[] = [];

  for (const [caseId, resA] of mapA.entries()) {
    const resB = mapB.get(caseId);
    if (!resB) continue;

    if (resA.passed && !resB.passed) {
      regressions.push({
        case_id: caseId,
        query: resA.query,
        category: resA.category,
        language: resA.language,
        label_status: resA.label_status,
        type: 'regression',
        runA_passed: true,
        runB_passed: false,
        runA_failures: resA.failure_reasons,
        runB_failures: resB.failure_reasons
      });
    } else if (!resA.passed && resB.passed) {
      fixes.push({
        case_id: caseId,
        query: resA.query,
        category: resA.category,
        language: resA.language,
        label_status: resA.label_status,
        type: 'fix',
        runA_passed: false,
        runB_passed: true,
        runA_failures: resA.failure_reasons,
        runB_failures: resB.failure_reasons
      });
    }
  }

  // Compare overall metric deltas
  const metricDeltas: MetricDelta[] = [];
  const rateKeys = [
    'intent_accuracy',
    'language_accuracy',
    'must_precision',
    'must_recall',
    'should_recall',
    'exclusion_correctness',
    'location_accuracy',
    'ambiguity_handled',
    'contract_validity_rate',
    'adversarial_pass_rate'
  ] as const;

  for (const key of rateKeys) {
    const mMetricA = (runA.summary.overall as any)[key];
    const mMetricB = (runB.summary.overall as any)[key];
    if (!mMetricA || !mMetricB) continue;

    const rateA = mMetricA.rate;
    const rateB = mMetricB.rate;
    const delta = Math.round((rateB - rateA) * 10000) / 10000;
    const ciA = mMetricA.wilson_ci;
    const ciB = mMetricB.wilson_ci;

    let conclusion: 'improvement' | 'regression' | 'no reliable difference' = 'no reliable difference';
    let reason = '';

    if (mMetricA.n < DEFAULT_MIN_SAMPLE_SIZE || mMetricB.n < DEFAULT_MIN_SAMPLE_SIZE) {
      conclusion = 'no reliable difference';
      reason = `Insufficient sample size (nA=${mMetricA.n}, nB=${mMetricB.n} < ${DEFAULT_MIN_SAMPLE_SIZE})`;
    } else if (intervalsOverlap(ciA, ciB)) {
      conclusion = 'no reliable difference';
      reason = `95% Wilson confidence intervals overlap: [${ciA.lower}, ${ciA.upper}] vs [${ciB.lower}, ${ciB.upper}]`;
    } else if (ciB.lower > ciA.upper) {
      conclusion = 'improvement';
      reason = `Statistically significant improvement: interval lower bound ${ciB.lower} > baseline upper bound ${ciA.upper}`;
    } else if (ciB.upper < ciA.lower) {
      conclusion = 'regression';
      reason = `Statistically significant regression: interval upper bound ${ciB.upper} < baseline lower bound ${ciA.lower}`;
    }

    metricDeltas.push({
      metric_name: key,
      runA_rate: rateA,
      runB_rate: rateB,
      delta,
      runA_ci: ciA,
      runB_ci: ciB,
      conclusion,
      reason
    });
  }

  return {
    runA_id: runA.summary.run_id,
    runB_id: runB.summary.run_id,
    dataset_match: datasetMatch,
    warning,
    regressions,
    fixes,
    metric_deltas: metricDeltas,
    summary: {
      total_regressions: regressions.length,
      total_fixes: fixes.length,
      net_improvement: fixes.length - regressions.length
    }
  };
}
