export type SupportedLanguage = 'vi' | 'zh-TW' | 'en' | 'th' | 'ja' | 'ko';

export type SearchIntentType = 
  | 'direct_lookup'
  | 'feature_search'
  | 'atmosphere_vibe'
  | 'hidden_gem_discovery'
  | 'activity_based'
  | 'constraint_based'
  | 'date_occasion'
  | 'general_discovery';

export interface LocationTarget {
  type: 'current_gps' | 'district' | 'city' | 'custom_landmark' | 'nearby';
  name?: string;
  district?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
  source: 'GPS' | 'IP' | 'QUERY_EXTRACTED' | 'UI_FALLBACK';
}

export interface QueryRequirement {
  mustHave: string[];           // Strict requirements (e.g. cat, board game, ps5, wifi)
  shouldHave: string[];         // Preferred features (e.g. beautiful view, good music)
  niceToHave: string[];         // Bonuses (e.g. free parking, pastries)
  negativeConstraints: string[];// Exclusions (e.g. no loud music, no smoke, not crowded)
  atmosphereVibes: string[];    // e.g. quiet, cozy, minimalist, vintage, industrial, lush_green
  activities: string[];         // e.g. laptop_work, reading, date, group_meeting, gaming
  priceLevelPreference?: 'budget' | 'moderate' | 'premium' | 'any';
  timeConstraint?: 'open_now' | 'late_night' | 'early_morning' | 'any';
}

export interface ParsedSearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  detectedLanguage: SupportedLanguage;
  searchMarketLanguage: SupportedLanguage;
  intentType: SearchIntentType;
  primaryCategory: string; // e.g. 'cafe'
  experienceModes: string[];
  requirements: QueryRequirement;
  locationTarget: LocationTarget;
  expandedKeywords: string[];
  localizedQueries: {
    language: SupportedLanguage;
    primaryQuery: string;
    secondaryQueries: string[];
    mustTerms: string[];
  };
}

export interface VerifiedEvidenceItem {
  feature: string;
  evidenceText: string;
  source: 'name' | 'reviews' | 'types' | 'attributes' | 'editorial_summary';
  confidence: number; // 0.0 to 1.0
  isMustHaveSatisfied?: boolean;
}

export interface PlaceVerificationResult {
  placeId: string;
  isMustHaveSatisfied: boolean;
  missingMustHaves: string[];
  hasNegativeConstraintViolation: boolean;
  violatedConstraints: string[];
  verifiedFeatures: string[];
  evidenceList: VerifiedEvidenceItem[];
  matchConfidence: number; // 0 to 1
  matchReason: {
    vi: string;
    'zh-TW': string;
    en: string;
    th: string;
  };
}

export interface RankedSearchResult {
  shop: any;
  scoreBreakdown: {
    baseRelevance: number;
    mustHaveCompliance: number;
    vibeMatchScore: number;
    qualityScore: number;
    trustScore: number;
    distanceScore: number;
    discoveryBonus: number;
    negativePenalty: number;
    finalScore: number;
  };
  verification: PlaceVerificationResult;
  matchHighlight: string;
}

export interface ComprehensiveSearchResponse {
  query: string;
  parsedQuery: ParsedSearchQuery;
  totalFound: number;
  strictPassedCount: number;
  rankedResults: RankedSearchResult[];
  searchId?: string;
  searchContext: {
    location: LocationTarget;
    marketLanguage: SupportedLanguage;
    intentType: SearchIntentType;
    googleQueriesUsed: string[];
    isDiscoveryMode: boolean;
    processingTimeMs: number;
    traceSummary?: any;
  };
}
