/**
 * MOBLER SEARCH - EVALUATION GATES
 * Configurable quality gates enforcing hard release criteria:
 * 1. Zero MUST-match regression on human_verified cases
 * 2. 100% contract validity
 * 3. Adversarial resilience (zero crashes on empty, long, injection queries)
 */

import { EvalRunResult, EvalGateConfig, GateEvaluationResult, CompareResult } from './types';

export const DEFAULT_GATE_CONFIG: EvalGateConfig = {
  no_must_regression_human_verified: true,
  min_contract_validity_rate: 1.0,
  adversarial_no_crash: true
};

export class EvalGateEnforcer {
  /**
   * Evaluates quality gates against a run result (and optional baseline comparison).
   */
  public static evaluateGates(
    run: EvalRunResult,
    comparison?: CompareResult,
    config: EvalGateConfig = DEFAULT_GATE_CONFIG
  ): GateEvaluationResult {
    const gate_results: GateEvaluationResult['gate_results'] = [];
    let allPassed = true;

    // Gate 1: Contract validity rate (default: 1.0 = 100%)
    const minContractRate = config.min_contract_validity_rate ?? 1.0;
    const actualContractRate = run.summary.overall.contract_validity_rate.rate;
    const contractPassed = actualContractRate >= minContractRate;
    if (!contractPassed) allPassed = false;

    gate_results.push({
      gate: 'min_contract_validity_rate',
      passed: contractPassed,
      actual: actualContractRate,
      expected: minContractRate,
      message: contractPassed
        ? `Contract validity rate ${(actualContractRate * 100).toFixed(1)}% satisfies target ${(minContractRate * 100).toFixed(1)}%`
        : `Contract validity rate ${(actualContractRate * 100).toFixed(1)}% below required ${(minContractRate * 100).toFixed(1)}%`
    });

    // Gate 2: Adversarial cases must not crash
    if (config.adversarial_no_crash !== false) {
      const adversarialCases = run.case_results.filter(r => r.category === 'adversarial');
      const crashedCases = adversarialCases.filter(r => r.crashed);
      const advPassed = crashedCases.length === 0;
      if (!advPassed) allPassed = false;

      gate_results.push({
        gate: 'adversarial_no_crash',
        passed: advPassed,
        actual: crashedCases.length,
        expected: 0,
        message: advPassed
          ? `All ${adversarialCases.length} adversarial cases handled safely without crashes`
          : `${crashedCases.length} adversarial case(s) caused uncaught crashes: ${crashedCases.map(c => c.case_id).join(', ')}`
      });
    }

    // Gate 3: No MUST-match regressions on human_verified cases
    if (config.no_must_regression_human_verified !== false) {
      let hvRegressionCount = 0;
      const regDetails: string[] = [];

      if (comparison) {
        // Compare against baseline
        const hvRegressions = comparison.regressions.filter(r => r.label_status === 'human_verified');
        hvRegressionCount = hvRegressions.length;
        regDetails.push(...hvRegressions.map(r => r.case_id));
      } else {
        // Absolute check on human_verified MUST recall
        const hvCases = run.case_results.filter(r => r.label_status === 'human_verified');
        const failedHvMust = hvCases.filter(r => r.must_recall < 1.0);
        hvRegressionCount = failedHvMust.length;
        regDetails.push(...failedHvMust.map(r => r.case_id));
      }

      const hvPassed = hvRegressionCount === 0;
      if (!hvPassed) allPassed = false;

      gate_results.push({
        gate: 'no_must_regression_human_verified',
        passed: hvPassed,
        actual: hvRegressionCount,
        expected: 0,
        message: hvPassed
          ? `Zero MUST-match regressions detected on human_verified test cases`
          : `${hvRegressionCount} human_verified cases suffered MUST failures: ${regDetails.join(', ')}`
      });
    }

    // Optional Gate: Minimum intent accuracy
    if (config.min_intent_accuracy !== undefined) {
      const actualIntentAcc = run.summary.overall.intent_accuracy.rate;
      const passed = actualIntentAcc >= config.min_intent_accuracy;
      if (!passed) allPassed = false;

      gate_results.push({
        gate: 'min_intent_accuracy',
        passed,
        actual: actualIntentAcc,
        expected: config.min_intent_accuracy,
        message: passed
          ? `Intent accuracy ${(actualIntentAcc * 100).toFixed(1)}% satisfies minimum ${(config.min_intent_accuracy * 100).toFixed(1)}%`
          : `Intent accuracy ${(actualIntentAcc * 100).toFixed(1)}% below minimum ${(config.min_intent_accuracy * 100).toFixed(1)}%`
      });
    }

    return {
      passed: allPassed,
      gate_results
    };
  }
}
