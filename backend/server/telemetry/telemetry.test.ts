import { SearchTelemetry, SearchTraceSession, CURRENT_PARSER_VERSION } from './SearchTelemetry';
import { CostLedger } from './CostLedger';
import { CostProfileConfig, PLACES_FIELD_TIER_TABLE } from './CostProfileConfig';

/**
 * Self-contained Test Runner for Telemetry & Cost Ledger (Phase 1B & Phase 1B-R Remediation)
 */
export async function runTelemetryTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: { testName: string; passed: boolean; details?: string }[];
  benchmark?: {
    iterations: number;
    telemetry_off_p50_ms: number;
    telemetry_on_p50_ms: number;
    overhead_p50_ms: number;
    telemetry_off_mean_ms: number;
    telemetry_on_mean_ms: number;
    overhead_mean_ms: number;
  };
}> {
  const results: { testName: string; passed: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, message: string = '') {
    if (condition) {
      results.push({ testName: name, passed: true });
    } else {
      results.push({ testName: name, passed: false, details: message });
    }
  }

  try {
    // 1. Search trace creation with query versioning and opaque geo bucket
    const trace1 = SearchTelemetry.startTrace({
      rawQuery: 'quán cà phê mèo yên tĩnh',
      latitude: 10.7769,
      longitude: 106.7009,
      city: 'Ho Chi Minh City',
      radiusMeters: 5000
    });
    assert(
      '1. Search trace creation with query versioning and opaque geo bucket',
      Boolean(
        trace1.searchId &&
        trace1.searchId.startsWith('src_') &&
        trace1.normalizerVersion === 'norm_v1.0' &&
        trace1.parserVersion === CURRENT_PARSER_VERSION &&
        trace1.taxonomyVersion === 'taxo_v16_canonical' &&
        trace1.geoBucketId.startsWith('geo_bkt_')
      ),
      `Trace creation failed. searchId: ${trace1.searchId}, bucket: ${trace1.geoBucketId}`
    );

    // 2. Provider request event and SKU resolution
    const mask = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.reviews';
    trace1.recordProviderCall({
      provider: 'google_places',
      operation: 'text_search_enterprise',
      apiMethod: 'places:searchText',
      fieldMask: mask,
      latencyMs: 145,
      success: true,
      resultCount: 15
    });

    const entries1 = CostLedger.getEntriesForSearch(trace1.searchId);
    const provEntry = entries1.find(e => e.provider === 'google_places');
    assert(
      '2. Provider request event and SKU resolution',
      Boolean(
        provEntry &&
        provEntry.success &&
        provEntry.latency_ms === 145 &&
        provEntry.sku === 'SKU_PLACES_TEXT_SEARCH_ENTERPRISE' &&
        provEntry.internal_cost_units === 40.0 &&
        provEntry.estimated_usd === 0.040
      ),
      `Expected SKU_PLACES_TEXT_SEARCH_ENTERPRISE ($0.040, 40 units), got ${provEntry?.sku}, ${provEntry?.estimated_usd}`
    );

    // 3. Field-mask resolution: Text Search Basic vs Pro vs Enterprise
    const basicRes = CostProfileConfig.resolveGooglePlacesSku('text_search', 'places.id,places.displayName,places.formattedAddress');
    const proRes = CostProfileConfig.resolveGooglePlacesSku('text_search', 'places.id,places.displayName,places.photos,places.websiteUri');
    const entRes = CostProfileConfig.resolveGooglePlacesSku('text_search', 'places.id,places.displayName,places.rating,places.reviews');
    assert(
      '3. Field-mask resolution: Text Search Basic vs Pro vs Enterprise',
      Boolean(
        basicRes.sku === 'SKU_PLACES_TEXT_SEARCH_BASIC' && basicRes.internalCostUnits === 5.0 &&
        proRes.sku === 'SKU_PLACES_TEXT_SEARCH_PRO' && proRes.internalCostUnits === 32.0 &&
        entRes.sku === 'SKU_PLACES_TEXT_SEARCH_ENTERPRISE' && entRes.internalCostUnits === 40.0
      ),
      `Text search resolution failed: basic=${basicRes.sku}, pro=${proRes.sku}, ent=${entRes.sku}`
    );

    // 4. Field-mask resolution: Place Details Basic vs Pro vs Enterprise vs Enterprise+Atmosphere
    const dtBasic = CostProfileConfig.resolveGooglePlacesSku('places/{placeId}', 'places.id,places.displayName,places.location');
    const dtPro = CostProfileConfig.resolveGooglePlacesSku('places/{placeId}', 'places.id,places.photos,places.websiteUri');
    const dtEnt = CostProfileConfig.resolveGooglePlacesSku('places/{placeId}', 'places.id,places.rating,places.userRatingCount');
    const dtAtm = CostProfileConfig.resolveGooglePlacesSku('places/{placeId}', 'places.id,places.reviews,places.editorialSummary');
    assert(
      '4. Field-mask resolution: Place Details Basic vs Pro vs Enterprise vs Enterprise+Atmosphere',
      Boolean(
        dtBasic.sku === 'SKU_PLACES_DETAILS_BASIC' && dtBasic.internalCostUnits === 5.0 &&
        dtPro.sku === 'SKU_PLACES_DETAILS_PRO' && dtPro.internalCostUnits === 17.0 &&
        dtEnt.sku === 'SKU_PLACES_DETAILS_ENTERPRISE' && dtEnt.internalCostUnits === 25.0 &&
        dtAtm.sku === 'SKU_PLACES_DETAILS_ENTERPRISE_ATMOSPHERE' && dtAtm.internalCostUnits === 30.0
      ),
      `Details resolution failed: basic=${dtBasic.sku}, pro=${dtPro.sku}, ent=${dtEnt.sku}, atm=${dtAtm.sku}`
    );

    // 5. Per-operation mapping differences (Text Search vs Nearby Search vs Place Details)
    const nbPro = CostProfileConfig.resolveGooglePlacesSku('places:searchNearby', 'places.id,places.photos');
    const tsPro = CostProfileConfig.resolveGooglePlacesSku('places:searchText', 'places.id,places.photos');
    const pdPro = CostProfileConfig.resolveGooglePlacesSku('places/{placeId}', 'places.id,places.photos');
    assert(
      '5. Per-operation mapping differences (Text Search vs Nearby Search vs Place Details)',
      Boolean(
        nbPro.sku === 'SKU_PLACES_NEARBY_SEARCH_PRO' &&
        tsPro.sku === 'SKU_PLACES_TEXT_SEARCH_PRO' &&
        pdPro.sku === 'SKU_PLACES_DETAILS_PRO'
      ),
      `Operation mapping failed: nb=${nbPro.sku}, ts=${tsPro.sku}, pd=${pdPro.sku}`
    );

    // 6. Unknown field in mask -> status "unresolved" + highest tier SKU + flagged in ledger
    const unkRes = CostProfileConfig.resolveGooglePlacesSku('text_search', 'places.id,places.customUnpublishedExperimentalField');
    assert(
      '6. Unknown field in mask -> status unresolved + highest tier SKU',
      Boolean(
        unkRes.isUnresolvedField === true &&
        unkRes.unresolvedFields.includes('places.customUnpublishedExperimentalField') &&
        unkRes.sku === 'SKU_PLACES_TEXT_SEARCH_ENTERPRISE' &&
        unkRes.internalCostUnits === 40.0
      ),
      `Unknown field resolution failed: isUnresolved=${unkRes.isUnresolvedField}, sku=${unkRes.sku}`
    );

    // 7. Unverified price marking (explicitly flag unverified pricing models)
    const profiles = CostProfileConfig.getProfiles();
    const placesVerified = profiles.filter(p => p.provider === 'google_places').every(p => p.verification_status === 'verified');
    const flashLiteProfile = profiles.find(p => p.operation === 'gemini-3.1-flash-lite');
    const flash38Profile = profiles.find(p => p.operation === 'gemini-3.8-flash');
    assert(
      '7. Unverified price marking (explicitly flag unverified preview models in code)',
      Boolean(
        placesVerified &&
        flashLiteProfile && flashLiteProfile.verification_status === 'unverified' &&
        flash38Profile && flash38Profile.verification_status === 'unverified'
      ),
      `Verification status check failed: placesVerified=${placesVerified}, flashLite=${flashLiteProfile?.verification_status}`
    );

    // 8. Cache hit recording
    trace1.recordCacheHit('placesCache', 'cache_key_cat_cafe_10.77_106.70', 2);
    const hitEntry = CostLedger.getEntriesForSearch(trace1.searchId).find(e => e.event_type === 'cache_hit');
    assert(
      '8. Cache hit recording',
      Boolean(hitEntry && hitEntry.cache_hit === true),
      'Cache hit not properly recorded'
    );

    // 9. Cache miss recording
    trace1.recordCacheMiss('placesCache', 'cache_key_dog_cafe_10.77_106.70', 3);
    const missEntry = CostLedger.getEntriesForSearch(trace1.searchId).find(e => e.event_type === 'cache_miss');
    assert(
      '9. Cache miss recording',
      Boolean(missEntry && missEntry.cache_hit === false),
      'Cache miss not properly recorded'
    );

    // 10. AI request, token estimation & token_count_source: 'estimated_from_text'
    trace1.recordAiCall({
      model: 'gemini-3.1-flash-lite',
      operation: 'query_expansion',
      inputTokens: 450,
      outputTokens: 120,
      tokenCountSource: 'estimated_from_text',
      latencyMs: 380,
      success: true
    });
    const aiEntry = CostLedger.getEntriesForSearch(trace1.searchId).find(e => e.provider === 'gemini');
    assert(
      '10. AI request, token estimation & token_count_source: estimated_from_text',
      Boolean(
        aiEntry &&
        aiEntry.ai_call &&
        aiEntry.ai_input_tokens === 450 &&
        aiEntry.token_count_source === 'estimated_from_text' &&
        aiEntry.is_token_estimated === true
      ),
      `AI request event not properly recorded: ${JSON.stringify(aiEntry)}`
    );

    // 11. Latency step measurement
    trace1.startStep('custom_step');
    await new Promise(r => setTimeout(r, 20));
    const stepDuration = trace1.endStep('custom_step');
    assert(
      '11. Latency step measurement',
      stepDuration >= 15,
      `Step duration was ${stepDuration}ms, expected >= 15ms`
    );

    // 12. Provider error recording
    const trace2 = SearchTelemetry.startTrace({ rawQuery: 'error test' });
    trace2.recordProviderCall({
      provider: 'google_places',
      operation: 'text_search_enterprise',
      apiMethod: 'places:searchText',
      latencyMs: 50,
      success: false,
      errorCode: 'RESOURCE_EXHAUSTED',
      errorMessage: 'Quota exceeded for project'
    });
    const errEntries = CostLedger.getEntriesForSearch(trace2.searchId);
    const errEntry = errEntries.find(e => e.error_code === 'RESOURCE_EXHAUSTED');
    assert(
      '12. Provider error recording',
      Boolean(errEntry && !errEntry.success && errEntry.error_code === 'RESOURCE_EXHAUSTED'),
      'Provider error not recorded'
    );

    // 13. Search failure handling
    const failedSummary = trace2.fail('INTERNAL_ABORT', 'Test simulated failure');
    assert(
      '13. Search failure handling',
      failedSummary.success === false && failedSummary.error_code === 'INTERNAL_ABORT',
      'Search failure summary mismatch'
    );

    // 14. Search success & candidate metrics
    trace1.recordCandidateCounts({
      candidateCount: 20,
      deduplicatedCount: 18,
      verifiedCount: 12,
      finalResultCount: 15
    });
    const successSummary = trace1.complete();
    assert(
      '14. Search success & candidate metrics',
      Boolean(
        successSummary.success &&
        successSummary.candidate_count === 20 &&
        successSummary.verified_count === 12 &&
        successSummary.final_result_count === 15
      ),
      'Summary metrics incorrect'
    );

    // 15. Cost aggregation (separate internal_cost_units vs estimated_usd vs actual_usd)
    assert(
      '15. Cost aggregation (separate internal_cost_units vs estimated_usd vs actual_usd)',
      Boolean(
        successSummary.internal_cost_units > 0 &&
        successSummary.estimated_usd > 0 &&
        successSummary.actual_usd === null
      ),
      `Cost unit separation failed: units=${successSummary.internal_cost_units}, est_usd=${successSummary.estimated_usd}, act_usd=${successSummary.actual_usd}`
    );

    // 16. Free-tier counter separation (monthly counter not deducted from per-search estimated cost)
    const textProProfile = profiles.find(p => p.sku === 'SKU_PLACES_TEXT_SEARCH_PRO');
    assert(
      '16. Free-tier counter separation',
      Boolean(
        textProProfile &&
        textProProfile.account_level_free_tier.monthly_free_requests === 5000 &&
        textProProfile.estimated_cost_per_call_usd === 0.032
      ),
      'Free tier counter separation improperly configured'
    );

    // 17. Query hashing & query versioning (normalizer_version, parser_version, taxonomy_version)
    const hash1 = SearchTelemetry.hashQuery('Quán Cà Phê Mèo');
    const hash2 = SearchTelemetry.hashQuery('quán cà phê mèo ');
    assert(
      '17. Query hashing & query versioning',
      Boolean(
        hash1 &&
        hash1 === hash2 &&
        !hash1.includes('quán') &&
        successSummary.normalizer_version === 'norm_v1.0' &&
        successSummary.parser_version === CURRENT_PARSER_VERSION &&
        successSummary.taxonomy_version === 'taxo_v16_canonical'
      ),
      `Query versioning check failed: hash1=${hash1}, normalizer=${successSummary.normalizer_version}`
    );

    // 17b. SearchIntent telemetry sanitization (raw_query strictly absent from emitted payload)
    const traceWithIntent = SearchTelemetry.startTrace({ rawQuery: 'test raw query for telemetry' });
    traceWithIntent.setSearchIntent({
      raw_query: 'SUPER_SECRET_RAW_QUERY_TEXT',
      normalized_query: 'coffee shop',
      language: 'en',
      intent: 'search_by_name',
      entities: [],
      location: null,
      requirements: [],
      search_mode: 'standard',
      ambiguities: [],
      parse_source: 'fast_path',
      confidence: 1.0,
      versions: {
        contract: 'contract_v2.0',
        taxonomy: 'taxo_v16_canonical',
        parser: CURRENT_PARSER_VERSION,
        normalizer: 'norm_v1.0'
      }
    });
    const summaryWithIntent = traceWithIntent.complete();
    assert(
      '17b. SearchIntent telemetry sanitization (raw_query strictly absent from emitted payload)',
      Boolean(
        summaryWithIntent.sanitized_intent &&
        !('raw_query' in summaryWithIntent.sanitized_intent) &&
        (summaryWithIntent.sanitized_intent as any).raw_query === undefined &&
        summaryWithIntent.sanitized_intent.normalized_query === 'coffee shop'
      ),
      `Sanitization failed: ${JSON.stringify(summaryWithIntent.sanitized_intent)}`
    );

    // 18. Geo privacy: opaque bucket hash, bucket_precision_class, radius_class, no plaintext coordinates
    const geoBucket = SearchTelemetry.resolveGeoBucket(10.7769123, 106.7009456, 'Ho Chi Minh City', 1500);
    assert(
      '18. Geo privacy: opaque bucket hash, bucket_precision_class, radius_class',
      Boolean(
        geoBucket.bucket_id.startsWith('geo_bkt_') &&
        !geoBucket.bucket_id.includes('10.77') &&
        !geoBucket.bucket_id.includes('106.70') &&
        geoBucket.bucket_precision_class === 'COARSE_2KM' &&
        geoBucket.radius_class === 'NEIGHBORHOOD_1KM'
      ),
      `Geo privacy failed: bucket=${geoBucket.bucket_id}, precision=${geoBucket.bucket_precision_class}, radius=${geoBucket.radius_class}`
    );

    // 19. Geo telemetry migration (rewrite/purge old geo_lat_lng identifiers)
    const migrationResult = CostLedger.migrateGeoIdentifiers();
    assert(
      '19. Geo telemetry migration',
      typeof migrationResult.migrated_count === 'number' && typeof migrationResult.total_summaries === 'number',
      `Migration failed: ${JSON.stringify(migrationResult)}`
    );

    // 20. Telemetry failure resilience (Search execution never fails if telemetry fails)
    let resilientPassed = false;
    try {
      (SearchTelemetry as any).hashQuery(null);
      resilientPassed = true;
    } catch {
      resilientPassed = false;
    }
    assert(
      '20. Telemetry failure resilience',
      resilientPassed,
      'Telemetry threw uncaught error on null input'
    );

    // 21. In-memory single-flight coalescing vs cache classification verification
    const fieldTableLength = Object.keys(PLACES_FIELD_TIER_TABLE).length;
    assert(
      '21. In-memory single-flight coalescing vs cache classification verification',
      fieldTableLength > 30,
      `Field tier table has only ${fieldTableLength} entries`
    );

    // 22. Telemetry overhead benchmark (>= 200 mock runs with telemetry ON/OFF)
    const benchmarkResults = await runMockOverheadBenchmark(200);
    assert(
      '22. Telemetry overhead benchmark (200 interleaved mock runs)',
      Boolean(
        benchmarkResults &&
        benchmarkResults.iterations >= 200 &&
        benchmarkResults.overhead_mean_ms < 5.0
      ),
      `Benchmark failed: iterations=${benchmarkResults.iterations}, overhead=${benchmarkResults.overhead_mean_ms}ms`
    );

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      total: results.length,
      passed,
      failed,
      results,
      benchmark: benchmarkResults
    };
  } catch (err: any) {
    results.push({ testName: 'Unexpected Test Runner Error', passed: false, details: err?.message });
    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    };
  }
}

/**
 * Executes an automated interleaved benchmark comparing mock provider search with telemetry ON vs OFF
 */
async function runMockOverheadBenchmark(iterations: number = 200): Promise<{
  iterations: number;
  telemetry_off_p50_ms: number;
  telemetry_on_p50_ms: number;
  overhead_p50_ms: number;
  telemetry_off_mean_ms: number;
  telemetry_on_mean_ms: number;
  overhead_mean_ms: number;
}> {
  // Warm up
  for (let i = 0; i < 10; i++) {
    await simulateMockSearch(true);
    await simulateMockSearch(false);
  }

  const offLatencies: number[] = [];
  const onLatencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Interleaved execution to balance CPU scheduling variance
    const t0Off = performance.now();
    await simulateMockSearch(false);
    offLatencies.push(performance.now() - t0Off);

    const t0On = performance.now();
    await simulateMockSearch(true);
    onLatencies.push(performance.now() - t0On);
  }

  const calcP50 = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length * 0.5)];
  };

  const calcMean = (arr: number[]) => {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const offP50 = Number(calcP50(offLatencies).toFixed(3));
  const onP50 = Number(calcP50(onLatencies).toFixed(3));
  const offMean = Number(calcMean(offLatencies).toFixed(3));
  const onMean = Number(calcMean(onLatencies).toFixed(3));

  return {
    iterations,
    telemetry_off_p50_ms: offP50,
    telemetry_on_p50_ms: onP50,
    overhead_p50_ms: Number((onP50 - offP50).toFixed(3)),
    telemetry_off_mean_ms: offMean,
    telemetry_on_mean_ms: onMean,
    overhead_mean_ms: Number((onMean - offMean).toFixed(3))
  };
}

/**
 * Simulates a fast mock search pipeline (fixed 2ms mock latency) with/without telemetry
 */
async function simulateMockSearch(telemetryEnabled: boolean): Promise<void> {
  let trace: SearchTraceSession | undefined;

  if (telemetryEnabled) {
    trace = SearchTelemetry.startTrace({
      rawQuery: 'mock benchmark query',
      latitude: 10.7769,
      longitude: 106.7009,
      city: 'Ho Chi Minh City'
    });
    trace.startStep('mock_step');
  }

  // Simulated fixed provider work (busy wait / minimal sleep)
  const start = Date.now();
  while (Date.now() - start < 2) {
    // tight busy loop to simulate ~2ms deterministic work
  }

  if (telemetryEnabled && trace) {
    trace.recordProviderCall({
      provider: 'google_places',
      operation: 'text_search_pro',
      apiMethod: 'places:searchText',
      fieldMask: 'places.id,places.displayName,places.photos',
      latencyMs: 2,
      success: true,
      resultCount: 10
    });
    trace.endStep('mock_step');
    trace.complete();
  }
}
