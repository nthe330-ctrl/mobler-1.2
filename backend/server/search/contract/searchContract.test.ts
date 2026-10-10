import fs from 'fs';
import path from 'path';
import {
  SearchIntent,
  Requirement,
  Evidence,
  CURRENT_CONTRACT_VERSIONS
} from './types';
import {
  validateSearchIntent,
  validateEvidence,
  validateRequirement,
  validateConfidence
} from './validator';
import { StubTaxonomyLookup } from './testUtils';
import {
  InMemoryComplianceRegistry,
  ComplianceReviewEntry
} from './complianceRegistry';
import {
  deriveRequirementViews,
  isEvidenceNegative,
  shouldEvidencePenalize,
  doesEvidenceStatusReduceScoreByDefault,
  sanitizeSearchIntentForTelemetry
} from './helpers';

export interface TestResultItem {
  testName: string;
  passed: boolean;
  details?: string;
}

export interface ContractTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
}

/**
 * Test Runner for Canonical Search Contract (Phase 2A)
 */
export async function runSearchContractTestSuite(): Promise<ContractTestSuiteSummary> {
  const results: TestResultItem[] = [];

  function assert(name: string, condition: boolean, message: string = '') {
    if (condition) {
      results.push({ testName: name, passed: true });
    } else {
      results.push({ testName: name, passed: false, details: message });
    }
  }

  try {
    const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'search-contract');

    // Setup Test Compliance Registry with mock reviews
    const testRegistry = new InMemoryComplianceRegistry([
      {
        id: 'cr_test_approved_item_001',
        status: 'approved',
        approved_by: 'compliance_officer_alice',
        approved_at: '2026-03-15T10:00:00Z',
        scope: 'wifi_high_speed_cache_tier1'
      },
      {
        id: 'cr_test_approved_missing_approver',
        status: 'approved',
        approved_by: undefined,
        approved_at: '2026-03-15T10:00:00Z',
        scope: 'wifi_speed'
      },
      {
        id: 'cr_test_approved_missing_approved_at',
        status: 'approved',
        approved_by: 'compliance_officer_alice',
        approved_at: undefined,
        scope: 'wifi_speed'
      },
      {
        id: 'cr_test_approved_missing_scope',
        status: 'approved',
        approved_by: 'compliance_officer_alice',
        approved_at: '2026-03-15T10:00:00Z',
        scope: ''
      },
      {
        id: 'cr_test_pending_item_001',
        status: 'pending',
        approved_by: undefined,
        approved_at: undefined,
        scope: 'wifi_speed'
      },
      {
        id: 'cr_test_rejected_item_001',
        status: 'rejected',
        approved_by: 'compliance_officer_bob',
        approved_at: '2026-03-16T12:00:00Z',
        scope: 'unauthorized_google_data'
      }
    ]);

    const testTaxonomy = new StubTaxonomyLookup({
      cafe: 'place_type',
      quiet_work: 'experience',
      good_wifi: 'attribute',
      smoking_allowed: 'attribute',
      reading_nook: 'experience'
    });

    const validationOptions = {
      taxonomyLookup: testTaxonomy,
      complianceRegistry: testRegistry
    };

    // 1. VALID FIXTURES TESTS
    const validFixtures = [
      'name-search.valid.json',
      'experience-attribute-location.valid.json',
      'exclusion.valid.json',
      'mixed-language.valid.json',
      'discovery-mode.valid.json',
      'vi-query-tw-gps.valid.json'
    ];

    for (const file of validFixtures) {
      const filePath = path.join(fixturesDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const res = validateSearchIntent(json, validationOptions);

      assert(
        `Valid Fixture: ${file}`,
        res.valid && res.errors.length === 0,
        `Validation failed for ${file}: ${JSON.stringify(res.errors)}`
      );
    }

    // 2. INVALID FIXTURES TESTS
    // 2a. name-with-canonical-id
    const rawNameWithCanId = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'name-with-canonical-id.invalid.json'), 'utf-8'));
    const resNameWithCanId = validateSearchIntent(rawNameWithCanId, validationOptions);
    assert(
      'Invalid Fixture: name-with-canonical-id.invalid.json',
      !resNameWithCanId.valid && resNameWithCanId.errors.some(e => e.code === 'CANONICAL_ID_FORBIDDEN_FOR_NAME'),
      `Expected CANONICAL_ID_FORBIDDEN_FOR_NAME, got ${JSON.stringify(resNameWithCanId.errors)}`
    );

    // 2b. experience-without-canonical-id
    const rawExpWithoutCanId = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'experience-without-canonical-id.invalid.json'), 'utf-8'));
    const resExpWithoutCanId = validateSearchIntent(rawExpWithoutCanId, validationOptions);
    assert(
      'Invalid Fixture: experience-without-canonical-id.invalid.json',
      !resExpWithoutCanId.valid && resExpWithoutCanId.errors.some(e => e.code === 'MISSING_CANONICAL_ID' || e.code === 'VALUE_FORBIDDEN_FOR_CANONICAL_TYPE'),
      `Expected MISSING_CANONICAL_ID or VALUE_FORBIDDEN, got ${JSON.stringify(resExpWithoutCanId.errors)}`
    );

    // 2c. confidence-out-of-range
    const rawConfRange = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'confidence-out-of-range.invalid.json'), 'utf-8'));
    const resConfRange = validateSearchIntent(rawConfRange, validationOptions);
    assert(
      'Invalid Fixture: confidence-out-of-range.invalid.json',
      !resConfRange.valid && resConfRange.errors.some(e => e.code === 'INVALID_CONFIDENCE'),
      `Expected INVALID_CONFIDENCE, got ${JSON.stringify(resConfRange.errors)}`
    );

    // 2d. confidence-nan
    const rawConfNan = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'confidence-nan.invalid.json'), 'utf-8'));
    const resConfNan = validateSearchIntent(rawConfNan, validationOptions);
    assert(
      'Invalid Fixture: confidence-nan.invalid.json',
      !resConfNan.valid && resConfNan.errors.some(e => e.code === 'INVALID_CONFIDENCE'),
      `Expected INVALID_CONFIDENCE, got ${JSON.stringify(resConfNan.errors)}`
    );

    // 2e. google-provider-persistable-no-ref
    const rawGoogleNoRef = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'google-provider-persistable-no-ref.invalid.json'), 'utf-8'));
    const resGoogleNoRef = validateEvidence(rawGoogleNoRef, validationOptions);
    assert(
      'Invalid Fixture: google-provider-persistable-no-ref.invalid.json',
      !resGoogleNoRef.valid && resGoogleNoRef.errors.some(e => e.code === 'MISSING_COMPLIANCE_REVIEW_REF'),
      `Expected MISSING_COMPLIANCE_REVIEW_REF, got ${JSON.stringify(resGoogleNoRef.errors)}`
    );

    // 2f. ref-not-in-registry
    const rawRefNotInReg = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'ref-not-in-registry.invalid.json'), 'utf-8'));
    const resRefNotInReg = validateEvidence(rawRefNotInReg, validationOptions);
    assert(
      'Invalid Fixture: ref-not-in-registry.invalid.json',
      !resRefNotInReg.valid && resRefNotInReg.errors.some(e => e.code === 'COMPLIANCE_REVIEW_NOT_FOUND'),
      `Expected COMPLIANCE_REVIEW_NOT_FOUND, got ${JSON.stringify(resRefNotInReg.errors)}`
    );

    // 2g. ref-pending
    const rawRefPending = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'ref-pending.invalid.json'), 'utf-8'));
    const resRefPending = validateEvidence(rawRefPending, validationOptions);
    assert(
      'Invalid Fixture: ref-pending.invalid.json',
      !resRefPending.valid && resRefPending.errors.some(e => e.code === 'COMPLIANCE_REVIEW_NOT_APPROVED'),
      `Expected COMPLIANCE_REVIEW_NOT_APPROVED, got ${JSON.stringify(resRefPending.errors)}`
    );

    // 2h. internal-derived-google-persistable-without-approved-ref
    const rawDerivedNoRef = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'internal-derived-google-persistable-without-approved-ref.invalid.json'), 'utf-8'));
    const resDerivedNoRef = validateEvidence(rawDerivedNoRef, validationOptions);
    assert(
      'Invalid Fixture: internal-derived-google-persistable-without-approved-ref.invalid.json',
      !resDerivedNoRef.valid && resDerivedNoRef.errors.some(e => e.code === 'MISSING_COMPLIANCE_REVIEW_REF'),
      `Expected MISSING_COMPLIANCE_REVIEW_REF for internal_derived inheriting google constraints, got ${JSON.stringify(resDerivedNoRef.errors)}`
    );

    // 2i. unknown-extra-field
    const rawExtraField = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'unknown-extra-field.invalid.json'), 'utf-8'));
    const resExtraField = validateSearchIntent(rawExtraField, validationOptions);
    assert(
      'Invalid Fixture: unknown-extra-field.invalid.json',
      !resExtraField.valid && resExtraField.errors.some(e => e.code === 'UNKNOWN_FIELD'),
      `Expected UNKNOWN_FIELD, got ${JSON.stringify(resExtraField.errors)}`
    );

    // 3. C1: LANGUAGE AND LOCATION INDEPENDENCE
    const twGpsFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'vi-query-tw-gps.valid.json'), 'utf-8'));
    assert(
      'C1: Language and location independence (vi query with Taiwan GPS)',
      twGpsFixture.language === 'vi' &&
      twGpsFixture.location &&
      twGpsFixture.location.source === 'gps' &&
      validateSearchIntent(twGpsFixture, validationOptions).valid,
      'Failed language and location independence validation'
    );

    // 4. C3: CONDITIONAL REQUIREMENT RULES & DERIVED VIEWS
    const sampleRequirements: Requirement[] = [
      { id: 'r1', type: 'place_type', canonical_id: 'cafe', priority: 'must', polarity: 'include', confidence: 0.95, source: 'deterministic' },
      { id: 'r2', type: 'experience', canonical_id: 'quiet_work', priority: 'must', polarity: 'include', confidence: 0.90, source: 'ai' },
      { id: 'r3', type: 'attribute', canonical_id: 'good_wifi', priority: 'should', polarity: 'include', confidence: 0.85, source: 'deterministic' },
      { id: 'r4', type: 'attribute', canonical_id: 'smoking_allowed', priority: 'must', polarity: 'exclude', confidence: 0.92, source: 'deterministic' },
      { id: 'r5', type: 'name', value: 'The Workshop', priority: 'must', polarity: 'include', confidence: 0.99, source: 'deterministic' }
    ];

    const views = deriveRequirementViews(sampleRequirements);
    assert(
      'C3: deriveRequirementViews helper splits requirements into views',
      views.place_types.length === 1 &&
      views.experiences.length === 1 &&
      views.attributes.length === 2 &&
      views.names.length === 1 &&
      views.exclusions.length === 1 &&
      views.exclusions[0].canonical_id === 'smoking_allowed' &&
      views.mustHaves.length === 3,
      `Derived views mismatch: ${JSON.stringify(views)}`
    );

    // 5. C7: EVIDENCE APPROVED REGISTRY RESOLUTION
    const approvedGoogleEvidence: Evidence = {
      feature_id: 'wifi_high_speed',
      status: 'verified',
      positive_count: 15,
      negative_count: 0,
      confidence: 0.95,
      source_type: 'google_provider',
      data_owner: 'google_provider',
      persistable: true,
      compliance_review_ref: 'cr_test_approved_item_001'
    };
    const resApproved = validateEvidence(approvedGoogleEvidence, validationOptions);
    assert(
      'C7: Google-derived persistable evidence with approved registry ref succeeds',
      resApproved.valid && resApproved.errors.length === 0,
      `Approved evidence validation failed: ${JSON.stringify(resApproved.errors)}`
    );

    // 5b. C7: APPROVED REGISTRY ENTRY MISSING approved_by MUST BE REJECTED
    const evidenceMissingApprover: Evidence = {
      ...approvedGoogleEvidence,
      compliance_review_ref: 'cr_test_approved_missing_approver'
    };
    const resMissingApprover = validateEvidence(evidenceMissingApprover, validationOptions);
    assert(
      'C7: Approved registry entry missing approved_by is rejected with COMPLIANCE_REVIEW_INCOMPLETE',
      !resMissingApprover.valid && resMissingApprover.errors.some(e => e.code === 'COMPLIANCE_REVIEW_INCOMPLETE'),
      `Expected COMPLIANCE_REVIEW_INCOMPLETE for missing approved_by, got ${JSON.stringify(resMissingApprover.errors)}`
    );

    // 5c. C7: APPROVED REGISTRY ENTRY MISSING approved_at MUST BE REJECTED
    const evidenceMissingApprovedAt: Evidence = {
      ...approvedGoogleEvidence,
      compliance_review_ref: 'cr_test_approved_missing_approved_at'
    };
    const resMissingApprovedAt = validateEvidence(evidenceMissingApprovedAt, validationOptions);
    assert(
      'C7: Approved registry entry missing approved_at is rejected with COMPLIANCE_REVIEW_INCOMPLETE',
      !resMissingApprovedAt.valid && resMissingApprovedAt.errors.some(e => e.code === 'COMPLIANCE_REVIEW_INCOMPLETE'),
      `Expected COMPLIANCE_REVIEW_INCOMPLETE for missing approved_at, got ${JSON.stringify(resMissingApprovedAt.errors)}`
    );

    // 5d. C7: APPROVED REGISTRY ENTRY MISSING scope MUST BE REJECTED
    const evidenceMissingScope: Evidence = {
      ...approvedGoogleEvidence,
      compliance_review_ref: 'cr_test_approved_missing_scope'
    };
    const resMissingScope = validateEvidence(evidenceMissingScope, validationOptions);
    assert(
      'C7: Approved registry entry missing scope is rejected with COMPLIANCE_REVIEW_INCOMPLETE',
      !resMissingScope.valid && resMissingScope.errors.some(e => e.code === 'COMPLIANCE_REVIEW_INCOMPLETE'),
      `Expected COMPLIANCE_REVIEW_INCOMPLETE for missing scope, got ${JSON.stringify(resMissingScope.errors)}`
    );

    // 6. C7: SOURCE_TYPE google_provider REQUIRES DATA_OWNER google_provider
    const invalidOwnerEvidence: any = {
      feature_id: 'wifi_high_speed',
      status: 'verified',
      positive_count: 5,
      negative_count: 0,
      confidence: 0.9,
      source_type: 'google_provider',
      data_owner: 'mobler_first_party', // mismatch
      persistable: false
    };
    const resInvalidOwner = validateEvidence(invalidOwnerEvidence, validationOptions);
    assert(
      'C7: source_type google_provider requires data_owner google_provider',
      !resInvalidOwner.valid && resInvalidOwner.errors.some(e => e.code === 'GOOGLE_SOURCE_REQUIRES_GOOGLE_OWNER'),
      `Expected GOOGLE_SOURCE_REQUIRES_GOOGLE_OWNER, got ${JSON.stringify(resInvalidOwner.errors)}`
    );

    // 7. C7: UNKNOWN SEMANTICS HELPER
    assert(
      'C7: Unknown status semantics (unknown != negative, unknown does not penalize score)',
      !isEvidenceNegative('unknown') &&
      !shouldEvidencePenalize('unknown') &&
      !doesEvidenceStatusReduceScoreByDefault('unknown') &&
      isEvidenceNegative('negative') &&
      shouldEvidencePenalize('negative'),
      'Unknown semantics helper validation failed'
    );

    // 8. C2/C4: RAW_QUERY TELEMETRY SANITIZATION
    const rawIntentSample: SearchIntent = {
      raw_query: 'sensitive user input with personal notes',
      normalized_query: 'the workshop coffee',
      language: 'en',
      intent: 'search_by_name',
      entities: [],
      location: null,
      requirements: [
        {
          id: 'req1',
          type: 'name',
          value: 'The Workshop Coffee',
          priority: 'must',
          polarity: 'include',
          confidence: 0.95,
          source: 'deterministic'
        }
      ],
      search_mode: 'standard',
      ambiguities: [],
      parse_source: 'fast_path',
      confidence: 0.95,
      versions: CURRENT_CONTRACT_VERSIONS
    };

    const sanitized = sanitizeSearchIntentForTelemetry(rawIntentSample);
    assert(
      'C2: sanitizeSearchIntentForTelemetry strips raw_query',
      !('raw_query' in sanitized) && sanitized.normalized_query === 'the workshop coffee',
      'raw_query was not stripped'
    );

    // 9. C6: CONFIDENCE STRICT NUMBER VALIDATION (NaN, Infinity, range)
    const errs1: any[] = [];
    validateConfidence(NaN, 'confidence', errs1);
    validateConfidence(Infinity, 'confidence', errs1);
    validateConfidence(-0.1, 'confidence', errs1);
    validateConfidence(1.0001, 'confidence', errs1);
    validateConfidence('0.5', 'confidence', errs1);

    const errs2: any[] = [];
    const validConf0 = validateConfidence(0, 'confidence', errs2);
    const validConf1 = validateConfidence(1, 'confidence', errs2);
    const validConfMid = validateConfidence(0.725, 'confidence', errs2);

    assert(
      'C6: Confidence strict number validator rejects NaN, Infinity, strings, and bounds',
      errs1.length === 5 && validConf0 && validConf1 && validConfMid && errs2.length === 0,
      `Confidence check failed. errs1=${errs1.length}, errs2=${errs2.length}`
    );

    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.filter(r => !r.passed).length;

    return {
      total: results.length,
      passed: totalPassed,
      failed: totalFailed,
      results
    };
  } catch (err: any) {
    results.push({ testName: 'Unexpected Contract Test Suite Error', passed: false, details: err?.message });
    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    };
  }
}
