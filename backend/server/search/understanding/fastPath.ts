/**
 * MOBLER SEARCH - PHASE 4: DETERMINISTIC FAST-PATH PARSER
 * Segments queries, extracts locations (without geocoding), resolves taxonomy terms,
 * detects polarities/exclusions, identifies ambiguities, and extracts business names.
 */

import {
  SearchIntent,
  Requirement,
  LocationIntent,
  SearchAmbiguity,
  ContractVersions,
  CURRENT_CONTRACT_VERSION,
  CURRENT_TAXONOMY_VERSION,
  CURRENT_NORMALIZER_VERSION,
  SearchMode
} from '../contract/types';
import { CURRENT_PARSER_VERSION } from '../../telemetry/SearchTelemetry';
import { normalizeTerm } from '../taxonomy/normalization';
import { TaxonomyRegistry } from '../taxonomy/TaxonomyRegistry';
import {
  STRICT_MODIFIER_PATTERNS,
  EXCLUSION_PATTERNS,
  COMMON_STOPWORDS,
  AMBIGUOUS_QUERY_PATTERNS,
  SHORTHAND_EXPERIENCE_ALIASES
} from './config';
import { QueryUnderstandingConfig } from './types';
import { detectLanguage, LanguageDetectionResult } from './languageDetector';

export interface FastPathResult {
  intent: SearchIntent;
  residualWords: string[];
  matchedTerms: string[];
  isTruncated: boolean;
  hasThaiPattern: boolean;
}

interface LocationMatch {
  scope: 'point' | 'district' | 'neighborhood' | 'city';
  matchedText: string;
  source: 'explicit' | 'gps';
  strictness: 'must' | 'should';
}

const LOCATION_PATTERNS: { regex: RegExp; scope: 'point' | 'district' | 'neighborhood' | 'city'; strictness: 'must' | 'should' }[] = [
  // Nearby / Point
  { regex: /\b(near\s+me|nearby|around\s+here|close\s+by)\b/i, scope: 'point', strictness: 'should' },
  { regex: /\b(gần\s+đây|ở\s+gần|gần\s+tôi|quanh\s+đây)\b/i, scope: 'point', strictness: 'should' },
  { regex: /(這?附近|周邊|周圍)/i, scope: 'point', strictness: 'should' },
  { regex: /(ใกล้ฉัน|แถวนี้|รอบๆ)/i, scope: 'point', strictness: 'should' },

  // Vietnamese Districts & Areas
  { regex: /\b(district\s+[0-9]+)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(quận\s+[0-9]+|quan\s+[0-9]+)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(quận\s+bình\s+thạnh|bình\s+thạnh|binh\s+thanh)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(quận\s+phú\s+nhuận|phú\s+nhuận|phu\s+nhuan)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(quận\s+gò\s+vấp|gò\s+vấp|go\s+vap)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(quận\s+tân\s+bình|tân\s+bình|tan\s+binh)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(thủ\s+đức|thu\s+duc)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(thảo\s+điền|thao\s+dien|an\s+phú)\b/i, scope: 'neighborhood', strictness: 'must' },
  { regex: /\b(hoàn\s+kiếm|hoan\s+kiem)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(tây\s+hồ|tay\s+ho)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(ba\s+đình|ba\s+dinh)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(đống\s+đa|dong\s+da)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(cầu\s+giấy|cau\s+giay)\b/i, scope: 'district', strictness: 'must' },
  { regex: /\b(hải\s+châu|hai\s+chau|sơn\s+trà|son\s+tra)\b/i, scope: 'district', strictness: 'must' },

  // Vietnamese Cities
  { regex: /\b(hồ\s+chí\s+minh|tp\s*hcm|tphcm|sài\s+gòn|saigon)\b/i, scope: 'city', strictness: 'must' },
  { regex: /\b(hà\s+nội|hanoi)\b/i, scope: 'city', strictness: 'must' },
  { regex: /\b(đà\s+nẵng|da\s+nang)\b/i, scope: 'city', strictness: 'must' },
  { regex: /\b(đà\s+lạt|da\s+lat|nha\s+trang|cần\s+thơ|vũng\s+tàu)\b/i, scope: 'city', strictness: 'must' },

  // Taiwan Districts & Areas
  { regex: /(大安區|大安|da['’\s]?an\s+district|da['’\s]?an)/i, scope: 'district', strictness: 'must' },
  { regex: /(信義區|信義|xinyi\s+district|xinyi)/i, scope: 'district', strictness: 'must' },
  { regex: /(中山區|中山|zhongshan)/i, scope: 'district', strictness: 'must' },
  { regex: /(中正區|中正|zhongzheng)/i, scope: 'district', strictness: 'must' },
  { regex: /(松山區|松山|songshan)/i, scope: 'district', strictness: 'must' },
  { regex: /(士林區|士林|shilin)/i, scope: 'district', strictness: 'must' },
  { regex: /(萬華區|萬華|wanhua)/i, scope: 'district', strictness: 'must' },
  { regex: /(西門町|西門|ximending)/i, scope: 'neighborhood', strictness: 'must' },
  { regex: /(公館|師大|板橋|新莊)/i, scope: 'neighborhood', strictness: 'must' },

  // Taiwan Cities
  { regex: /(台北市?|臺北市?|taipei)/i, scope: 'city', strictness: 'must' },
  { regex: /(新北市?|new\s+taipei)/i, scope: 'city', strictness: 'must' },
  { regex: /(台中市?|臺中市?|taichung)/i, scope: 'city', strictness: 'must' },
  { regex: /(高雄市?|kaohsiung)/i, scope: 'city', strictness: 'must' },
  { regex: /(台南市?|臺南市?|tainan|桃園市?|taoyuan|新竹市?|hsinchu)/i, scope: 'city', strictness: 'must' },

  // Thailand Areas
  { regex: /(กรุงเทพฯ?|bangkok)/i, scope: 'city', strictness: 'must' },
  { regex: /(สยาม|siam)/i, scope: 'neighborhood', strictness: 'must' },
  { regex: /(อารีย์|ari)/i, scope: 'neighborhood', strictness: 'must' },
  { regex: /(สุขุมวิท|sukhumvit)/i, scope: 'district', strictness: 'must' },
  { regex: /(ทองหล่อ|thong\s*lor|thonglor)/i, scope: 'neighborhood', strictness: 'must' },
  { regex: /(เอกมัย|ekkamai)/i, scope: 'neighborhood', strictness: 'must' },
  { regex: /(สีลม|silom)/i, scope: 'district', strictness: 'must' },
  { regex: /(เชียงใหม่|chiang\s*mai)/i, scope: 'city', strictness: 'must' },

  // Other Global Cities
  { regex: /\b(singapore|tokyo|seoul|london|paris)\b/i, scope: 'city', strictness: 'must' }
];

const KNOWN_BRANDS: { pattern: RegExp; brandName: string }[] = [
  { pattern: /\b(the\s+coffee\s+house)\b/i, brandName: 'The Coffee House' },
  { pattern: /\b(highlands\s+coffee|highlands)\b/i, brandName: 'Highlands Coffee' },
  { pattern: /\b(cộng\s+cà\s+phê|cộng\s+cafe|cong\s+ca\s+phe)\b/i, brandName: 'Cộng Cà Phê' },
  { pattern: /\b(phúc\s+long|phuc\s+long)\b/i, brandName: 'Phúc Long' },
  { pattern: /\b(trung\s+nguyên|trung\s+nguyen)\b/i, brandName: 'Trung Nguyên' },
  { pattern: /\b(katinat)\b/i, brandName: 'Katinat' },
  { pattern: /\b(cheese\s+coffee)\b/i, brandName: 'Cheese Coffee' },
  { pattern: /(路易莎咖啡|louisa\s+coffee|louisa)/i, brandName: 'Louisa Coffee' },
  { pattern: /(cama\s+cafe|cama)/i, brandName: 'Cama Café' },
  { pattern: /(春水堂|chun\s+shui\s+tang)/i, brandName: 'Chun Shui Tang' },
  { pattern: /(after\s+you)\b/i, brandName: 'After You' },
  { pattern: /\b(starbucks)\b/i, brandName: 'Starbucks' },
  { pattern: /(greyhound\s+cafe)\b/i, brandName: 'Greyhound Café' }
];

export class FastPathParser {
  public static parse(
    rawQuery: string,
    context: { gps_present: boolean; ui_language?: string; search_mode?: SearchMode },
    registry: TaxonomyRegistry,
    config: QueryUnderstandingConfig
  ): FastPathResult {
    let queryToProcess = rawQuery.trim();
    let isTruncated = false;

    // 1. Truncate over-long input deterministically
    if (queryToProcess.length > config.maxQueryLength) {
      queryToProcess = queryToProcess.slice(0, config.maxQueryLength);
      isTruncated = true;
    }

    // 2. Language Detection
    const langResult = detectLanguage(queryToProcess);
    const primaryLang = langResult.language;

    // 3. Normalization
    const normalizedQuery = normalizeTerm(queryToProcess) || 'empty_query';

    // 4. Location Detection (no geocoding call, strictly Phase 5 decoupled)
    let locationIntent: LocationIntent | null = null;
    let workingText = normalizedQuery;
    let locationMatchFound = false;

    for (const locPattern of LOCATION_PATTERNS) {
      const match = workingText.match(locPattern.regex);
      if (match) {
        locationIntent = {
          source: 'explicit',
          scope: locPattern.scope,
          radius_source: 'system_default',
          strictness: locPattern.strictness,
          confidence: 0.95
        };
        // Remove location text from working text
        workingText = workingText.replace(locPattern.regex, ' ').replace(/\s+/g, ' ').trim();
        locationMatchFound = true;
        break;
      }
    }

    if (!locationMatchFound) {
      if (context.gps_present) {
        locationIntent = {
          source: 'gps',
          scope: 'point',
          radius_source: 'system_default',
          strictness: 'should',
          confidence: 0.85
        };
      } else {
        locationIntent = null;
      }
    }

    // 5. Business Name Detection (quotes or known brands)
    const requirements: Requirement[] = [];
    let reqIndex = 1;
    const matchedTerms: string[] = [];

    // Quoted brand name
    const quoteMatch = rawQuery.match(/["']([^"']{2,40})["']/);
    if (quoteMatch) {
      const quotedName = quoteMatch[1].trim();
      requirements.push({
        id: `req_name_${reqIndex++}`,
        type: 'name',
        value: quotedName,
        priority: 'must',
        polarity: 'include',
        source: 'deterministic',
        confidence: 0.98,
        original_text: quotedName
      });
      workingText = workingText.replace(quotedName.toLowerCase(), ' ').replace(/\s+/g, ' ').trim();
    } else {
      // Known brand patterns
      for (const brand of KNOWN_BRANDS) {
        if (brand.pattern.test(workingText)) {
          requirements.push({
            id: `req_name_${reqIndex++}`,
            type: 'name',
            value: brand.brandName,
            priority: 'must',
            polarity: 'include',
            source: 'deterministic',
            confidence: 0.95,
            original_text: brand.brandName
          });
          workingText = workingText.replace(brand.pattern, ' ').replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }

    // 6. Exclusion & Strictness Scanning
    let hasThaiPattern = false;
    const exclusions = EXCLUSION_PATTERNS[primaryLang] || EXCLUSION_PATTERNS.en;
    const strictPatterns = STRICT_MODIFIER_PATTERNS[primaryLang] || STRICT_MODIFIER_PATTERNS.en;

    if (primaryLang === 'th' && EXCLUSION_PATTERNS.th.some(p => workingText.includes(p))) {
      hasThaiPattern = true;
    }

    // 7. Tokenize and N-Gram Match against Taxonomy Registry
    const ambiguities: SearchAmbiguity[] = [];
    const seenCanonicalIds = new Set<string>();

    // Split text into tokens
    const words = workingText.split(/\s+/).filter(w => w.length > 0);

    // Multi-word n-gram matching (longest-match first: 4-grams down to 1-grams)
    const matchedTokenIndices = new Set<number>();

    for (let n = 4; n >= 1; n--) {
      for (let i = 0; i <= words.length - n; i++) {
        // Skip if any token in this span is already matched
        let alreadyMatched = false;
        for (let k = 0; k < n; k++) {
          if (matchedTokenIndices.has(i + k)) {
            alreadyMatched = true;
            break;
          }
        }
        if (alreadyMatched) continue;

        const phrase = words.slice(i, i + n).join(' ');
        if (phrase.length < 2) continue;

        // Check if preceded by exclusion
        let isExcluded = false;
        if (i > 0) {
          const prevToken = words[i - 1];
          const prevTwo = i > 1 ? `${words[i - 2]} ${words[i - 1]}` : prevToken;
          if (exclusions.some(ex => prevToken === ex || prevTwo.endsWith(ex))) {
            isExcluded = true;
          }
        }

        // Check config-driven ambiguous query patterns (never silent pick)
        const ambMatch = AMBIGUOUS_QUERY_PATTERNS.find(ap => ap.regex.test(phrase));
        if (ambMatch) {
          matchedTerms.push(phrase);
          for (let k = 0; k < n; k++) {
            matchedTokenIndices.add(i + k);
          }
          if (!ambiguities.some(a => a.text === ambMatch.text)) {
            ambiguities.push({
              text: ambMatch.text,
              candidate_ids: [...ambMatch.candidate_ids]
            });
          }
          continue;
        }

        // Check if near strict modifier
        let isStrict = false;
        if (i > 0) {
          const prevToken = words[i - 1];
          const prevTwo = i > 1 ? `${words[i - 2]} ${words[i - 1]}` : prevToken;
          if (strictPatterns.some(st => prevToken === st || prevTwo.endsWith(st))) {
            isStrict = true;
          }
        }
        if (i + n < words.length) {
          const nextToken = words[i + n];
          if (strictPatterns.some(st => nextToken === st)) {
            isStrict = true;
          }
        }

        // Lookup term in taxonomy registry (support query language and fallback)
        let results = registry.lookupTerm(phrase, primaryLang);
        if (results.length === 0 && primaryLang !== 'en') {
          results = registry.lookupTerm(phrase, 'en');
        }

        // Check shorthand experience aliases (e.g. "mèo", "chó", "sách")
        if (results.length === 0) {
          const aliasId = SHORTHAND_EXPERIENCE_ALIASES[primaryLang]?.[phrase]
            || SHORTHAND_EXPERIENCE_ALIASES.en?.[phrase]
            || SHORTHAND_EXPERIENCE_ALIASES.vi?.[phrase];
          if (aliasId && registry.hasCanonicalId(aliasId)) {
            const entry = registry.getEntry(aliasId);
            if (entry) {
              results = [{
                canonical_id: aliasId,
                type: entry.type,
                confidence: 0.95,
                matched_term: phrase,
                provenance: 'curated'
              }];
            }
          }
        }

        if (results.length > 0) {
          matchedTerms.push(phrase);
          for (let k = 0; k < n; k++) {
            matchedTokenIndices.add(i + k);
          }

          // Check ambiguity
          const distinctIds = Array.from(new Set(results.map(r => r.canonical_id)));
          if (distinctIds.length > 1 || results.some(r => r.ambiguous)) {
            // Ambiguous term -> return all candidates in ambiguities, never a silent pick
            ambiguities.push({
              text: phrase,
              candidate_ids: distinctIds
            });
          } else {
            // Unambiguous canonical match
            const bestMatch = results[0];
            const canonicalId = bestMatch.canonical_id;

            if (!seenCanonicalIds.has(canonicalId)) {
              seenCanonicalIds.add(canonicalId);
              const entry = registry.getEntry(canonicalId);
              const reqType = entry ? entry.type : 'attribute';

              const polarity = isExcluded ? 'exclude' : 'include';
              let priority = isExcluded ? 'must' : (isStrict ? 'must' : config.priorityRules[reqType] || 'should');

              requirements.push({
                id: `req_${reqType}_${reqIndex++}`,
                type: reqType,
                canonical_id: canonicalId,
                priority,
                polarity,
                source: 'deterministic',
                confidence: bestMatch.confidence || 0.95,
                original_text: phrase
              });
            }
          }
        }
      }
    }

    // Chinese and Thai continuous character sequence scanning (for non-spaced text)
    if (primaryLang === 'zh-TW' || primaryLang === 'th') {
      const cleanDense = workingText.replace(/\s+/g, '');
      const maxLen = Math.min(cleanDense.length, 8);
      for (let len = maxLen; len >= 2; len--) {
        for (let start = 0; start <= cleanDense.length - len; start++) {
          const sub = cleanDense.slice(start, start + len);
          if (matchedTerms.some(m => m.includes(sub))) continue;

          // Check ambiguous query patterns for CJK
          const ambSubMatch = AMBIGUOUS_QUERY_PATTERNS.find(ap => ap.regex.test(sub));
          if (ambSubMatch) {
            matchedTerms.push(sub);
            if (!ambiguities.some(a => a.text === ambSubMatch.text)) {
              ambiguities.push({
                text: ambSubMatch.text,
                candidate_ids: [...ambSubMatch.candidate_ids]
              });
            }
            continue;
          }

          let results = registry.lookupTerm(sub, primaryLang);
          if (results.length === 0) {
            const aliasId = SHORTHAND_EXPERIENCE_ALIASES[primaryLang]?.[sub];
            if (aliasId && registry.hasCanonicalId(aliasId)) {
              const entry = registry.getEntry(aliasId);
              if (entry) {
                results = [{
                  canonical_id: aliasId,
                  type: entry.type,
                  confidence: 0.95,
                  matched_term: sub,
                  provenance: 'curated'
                }];
              }
            }
          }

          if (results.length > 0) {
            const distinctIds = Array.from(new Set(results.map(r => r.canonical_id)));
            if (distinctIds.length > 1 || results.some(r => r.ambiguous)) {
              ambiguities.push({
                text: sub,
                candidate_ids: distinctIds
              });
            } else {
              const best = results[0];
              if (!seenCanonicalIds.has(best.canonical_id)) {
                seenCanonicalIds.add(best.canonical_id);
                matchedTerms.push(sub);
                const entry = registry.getEntry(best.canonical_id);
                const reqType = entry ? entry.type : 'attribute';
                requirements.push({
                  id: `req_${reqType}_${reqIndex++}`,
                  type: reqType,
                  canonical_id: best.canonical_id,
                  priority: config.priorityRules[reqType] || 'should',
                  polarity: 'include',
                  source: 'deterministic',
                  confidence: best.confidence || 0.95,
                  original_text: sub
                });
              }
            }
          }
        }
      }
    }

    // 8. Hierarchy Pruning: Emit the most specific ID; do not expand ancestors here
    // If a child requirement and its ancestor requirement were both emitted from the same phrase, prune the ancestor
    const prunedRequirements: Requirement[] = [];
    for (const req of requirements) {
      if (!req.canonical_id) {
        prunedRequirements.push(req);
        continue;
      }
      // Check if any other requirement in the list is a descendant of this req
      const isAncestorOfAnother = requirements.some(other => {
        if (other === req || !other.canonical_id) return false;
        // Polarities must match (e.g. exclude cat_cafe should NOT prune include cafe)
        if (other.polarity !== req.polarity) return false;
        const descendants = registry.getDescendants(req.canonical_id!);
        return descendants.includes(other.canonical_id!);
      });

      if (!isAncestorOfAnother) {
        prunedRequirements.push(req);
      }
    }

    // 9. Intent Classification
    let intentType: SearchIntent['intent'] = 'discover';
    if (prunedRequirements.some(r => r.type === 'name')) {
      intentType = 'search_by_name';
    } else if (prunedRequirements.some(r => r.type === 'experience')) {
      intentType = 'search_by_experience';
    } else if (prunedRequirements.some(r => r.type === 'activity')) {
      intentType = 'search_by_activity';
    } else if (prunedRequirements.some(r => r.type === 'attribute')) {
      intentType = 'search_by_attribute';
    } else if (locationIntent && locationIntent.source === 'explicit') {
      intentType = 'search_by_location';
    } else if (locationIntent && locationIntent.scope === 'point') {
      intentType = 'nearby';
    } else if (context.search_mode === 'discovery') {
      intentType = 'discover';
    }

    // 10. Residual Words Computation
    const residualWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (!matchedTokenIndices.has(i)) {
        const w = words[i].toLowerCase();
        if (!COMMON_STOPWORDS.has(w) && !exclusions.includes(w) && !strictPatterns.includes(w)) {
          residualWords.push(w);
        }
      }
    }

    const versions: ContractVersions = {
      contract: CURRENT_CONTRACT_VERSION,
      taxonomy: CURRENT_TAXONOMY_VERSION,
      parser: CURRENT_PARSER_VERSION,
      normalizer: CURRENT_NORMALIZER_VERSION
    };

    const finalConfidence = Math.max(
      0.5,
      prunedRequirements.length > 0 ? (residualWords.length === 0 ? 0.98 : 0.85) : 0.6
    );

    const intent: SearchIntent = {
      raw_query: rawQuery,
      normalized_query: normalizedQuery,
      language: primaryLang,
      secondary_languages: langResult.secondary_languages,
      intent: intentType,
      entities: [],
      location: locationIntent,
      requirements: prunedRequirements,
      search_mode: context.search_mode || 'standard',
      ambiguities,
      parse_source: 'fast_path',
      confidence: finalConfidence,
      versions
    };

    return {
      intent,
      residualWords,
      matchedTerms,
      isTruncated,
      hasThaiPattern
    };
  }
}
