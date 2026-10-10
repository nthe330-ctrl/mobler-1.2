/**
 * MOBLER SEARCH - EVALUATION METRIC CALCULATOR
 * Evaluates individual cases against layered expectations, computes binomial rates
 * with Wilson 95% confidence intervals, summarizes costs and latencies, and computes
 * fine-grained slices by language, category, and label status.
 */

import {
  EvalCase,
  EvalCaseResult,
  AggregateMetrics,
  SliceMetrics,
  EvalRunSummary
} from '../types';
import { validateSearchIntent } from '../../server/search/contract/validator';
import { TaxonomyRegistry } from '../../server/search/taxonomy/TaxonomyRegistry';
import { buildRateMetric, computeNumericSummary } from './wilson';
import { SearchIntent } from '../../server/search/contract/types';
import { intentMetaMap } from '../adapters/Phase4QueryUnderstandingAdapter';

export class EvalMetricCalculator {
  private static taxonomyRegistry: TaxonomyRegistry = new TaxonomyRegistry();

  /**
   * Evaluates a single test case execution against its expected specification.
   */
  public static evaluateCase(
    evalCase: EvalCase,
    actual: {
      intent?: SearchIntent;
      retrieval?: any;
      latency_ms?: number;
      crashed?: boolean;
      crash_error?: string;
    }
  ): EvalCaseResult {
    const failure_reasons: string[] = [];
    const latency_ms = actual.latency_ms ?? 0;

    // 1. Crash check (especially vital for adversarial inputs)
    if (actual.crashed || !actual.intent) {
      return {
        case_id: evalCase.id,
        query: evalCase.query,
        language: evalCase.language,
        category: evalCase.category,
        label_status: evalCase.label_status,
        passed: false,
        crashed: true,
        intent_match: false,
        language_match: false,
        must_precision: 0,
        must_recall: 0,
        should_recall: 0,
        exclusion_correct: false,
        location_match: false,
        ambiguity_handled: false,
        contract_valid: false,
        latency_ms,
        failure_reasons: [actual.crash_error || 'Execution crashed or returned no intent']
      };
    }

    const intent = actual.intent;

    // 2. Contract validity verification via 2A validator
    const taxonomyLookup = this.taxonomyRegistry;
    const contractVal = validateSearchIntent(intent, { taxonomyLookup });
    const contract_valid = contractVal.valid;
    if (!contract_valid) {
      failure_reasons.push(`Contract validation failure: ${contractVal.errors.map(e => e.message).join('; ')}`);
    }

    // 3. Intent type match
    let intent_match = true;
    if (evalCase.expected.intent) {
      intent_match = intent.intent === evalCase.expected.intent;
      if (!intent_match) {
        failure_reasons.push(`Intent mismatch: expected '${evalCase.expected.intent}', got '${intent.intent}'`);
      }
    }

    // 4. Language match
    let language_match = true;
    if (evalCase.expected.language) {
      language_match = intent.language === evalCase.expected.language;
      if (!language_match) {
        failure_reasons.push(`Language mismatch: expected '${evalCase.expected.language}', got '${intent.language}'`);
      }
    }

    // 5. Requirements matching
    const expectedReqs = evalCase.expected.requirements;
    const actualReqs = intent.requirements || [];

    // MUST requirements
    const expectedMust = (expectedReqs?.required || []).filter(r => r.priority === 'must' && r.polarity === 'include');
    const actualMust = actualReqs.filter(r => r.priority === 'must' && r.polarity === 'include');

    let matchedMustCount = 0;
    for (const exp of expectedMust) {
      const found = actualMust.some(act => {
        if (exp.type === 'name') {
          return act.type === 'name' && (!exp.value || act.value?.toLowerCase() === exp.value.toLowerCase());
        }
        return act.type === exp.type && act.canonical_id === exp.canonical_id;
      });
      if (found) matchedMustCount++;
    }

    const must_recall = expectedMust.length > 0 ? matchedMustCount / expectedMust.length : 1.0;
    if (must_recall < 1.0) {
      failure_reasons.push(`MUST recall failure (${matchedMustCount}/${expectedMust.length} matched)`);
    }

    // MUST precision
    const allowedExtra = expectedReqs?.allowed_extra || [];
    let validActualMustCount = 0;
    for (const act of actualMust) {
      const isExpected = expectedMust.some(exp =>
        exp.type === act.type && (act.type === 'name' ? act.value === exp.value : act.canonical_id === exp.canonical_id)
      );
      const isAllowedExtra = allowedExtra.some(ae =>
        (!ae.type || ae.type === act.type) && (!ae.canonical_id || ae.canonical_id === act.canonical_id)
      );
      if (isExpected || isAllowedExtra) {
        validActualMustCount++;
      }
    }
    const must_precision = actualMust.length > 0 ? validActualMustCount / actualMust.length : 1.0;
    if (must_precision < 1.0) {
      failure_reasons.push(`MUST precision failure (${validActualMustCount}/${actualMust.length} valid)`);
    }

    // SHOULD requirements recall
    const expectedShould = (expectedReqs?.required || []).filter(r => r.priority === 'should' && r.polarity === 'include');
    let matchedShouldCount = 0;
    for (const exp of expectedShould) {
      const found = actualReqs.some(act => act.type === exp.type && act.canonical_id === exp.canonical_id);
      if (found) matchedShouldCount++;
    }
    const should_recall = expectedShould.length > 0 ? matchedShouldCount / expectedShould.length : 1.0;

    // 6. Exclusion correctness
    let exclusion_correct = true;
    const expectedExcludes = (expectedReqs?.required || []).filter(r => r.polarity === 'exclude');
    for (const exp of expectedExcludes) {
      const found = actualReqs.some(act => act.type === exp.type && act.canonical_id === exp.canonical_id && act.polarity === 'exclude');
      if (!found) {
        exclusion_correct = false;
        failure_reasons.push(`Missing expected exclusion for canonical_id '${exp.canonical_id}'`);
      }
    }

    const forbidden = expectedReqs?.forbidden || [];
    for (const f of forbidden) {
      const violation = actualReqs.some(act =>
        (!f.type || act.type === f.type) &&
        (!f.canonical_id || act.canonical_id === f.canonical_id) &&
        (act.polarity === (f.polarity || 'include'))
      );
      if (violation) {
        exclusion_correct = false;
        failure_reasons.push(`Forbidden requirement detected in intent: ${f.canonical_id}`);
      }
    }

    // 7. Location match
    let location_match = true;
    if (evalCase.expected.location) {
      const expLoc = evalCase.expected.location;
      if (expLoc.has_location === false) {
        if (intent.location !== undefined) {
          location_match = false;
          failure_reasons.push(`Expected no location, but location intent was present`);
        }
      } else if (expLoc.scope && intent.location?.scope !== expLoc.scope) {
        location_match = false;
        failure_reasons.push(`Location scope mismatch: expected '${expLoc.scope}', got '${intent.location?.scope}'`);
      }
    }

    // 8. Ambiguity handling
    let ambiguity_handled = true;
    if (evalCase.expected.ambiguities?.must_flag) {
      if (!intent.ambiguities || intent.ambiguities.length === 0) {
        ambiguity_handled = false;
        failure_reasons.push(`Expected ambiguity to be flagged, but was silently picked`);
      }
    }

    // 9. Retrieval metrics (if present)
    let zero_result: boolean | undefined = undefined;
    let duplicate_count: number | undefined = undefined;
    if (actual.retrieval) {
      zero_result = actual.retrieval.zero_result;
      duplicate_count = actual.retrieval.duplicate_count;

      // Check forbidden places
      const forbiddenPlaces = evalCase.expected.retrieval?.must_not_appear_place_ids || [];
      const retrievedPlaceIds = (actual.retrieval.results || []).map((r: any) => r.place_id);
      for (const fp of forbiddenPlaces) {
        if (retrievedPlaceIds.includes(fp)) {
          failure_reasons.push(`Forbidden place_id '${fp}' appeared in retrieval results`);
        }
      }
    }

    // Overall case pass
    const passed =
      contract_valid &&
      intent_match &&
      language_match &&
      must_recall === 1.0 &&
      must_precision >= 0.8 &&
      exclusion_correct &&
      location_match &&
      ambiguity_handled &&
      !actual.crashed;

    const metaWrap = actual.intent ? intentMetaMap.get(actual.intent) : undefined;
    const meta = metaWrap?.meta;

    return {
      case_id: evalCase.id,
      query: evalCase.query,
      language: evalCase.language,
      category: evalCase.category,
      label_status: evalCase.label_status,
      passed,
      crashed: false,
      intent_match,
      language_match,
      must_precision,
      must_recall,
      should_recall,
      exclusion_correct,
      location_match,
      ambiguity_handled,
      contract_valid,
      zero_result,
      duplicate_count,
      latency_ms: meta?.latency_ms ?? latency_ms,
      cost_units: actual.retrieval?.internal_cost_units ?? 0,
      priced_calls: actual.retrieval?.provider_calls?.priced ?? 0,
      unpriced_calls: actual.retrieval?.provider_calls?.unpriced ?? 0,
      ai_calls: actual.retrieval?.ai_calls ?? (meta?.ai_called ? 1 : 0),
      ai_tokens: actual.retrieval?.ai_tokens ?? (meta?.tokens_used ?? 0),
      cache_hit: actual.retrieval?.cache_hit ?? (meta?.path === 'cache'),
      failure_reasons
    };
  }

  /**
   * Computes aggregate metrics for a slice of case results.
   */
  public static computeSliceMetrics(
    cases: EvalCase[],
    results: EvalCaseResult[],
    minSample: number = 10
  ): SliceMetrics {
    const caseMap = new Map<string, EvalCase>(cases.map(c => [c.id, c]));
    const total = results.length;

    let intentMatchK = 0, intentMatchN = 0;
    let langMatchK = 0, langMatchN = 0;
    let mustPrecK = 0, mustPrecN = 0;
    let mustRecK = 0, mustRecN = 0;
    let shouldRecK = 0, shouldRecN = 0;
    let exclK = 0, exclN = 0;
    let locK = 0, locN = 0;
    let ambK = 0, ambN = 0;
    let contractValidK = 0;
    let zeroResultK = 0, zeroResultN = 0;
    let duplicateK = 0, duplicateN = 0;
    let cacheHitK = 0, cacheHitN = 0;
    let advPassK = 0, advPassN = 0;

    const latencies: number[] = [];
    const costUnits: number[] = [];
    const providerCalls: number[] = [];
    const aiCalls: number[] = [];
    const aiTokens: number[] = [];

    for (const res of results) {
      const item = caseMap.get(res.case_id);

      if (res.contract_valid) contractValidK++;

      if (item?.expected.intent) {
        intentMatchN++;
        if (res.intent_match) intentMatchK++;
      }

      if (item?.expected.language) {
        langMatchN++;
        if (res.language_match) langMatchK++;
      }

      // MUST requirements
      const expMust = (item?.expected.requirements?.required || []).filter(r => r.priority === 'must');
      if (expMust.length > 0) {
        mustRecN++;
        if (res.must_recall === 1.0) mustRecK++;
      }
      mustPrecN++;
      if (res.must_precision >= 0.8) mustPrecK++;

      // SHOULD requirements
      const expShould = (item?.expected.requirements?.required || []).filter(r => r.priority === 'should');
      if (expShould.length > 0) {
        shouldRecN++;
        if (res.should_recall === 1.0) shouldRecK++;
      }

      // Exclusion
      if ((item?.expected.requirements?.required || []).some(r => r.polarity === 'exclude') || (item?.expected.requirements?.forbidden?.length ?? 0) > 0) {
        exclN++;
        if (res.exclusion_correct) exclK++;
      }

      // Location
      if (item?.expected.location) {
        locN++;
        if (res.location_match) locK++;
      }

      // Ambiguity
      if (item?.expected.ambiguities?.must_flag) {
        ambN++;
        if (res.ambiguity_handled) ambK++;
      }

      // Adversarial
      if (item?.category === 'adversarial') {
        advPassN++;
        if (!res.crashed) advPassK++;
      }

      // Retrieval
      if (res.zero_result !== undefined) {
        zeroResultN++;
        if (res.zero_result) zeroResultK++;
      }

      if (res.duplicate_count !== undefined) {
        duplicateN++;
        if (res.duplicate_count > 0) duplicateK++;
      }

      if (res.cache_hit !== undefined) {
        cacheHitN++;
        if (res.cache_hit) cacheHitK++;
      }

      latencies.push(res.latency_ms);
      costUnits.push(res.cost_units ?? 0);
      providerCalls.push((res.priced_calls ?? 0) + (res.unpriced_calls ?? 0));
      aiCalls.push(res.ai_calls ?? 0);
      aiTokens.push(res.ai_tokens ?? 0);
    }

    const metrics: AggregateMetrics = {
      intent_accuracy: buildRateMetric(intentMatchK, intentMatchN, minSample),
      language_accuracy: buildRateMetric(langMatchK, langMatchN, minSample),
      must_precision: buildRateMetric(mustPrecK, mustPrecN, minSample),
      must_recall: buildRateMetric(mustRecK, mustRecN, minSample),
      should_recall: buildRateMetric(shouldRecK, shouldRecN, minSample),
      exclusion_correctness: buildRateMetric(exclK, exclN, minSample),
      location_accuracy: buildRateMetric(locK, locN, minSample),
      ambiguity_handled: buildRateMetric(ambK, ambN, minSample),
      contract_validity_rate: buildRateMetric(contractValidK, total, minSample),
      zero_result_rate: buildRateMetric(zeroResultK, zeroResultN, minSample),
      duplicate_rate: buildRateMetric(duplicateK, duplicateN, minSample),
      cache_hit_rate: buildRateMetric(cacheHitK, cacheHitN, minSample),
      adversarial_pass_rate: buildRateMetric(advPassK, advPassN, minSample),
      provider_calls_per_search: computeNumericSummary(providerCalls, minSample),
      cost_units_per_search: computeNumericSummary(costUnits, minSample),
      ai_calls_per_search: computeNumericSummary(aiCalls, minSample),
      ai_tokens_per_search: computeNumericSummary(aiTokens, minSample),
      latency_ms: computeNumericSummary(latencies, minSample)
    };

    return {
      total_cases: total,
      metrics
    };
  }

  /**
   * Builds the comprehensive run summary across all slices.
   */
  public static summarizeRun(
    runId: string,
    datasetVersion: string,
    datasetHash: string,
    cases: EvalCase[],
    caseResults: EvalCaseResult[],
    adapters: any,
    mode: any
  ): EvalRunSummary {
    const overall = this.computeSliceMetrics(cases, caseResults).metrics;

    // By label status
    const draftCases = cases.filter(c => c.label_status === 'draft');
    const draftResults = caseResults.filter(r => r.label_status === 'draft');
    const hvCases = cases.filter(c => c.label_status === 'human_verified');
    const hvResults = caseResults.filter(r => r.label_status === 'human_verified');

    // By language
    const languages = Array.from(new Set(cases.map(c => c.language)));
    const by_language: Record<string, SliceMetrics> = {};
    for (const lang of languages) {
      const sliceCases = cases.filter(c => c.language === lang);
      const sliceResults = caseResults.filter(r => r.language === lang);
      by_language[lang] = this.computeSliceMetrics(sliceCases, sliceResults);
    }

    // By category
    const categories = Array.from(new Set(cases.map(c => c.category)));
    const by_category: Record<string, SliceMetrics> = {};
    for (const cat of categories) {
      const sliceCases = cases.filter(c => c.category === cat);
      const sliceResults = caseResults.filter(r => r.category === cat);
      by_category[cat] = this.computeSliceMetrics(sliceCases, sliceResults);
    }

    let passedCount = 0;
    let failedCount = 0;
    let crashedCount = 0;
    let lackingPlaceLabels = 0;

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const r = caseResults[i];
      if (r.passed) passedCount++;
      else failedCount++;
      if (r.crashed) crashedCount++;
      if (!c.expected?.retrieval?.allowed_place_ids || c.expected.retrieval.allowed_place_ids.length === 0) {
        lackingPlaceLabels++;
      }
    }

    return {
      run_id: runId,
      timestamp: new Date().toISOString(),
      dataset_version: datasetVersion,
      dataset_hash: datasetHash,
      versions: {
        contract: '2.0.0',
        taxonomy: '2.0.0',
        parser: '0.9.0',
        normalizer: '1.0.0'
      },
      adapters,
      mode,
      total_cases: cases.length,
      cases_passed: passedCount,
      cases_failed: failedCount,
      cases_crashed: crashedCount,
      cases_lacking_human_verification: draftCases.length,
      cases_lacking_place_labels: lackingPlaceLabels,
      overall,
      by_label_status: {
        draft: this.computeSliceMetrics(draftCases, draftResults),
        human_verified: this.computeSliceMetrics(hvCases, hvResults)
      },
      by_language,
      by_category
    };
  }
}
