/**
 * MOBLER SEARCH - PHASE 3: EVAL HARNESS CLI
 * Deterministic command-line entrypoint for running evals, regression checks, and comparisons.
 */

import { EvalRunner } from './runner';
import { BaselineIntentAdapter } from './adapters/BaselineAdapter';
import { Phase4QueryUnderstandingAdapter } from './adapters/Phase4QueryUnderstandingAdapter';
import { compareRuns } from './compare';
import { EvalGateEnforcer } from './gates';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  const parsedArgs: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      parsedArgs[key] = val !== undefined ? val : true;
    }
  }

  // Check if comparison mode is requested: --compare run_A.json run_B.json
  if (parsedArgs['compare']) {
    const runAFile = args[args.indexOf('--compare') + 1] || (parsedArgs['a'] as string);
    const runBFile = args[args.indexOf('--compare') + 2] || (parsedArgs['b'] as string);

    if (!runAFile || !runBFile) {
      console.error('Usage: npm run eval:run -- --compare <runA.json> <runB.json> [--force]');
      process.exit(1);
    }

    const runA = JSON.parse(fs.readFileSync(path.resolve(runAFile), 'utf-8'));
    const runB = JSON.parse(fs.readFileSync(path.resolve(runBFile), 'utf-8'));
    const force = Boolean(parsedArgs['force']);

    const diff = compareRuns(runA, runB, { force });
    console.log('\n=================== EVAL COMPARISON REPORT ===================');
    console.log(`Baseline Run: ${diff.runA_id} | Candidate Run: ${diff.runB_id}`);
    if (diff.warning) {
      console.log(`Warning: ${diff.warning}`);
    }
    console.log(`Net Improvement: ${diff.summary.net_improvement > 0 ? '+' : ''}${diff.summary.net_improvement}`);
    console.log(`Fixed Cases (${diff.fixes.length}): ${diff.fixes.map(f => f.case_id).join(', ') || 'None'}`);
    console.log(`Regressed Cases (${diff.regressions.length}): ${diff.regressions.map(r => r.case_id).join(', ') || 'None'}`);
    console.log('--------------------------------------------------------------');
    for (const delta of diff.metric_deltas) {
      console.log(`  ${delta.metric_name.padEnd(25)}: ${(delta.runA_rate * 100).toFixed(1)}% -> ${(delta.runB_rate * 100).toFixed(1)}% (Delta: ${delta.delta >= 0 ? '+' : ''}${(delta.delta * 100).toFixed(1)}%) [${delta.conclusion}]`);
    }
    console.log('==============================================================\n');
    return;
  }

  const datasetPath = (parsedArgs['dataset'] as string) || path.resolve(__dirname, 'datasets/dataset_v1.0.json');
  const mode = (parsedArgs['mode'] as any) || 'mock';
  const allowLive = Boolean(parsedArgs['live'] || parsedArgs['allowLiveMode']);
  const maxQueries = parsedArgs['max-queries'] ? parseInt(parsedArgs['max-queries'] as string, 10) : undefined;
  const maxCost = parsedArgs['max-cost'] ? parseFloat(parsedArgs['max-cost'] as string) : undefined;
  const adapterArg = (parsedArgs['adapter'] as string) || 'phase4_mock';

  let intentProvider;
  if (adapterArg === 'baseline') {
    intentProvider = new BaselineIntentAdapter();
  } else if (adapterArg === 'phase4_fastpath') {
    intentProvider = new Phase4QueryUnderstandingAdapter('fast_path_only');
  } else if (adapterArg === 'phase4_live') {
    intentProvider = new Phase4QueryUnderstandingAdapter('live_ai');
  } else {
    intentProvider = new Phase4QueryUnderstandingAdapter('mock_ai');
  }

  console.log('Initiating Mobler Search Evaluation Run...');
  console.log(`  Dataset: ${datasetPath}`);
  console.log(`  Adapter: ${intentProvider.name}`);
  console.log(`  Mode: ${mode} (Live enabled: ${allowLive})`);

  const runResult = await EvalRunner.run({
    datasetPath,
    intentProvider,
    mode: allowLive ? 'live' : 'mock',
    allowLiveMode: allowLive,
    maxQueryCount: maxQueries,
    maxEstimatedCostUsd: maxCost
  });

  const passRate = runResult.summary.total_cases > 0
    ? (runResult.summary.cases_passed / runResult.summary.total_cases) * 100
    : 0;

  // Compute Fast-Path Share
  const totalCases = runResult.case_results.length;
  const fastPathCount = runResult.case_results.filter(c => (c.ai_calls ?? 0) === 0).length;
  const fastPathShare = totalCases > 0 ? (fastPathCount / totalCases) * 100 : 0;

  console.log('\n====================== EVAL RUN SUMMARY ======================');
  console.log(`Run ID:              ${runResult.summary.run_id}`);
  console.log(`Dataset:             ${runResult.summary.dataset_version} (Hash: ${runResult.summary.dataset_hash.slice(0, 8)})`);
  console.log(`Timestamp:           ${runResult.summary.timestamp}`);
  console.log(`Total Cases:         ${runResult.summary.total_cases}`);
  console.log(`Cases Passed:        ${runResult.summary.cases_passed} / ${runResult.summary.total_cases} (${passRate.toFixed(1)}%)`);
  console.log(`Fast-Path Share:     ${fastPathShare.toFixed(1)}% (${fastPathCount}/${totalCases} resolved with 0 AI calls)`);
  console.log(`AI Calls/Search:     mean=${runResult.summary.overall.ai_calls_per_search.mean.toFixed(2)} | max=${runResult.summary.overall.ai_calls_per_search.max}`);
  console.log(`AI Tokens/Search:    mean=${runResult.summary.overall.ai_tokens_per_search.mean.toFixed(1)} | max=${runResult.summary.overall.ai_tokens_per_search.max}`);
  console.log(`Cache Hit Rate:      ${(runResult.summary.overall.cache_hit_rate.rate * 100).toFixed(1)}%`);
  console.log(`Latency (p50/p95):   p50=${runResult.summary.overall.latency_ms.p50}ms | p95=${runResult.summary.overall.latency_ms.p95}ms`);
  console.log(`Contract Validity:   ${(runResult.summary.overall.contract_validity_rate.rate * 100).toFixed(1)}% (${runResult.summary.overall.contract_validity_rate.k}/${runResult.summary.overall.contract_validity_rate.n})`);
  console.log(`Intent Accuracy:     ${(runResult.summary.overall.intent_accuracy.rate * 100).toFixed(1)}% [${(runResult.summary.overall.intent_accuracy.wilson_ci.lower * 100).toFixed(1)}%, ${(runResult.summary.overall.intent_accuracy.wilson_ci.upper * 100).toFixed(1)}%]`);
  console.log(`Must Precision:      ${(runResult.summary.overall.must_precision.rate * 100).toFixed(1)}% [${(runResult.summary.overall.must_precision.wilson_ci.lower * 100).toFixed(1)}%, ${(runResult.summary.overall.must_precision.wilson_ci.upper * 100).toFixed(1)}%]`);
  console.log(`Must Recall:         ${(runResult.summary.overall.must_recall.rate * 100).toFixed(1)}% [${(runResult.summary.overall.must_recall.wilson_ci.lower * 100).toFixed(1)}%, ${(runResult.summary.overall.must_recall.wilson_ci.upper * 100).toFixed(1)}%]`);
  console.log(`Should Recall:       ${(runResult.summary.overall.should_recall.rate * 100).toFixed(1)}%`);
  console.log(`Exclusion Correct:   ${(runResult.summary.overall.exclusion_correctness.rate * 100).toFixed(1)}% [${(runResult.summary.overall.exclusion_correctness.wilson_ci.lower * 100).toFixed(1)}%, ${(runResult.summary.overall.exclusion_correctness.wilson_ci.upper * 100).toFixed(1)}%]`);
  console.log(`Ambiguity Handled:   ${(runResult.summary.overall.ambiguity_handled.rate * 100).toFixed(1)}%`);

  const gateResult = EvalGateEnforcer.evaluateGates(runResult);
  console.log(`Gates Passed:        ${gateResult.passed ? 'PASSED' : 'FAILED'}`);
  if (!gateResult.passed) {
    const failedMessages = gateResult.gate_results
      .filter(g => !g.passed)
      .map(g => `${g.gate}: ${g.message}`);
    console.log(`Violated Gates:      ${failedMessages.join('; ')}`);
  }

  console.log('--------------------------------------------------------------');
  console.log('Metrics by Label Status:');
  for (const [status, slice] of Object.entries(runResult.summary.by_label_status)) {
    console.log(`  [${status.toUpperCase()}] Total=${slice.total_cases}`);
    console.log(`    Intent Acc:     ${(slice.metrics.intent_accuracy.rate * 100).toFixed(1)}% (${slice.metrics.intent_accuracy.k}/${slice.metrics.intent_accuracy.n}) [${(slice.metrics.intent_accuracy.wilson_ci.lower * 100).toFixed(1)}%, ${(slice.metrics.intent_accuracy.wilson_ci.upper * 100).toFixed(1)}%]`);
    console.log(`    Contract Valid: ${(slice.metrics.contract_validity_rate.rate * 100).toFixed(1)}%`);
    console.log(`    Must Recall:    ${(slice.metrics.must_recall.rate * 100).toFixed(1)}%`);
  }

  console.log('--------------------------------------------------------------');
  console.log('Metrics by Language:');
  for (const [lang, slice] of Object.entries(runResult.summary.by_language)) {
    if (slice.metrics.intent_accuracy.status === 'insufficient_data') {
      console.log(`  ${lang.padEnd(8)}: [Insufficient data: n=${slice.total_cases} < 10]`);
    } else {
      console.log(`  ${lang.padEnd(8)}: Total=${slice.total_cases} | Intent Acc: ${(slice.metrics.intent_accuracy.rate * 100).toFixed(1)}% (${slice.metrics.intent_accuracy.k}/${slice.metrics.intent_accuracy.n}) (95% CI [${(slice.metrics.intent_accuracy.wilson_ci.lower * 100).toFixed(1)}%, ${(slice.metrics.intent_accuracy.wilson_ci.upper * 100).toFixed(1)}%]) | Contract: ${(slice.metrics.contract_validity_rate.rate * 100).toFixed(1)}%`);
    }
  }

  console.log('--------------------------------------------------------------');
  console.log('Metrics by Category:');
  for (const [cat, slice] of Object.entries(runResult.summary.by_category)) {
    if (slice.metrics.intent_accuracy.status === 'insufficient_data') {
      console.log(`  ${cat.padEnd(24)}: [Insufficient data: n=${slice.total_cases} < 10]`);
    } else {
      console.log(`  ${cat.padEnd(24)}: Total=${slice.total_cases} | Intent Acc: ${(slice.metrics.intent_accuracy.rate * 100).toFixed(1)}% (${slice.metrics.intent_accuracy.k}/${slice.metrics.intent_accuracy.n}) | Contract: ${(slice.metrics.contract_validity_rate.rate * 100).toFixed(1)}%`);
    }
  }
  console.log('==============================================================\n');
}

main().catch(err => {
  console.error('Eval CLI execution failed:', err);
  process.exit(1);
});
