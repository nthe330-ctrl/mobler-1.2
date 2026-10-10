/**
 * MOBLER SEARCH - BASELINE INTENT ADAPTER
 * Wraps the current deterministic query understanding logic and converts
 * its output into the Phase 2A SearchIntent contract via Phase 2C LegacyCompatibilityLayer.
 *
 * Provides a measurable baseline of current search behavior without changing any production code.
 */

import { IntentProvider } from './interfaces';
import { SearchIntent, Requirement, LocationIntent, SupportedQueryLanguage, SearchMode } from '../../server/search/contract/types';
import { EvalContext, AdapterRunOptions } from '../types';
import { QueryUnderstandingService } from '../../server/search/QueryUnderstandingService';
import { LegacyCompatibilityLayer } from '../../server/search/taxonomy/compatibility/LegacyCompatibilityLayer';

export class BaselineIntentAdapter implements IntentProvider {
  public readonly name = 'CurrentSearchBaseline';
  public readonly version = '0.9.0-legacy-compat';

  private legacyCompat = new LegacyCompatibilityLayer();

  public async provideIntent(
    query: string,
    context?: EvalContext,
    _options?: AdapterRunOptions
  ): Promise<SearchIntent> {
    const rawQuery = query || '';
    const uiLang = (context?.ui_language as any) || 'vi';

    // Call current deterministic parser without mutating production state
    const parsed = QueryUnderstandingService.parseQueryDeterministic(
      rawQuery,
      {
        type: 'current_gps',
        source: 'UI_FALLBACK',
        latitude: 10.7769,
        longitude: 106.7009,
        countryCode: 'VN'
      },
      uiLang
    );

    const requirements: Requirement[] = [];
    let reqIdx = 1;
    const seenReqKeys = new Set<string>();

    const addReqFromLegacy = (item: string, priority: 'must' | 'should', polarity: 'include' | 'exclude') => {
      const res = this.legacyCompat.resolve(item);
      if (res.resolved && res.canonical_id && res.entry) {
        const key = `${res.entry.type}:${res.canonical_id}:${polarity}`;
        if (!seenReqKeys.has(key)) {
          seenReqKeys.add(key);
          requirements.push({
            id: `req_base_${reqIdx++}`,
            type: res.entry.type,
            canonical_id: res.canonical_id,
            priority,
            polarity,
            source: 'deterministic',
            confidence: 0.95
          });
        }
      }
    };

    // Map experience modes
    if (parsed.experienceModes) {
      for (const exp of parsed.experienceModes) {
        addReqFromLegacy(exp, 'must', 'include');
      }
    }

    // Map mustHave items through legacy compatibility layer
    if (parsed.requirements?.mustHave) {
      for (const item of parsed.requirements.mustHave) {
        addReqFromLegacy(item, 'must', 'include');
      }
    }

    // Map atmosphere vibes
    if (parsed.requirements?.atmosphereVibes) {
      for (const vibe of parsed.requirements.atmosphereVibes) {
        addReqFromLegacy(vibe, 'should', 'include');
      }
    }

    // Map shouldHave items
    if (parsed.requirements?.shouldHave) {
      for (const item of parsed.requirements.shouldHave) {
        addReqFromLegacy(item, 'should', 'include');
      }
    }

    // Map negative constraints
    if (parsed.requirements?.negativeConstraints) {
      for (const item of parsed.requirements.negativeConstraints) {
        addReqFromLegacy(item, 'must', 'exclude');
      }
    }

    // Map activities
    if (parsed.requirements?.activities) {
      for (const act of parsed.requirements.activities) {
        addReqFromLegacy(act, 'should', 'include');
      }
    }

    // Map legacy intentType to 2A contract intent
    let intentKind = 'discover';
    if (parsed.experienceModes && parsed.experienceModes.length > 0) {
      intentKind = 'search_by_experience';
    } else if (parsed.intentType === 'atmosphere_vibe' || (parsed.requirements?.atmosphereVibes && parsed.requirements.atmosphereVibes.length > 0)) {
      intentKind = 'search_by_attribute';
    } else if (parsed.intentType === 'activity_based' || (parsed.requirements?.activities && parsed.requirements.activities.length > 0)) {
      intentKind = 'search_by_activity';
    } else if (parsed.intentType === 'direct_lookup') {
      intentKind = 'search_by_name';
    } else if (parsed.locationTarget?.district) {
      intentKind = 'search_by_location';
    }

    const detectedLang = QueryUnderstandingService.detectQueryLanguage(rawQuery, 'vi');
    const validLang: SupportedQueryLanguage = ['vi', 'zh-TW', 'en', 'th', 'ja', 'ko'].includes(detectedLang)
      ? (detectedLang as SupportedQueryLanguage)
      : 'en';

    // Location intent
    let locationIntent: LocationIntent | null = null;
    if (parsed.locationTarget?.district) {
      locationIntent = {
        source: 'explicit',
        scope: 'district',
        strictness: 'must',
        radius_meters: 3000,
        radius_source: 'system_default',
        confidence: 0.9
      };
    } else if (parsed.locationTarget?.city) {
      locationIntent = {
        source: 'explicit',
        scope: 'city',
        strictness: 'must',
        radius_meters: 5000,
        radius_source: 'system_default',
        confidence: 0.9
      };
    }

    const safeNormalized = QueryUnderstandingService.normalizeQueryText(rawQuery).trim().toLowerCase() || 'cafe';

    const searchIntent: SearchIntent = {
      raw_query: rawQuery,
      normalized_query: safeNormalized,
      language: validLang,
      search_mode: (parsed.intentType === 'general_discovery' ? 'discovery' : 'standard') as SearchMode,
      intent: intentKind,
      confidence: 0.85,
      requirements,
      entities: [],
      location: locationIntent,
      ambiguities: [],
      parse_source: 'fast_path',
      versions: {
        contract: 'contract_v2.0',
        taxonomy: '2.0.0',
        parser: '0.9.0',
        normalizer: '1.0.0'
      }
    };

    return searchIntent;
  }
}
