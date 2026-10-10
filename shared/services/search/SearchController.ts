import { CoffeeShop } from '../../types';
import { SearchIntentObject, SearchIntentParser } from './SearchIntentParser';
import { LocalLanguageResolver, ResolvedLocationContext } from './LocalLanguageResolver';
import { ReverseGeocodingService } from './ReverseGeocodingService';
import { QueryLocalizationService } from './QueryLocalizationService';
import { CoffeePassportSearchService } from './CoffeePassportSearchService';
import { UITranslationService, FormattedSearchResult } from './UITranslationService';
import { googlePlacesService } from '../googlePlacesService';
import { TaxonomyValidator } from '../taxonomy/TaxonomyValidator';

export interface SearchPipelineRequest {
  query: string;
  uiLanguage?: string; // e.g. 'vi', 'en', 'zh-TW', 'ja', 'ko'
  latitude?: number | null;
  longitude?: number | null;
  cityName?: string | null;
  candidateShops?: CoffeeShop[];
  forceGooglePlacesDiscovery?: boolean;
}

export interface SearchPipelineResponse {
  // Intent Analysis
  intent: SearchIntentObject;
  resolvedLocation: ResolvedLocationContext;
  localizedQuery: {
    primaryQuery: string;
    alternativeQueries: string[];
    localizedKeywords: string[];
  };

  // Pipeline Execution Stats
  discoveryCount: number;
  strictPassedCount: number;
  rejectedCount: number;
  isFallbackApplied: boolean;
  fallbackNotice?: string;

  // Final Results
  results: CoffeeShop[];
  formattedResults: FormattedSearchResult[];
}

export class SearchController {
  /**
   * Executes the full AI-powered local search engine pipeline for Coffee Passport.
   * Adheres strictly to the architectural pipeline sequence without skipping steps.
   */
  public static async search(request: SearchPipelineRequest): Promise<SearchPipelineResponse> {
    const uiLanguage = request.uiLanguage || 'vi';
    const query = request.query || '';

    // Step 1: Location Resolution & Reverse Geocoding (GPS is highest priority)
    let resolvedLocation: ResolvedLocationContext;
    if (typeof request.latitude === 'number' && typeof request.longitude === 'number') {
      resolvedLocation = await ReverseGeocodingService.reverseGeocode(
        request.latitude,
        request.longitude
      );
    } else {
      resolvedLocation = LocalLanguageResolver.resolve(null, null, request.cityName);
    }

    // Step 2 & 3 & 4: AI Search Intent Analysis, Taxonomy Mapping & Validation
    const intent = SearchIntentParser.parse(
      query,
      resolvedLocation,
      resolvedLocation.coordinates
    );

    // Step 5: Query Localization for Google Maps (Local search terminology in searchLanguage)
    const localizedQuery = QueryLocalizationService.buildLocalizedGoogleQuery(
      intent,
      resolvedLocation
    );

    // Step 6: Places Discovery (Google Places API if enabled + Coffee Passport Database)
    let discoveredCandidates: CoffeeShop[] = [];
    const dbPool = request.candidateShops && request.candidateShops.length > 0
      ? request.candidateShops
      : CoffeePassportSearchService.getDatabase();

    // Try Google Places discovery if query has intent or explicit request
    if (request.forceGooglePlacesDiscovery || (query && resolvedLocation.coordinates)) {
      try {
        let coords = resolvedLocation.coordinates || { lat: 10.7769, lng: 106.7009 };
        if (intent.locationIntent.type === 'specified_location' && intent.locationIntent.cityName && intent.locationIntent.cityName !== resolvedLocation.city) {
          const extractedLocation = LocalLanguageResolver.resolve(null, null, intent.locationIntent.cityName);
          if (extractedLocation && extractedLocation.coordinates) {
            coords = extractedLocation.coordinates;
          }
        }
        
        const places = await googlePlacesService.searchPlacesText(
          localizedQuery.primaryQuery,
          coords.lat,
          coords.lng,
          intent.locationIntent.radius || 5000,
          resolvedLocation.languageCode
        );

        if (places && places.length > 0) {
          discoveredCandidates = places;
        }
      } catch (err) {
        console.warn('[SearchController] Google Places discovery bypassed:', err);
      }
    }

    // Merge database pool with any new discoveries
    const mergedPool = [...dbPool];
    for (const dc of discoveredCandidates) {
      if (!mergedPool.some(p => p.id === dc.id || (p.placeId && p.placeId === dc.placeId))) {
        mergedPool.push(dc);
      }
    }

    // Step 7 & 8: Match with Coffee Passport Database + Strict Match Engine + Ranking
    const matchAndRank = CoffeePassportSearchService.executeSearch(
      mergedPool,
      intent,
      resolvedLocation.coordinates
    );

    // Step 9: UI Language Translation and Formatting
    const formattedResults = matchAndRank.rankedShops.map(shop =>
      UITranslationService.formatPlaceForUI(shop, uiLanguage)
    );

    return {
      intent,
      resolvedLocation,
      localizedQuery,
      discoveryCount: mergedPool.length,
      strictPassedCount: matchAndRank.rankedShops.length,
      rejectedCount: matchAndRank.rejectedCount,
      isFallbackApplied: matchAndRank.isFallbackApplied,
      fallbackNotice: matchAndRank.fallbackNotice,
      results: matchAndRank.rankedShops,
      formattedResults
    };
  }
}
