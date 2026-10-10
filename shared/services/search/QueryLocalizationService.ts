import { SearchIntentObject } from './SearchIntentParser';
import { ResolvedLocationContext } from './LocalLanguageResolver';
import { TaxonomyService } from '../taxonomy/TaxonomyService';

export class QueryLocalizationService {
  /**
   * Translates the structured search intent into natural local search terminology for Google Maps & Places API.
   * Prioritizes LOCAL SEARCH TERMINOLOGY over literal word-by-word translations.
   */
  public static buildLocalizedGoogleQuery(
    intent: SearchIntentObject,
    location: ResolvedLocationContext
  ): { primaryQuery: string; alternativeQueries: string[]; localizedKeywords: string[] } {
    const lang = location.languageCode || 'vi';
    const city = intent.locationIntent.cityName || location.city || '';
    const localizedKeywords: string[] = [];

    // 1. Localized term for Models
    const modelTerms: string[] = [];
    for (const modelId of intent.models) {
      const modelDef = TaxonomyService.getModel(modelId);
      if (modelDef) {
        const langAliases = modelDef.aliases[lang] || modelDef.aliases['en'] || [];
        if (langAliases.length > 0) {
          modelTerms.push(langAliases[0]);
          localizedKeywords.push(...langAliases);
        } else {
          modelTerms.push(modelDef.uiName);
        }
      }
    }

    // 2. Localized term for Amenities
    const amenityTerms: string[] = [];
    for (const amenityId of intent.amenities) {
      const amenityDef = TaxonomyService.getAmenity(amenityId);
      if (amenityDef) {
        const langAliases = amenityDef.aliases[lang] || amenityDef.aliases['en'] || [];
        if (langAliases.length > 0) {
          amenityTerms.push(langAliases[0]);
          localizedKeywords.push(...langAliases);
        }
      }
    }

    // 3. Localized term for Experiences
    const experienceTerms: string[] = [];
    for (const expId of intent.experiences) {
      const expDef = TaxonomyService.getExperience(expId);
      if (expDef) {
        const langAliases = expDef.aliases[lang] || expDef.aliases['en'] || [];
        if (langAliases.length > 0) {
          experienceTerms.push(langAliases[0]);
          localizedKeywords.push(...langAliases);
        }
      }
    }

    // Combine into natural local search query
    const baseComponents: string[] = [];
    if (modelTerms.length > 0) {
      baseComponents.push(modelTerms.join(' '));
    } else {
      // Fallback base cafe term in local language
      if (lang === 'zh-TW' || lang === 'zh-HK') baseComponents.push('咖啡廳');
      else if (lang === 'zh-CN') baseComponents.push('咖啡馆');
      else if (lang === 'ja') baseComponents.push('カフェ');
      else if (lang === 'ko') baseComponents.push('카페');
      else if (lang === 'th') baseComponents.push('ร้านกาแฟ');
      else if (lang === 'vi') baseComponents.push('quán cà phê');
      else baseComponents.push('coffee shop');
    }

    if (experienceTerms.length > 0) {
      baseComponents.push(experienceTerms.join(' '));
    }
    if (amenityTerms.length > 0) {
      baseComponents.push(amenityTerms.join(' '));
    }

    const rawJoined = baseComponents.join(' ').trim();
    const primaryQuery = city && !rawJoined.includes(city) ? `${city} ${rawJoined}` : rawJoined;

    // Alternative queries for broader search discovery
    const alternativeQueries: string[] = [rawJoined];
    if (modelTerms.length > 0) {
      for (const mt of modelTerms) {
        if (city) alternativeQueries.push(`${city} ${mt}`);
        alternativeQueries.push(mt);
      }
    }

    return {
      primaryQuery,
      alternativeQueries: Array.from(new Set(alternativeQueries)),
      localizedKeywords: Array.from(new Set(localizedKeywords))
    };
  }
}
