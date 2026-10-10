import { 
  ParsedSearchQuery, 
  ComprehensiveSearchResponse, 
  SupportedLanguage, 
  LocationTarget 
} from './types';
import { QueryUnderstandingService } from './QueryUnderstandingService';
import { CandidateRetrievalService } from './CandidateRetrievalService';
import { SearchRankingService } from './SearchRankingService';
import { SearchTelemetry } from '../telemetry/SearchTelemetry';

export class SearchEngineService {
  /**
   * Main Search Pipeline Execution with Phase 1B Telemetry & Cost Ledger
   */
  public static async executeSearch(params: {
    query: string;
    latitude?: number | null;
    longitude?: number | null;
    cityName?: string | null;
    countryCode?: string | null;
    source?: 'GPS' | 'IP' | 'QUERY_EXTRACTED' | 'UI_FALLBACK';
    uiLanguage?: SupportedLanguage;
    candidateShops?: any[];
  }): Promise<ComprehensiveSearchResponse> {
    const rawQuery = (params.query || '').trim();
    const uiLanguage = params.uiLanguage || 'vi';

    // 1. Initialize Telemetry Trace Session
    const trace = SearchTelemetry.startTrace({
      rawQuery,
      latitude: params.latitude,
      longitude: params.longitude,
      city: params.cityName || 'Ho Chi Minh City'
    });

    try {
      // 2. Determine Initial Location Context
      const locationTarget: LocationTarget = {
        type: (typeof params.latitude === 'number' && typeof params.longitude === 'number') ? 'current_gps' : 'city',
        city: params.cityName || 'Ho Chi Minh City',
        countryCode: params.countryCode || 'VN',
        latitude: params.latitude,
        longitude: params.longitude,
        source: params.source || (params.latitude && params.longitude ? 'GPS' : 'UI_FALLBACK')
      };

      // 3. Query Understanding (Language, Intent, Entities, Localized Queries)
      trace.startStep('query_understanding');
      const parsedQuery: ParsedSearchQuery = await QueryUnderstandingService.analyze(
        rawQuery,
        locationTarget,
        uiLanguage,
        trace
      );
      trace.endStep('query_understanding');

      // 4. Candidate Retrieval (Google Places API + Internal DB + Deduplication)
      trace.startStep('candidate_retrieval');
      const { candidates, googleQueriesUsed } = await CandidateRetrievalService.retrieveCandidates(
        parsedQuery,
        params.candidateShops || [],
        trace
      );
      trace.endStep('candidate_retrieval');

      // 5. Verification & Multidimensional Ranking
      trace.startStep('ranking_and_verification');
      const rankedResults = SearchRankingService.rankCandidates(
        candidates,
        parsedQuery,
        parsedQuery.locationTarget.latitude,
        parsedQuery.locationTarget.longitude
      );
      trace.endStep('ranking_and_verification');

      const strictPassedCount = rankedResults.filter(r => r.verification.isMustHaveSatisfied).length;

      // 6. Record Candidate & Verification telemetry metrics
      trace.recordCandidateCounts({
        candidateCount: candidates.length,
        verifiedCount: strictPassedCount,
        finalResultCount: rankedResults.length
      });

      // 7. Complete Trace and generate summary
      const traceSummary = trace.complete();

      return {
        query: rawQuery,
        parsedQuery,
        totalFound: candidates.length,
        strictPassedCount,
        rankedResults,
        searchId: trace.searchId,
        searchContext: {
          location: parsedQuery.locationTarget,
          marketLanguage: parsedQuery.searchMarketLanguage,
          intentType: parsedQuery.intentType,
          googleQueriesUsed,
          isDiscoveryMode: parsedQuery.intentType === 'hidden_gem_discovery',
          processingTimeMs: traceSummary.latency_ms,
          traceSummary
        }
      };
    } catch (err: any) {
      trace.fail('SEARCH_PIPELINE_ERROR', err?.message || 'Unknown search error');
      throw err;
    }
  }
}
