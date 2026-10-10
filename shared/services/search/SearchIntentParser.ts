import { TaxonomyMapper } from '../taxonomy/TaxonomyMapper';
import { TaxonomyValidator } from '../taxonomy/TaxonomyValidator';
import { LocalLanguageResolver, ResolvedLocationContext } from './LocalLanguageResolver';

export interface SearchIntentObject {
  originalQuery: string;
  category: string[];
  models: string[];
  experiences: string[];
  amenities: string[];
  services: string[];
  locationIntent: {
    type: 'near_me' | 'specified_location' | 'city' | 'global';
    latitude: number | null;
    longitude: number | null;
    radius: number | null;
    cityName?: string;
  };
  searchLanguage: string;
  mustMatch: string[];
  shouldMatch: string[];
  keywords: string[];
  operator: 'AND' | 'OR';
  fallbackIntent?: {
    models?: string[];
    experiences?: string[];
    amenities?: string[];
    reason?: string;
  };
}

export class SearchIntentParser {
  /**
   * Analyzes natural user query and maps into Coffee Passport Canonical Taxonomy.
   * STRICT RULES:
   * 1. Uses ONLY registered taxonomy IDs (e.g. 'cat_cafe', 'charging_station', 'quiet').
   * 2. NEVER invents new models (e.g. invalid models like 'anime_cafe' or 'cat_coffee_shop' are rejected from mustMatch).
   * 3. Operator: Detects OR ('hoặc', 'or', 'あるいは') vs AND ('và', 'có', 'and', 'with').
   * 4. User-requested Fallback: Detects conditional fallback ("nếu không có thì...", "if not found then...").
   */
  public static parse(
    rawQuery: string,
    resolvedLocation: ResolvedLocationContext,
    userProvidedCoords?: { lat: number; lng: number } | null
  ): SearchIntentObject {
    const query = (rawQuery || '').trim();
    const queryLower = query.toLowerCase();

    // 1. Detect Operator (OR vs AND)
    let operator: 'AND' | 'OR' = 'AND';
    if (
      queryLower.includes(' hoặc ') ||
      queryLower.includes(' hay là ') ||
      queryLower.includes(' or ') ||
      queryLower.includes(' または ') ||
      queryLower.includes(' 或者 ')
    ) {
      operator = 'OR';
    }

    // 2. Detect User-Requested Conditional Fallback (Rule 21)
    let fallbackPart = '';
    let primaryPart = query;
    const fallbackRegex = /(?:nếu không có(?: thì)?|if (?:no|not found|none)(?: then)?|なければ|如果没有|만약 없으면)\s*(.*)/i;
    const fallbackMatch = query.match(fallbackRegex);
    if (fallbackMatch && fallbackMatch[1]) {
      primaryPart = query.substring(0, fallbackMatch.index).trim();
      fallbackPart = fallbackMatch[1].trim();
    }

    // 3. Semantic Mapping of Primary Query to Taxonomy
    const semanticMatch = TaxonomyMapper.mapTextToTaxonomy(primaryPart);

    // 4. Validate through TaxonomyValidator (Rule 8)
    const validation = TaxonomyValidator.validate(
      semanticMatch.models,
      semanticMatch.amenities,
      semanticMatch.experiences,
      semanticMatch.keywords
    );

    // 5. Build MustMatch criteria
    const mustMatch: string[] = [];
    for (const m of validation.validModels) {
      mustMatch.push(`special_model:${m}`);
    }
    for (const a of validation.validAmenities) {
      mustMatch.push(`amenity:${a}`);
    }
    for (const e of validation.validExperiences) {
      mustMatch.push(`experience:${e}`);
    }

    // 6. Handle Location Intent
    let locationType: 'near_me' | 'specified_location' | 'city' | 'global' = 'near_me';
    let extractedCity = '';
    
    // Check for explicit city mentions in the query
    const cityMap: Record<string, string> = {
      'taipei': 'Taipei', 'đài bắc': 'Taipei', '台北': 'Taipei',
      'kaohsiung': 'Kaohsiung', 'cao hùng': 'Kaohsiung', '高雄': 'Kaohsiung',
      'tainan': 'Tainan', 'đài nam': 'Tainan', '台南': 'Tainan',
      'chiayi': 'Chiayi', 'gia nghĩa': 'Chiayi', '嘉義': 'Chiayi',
      'taichung': 'Taichung', 'đài trung': 'Taichung', '台中': 'Taichung',
      'miaoli': 'Miaoli', '苗栗': 'Miaoli',
      'hsinchu': 'Hsinchu', 'tân trúc': 'Hsinchu', '新竹': 'Hsinchu',
      'taoyuan': 'Taoyuan', 'đào viên': 'Taoyuan', '桃園': 'Taoyuan',
      'tokyo': 'Tokyo', '東京': 'Tokyo',
      'osaka': 'Osaka', '大阪': 'Osaka',
      'kyoto': 'Kyoto', '京都': 'Kyoto',
      'seoul': 'Seoul', '서울': 'Seoul',
      'busan': 'Busan', '부산': 'Busan',
      'bangkok': 'Bangkok', 'กรุงเทพ': 'Bangkok',
      'chiang mai': 'Chiang Mai', 'เชียงใหม่': 'Chiang Mai',
      'hồ chí minh': 'Hồ Chí Minh', 'sài gòn': 'Hồ Chí Minh', 'ho chi minh': 'Hồ Chí Minh',
      'hà nội': 'Hà Nội', 'ha noi': 'Hà Nội',
      'đà nẵng': 'Đà Nẵng', 'da nang': 'Đà Nẵng',
      'đà lạt': 'Đà Lạt', 'da lat': 'Đà Lạt'
    };

    for (const [key, val] of Object.entries(cityMap)) {
      if (queryLower.includes(key)) {
        extractedCity = val;
        break;
      }
    }

    if (extractedCity) {
      locationType = 'specified_location';
    } else if (
      queryLower.includes('gần tôi') ||
      queryLower.includes('near me') ||
      queryLower.includes('nearby') ||
      queryLower.includes('附近') ||
      queryLower.includes('近く') ||
      queryLower.includes('주변')
    ) {
      locationType = 'near_me';
    } else if (resolvedLocation.city) {
      locationType = 'city';
    }

    const lat = userProvidedCoords?.lat ?? resolvedLocation.coordinates?.lat ?? null;
    const lng = userProvidedCoords?.lng ?? resolvedLocation.coordinates?.lng ?? null;

    // 7. Parse User-Requested Fallback if present
    let fallbackIntent: SearchIntentObject['fallbackIntent'] = undefined;
    if (fallbackPart) {
      const fallbackSemantic = TaxonomyMapper.mapTextToTaxonomy(fallbackPart);
      const fallbackValidation = TaxonomyValidator.validate(
        fallbackSemantic.models,
        fallbackSemantic.amenities,
        fallbackSemantic.experiences
      );
      if (
        fallbackValidation.validModels.length > 0 ||
        fallbackValidation.validAmenities.length > 0 ||
        fallbackValidation.validExperiences.length > 0
      ) {
        fallbackIntent = {
          models: fallbackValidation.validModels,
          amenities: fallbackValidation.validAmenities,
          experiences: fallbackValidation.validExperiences,
          reason: 'user_fallback'
        };
      }
    }

    return {
      originalQuery: query,
      category: ['cafe'],
      models: validation.validModels,
      experiences: validation.validExperiences,
      amenities: validation.validAmenities,
      services: [],
      locationIntent: {
        type: locationType,
        latitude: lat,
        longitude: lng,
        radius: 5000,
        cityName: extractedCity || resolvedLocation.city
      },
      searchLanguage: resolvedLocation.languageCode,
      mustMatch,
      shouldMatch: [],
      keywords: validation.unresolvedKeywords,
      operator,
      fallbackIntent
    };
  }
}
