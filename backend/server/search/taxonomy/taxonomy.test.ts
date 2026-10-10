/**
 * MOBLER SEARCH - TAXONOMY REGISTRY ACCEPTANCE TEST SUITE (PHASE 2B)
 */

import {
  TaxonomyRegistry,
  defaultTaxonomyRegistry
} from './TaxonomyRegistry';
import {
  TaxonomyValidator
} from './taxonomyValidator';
import {
  CURRENT_TAXONOMY_VERSION,
  CANONICAL_TAXONOMY_ENTRIES,
  TOMBSTONED_CANONICAL_IDS
} from './registryData';
import {
  normalizeTerm,
  stripVietnameseDiacritics,
  toSimplifiedChinese,
  toTraditionalChinese,
  generateLookupKeys,
  CURRENT_NORMALIZER_VERSION,
  ZH_MAPPING_TABLE_USED
} from './normalization';
import { TaxonomyEntry } from './types';
import { validateSearchIntent } from '../contract/validator';
import { SearchIntent } from '../contract/types';

export interface TestResultItem {
  testName: string;
  passed: boolean;
  details?: string;
}

export interface TaxonomyTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
}

export async function runTaxonomyTestSuite(): Promise<TaxonomyTestSuiteSummary> {
  const results: TestResultItem[] = [];
  const registry = defaultTaxonomyRegistry;

  function assert(name: string, condition: boolean, message: string = '') {
    if (condition) {
      results.push({ testName: name, passed: true });
    } else {
      results.push({ testName: name, passed: false, details: message });
    }
  }

  // -------------------------------------------------------------------------
  // 1. The 16 Target Experiences
  // -------------------------------------------------------------------------
  const target16Experiences = [
    { zhName: '貓咪咖啡廳', enName: 'Cat Café', canonicalId: 'cat_cafe' },
    { zhName: '狗狗咖啡廳', enName: 'Dog Café', canonicalId: 'dog_cafe' },
    { zhName: '桌遊咖啡廳', enName: 'Board Game Café', canonicalId: 'board_game_cafe' },
    { zhName: '手作工作坊', enName: 'Workshop Café', canonicalId: 'workshop_cafe' },
    { zhName: '主機電玩館', enName: 'Console Gaming Café', canonicalId: 'console_gaming_cafe' },
    { zhName: '靜謐書香館', enName: 'Book Café', canonicalId: 'book_cafe' },
    { zhName: '植栽咖啡廳', enName: 'Plant Café', canonicalId: 'plant_cafe' },
    { zhName: '陶藝手作館', enName: 'Ceramic Café', canonicalId: 'ceramic_cafe' },
    { zhName: '黑膠唱片館', enName: 'Vinyl Café', canonicalId: 'vinyl_cafe' },
    { zhName: '時尚選品館', enName: 'Fashion Café', canonicalId: 'fashion_cafe' },
    { zhName: '潮玩盲盒館', enName: 'Art Toy Café', canonicalId: 'art_toy_cafe' },
    { zhName: '動漫主題館', enName: 'Anime Café', canonicalId: 'anime_cafe' },
    { zhName: 'VR虛擬實境', enName: 'VR Café', canonicalId: 'vr_cafe' },
    { zhName: '光影沉浸館', enName: 'Immersive Café', canonicalId: 'immersive_cafe' },
    { zhName: '老車車庫館', enName: 'Car Workshop Café', canonicalId: 'car_workshop_cafe' },
    { zhName: '重機俱樂部', enName: 'Moto Workshop Café', canonicalId: 'moto_workshop_cafe' }
  ];

  for (const target of target16Experiences) {
    const entry = registry.getEntry(target.canonicalId);
    assert(
      `Experience defined: ${target.canonicalId}`,
      entry !== undefined && entry.type === 'experience' && !entry.deprecated && registry.hasCanonicalId(target.canonicalId, 'experience'),
      `Target experience ${target.canonicalId} missing or invalid`
    );

    const zhMatches = registry.lookupTerm(target.zhName, 'zh-TW');
    assert(
      `Experience zh-TW lookup: ${target.canonicalId} (${target.zhName})`,
      zhMatches.some(m => m.canonical_id === target.canonicalId),
      `Failed to match ${target.zhName}`
    );

    const enMatches = registry.lookupTerm(target.enName, 'en');
    assert(
      `Experience en lookup: ${target.canonicalId} (${target.enName})`,
      enMatches.some(m => m.canonical_id === target.canonicalId),
      `Failed to match ${target.enName}`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Multilingual Consistency
  // -------------------------------------------------------------------------
  const enRes = registry.lookupTerm('Cat Café', 'en');
  const viRes = registry.lookupTerm('Cà phê mèo', 'vi');
  const zhRes = registry.lookupTerm('貓咪咖啡廳', 'zh-TW');
  const thRes = registry.lookupTerm('คาเฟ่แมว', 'th');

  assert(
    'Multilingual consistent canonical_id (cat_cafe across en, vi, zh-TW, th)',
    enRes.some(r => r.canonical_id === 'cat_cafe') &&
    viRes.some(r => r.canonical_id === 'cat_cafe') &&
    zhRes.some(r => r.canonical_id === 'cat_cafe') &&
    thRes.some(r => r.canonical_id === 'cat_cafe')
  );

  // -------------------------------------------------------------------------
  // 3. Normalization Engine (Vietnamese, Chinese, Thai)
  // -------------------------------------------------------------------------
  assert(
    'Unicode NFKC, lowercase, whitespace collapse, punctuation stripping',
    normalizeTerm('  Cà Phê - Mèo (Hà Nội)!  ') === 'cà phê mèo hà nội'
  );

  assert(
    'Vietnamese diacritics stripping (tone marks and đ/Đ)',
    stripVietnameseDiacritics('Cà phê đường phố') === 'Ca phe duong pho' &&
    stripVietnameseDiacritics('Đông Đúc') === 'Dong Duc'
  );

  const viAccented = registry.lookupTerm('cà phê mèo', 'vi');
  const viUnaccented = registry.lookupTerm('ca phe meo', 'vi');
  assert(
    'Vietnamese accented and unaccented terms both resolve accurately',
    viAccented.some(r => r.canonical_id === 'cat_cafe') &&
    viUnaccented.some(r => r.canonical_id === 'cat_cafe')
  );

  assert(
    'Chinese Traditional <-> Simplified bidirectional mapping table recorded',
    ZH_MAPPING_TABLE_USED === 'cjk_s2t_t2s_v1' &&
    toSimplifiedChinese('貓咪咖啡廳') === '猫咪咖啡厅' &&
    toTraditionalChinese('猫咪咖啡厅') === '貓咪咖啡廳'
  );

  const zhTrad = registry.lookupTerm('貓咪咖啡廳', 'zh-TW');
  const zhSimp = registry.lookupTerm('猫咪咖啡厅', 'zh-CN');
  assert(
    'Chinese Traditional and Simplified terms both resolve accurately',
    zhTrad.some(r => r.canonical_id === 'cat_cafe') &&
    zhSimp.some(r => r.canonical_id === 'cat_cafe')
  );

  const thMatches = registry.lookupTerm('คาเฟ่แมว', 'th');
  assert(
    'Thai sequence normalization resolves accurately without whitespace assumptions',
    thMatches.some(r => r.canonical_id === 'cat_cafe')
  );

  // -------------------------------------------------------------------------
  // 4. Attributes, Opposites, and Verifiability
  // -------------------------------------------------------------------------
  const quiet = registry.getEntry('quiet');
  assert(
    'Attribute quiet has opposite crowded and verifiable_by mobler_review',
    quiet !== undefined &&
    quiet.type === 'attribute' &&
    quiet.opposite_of === 'crowded' &&
    registry.getOpposite('quiet') === 'crowded' &&
    (quiet.verifiable_by || []).includes('mobler_review')
  );

  assert(
    'Attribute crowded has opposite quiet',
    registry.getOpposite('crowded') === 'quiet'
  );

  const coreAttrs = [
    'quiet', 'work_friendly', 'study_friendly', 'wifi', 'power_outlet',
    'outdoor_seating', 'pet_friendly', 'parking', 'accessible',
    'spacious', 'crowded', 'romantic', 'family_friendly'
  ];
  for (const attr of coreAttrs) {
    assert(
      `Core attribute verified: ${attr}`,
      registry.hasCanonicalId(attr, 'attribute') && registry.getEntry(attr)?.type === 'attribute'
    );
  }

  // -------------------------------------------------------------------------
  // 5. Activities (User Goals)
  // -------------------------------------------------------------------------
  const coreActivities = [
    'work', 'study', 'work_study', 'date', 'meeting',
    'relax', 'social', 'casual_chat', 'gaming', 'board_games',
    'shopping', 'crafting', 'photography'
  ];
  for (const act of coreActivities) {
    assert(
      `Core activity verified: ${act}`,
      registry.hasCanonicalId(act, 'activity') && registry.getEntry(act)?.type === 'activity'
    );
  }

  assert(
    'Activity study has parent work',
    registry.getAncestors('study').includes('work')
  );

  // -------------------------------------------------------------------------
  // 6. Hierarchy Traversal & Constraints
  // -------------------------------------------------------------------------
  const nookAncestors = registry.getAncestors('reading_nook');
  assert(
    'getAncestors returns path to root (reading_nook -> book_cafe -> cafe)',
    nookAncestors.length === 2 && nookAncestors[0] === 'book_cafe' && nookAncestors[1] === 'cafe'
  );

  const cafeDescendants = registry.getDescendants('cafe');
  assert(
    'getDescendants returns all descendant IDs (cat_cafe, book_cafe, reading_nook)',
    cafeDescendants.includes('cat_cafe') &&
    cafeDescendants.includes('book_cafe') &&
    cafeDescendants.includes('reading_nook')
  );

  let maxDepth = 0;
  for (const entry of registry.getAllEntries()) {
    const depth = registry.getAncestors(entry.canonical_id).length;
    if (depth > maxDepth) maxDepth = depth;
  }
  assert(
    'Hierarchy depth does not exceed max limit of 4',
    maxDepth <= 4,
    `Max depth was ${maxDepth}`
  );

  // -------------------------------------------------------------------------
  // 7. Immutability, Deprecation & Tombstones
  // -------------------------------------------------------------------------
  for (const tombstone of TOMBSTONED_CANONICAL_IDS) {
    const entry = registry.getEntry(tombstone);
    assert(
      `Tombstoned ID inactive: ${tombstone}`,
      registry.hasCanonicalId(tombstone) === false &&
      entry !== undefined &&
      entry.deprecated === true &&
      entry.deprecated_by !== undefined
    );
  }

  // -------------------------------------------------------------------------
  // 8. Ambiguity Handling
  // -------------------------------------------------------------------------
  const mockEntries: TaxonomyEntry[] = [
    ...CANONICAL_TAXONOMY_ENTRIES,
    {
      canonical_id: 'test_specialty_beans',
      type: 'place_type',
      names: { en: { text: 'Specialty Beans', translation_status: 'verified', reviewer: 'curated_team' } },
      synonyms: [
        { language: 'en', term: 'roastery_test', normalized_term: 'roastery_test', confidence: 0.9, provenance: 'curated' }
      ],
      related_terms: [],
      exclusions: [],
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    },
    {
      canonical_id: 'test_roast_experience',
      type: 'experience',
      names: { en: { text: 'Coffee Roasting Experience', translation_status: 'verified', reviewer: 'curated_team' } },
      synonyms: [
        { language: 'en', term: 'roastery_test', normalized_term: 'roastery_test', confidence: 0.9, provenance: 'curated' }
      ],
      related_terms: [],
      exclusions: [],
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    }
  ];

  const ambRegistry = new TaxonomyRegistry(mockEntries, TOMBSTONED_CANONICAL_IDS);
  const ambResults = ambRegistry.lookupTerm('roastery_test', 'en');
  assert(
    'Ambiguous synonym returns all candidates with ambiguous: true',
    ambResults.length >= 2 && ambResults.every(r => r.ambiguous === true)
  );

  // -------------------------------------------------------------------------
  // 9. Integrity Validator Negative Tests
  // -------------------------------------------------------------------------
  const cyclicEntries: TaxonomyEntry[] = [
    {
      canonical_id: 'cycle_a',
      type: 'experience',
      names: { en: { text: 'A', translation_status: 'draft' } },
      synonyms: [],
      related_terms: [],
      exclusions: [],
      parent_id: 'cycle_b',
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    },
    {
      canonical_id: 'cycle_b',
      type: 'experience',
      names: { en: { text: 'B', translation_status: 'draft' } },
      synonyms: [],
      related_terms: [],
      exclusions: [],
      parent_id: 'cycle_a',
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    }
  ];
  const cyclicVal = TaxonomyValidator.validateRegistry(cyclicEntries);
  assert(
    'Validator rejects hierarchy cycle (A -> B -> A)',
    !cyclicVal.valid && cyclicVal.errors.some(e => e.code === 'HIERARCHY_CYCLE_DETECTED')
  );

  const invalidTypeEntries: TaxonomyEntry[] = [
    {
      canonical_id: 'parent_attr',
      type: 'attribute',
      names: { en: { text: 'Attr', translation_status: 'draft' } },
      synonyms: [],
      related_terms: [],
      exclusions: [],
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    },
    {
      canonical_id: 'child_exp',
      type: 'experience',
      names: { en: { text: 'Exp', translation_status: 'draft' } },
      synonyms: [],
      related_terms: [],
      exclusions: [],
      parent_id: 'parent_attr',
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    }
  ];
  const invalidTypeVal = TaxonomyValidator.validateRegistry(invalidTypeEntries);
  assert(
    'Validator rejects invalid child-parent type matrix (experience -> attribute)',
    !invalidTypeVal.valid && invalidTypeVal.errors.some(e => e.code === 'INVALID_HIERARCHY_TYPE_COMBINATION')
  );

  const aiSynonymEntries: TaxonomyEntry[] = [
    {
      canonical_id: 'sample_exp',
      type: 'experience',
      names: { en: { text: 'Sample', translation_status: 'draft' } },
      synonyms: [
        {
          language: 'en',
          term: 'ai guessed synonym',
          normalized_term: 'ai guessed synonym',
          confidence: 0.9,
          provenance: 'ai_generated' as any
        }
      ],
      related_terms: [],
      exclusions: [],
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    }
  ];
  const aiSynVal = TaxonomyValidator.validateRegistry(aiSynonymEntries);
  assert(
    'Validator rejects uncurated AI provenance',
    !aiSynVal.valid && aiSynVal.errors.some(e => e.code === 'INVALID_SYNONYM_PROVENANCE')
  );

  const missingReviewerEntries: TaxonomyEntry[] = [
    {
      canonical_id: 'sample_exp',
      type: 'experience',
      names: {
        en: { text: 'Sample', translation_status: 'verified' }
      },
      synonyms: [],
      related_terms: [],
      exclusions: [],
      deprecated: false,
      taxonomy_version: CURRENT_TAXONOMY_VERSION
    }
  ];
  const missingRevVal = TaxonomyValidator.validateRegistry(missingReviewerEntries);
  assert(
    'Validator rejects verified translation without reviewer',
    !missingRevVal.valid && missingRevVal.errors.some(e => e.code === 'MISSING_VERIFIED_REVIEWER')
  );

  // -------------------------------------------------------------------------
  // 10. Integration with Contract Validator
  // -------------------------------------------------------------------------
  const goldenIntent: SearchIntent = {
    normalized_query: 'find quiet cat cafe in da nang for work with wifi',
    language: 'en',
    intent: 'search_by_experience',
    entities: [],
    location: {
      source: 'explicit',
      scope: 'city',
      radius_meters: 5000,
      radius_source: 'system_default',
      strictness: 'must',
      confidence: 0.95
    },
    requirements: [
      {
        id: 'req_exp_1',
        type: 'experience',
        canonical_id: 'cat_cafe',
        priority: 'must',
        polarity: 'include',
        source: 'deterministic',
        confidence: 1.0,
        original_text: 'cat cafe'
      },
      {
        id: 'req_attr_1',
        type: 'attribute',
        canonical_id: 'quiet',
        priority: 'should',
        polarity: 'include',
        source: 'ai',
        confidence: 0.95,
        original_text: 'quiet'
      },
      {
        id: 'req_attr_2',
        type: 'attribute',
        canonical_id: 'wifi',
        priority: 'must',
        polarity: 'include',
        source: 'deterministic',
        confidence: 1.0,
        original_text: 'wifi'
      },
      {
        id: 'req_act_1',
        type: 'activity',
        canonical_id: 'work',
        priority: 'should',
        polarity: 'include',
        source: 'deterministic',
        confidence: 0.9,
        original_text: 'for work'
      }
    ],
    search_mode: 'standard',
    ambiguities: [],
    parse_source: 'fast_path',
    confidence: 0.96,
    versions: {
      contract: 'contract_v2.0',
      taxonomy: CURRENT_TAXONOMY_VERSION,
      normalizer: 'norm_v1.0',
      parser: 'parse_v1.2'
    }
  };

  const goldenVal = validateSearchIntent(goldenIntent);
  assert(
    'Contract validator validates SearchIntent against real TaxonomyRegistry',
    goldenVal.valid && goldenVal.errors.length === 0,
    JSON.stringify(goldenVal.errors)
  );

  const hallucinatedIntent: SearchIntent = {
    normalized_query: 'flying unicorn cafe',
    language: 'en',
    intent: 'search_by_experience',
    entities: [],
    location: null,
    requirements: [
      {
        id: 'req_exp_fake',
        type: 'experience',
        canonical_id: 'flying_unicorn_cafe',
        priority: 'must',
        polarity: 'include',
        source: 'ai',
        confidence: 1.0,
        original_text: 'flying unicorn cafe'
      }
    ],
    search_mode: 'standard',
    ambiguities: [],
    parse_source: 'ai',
    confidence: 0.8,
    versions: {
      contract: 'contract_v2.0',
      taxonomy: CURRENT_TAXONOMY_VERSION,
      normalizer: 'norm_v1.0',
      parser: 'parse_v1.2'
    }
  };

  const hallucinatedVal = validateSearchIntent(hallucinatedIntent);
  assert(
    'Contract validator rejects hallucinated canonical_id',
    !hallucinatedVal.valid && hallucinatedVal.errors.some(e => e.code === 'UNKNOWN_CANONICAL_ID')
  );

  // -------------------------------------------------------------------------
  // 11. Summary Counts and Snapshot
  // -------------------------------------------------------------------------
  const summary = registry.getSummaryCounts();
  assert(
    'Summary counts report accurate totals',
    summary.total_entries >= 40 &&
    summary.type_counts.place_type === 6 &&
    summary.type_counts.experience >= 16 &&
    summary.type_counts.activity >= 10 &&
    summary.type_counts.attribute >= 13 &&
    summary.deprecated_entries === 3
  );

  const snapshot = registry.getSnapshot('pending human approval');
  assert(
    'Baseline snapshot generation produces valid schema with pending human approval',
    snapshot.status === 'pending human approval' &&
    snapshot.taxonomy_version === CURRENT_TAXONOMY_VERSION &&
    snapshot.normalizer_version === CURRENT_NORMALIZER_VERSION &&
    snapshot.entries['cat_cafe'] !== undefined
  );

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results
  };
}
