import { 
  CostProfile, 
  ProviderName, 
  VerificationStatus,
  REFERENCE_UNIT_USD 
} from './types';

export type PlacesOperation = 'places:searchText' | 'places:searchNearby' | 'places/{placeId}' | 'text_search' | 'nearby_search' | 'place_details';
export type PlacesTier = 'basic' | 'pro' | 'enterprise' | 'enterprise_atmosphere';

/**
 * Explicit Field-to-Tier Mapping Table
 * Sourced from official Google Maps Platform Places API (New) Data Fields Documentation
 * Source: https://developers.google.com/maps/documentation/places/web-service/place-data-fields
 * Version: 2026.1-q1-official
 */
export const PLACES_FIELD_TIER_TABLE: Record<string, PlacesTier> = {
  // === BASIC (ESSENTIALS) TIER FIELDS ===
  'places.id': 'basic',
  'places.displayName': 'basic',
  'places.formattedAddress': 'basic',
  'places.location': 'basic',
  'places.types': 'basic',
  'places.googleMapsUri': 'basic',
  'places.viewport': 'basic',
  'places.addressComponents': 'basic',
  'places.plusCode': 'basic',
  'places.shortFormattedAddress': 'basic',
  'places.nationalPhoneNumber': 'basic',
  'places.internationalPhoneNumber': 'basic',
  'id': 'basic',
  'displayName': 'basic',
  'formattedAddress': 'basic',
  'location': 'basic',
  'types': 'basic',
  'googleMapsUri': 'basic',
  'viewport': 'basic',

  // === PRO (PREFERRED) TIER FIELDS ===
  'places.photos': 'pro',
  'places.regularOpeningHours': 'pro',
  'places.currentOpeningHours': 'pro',
  'places.currentSecondaryOpeningHours': 'pro',
  'places.regularSecondaryOpeningHours': 'pro',
  'places.websiteUri': 'pro',
  'places.priceLevel': 'pro',
  'places.priceRange': 'pro',
  'places.paymentOptions': 'pro',
  'places.parkingOptions': 'pro',
  'places.accessibilityOptions': 'pro',
  'places.utcOffsetMinutes': 'pro',
  'photos': 'pro',
  'regularOpeningHours': 'pro',
  'currentOpeningHours': 'pro',
  'websiteUri': 'pro',
  'priceLevel': 'pro',
  'paymentOptions': 'pro',
  'parkingOptions': 'pro',

  // === ENTERPRISE / ATMOSPHERE TIER FIELDS ===
  'places.rating': 'enterprise',
  'places.userRatingCount': 'enterprise',
  'places.reviews': 'enterprise_atmosphere',
  'places.editorialSummary': 'enterprise_atmosphere',
  'places.generativeSummary': 'enterprise_atmosphere',
  'places.areaSummary': 'enterprise_atmosphere',
  'places.evChargeOptions': 'enterprise',
  'places.fuelOptions': 'enterprise',
  'places.allowsDogs': 'enterprise',
  'places.goodForChildren': 'enterprise',
  'places.goodForGroups': 'enterprise',
  'places.goodForWatchingSports': 'enterprise',
  'places.liveMusic': 'enterprise',
  'places.menuForChildren': 'enterprise',
  'places.outdoorSeating': 'enterprise',
  'places.reservable': 'enterprise',
  'places.restroom': 'enterprise',
  'places.servesBeer': 'enterprise',
  'places.servesBreakfast': 'enterprise',
  'places.servesBrunch': 'enterprise',
  'places.servesCocktails': 'enterprise',
  'places.servesCoffee': 'enterprise',
  'places.servesDessert': 'enterprise',
  'places.servesDinner': 'enterprise',
  'places.servesLunch': 'enterprise',
  'places.servesVegetarianFood': 'enterprise',
  'places.servesWine': 'enterprise',
  'rating': 'enterprise',
  'userRatingCount': 'enterprise',
  'reviews': 'enterprise_atmosphere',
  'editorialSummary': 'enterprise_atmosphere',
  'outdoorSeating': 'enterprise',
  'reservable': 'enterprise',
  'restroom': 'enterprise'
};

/**
 * Centrally configured Cost Profiles with separate pricing layers:
 * 1. published_list_price (official rate sheet)
 * 2. account_level_free_tier (monthly free allocations / volume thresholds)
 * 3. internal_cost_units_per_call (normalized against REFERENCE_UNIT_USD = $0.001)
 * 4. estimated_cost_per_call_usd (per-search estimated cost at list price)
 */
export const DEFAULT_COST_PROFILES: CostProfile[] = [
  // --- Google Places (New) Text Search SKUs ---
  {
    provider: 'google_places',
    operation: 'text_search_basic',
    sku: 'SKU_PLACES_TEXT_SEARCH_BASIC',
    published_list_price: {
      amount: 5.00,
      unit_description: '$5.00 per 1,000 requests',
      price_per_request_usd: 0.005
    },
    account_level_free_tier: {
      monthly_free_requests: 10000,
      note: 'Account-level free tier cap: 10,000 requests/month across Essentials'
    },
    internal_cost_units_per_call: 5.0,
    estimated_cost_per_call_usd: 0.005,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'google_places',
    operation: 'text_search_pro',
    sku: 'SKU_PLACES_TEXT_SEARCH_PRO',
    published_list_price: {
      amount: 32.00,
      unit_description: '$32.00 per 1,000 requests (0-100k tier)',
      price_per_request_usd: 0.032
    },
    account_level_free_tier: {
      monthly_free_requests: 5000,
      note: 'Account-level free tier cap: 5,000 requests/month for Pro SKUs'
    },
    internal_cost_units_per_call: 32.0,
    estimated_cost_per_call_usd: 0.032,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'google_places',
    operation: 'text_search_enterprise',
    sku: 'SKU_PLACES_TEXT_SEARCH_ENTERPRISE',
    published_list_price: {
      amount: 40.00,
      unit_description: '$40.00 per 1,000 requests (0-100k tier)',
      price_per_request_usd: 0.040
    },
    account_level_free_tier: {
      monthly_free_requests: 0,
      note: 'Enterprise atmosphere searches billed pay-as-you-go without separate free cap'
    },
    internal_cost_units_per_call: 40.0,
    estimated_cost_per_call_usd: 0.040,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },

  // --- Google Places (New) Nearby Search SKUs ---
  {
    provider: 'google_places',
    operation: 'nearby_search_basic',
    sku: 'SKU_PLACES_NEARBY_SEARCH_BASIC',
    published_list_price: {
      amount: 5.00,
      unit_description: '$5.00 per 1,000 requests',
      price_per_request_usd: 0.005
    },
    account_level_free_tier: {
      monthly_free_requests: 10000,
      note: 'Account-level free tier cap: 10,000 requests/month across Essentials'
    },
    internal_cost_units_per_call: 5.0,
    estimated_cost_per_call_usd: 0.005,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'google_places',
    operation: 'nearby_search_pro',
    sku: 'SKU_PLACES_NEARBY_SEARCH_PRO',
    published_list_price: {
      amount: 32.00,
      unit_description: '$32.00 per 1,000 requests',
      price_per_request_usd: 0.032
    },
    account_level_free_tier: {
      monthly_free_requests: 5000,
      note: 'Account-level free tier cap: 5,000 requests/month for Pro SKUs'
    },
    internal_cost_units_per_call: 32.0,
    estimated_cost_per_call_usd: 0.032,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'google_places',
    operation: 'nearby_search_enterprise',
    sku: 'SKU_PLACES_NEARBY_SEARCH_ENTERPRISE',
    published_list_price: {
      amount: 40.00,
      unit_description: '$40.00 per 1,000 requests',
      price_per_request_usd: 0.040
    },
    account_level_free_tier: {
      monthly_free_requests: 0,
      note: 'Enterprise Atmosphere nearby search'
    },
    internal_cost_units_per_call: 40.0,
    estimated_cost_per_call_usd: 0.040,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },

  // --- Google Places (New) Place Details SKUs ---
  {
    provider: 'google_places',
    operation: 'place_details_basic',
    sku: 'SKU_PLACES_DETAILS_BASIC',
    published_list_price: {
      amount: 5.00,
      unit_description: '$5.00 per 1,000 requests',
      price_per_request_usd: 0.005
    },
    account_level_free_tier: {
      monthly_free_requests: 10000,
      note: 'Place Details Essentials monthly allocation'
    },
    internal_cost_units_per_call: 5.0,
    estimated_cost_per_call_usd: 0.005,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'google_places',
    operation: 'place_details_pro',
    sku: 'SKU_PLACES_DETAILS_PRO',
    published_list_price: {
      amount: 17.00,
      unit_description: '$17.00 per 1,000 requests',
      price_per_request_usd: 0.017
    },
    account_level_free_tier: {
      monthly_free_requests: 5000,
      note: 'Place Details Pro monthly allocation'
    },
    internal_cost_units_per_call: 17.0,
    estimated_cost_per_call_usd: 0.017,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'google_places',
    operation: 'place_details_enterprise',
    sku: 'SKU_PLACES_DETAILS_ENTERPRISE',
    published_list_price: {
      amount: 25.00,
      unit_description: '$25.00 per 1,000 requests',
      price_per_request_usd: 0.025
    },
    account_level_free_tier: {
      monthly_free_requests: 1000,
      note: 'Place Details Enterprise monthly allocation'
    },
    internal_cost_units_per_call: 25.0,
    estimated_cost_per_call_usd: 0.025,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'google_places',
    operation: 'place_details_enterprise_atmosphere',
    sku: 'SKU_PLACES_DETAILS_ENTERPRISE_ATMOSPHERE',
    published_list_price: {
      amount: 30.00,
      unit_description: '$30.00 per 1,000 requests ($25 Enterprise + $5 Atmosphere)',
      price_per_request_usd: 0.030
    },
    account_level_free_tier: {
      monthly_free_requests: 0,
      note: 'Enterprise Atmosphere Place Details billed pay-as-you-go'
    },
    internal_cost_units_per_call: 30.0,
    estimated_cost_per_call_usd: 0.030,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/places/web-service/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },

  // --- Google Maps Geocoding SKU ---
  {
    provider: 'google_maps',
    operation: 'geocoding',
    sku: 'SKU_GEOCODING',
    published_list_price: {
      amount: 5.00,
      unit_description: '$5.00 per 1,000 requests',
      price_per_request_usd: 0.005
    },
    account_level_free_tier: {
      monthly_free_requests: 10000,
      note: 'Geocoding monthly allocation'
    },
    internal_cost_units_per_call: 5.0,
    estimated_cost_per_call_usd: 0.005,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://developers.google.com/maps/documentation/geocoding/usage-and-billing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },

  // --- Gemini AI Models (Verified Standard vs. Unverified Preview Aliases in Code) ---
  {
    provider: 'gemini',
    operation: 'gemini-2.5-flash',
    sku: 'SKU_GEMINI_2_5_FLASH',
    published_list_price: {
      amount: 0.30,
      unit_description: '$0.30/1M input tokens, $2.50/1M output tokens',
      price_per_1m_input_tokens_usd: 0.30,
      price_per_1m_output_tokens_usd: 2.50
    },
    account_level_free_tier: {
      monthly_free_tokens: 0,
      note: 'Free tier up to 1500 RPM on AI Studio development keys'
    },
    internal_cost_units_per_call: 0.30,
    estimated_cost_per_call_usd: 0.00000030,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://ai.google.dev/pricing',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  },
  {
    provider: 'gemini',
    operation: 'gemini-3.1-flash-lite',
    sku: 'SKU_GEMINI_3_1_FLASH_LITE',
    published_list_price: {
      amount: 0.075,
      unit_description: '$0.075/1M input tokens, $0.30/1M output tokens (Unverified preview alias in code)',
      price_per_1m_input_tokens_usd: 0.075,
      price_per_1m_output_tokens_usd: 0.30
    },
    account_level_free_tier: {
      monthly_free_tokens: 0,
      note: 'Preview model alias used in QueryUnderstandingService'
    },
    internal_cost_units_per_call: 0.075,
    estimated_cost_per_call_usd: 0.000000075,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://ai.google.dev/pricing',
    retrieved_at: '2026-09-19',
    verification_status: 'unverified' // Explicitly marked unverified because model alias is experimental/preview in code
  },
  {
    provider: 'gemini',
    operation: 'gemini-3.8-flash',
    sku: 'SKU_GEMINI_3_8_FLASH',
    published_list_price: {
      amount: 0.15,
      unit_description: '$0.15/1M input tokens, $0.60/1M output tokens (Unverified preview alias in code)',
      price_per_1m_input_tokens_usd: 0.15,
      price_per_1m_output_tokens_usd: 0.60
    },
    account_level_free_tier: {
      monthly_free_tokens: 0,
      note: 'Preview model alias used in QueryUnderstandingService fallback candidate'
    },
    internal_cost_units_per_call: 0.15,
    estimated_cost_per_call_usd: 0.00000015,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://ai.google.dev/pricing',
    retrieved_at: '2026-09-19',
    verification_status: 'unverified' // Explicitly marked unverified
  },
  {
    provider: 'gemini',
    operation: 'gemini-flash-latest',
    sku: 'SKU_GEMINI_FLASH_LATEST',
    published_list_price: {
      amount: 0.075,
      unit_description: '$0.075/1M input tokens, $0.30/1M output tokens (Unverified dynamic alias)',
      price_per_1m_input_tokens_usd: 0.075,
      price_per_1m_output_tokens_usd: 0.30
    },
    account_level_free_tier: {
      monthly_free_tokens: 0,
      note: 'Dynamic latest alias'
    },
    internal_cost_units_per_call: 0.075,
    estimated_cost_per_call_usd: 0.000000075,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'https://ai.google.dev/pricing',
    retrieved_at: '2026-09-19',
    verification_status: 'unverified' // Explicitly marked unverified
  },

  // --- Internal Zero Cost ---
  {
    provider: 'internal_db',
    operation: 'local_retrieval',
    sku: 'SKU_INTERNAL_ZERO_COST',
    published_list_price: {
      amount: 0,
      unit_description: 'Internal zero cost'
    },
    account_level_free_tier: {
      note: 'Local in-memory / local database queries incur 0 external API cost'
    },
    internal_cost_units_per_call: 0,
    estimated_cost_per_call_usd: 0,
    pricing_version: '2026.1-q1-official',
    effective_from: '2026-01-01',
    source_url: 'internal://mobler-db',
    retrieved_at: '2026-09-19',
    verification_status: 'verified'
  }
];

export interface SkuResolutionResult {
  sku: string;
  resolvedOperation: string;
  resolvedTier: PlacesTier;
  isUnresolvedField: boolean;
  unresolvedFields: string[];
  drivingFields: string[];
  internalCostUnits: number;
  estimatedCostUsd: number;
  verificationStatus: VerificationStatus;
}

export class CostProfileConfig {
  private static profiles: Map<string, CostProfile> = new Map(
    DEFAULT_COST_PROFILES.map(p => [`${p.provider}:${p.operation}`, p])
  );

  /**
   * Resolves Google Places SKU based on explicit field mask and operation
   * Never defaults to cheapest; unknown fields trigger status 'unresolved' priced at highest tier
   */
  public static resolveGooglePlacesSku(
    operation: string = 'text_search',
    fieldMask: string = ''
  ): SkuResolutionResult {
    const rawMask = (fieldMask || '').trim();
    const fields = rawMask ? rawMask.split(',').map(f => f.trim()).filter(Boolean) : [];

    const opNormalized = operation.toLowerCase().replace(/^places:/, '').replace(/\//g, '_');
    const isNearby = opNormalized.includes('nearby');
    const isDetails = opNormalized.includes('details') || opNormalized.includes('placeid');
    const isTextSearch = !isNearby && !isDetails;

    let highestTier: PlacesTier = 'basic';
    const tierWeights: Record<PlacesTier, number> = {
      basic: 1,
      pro: 2,
      enterprise: 3,
      enterprise_atmosphere: 4
    };

    let isUnresolvedField = false;
    const unresolvedFields: string[] = [];
    const drivingFields: string[] = [];

    if (fields.length === 0) {
      // Empty mask -> unknown requested structure -> resolve to Enterprise tier for safety
      highestTier = isDetails ? 'enterprise_atmosphere' : 'enterprise';
      isUnresolvedField = true;
      unresolvedFields.push('EMPTY_FIELD_MASK');
    } else {
      for (const f of fields) {
        const tier = PLACES_FIELD_TIER_TABLE[f];
        if (!tier) {
          // Unknown / unrecognized field -> Flag unresolved and escalate to highest tier
          isUnresolvedField = true;
          unresolvedFields.push(f);
          highestTier = isDetails ? 'enterprise_atmosphere' : 'enterprise';
        } else {
          if (tierWeights[tier] > tierWeights[highestTier]) {
            highestTier = tier;
          }
        }
      }

      // Collect all fields matching or exceeding the highest resolved tier
      for (const f of fields) {
        const tier = PLACES_FIELD_TIER_TABLE[f];
        if (tier && tierWeights[tier] >= tierWeights[highestTier]) {
          drivingFields.push(f);
        }
      }
    }

    // Map operation + highestTier to SKU and CostProfile operation
    let resolvedOp = 'text_search_basic';
    let defaultSku = 'SKU_PLACES_TEXT_SEARCH_BASIC';

    if (isTextSearch) {
      if (highestTier === 'enterprise_atmosphere' || highestTier === 'enterprise') {
        resolvedOp = 'text_search_enterprise';
        defaultSku = 'SKU_PLACES_TEXT_SEARCH_ENTERPRISE';
      } else if (highestTier === 'pro') {
        resolvedOp = 'text_search_pro';
        defaultSku = 'SKU_PLACES_TEXT_SEARCH_PRO';
      } else {
        resolvedOp = 'text_search_basic';
        defaultSku = 'SKU_PLACES_TEXT_SEARCH_BASIC';
      }
    } else if (isNearby) {
      if (highestTier === 'enterprise_atmosphere' || highestTier === 'enterprise') {
        resolvedOp = 'nearby_search_enterprise';
        defaultSku = 'SKU_PLACES_NEARBY_SEARCH_ENTERPRISE';
      } else if (highestTier === 'pro') {
        resolvedOp = 'nearby_search_pro';
        defaultSku = 'SKU_PLACES_NEARBY_SEARCH_PRO';
      } else {
        resolvedOp = 'nearby_search_basic';
        defaultSku = 'SKU_PLACES_NEARBY_SEARCH_BASIC';
      }
    } else if (isDetails) {
      if (highestTier === 'enterprise_atmosphere') {
        resolvedOp = 'place_details_enterprise_atmosphere';
        defaultSku = 'SKU_PLACES_DETAILS_ENTERPRISE_ATMOSPHERE';
      } else if (highestTier === 'enterprise') {
        resolvedOp = 'place_details_enterprise';
        defaultSku = 'SKU_PLACES_DETAILS_ENTERPRISE';
      } else if (highestTier === 'pro') {
        resolvedOp = 'place_details_pro';
        defaultSku = 'SKU_PLACES_DETAILS_PRO';
      } else {
        resolvedOp = 'place_details_basic';
        defaultSku = 'SKU_PLACES_DETAILS_BASIC';
      }
    }

    const key = `google_places:${resolvedOp}`;
    const profile = this.profiles.get(key) || {
      sku: defaultSku,
      internal_cost_units_per_call: highestTier.includes('enterprise') ? 40.0 : 5.0,
      estimated_cost_per_call_usd: highestTier.includes('enterprise') ? 0.040 : 0.005,
      verification_status: 'verified' as VerificationStatus
    };

    return {
      sku: profile.sku,
      resolvedOperation: resolvedOp,
      resolvedTier: highestTier,
      isUnresolvedField,
      unresolvedFields,
      drivingFields,
      internalCostUnits: (profile as any).internal_cost_units_per_call ?? (profile as any).cost_unit ?? 5.0,
      estimatedCostUsd: (profile as any).estimated_cost_per_call_usd ?? (profile as any).currency_cost_usd ?? 0.005,
      verificationStatus: profile.verification_status || 'verified'
    };
  }

  /**
   * Calculates AI call estimated cost with centralized pricing and token categorization
   */
  public static calculateAiCost(
    model: string,
    inputTokens: number = 0,
    outputTokens: number = 0
  ): {
    sku: string;
    internalCostUnits: number;
    estimatedUsd: number;
    model: string;
    verificationStatus: VerificationStatus;
  } {
    const normModel = (model || 'gemini-3.1-flash-lite').toLowerCase();
    const key = `gemini:${normModel}`;
    const profile = this.profiles.get(key) || this.profiles.get('gemini:gemini-3.1-flash-lite')!;

    const priceInput1M = profile.published_list_price.price_per_1m_input_tokens_usd ?? 0.075;
    const priceOutput1M = profile.published_list_price.price_per_1m_output_tokens_usd ?? 0.30;

    const inputCostUsd = (inputTokens / 1_000_000) * priceInput1M;
    const outputCostUsd = (outputTokens / 1_000_000) * priceOutput1M;
    const totalUsd = inputCostUsd + outputCostUsd;
    const costUnits = totalUsd / REFERENCE_UNIT_USD; // 1 unit = $0.001 USD

    return {
      sku: profile.sku,
      internalCostUnits: Number(costUnits.toFixed(6)),
      estimatedUsd: Number(totalUsd.toFixed(8)),
      model: normModel,
      verificationStatus: profile.verification_status
    };
  }

  public static getProfiles(): CostProfile[] {
    return Array.from(this.profiles.values());
  }

  public static registerProfile(profile: CostProfile): void {
    this.profiles.set(`${profile.provider}:${profile.operation}`, profile);
  }
}
