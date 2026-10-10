/**
 * MOBLER SEARCH - PHASE 2C: LEGACY IDENTIFIER COMPATIBILITY MAP
 * Single source of truth for mapping legacy code and database identifiers to Phase 2B canonical taxonomy.
 */

import { CompatibilityMapping } from './types';

export const COMPATIBILITY_MAPPINGS: CompatibilityMapping[] = [
  // =========================================================================
  // 1. SPECIAL MODELS - MACHINE IDENTIFIERS (16 items)
  // Exact 1:1 match to Phase 2B canonical IDs
  // =========================================================================
  {
    identifier: 'anime_cafe',
    status: 'exact',
    canonical_id: 'anime_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'art_toy_cafe',
    status: 'exact',
    canonical_id: 'art_toy_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'board_game_cafe',
    status: 'exact',
    canonical_id: 'board_game_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/QueryUnderstandingService.ts', 'server/search/PlaceVerificationService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'book_cafe',
    status: 'exact',
    canonical_id: 'book_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'car_workshop_cafe',
    status: 'exact',
    canonical_id: 'car_workshop_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'cat_cafe',
    status: 'exact',
    canonical_id: 'cat_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/QueryUnderstandingService.ts', 'server/search/PlaceVerificationService.ts', 'server/aiSearchPipeline.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'ceramic_cafe',
    status: 'exact',
    canonical_id: 'ceramic_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'console_gaming_cafe',
    status: 'exact',
    canonical_id: 'console_gaming_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/QueryUnderstandingService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'dog_cafe',
    status: 'exact',
    canonical_id: 'dog_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/QueryUnderstandingService.ts', 'server/search/PlaceVerificationService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'fashion_cafe',
    status: 'exact',
    canonical_id: 'fashion_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'immersive_cafe',
    status: 'exact',
    canonical_id: 'immersive_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'moto_workshop_cafe',
    status: 'exact',
    canonical_id: 'moto_workshop_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'plant_cafe',
    status: 'exact',
    canonical_id: 'plant_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/QueryUnderstandingService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'vinyl_cafe',
    status: 'exact',
    canonical_id: 'vinyl_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/QueryUnderstandingService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'vr_cafe',
    status: 'exact',
    canonical_id: 'vr_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'workshop_cafe',
    status: 'exact',
    canonical_id: 'workshop_cafe',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },

  // =========================================================================
  // 2. SPECIAL MODELS - UI DISPLAY NAMES (16 items)
  // =========================================================================
  {
    identifier: 'Anime Café',
    status: 'exact',
    canonical_id: 'anime_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Art Toy Café',
    status: 'exact',
    canonical_id: 'art_toy_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Board Game Café',
    status: 'exact',
    canonical_id: 'board_game_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Book Café',
    status: 'exact',
    canonical_id: 'book_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Car Workshop Café',
    status: 'exact',
    canonical_id: 'car_workshop_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Cat Café',
    status: 'exact',
    canonical_id: 'cat_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Ceramic Café',
    status: 'exact',
    canonical_id: 'ceramic_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Console Gaming Café',
    status: 'exact',
    canonical_id: 'console_gaming_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Dog Café',
    status: 'exact',
    canonical_id: 'dog_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Fashion Café',
    status: 'exact',
    canonical_id: 'fashion_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Immersive Café',
    status: 'exact',
    canonical_id: 'immersive_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Moto Workshop Café',
    status: 'exact',
    canonical_id: 'moto_workshop_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Plant Café',
    status: 'exact',
    canonical_id: 'plant_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Vinyl Café',
    status: 'exact',
    canonical_id: 'vinyl_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'VR Café',
    status: 'exact',
    canonical_id: 'vr_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Workshop Café',
    status: 'exact',
    canonical_id: 'workshop_cafe',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },

  // =========================================================================
  // 3. SPECIAL MODELS - ALTERNATE HEURISTIC SLUGS (6 items)
  // Slugs used in QueryUnderstandingService CANONICAL_SPECIAL_MODES
  // =========================================================================
  {
    identifier: 'anime_theme_cafe',
    status: 'exact',
    canonical_id: 'anime_cafe',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'blind_box_cafe',
    status: 'exact',
    canonical_id: 'art_toy_cafe',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'classic_car_garage_cafe',
    status: 'exact',
    canonical_id: 'car_workshop_cafe',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'fashion_select_shop_cafe',
    status: 'exact',
    canonical_id: 'fashion_cafe',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'immersive_light_cafe',
    status: 'exact',
    canonical_id: 'immersive_cafe',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'motorcycle_cafe',
    status: 'exact',
    canonical_id: 'moto_workshop_cafe',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },

  // =========================================================================
  // 4. STYLES & EXPERIENCES - EXACT MATCHES (16 items)
  // =========================================================================
  {
    identifier: 'artistic',
    status: 'exact',
    canonical_id: 'artistic',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Artistic',
    status: 'exact',
    canonical_id: 'artistic',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'cozy_modern',
    status: 'exact',
    canonical_id: 'cozy_modern',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Cozy Modern',
    status: 'exact',
    canonical_id: 'cozy_modern',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'cute',
    status: 'exact',
    canonical_id: 'cute',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Cute',
    status: 'exact',
    canonical_id: 'cute',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'futuristic',
    status: 'exact',
    canonical_id: 'futuristic',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Futuristic',
    status: 'exact',
    canonical_id: 'futuristic',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'industrial',
    status: 'exact',
    canonical_id: 'industrial',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Industrial',
    status: 'exact',
    canonical_id: 'industrial',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'minimalist',
    status: 'exact',
    canonical_id: 'minimalist',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Minimalist',
    status: 'exact',
    canonical_id: 'minimalist',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'nature',
    status: 'exact',
    canonical_id: 'nature',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Nature',
    status: 'exact',
    canonical_id: 'nature',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'quiet',
    status: 'exact',
    canonical_id: 'quiet',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/aiSearchPipeline.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'retro_vintage',
    status: 'exact',
    canonical_id: 'retro_vintage',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },

  // =========================================================================
  // 5. AMENITIES, ATTRIBUTES & ACTIVITIES - EXACT MATCHES (12 items)
  // =========================================================================
  {
    identifier: 'board_gaming',
    status: 'exact',
    canonical_id: 'board_games',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'Chỗ sạc',
    status: 'exact',
    canonical_id: 'power_outlet',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'laptop_work',
    status: 'exact',
    canonical_id: 'work',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'outdoor',
    status: 'exact',
    canonical_id: 'outdoor_seating',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Outdoor',
    status: 'exact',
    canonical_id: 'outdoor_seating',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Parking',
    status: 'exact',
    canonical_id: 'parking',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'power_outlets',
    status: 'exact',
    canonical_id: 'power_outlets',
    where_found: ['server/search/PlaceVerificationService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'private_parking',
    status: 'exact',
    canonical_id: 'parking',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'quiet_atmosphere',
    status: 'exact',
    canonical_id: 'quiet',
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'wifi',
    status: 'exact',
    canonical_id: 'wifi',
    where_found: ['src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Wi-Fi',
    status: 'exact',
    canonical_id: 'wifi',
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'work_friendly',
    status: 'exact',
    canonical_id: 'work_friendly',
    where_found: ['server/aiSearchPipeline.ts', 'server/search/taxonomy/registryData.ts']
  },

  // =========================================================================
  // 6. MOODS - EXACT MATCHES (3 items)
  // =========================================================================
  {
    identifier: 'Hẹn hò',
    status: 'exact',
    canonical_id: 'date',
    where_found: ['src/types.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Thư giãn / Chill',
    status: 'exact',
    canonical_id: 'relax',
    where_found: ['src/types.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'Tụ tập nhóm',
    status: 'exact',
    canonical_id: 'social',
    where_found: ['src/types.ts', 'server/search/taxonomy/registryData.ts']
  },

  // =========================================================================
  // 7. SPLIT CASES (split_requires_review) (8 items)
  // Multi-target identifiers flagged with candidate options, never resolved silently.
  // =========================================================================
  {
    identifier: 'Chụp ảnh / Check-in',
    status: 'split_requires_review',
    candidates: ['photography', 'social', 'cute'],
    reason: "Compound user mood spanning photography activity, social gathering, and cute visual atmosphere",
    where_found: ['src/types.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'craft_workshop_cafe',
    status: 'split_requires_review',
    candidates: ['workshop_cafe', 'crafting'],
    reason: "Heuristic slug that can map to either the workshop_cafe experience or crafting activity",
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'Game Cafe',
    status: 'split_requires_review',
    candidates: ['console_gaming_cafe', 'board_game_cafe'],
    reason: "Generic Google Places category 'Game Cafe' encompasses both console video gaming and tabletop board game cafes",
    where_found: ['server/consoleGaming.ts']
  },
  {
    identifier: 'Làm việc / Học bài',
    status: 'split_requires_review',
    candidates: ['work', 'study', 'work_study'],
    reason: "Dual-purpose mood compound phrase that maps to work activity, study activity, or work_study composite activity",
    where_found: ['src/types.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'quiet_reading_cafe',
    status: 'split_requires_review',
    candidates: ['book_cafe', 'reading_nook', 'quiet'],
    reason: "Compound legacy slug that could resolve to book_cafe, reading_nook, or quiet attribute",
    where_found: ['server/search/QueryUnderstandingService.ts', 'server/search/PlaceVerificationService.ts']
  },
  {
    identifier: 'reading',
    status: 'split_requires_review',
    candidates: ['study', 'reading_nook'],
    reason: "Could map to study activity or reading_nook experience",
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'Retro',
    status: 'split_requires_review',
    candidates: ['retro_vintage', 'vinyl_cafe'],
    reason: "Ambiguous between general retro_vintage aesthetic and vintage vinyl/analog music specialty",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'Vintage',
    status: 'split_requires_review',
    candidates: ['retro_vintage', 'vinyl_cafe'],
    reason: "Ambiguous between general retro_vintage style and analog/vinyl cultural atmosphere",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts', 'server/search/QueryUnderstandingService.ts']
  },

  // =========================================================================
  // 8. JUDGMENT CALLS (human_review_required) (10 items)
  // Mapping is a semantic judgment call, not an exact string/synonym match.
  // =========================================================================
  {
    identifier: 'charging_station',
    status: 'human_review_required',
    proposed_canonical_id: 'power_outlet',
    reason: "Legacy machine key charging_station maps semantically to canonical power_outlet attribute, requires confirmation",
    where_found: ['src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'indoor',
    status: 'human_review_required',
    proposed_canonical_id: 'air_conditioned',
    reason: "Indoor space commonly implies air_conditioned attribute in café context, requires verification",
    where_found: ['src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'Indoor',
    status: 'human_review_required',
    proposed_canonical_id: 'air_conditioned',
    reason: "Indoor space commonly implies air_conditioned attribute in café context, requires verification",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'lush_green',
    status: 'human_review_required',
    proposed_canonical_id: 'nature',
    reason: "Lush green atmosphere maps to nature aesthetic, requires confirmation",
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'no_smoking',
    status: 'human_review_required',
    proposed_canonical_id: 'smoking_allowed',
    reason: "Negative constraint representing absence of smoking_allowed attribute",
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'pottery_cafe',
    status: 'human_review_required',
    proposed_canonical_id: 'ceramic_cafe',
    reason: "Semantic judgment call mapping English legacy slug 'pottery_cafe' to canonical 'ceramic_cafe' pending human approval",
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'Private',
    status: 'human_review_required',
    proposed_canonical_id: 'spacious',
    reason: "Private booths/rooms do not have an exact 1:1 attribute; closest proxy is spacious, review required",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'private_space',
    status: 'human_review_required',
    proposed_canonical_id: 'spacious',
    reason: "Private booths/rooms do not have an exact 1:1 attribute; closest proxy is spacious, review required",
    where_found: ['src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'Shared',
    status: 'human_review_required',
    proposed_canonical_id: 'work_friendly',
    reason: "Shared communal table is an operational layout feature often associated with work_friendly, review required",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'shared_space',
    status: 'human_review_required',
    proposed_canonical_id: 'work_friendly',
    reason: "Shared communal table is an operational layout feature often associated with work_friendly, review required",
    where_found: ['src/services/taxonomy/TaxonomyService.ts']
  },

  // =========================================================================
  // 9. UNMAPPED IDENTIFIERS (unmapped) (8 items)
  // Operational service/facility/constraint attributes not represented in 2B search discovery taxonomy
  // =========================================================================
  {
    identifier: 'budget_friendly',
    status: 'unmapped',
    reason: "Pricing tier preference not codified in Phase 2B taxonomy",
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'restroom',
    status: 'unmapped',
    reason: "Basic operational sanitary facility not included in 2B customer discovery taxonomy",
    where_found: ['src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'scenic_view',
    status: 'unmapped',
    reason: "Visual scenic view is not a codified search attribute in Phase 2B taxonomy",
    where_found: ['server/search/QueryUnderstandingService.ts']
  },
  {
    identifier: 'Self Service',
    status: 'unmapped',
    reason: "Service workflow not tracked as a customer search discovery attribute in 2B",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'self_service',
    status: 'unmapped',
    reason: "Service workflow not tracked as a customer search discovery attribute in 2B",
    where_found: ['src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'Table Service',
    status: 'unmapped',
    reason: "Service workflow not tracked as a customer search discovery attribute in 2B",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'table_service',
    status: 'unmapped',
    reason: "Service workflow not tracked as a customer search discovery attribute in 2B",
    where_found: ['src/services/taxonomy/TaxonomyService.ts']
  },
  {
    identifier: 'WC',
    status: 'unmapped',
    reason: "Basic operational sanitary facility not included in 2B customer discovery taxonomy",
    where_found: ['src/types.ts', 'src/data.ts', 'src/services/taxonomy/TaxonomyService.ts']
  },

  // =========================================================================
  // 10. DEPRECATED / TOMBSTONED IDENTIFIERS (deprecated) (3 items)
  // Tombstoned in Phase 2B; mapped to official migration replacements
  // =========================================================================
  {
    identifier: 'deprecated_outlet_v1',
    status: 'deprecated',
    replacement_id: 'power_outlet',
    reason: "Tombstoned in 2B in favor of canonical power_outlet",
    where_found: ['server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'legacy_pet_cafe',
    status: 'deprecated',
    replacement_id: 'cat_cafe',
    reason: "Tombstoned in 2B in favor of specific pet café types (cat_cafe, dog_cafe)",
    where_found: ['server/search/taxonomy/registryData.ts']
  },
  {
    identifier: 'old_reading_space',
    status: 'deprecated',
    replacement_id: 'reading_nook',
    reason: "Tombstoned in 2B in favor of canonical reading_nook",
    where_found: ['server/search/taxonomy/registryData.ts']
  }
];
