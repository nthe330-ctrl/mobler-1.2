import { GoogleGenAI, Type } from '@google/genai';
import { 
  ParsedSearchQuery, 
  SearchIntentType, 
  SupportedLanguage, 
  LocationTarget, 
  QueryRequirement 
} from './types';

// In-memory LRU-like cache for query understandings
const queryUnderstandingCache = new Map<string, ParsedSearchQuery>();
let geminiQuotaCooldownUntil = 0;

// Canonical 16 Special Experience Modes
export const CANONICAL_SPECIAL_MODES = [
  'cat_cafe',
  'dog_cafe',
  'board_game_cafe',
  'craft_workshop_cafe',
  'console_gaming_cafe',
  'quiet_reading_cafe',
  'plant_cafe',
  'pottery_cafe',
  'vinyl_cafe',
  'fashion_select_shop_cafe',
  'blind_box_cafe',
  'anime_theme_cafe',
  'vr_cafe',
  'immersive_light_cafe',
  'classic_car_garage_cafe',
  'motorcycle_cafe'
] as const;

export class QueryUnderstandingService {
  /**
   * Fast language detection based on script and character analysis
   */
  public static detectQueryLanguage(query: string, defaultLang: SupportedLanguage = 'vi'): SupportedLanguage {
    const q = query.trim();
    if (!q) return defaultLang;

    // Thai script regex: \u0E00-\u0E7F
    if (/[\u0E00-\u0E7F]/.test(q)) {
      return 'th';
    }

    // Japanese kana regex: \u3040-\u309F, \u30A0-\u30FF
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(q)) {
      return 'ja';
    }

    // Korean Hangul: \uAC00-\uD7AF, \u1100-\u11FF
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(q)) {
      return 'ko';
    }

    // Chinese characters: \u4E00-\u9FFF
    if (/[\u4E00-\u9FFF]/.test(q)) {
      return 'zh-TW';
    }

    // Vietnamese accented characters
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(q)) {
      return 'vi';
    }

    // Vietnamese unaccented common words
    const lower = q.toLowerCase();
    const viKeywords = ['quan', 'ca phe', 'caphe', 'yen tinh', 'lam viec', 'chỗ ngồi', 'meo', 'cun', 'sach', 'hen ho', 'view dep', 'gan day', 'o cam'];
    if (viKeywords.some(k => lower.includes(k))) {
      return 'vi';
    }

    // Default to English if Latin alphabet or fallback
    return 'en';
  }

  /**
   * Resolves the search market language based on GPS / Location coordinates
   * GPS location strictly dictates the search query target language for Google Places
   */
  public static resolveMarketLanguage(location: LocationTarget, uiLang: SupportedLanguage = 'vi'): SupportedLanguage {
    const lat = location.latitude;
    const lng = location.longitude;

    if (typeof lat === 'number' && typeof lng === 'number') {
      // Taiwan
      if (lat >= 21.8 && lat <= 25.5 && lng >= 119.8 && lng <= 122.2) return 'zh-TW';
      // Hong Kong
      if (lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.4) return 'zh-TW';
      // Japan
      if (lat >= 30.0 && lat <= 45.5 && lng >= 128.0 && lng <= 146.0) return 'ja';
      // South Korea
      if (lat >= 33.0 && lat <= 38.8 && lng >= 124.5 && lng <= 130.5) return 'ko';
      // Thailand
      if (lat >= 5.5 && lat <= 20.5 && lng >= 97.0 && lng <= 105.8) return 'th';
      // Vietnam
      if (lat >= 8.2 && lat <= 23.5 && lng >= 102.0 && lng <= 109.8) return 'vi';
    }

    if (location.countryCode === 'TW' || location.country === 'Taiwan') return 'zh-TW';
    if (location.countryCode === 'TH' || location.country === 'Thailand') return 'th';
    if (location.countryCode === 'JP' || location.country === 'Japan') return 'ja';
    if (location.countryCode === 'KR' || location.country === 'South Korea') return 'ko';
    if (location.countryCode === 'VN' || location.country === 'Vietnam') return 'vi';

    return uiLang || 'vi';
  }

  /**
   * Deterministic semantic parser - fast, reliable, zero latency, handles typos and multi-market terms
   */
  public static parseQueryDeterministic(
    rawQuery: string,
    locationTarget: LocationTarget,
    uiLanguage: SupportedLanguage = 'vi'
  ): ParsedSearchQuery {
    const q = (rawQuery || '').trim();
    const qLower = q.toLowerCase();
    const detectedLanguage = this.detectQueryLanguage(q, uiLanguage);
    const searchMarketLanguage = this.resolveMarketLanguage(locationTarget, uiLanguage);

    const mustHave: string[] = [];
    const shouldHave: string[] = [];
    const niceToHave: string[] = [];
    const negativeConstraints: string[] = [];
    const atmosphereVibes: string[] = [];
    const activities: string[] = [];
    const experienceModes: string[] = [];
    let intentType: SearchIntentType = 'general_discovery';

    // 1. Must-Have Experience Modes & Core Features
    if (qLower.includes('mèo') || qLower.includes('cat cafe') || qLower.includes('meo') || qLower.includes('猫') || qLower.includes('แมว') || qLower.includes('고양이')) {
      mustHave.push('cat_cafe');
      experienceModes.push('cat_cafe');
      intentType = 'feature_search';
    }

    if (qLower.includes('chó') || qLower.includes('cún') || qLower.includes('dog cafe') || qLower.includes('puppy') || qLower.includes('狗') || qLower.includes('犬') || qLower.includes('หมา') || qLower.includes('강아지')) {
      mustHave.push('dog_cafe');
      experienceModes.push('dog_cafe');
      intentType = 'feature_search';
    }

    if (qLower.includes('board game') || qLower.includes('boardgame') || qLower.includes('trò chơi bàn') || qLower.includes('bàn cờ') || qLower.includes('桌遊') || qLower.includes('บอร์ดเกม')) {
      mustHave.push('board_game_cafe');
      experienceModes.push('board_game_cafe');
      activities.push('board_gaming');
      intentType = 'activity_based';
    }

    if (qLower.includes('ps5') || qLower.includes('switch') || qLower.includes('console') || qLower.includes('gaming') || qLower.includes('chơi game') || qLower.includes('電玩') || qLower.includes('เกม')) {
      mustHave.push('console_gaming_cafe');
      experienceModes.push('console_gaming_cafe');
      activities.push('gaming');
      intentType = 'activity_based';
    }

    if (qLower.includes('sách') || qLower.includes('book') || qLower.includes('reading') || qLower.includes('đọc sách') || qLower.includes('書') || qLower.includes('หนังสือ')) {
      mustHave.push('quiet_reading_cafe');
      experienceModes.push('quiet_reading_cafe');
      activities.push('reading');
      intentType = 'activity_based';
    }

    if (qLower.includes('gốm') || qLower.includes('ceramic') || qLower.includes('pottery') || qLower.includes('làm gốm') || qLower.includes('陶') || qLower.includes('เซรามิก')) {
      mustHave.push('pottery_cafe');
      experienceModes.push('pottery_cafe');
      intentType = 'feature_search';
    }

    if (qLower.includes('workshop') || qLower.includes('thủ công') || qLower.includes('craft') || qLower.includes('diy') || qLower.includes('工作坊') || qLower.includes('เวิร์กช็อป')) {
      mustHave.push('craft_workshop_cafe');
      experienceModes.push('craft_workshop_cafe');
      intentType = 'activity_based';
    }

    if (qLower.includes('cây xanh') || qLower.includes('vườn') || qLower.includes('plant') || qLower.includes('garden') || qLower.includes('botanical') || qLower.includes('花園') || qLower.includes('สวน')) {
      mustHave.push('plant_cafe');
      experienceModes.push('plant_cafe');
      atmosphereVibes.push('lush_green');
    }

    if (qLower.includes('đĩa than') || qLower.includes('vinyl') || qLower.includes('record') || qLower.includes('hi-fi') || qLower.includes('黑膠') || qLower.includes('แผ่นเสียง')) {
      mustHave.push('vinyl_cafe');
      experienceModes.push('vinyl_cafe');
      atmosphereVibes.push('vintage');
    }

    // 2. Activity & Work Detection
    if (qLower.includes('làm việc') || qLower.includes('lam viec') || qLower.includes('laptop') || qLower.includes('ngồi laptop') || qLower.includes('work') || qLower.includes('học bài') || qLower.includes('hoc bai') || qLower.includes('study') || qLower.includes('辦公') || qLower.includes('工作') || qLower.includes('นั่งทำงาน')) {
      activities.push('laptop_work');
      shouldHave.push('power_outlets', 'fast_wifi', 'comfortable_seating');
      intentType = 'activity_based';
    }

    // 3. Atmosphere & Vibe Detection
    if (qLower.includes('yên tĩnh') || qLower.includes('yen tinh') || qLower.includes('ít ồn') || qLower.includes('im lặng') || qLower.includes('quiet') || qLower.includes('peaceful') || qLower.includes('安靜') || qLower.includes('靜謐') || qLower.includes('เงียบ')) {
      atmosphereVibes.push('quiet');
      shouldHave.push('quiet_atmosphere');
      if (intentType === 'general_discovery') intentType = 'atmosphere_vibe';
    }

    if (qLower.includes('view đẹp') || qLower.includes('view ho') || qLower.includes('view hồ') || qLower.includes('rooftop') || qLower.includes('sống ảo') || qLower.includes('scenic') || qLower.includes('景觀') || qLower.includes('วิวสวย')) {
      atmosphereVibes.push('scenic_view');
      shouldHave.push('scenic_view');
      if (intentType === 'general_discovery') intentType = 'atmosphere_vibe';
    }

    if (qLower.includes('hẹn hò') || qLower.includes('date') || qLower.includes('lãng mạn') || qLower.includes('romantic') || qLower.includes('約會') || qLower.includes('เดท')) {
      atmosphereVibes.push('romantic', 'cozy');
      activities.push('date');
      intentType = 'date_occasion';
    }

    // 4. Discovery Mode / Hidden Gems
    if (qLower.includes('quán ẩn') || qLower.includes('hidden gem') || qLower.includes('độc lạ') || qLower.includes('ít người biết') || qLower.includes('quán lạ') || qLower.includes('núp hẻm') || qLower.includes('私房') || qLower.includes('隱密') || qLower.includes('ลับ')) {
      intentType = 'hidden_gem_discovery';
      shouldHave.push('unique_character', 'high_rating');
    }

    // 5. Negative Constraints (Exclusions)
    if (qLower.includes('không ồn') || qLower.includes('đừng ồn') || qLower.includes('không nhạc lớn') || qLower.includes('no loud') || qLower.includes('no noise') || qLower.includes('不吵') || qLower.includes('ไม่เสียงดัง')) {
      negativeConstraints.push('no_loud_music', 'no_noisy_crowd');
    }
    if (qLower.includes('không khói') || qLower.includes('không hút thuốc') || qLower.includes('no smoking') || qLower.includes('cấm hút thuốc') || qLower.includes('禁菸') || qLower.includes('ห้ามสูบบุหรี่')) {
      negativeConstraints.push('no_smoking');
    }
    if (qLower.includes('không đắt') || qLower.includes('giá rẻ') || qLower.includes('bình dân') || qLower.includes('affordable') || qLower.includes('cheap') || qLower.includes('平價')) {
      shouldHave.push('budget_friendly');
    }

    // 6. Spatial Extraction from Query
    const parsedLocationTarget: LocationTarget = { ...locationTarget };
    if (qLower.includes('quận 1') || qLower.includes('q1') || qLower.includes('district 1')) {
      parsedLocationTarget.district = 'Quận 1';
      parsedLocationTarget.type = 'district';
    } else if (qLower.includes('quận 2') || qLower.includes('thảo điền') || qLower.includes('thao dien')) {
      parsedLocationTarget.district = 'Thảo Điền, Quận 2';
      parsedLocationTarget.type = 'district';
    } else if (qLower.includes('quận 3') || qLower.includes('q3')) {
      parsedLocationTarget.district = 'Quận 3';
      parsedLocationTarget.type = 'district';
    } else if (qLower.includes('quận 7') || qLower.includes('phú mỹ hưng')) {
      parsedLocationTarget.district = 'Quận 7';
      parsedLocationTarget.type = 'district';
    } else if (qLower.includes('tây hồ') || qLower.includes('hoàn kiếm') || qLower.includes('đống đa') || qLower.includes('cầu giấy')) {
      parsedLocationTarget.city = 'Hà Nội';
      parsedLocationTarget.type = 'district';
    } else if (qLower.includes('đà lạt') || qLower.includes('da lat')) {
      parsedLocationTarget.city = 'Đà Lạt';
      parsedLocationTarget.type = 'city';
    } else if (qLower.includes('đà nẵng') || qLower.includes('da nang')) {
      parsedLocationTarget.city = 'Đà Nẵng';
      parsedLocationTarget.type = 'city';
    } else if (qLower.includes('xinyi') || qLower.includes('信義') || qLower.includes('daan') || qLower.includes('大安') || qLower.includes('taipei') || qLower.includes('台北')) {
      parsedLocationTarget.city = 'Taipei';
      parsedLocationTarget.type = 'city';
    } else if (qLower.includes('sukhumvit') || qLower.includes('thonglor') || qLower.includes('bangkok') || qLower.includes('กรุงเทพ')) {
      parsedLocationTarget.city = 'Bangkok';
      parsedLocationTarget.type = 'city';
    }

    if (qLower.includes('gần đây') || qLower.includes('quanh đây') || qLower.includes('near me') || qLower.includes('nearby') || qLower.includes('附近') || qLower.includes('แถวนี้')) {
      parsedLocationTarget.type = 'nearby';
      parsedLocationTarget.radiusMeters = 3000;
    }

    // Direct lookup detection (Specific brand or proper names)
    if (!mustHave.length && !activities.length && !atmosphereVibes.length && q.length > 2 && !qLower.includes('cà phê') && !qLower.includes('cafe') && !qLower.includes('quán')) {
      intentType = 'direct_lookup';
    }

    const requirements: QueryRequirement = {
      mustHave: Array.from(new Set(mustHave)),
      shouldHave: Array.from(new Set(shouldHave)),
      niceToHave: Array.from(new Set(niceToHave)),
      negativeConstraints: Array.from(new Set(negativeConstraints)),
      atmosphereVibes: Array.from(new Set(atmosphereVibes)),
      activities: Array.from(new Set(activities))
    };

    // Construct localized queries
    const localizedQueries = this.buildLocalizedSearchQueries(requirements, experienceModes, searchMarketLanguage, parsedLocationTarget);

    return {
      rawQuery: q,
      normalizedQuery: this.normalizeQueryText(q),
      detectedLanguage,
      searchMarketLanguage,
      intentType,
      primaryCategory: 'cafe',
      experienceModes,
      requirements,
      locationTarget: parsedLocationTarget,
      expandedKeywords: localizedQueries.mustTerms,
      localizedQueries
    };
  }

  /**
   * Normalizes search typos and slang
   */
  public static normalizeQueryText(query: string): string {
    return query
      .replace(/\bcoffe\b/gi, 'coffee')
      .replace(/\bca fe\b/gi, 'cà phê')
      .replace(/\bcaphe\b/gi, 'cà phê')
      .replace(/\byen tinh\b/gi, 'yên tĩnh')
      .replace(/\blam viec\b/gi, 'làm việc')
      .replace(/\bboardgame\b/gi, 'board game')
      .replace(/\bgui xe\b/gi, 'gửi xe')
      .trim();
  }

  /**
   * Builds high-precision localized search queries matching the target destination market
   */
  public static buildLocalizedSearchQueries(
    requirements: QueryRequirement,
    experienceModes: string[],
    marketLanguage: SupportedLanguage,
    location: LocationTarget
  ): {
    language: SupportedLanguage;
    primaryQuery: string;
    secondaryQueries: string[];
    mustTerms: string[];
  } {
    const isTW = marketLanguage === 'zh-TW';
    const isTH = marketLanguage === 'th';
    const isJP = marketLanguage === 'ja';
    const isEN = marketLanguage === 'en';
    const isVI = marketLanguage === 'vi';

    const secondaryQueries: string[] = [];
    const mustTerms: string[] = [];
    let primaryQuery = '';

    const district = location.district ? ` ${location.district}` : '';

    // Handle Experience Modes
    if (experienceModes.includes('cat_cafe')) {
      mustTerms.push('mèo', 'cat', '猫', 'แมว');
      if (isTW) {
        primaryQuery = `貓咪咖啡廳${district}`;
        secondaryQueries.push('貓咖', '貓咪餐廳');
      } else if (isTH) {
        primaryQuery = `คาเฟ่แมว${district}`;
        secondaryQueries.push('cat cafe', 'ร้านกาแฟแมว');
      } else if (isJP) {
        primaryQuery = `猫カフェ${district}`;
        secondaryQueries.push('ネコカフェ');
      } else if (isEN) {
        primaryQuery = `cat cafe${district}`;
        secondaryQueries.push('feline coffee shop');
      } else {
        primaryQuery = `quán cà phê mèo${district}`;
        secondaryQueries.push('cà phê thú cưng mèo', 'cat cafe');
      }
    } else if (experienceModes.includes('dog_cafe')) {
      mustTerms.push('chó', 'cún', 'dog', '狗', 'หมา');
      if (isTW) {
        primaryQuery = `狗狗咖啡廳${district}`;
        secondaryQueries.push('狗咖');
      } else if (isTH) {
        primaryQuery = `คาเฟ่หมา${district}`;
        secondaryQueries.push('dog cafe');
      } else if (isJP) {
        primaryQuery = `犬カフェ${district}`;
      } else if (isEN) {
        primaryQuery = `dog cafe${district}`;
      } else {
        primaryQuery = `quán cà phê cún${district}`;
        secondaryQueries.push('cà phê chó', 'dog cafe');
      }
    } else if (experienceModes.includes('board_game_cafe')) {
      mustTerms.push('board game', 'boardgame', '桌遊', 'บอร์ดเกม');
      if (isTW) {
        primaryQuery = `桌遊咖啡廳${district}`;
        secondaryQueries.push('桌遊店');
      } else if (isTH) {
        primaryQuery = `บอร์ดเกมคาเฟ่${district}`;
        secondaryQueries.push('board game cafe');
      } else if (isJP) {
        primaryQuery = `ボードゲームカフェ${district}`;
      } else if (isEN) {
        primaryQuery = `board game cafe${district}`;
      } else {
        primaryQuery = `quán cà phê board game${district}`;
        secondaryQueries.push('board game cafe', 'quán boardgame');
      }
    } else if (experienceModes.includes('quiet_reading_cafe')) {
      mustTerms.push('sách', 'book', 'reading', '書', 'หนังสือ');
      if (isTW) {
        primaryQuery = `書店咖啡廳${district}`;
        secondaryQueries.push('閱讀咖啡館');
      } else if (isTH) {
        primaryQuery = `คาเฟ่อ่านหนังสือ${district}`;
        secondaryQueries.push('book cafe');
      } else if (isJP) {
        primaryQuery = `ブックカフェ${district}`;
      } else if (isEN) {
        primaryQuery = `book cafe${district}`;
      } else {
        primaryQuery = `quán cà phê sách${district}`;
        secondaryQueries.push('cà phê đọc sách', 'book cafe');
      }
    } else if (requirements.activities.includes('laptop_work') && requirements.atmosphereVibes.includes('quiet')) {
      mustTerms.push('yên tĩnh', 'làm việc', 'quiet', 'work', '安靜', '工作', 'เงียบ', 'ทำงาน');
      if (isTW) {
        primaryQuery = `安靜適合工作的咖啡廳${district}`;
        secondaryQueries.push('工作咖啡廳', '不限時安靜咖啡廳');
      } else if (isTH) {
        primaryQuery = `คาเฟ่เงียบสงบนั่งทำงาน${district}`;
        secondaryQueries.push('คาเฟ่ทำงาน มีปลั๊กไฟ', 'quiet work cafe');
      } else if (isJP) {
        primaryQuery = `静かで作業ができるカフェ${district}`;
        secondaryQueries.push('仕事カフェ 電源');
      } else if (isEN) {
        primaryQuery = `quiet work friendly coffee shop${district}`;
        secondaryQueries.push('laptop friendly quiet cafe');
      } else {
        primaryQuery = `quán cà phê yên tĩnh làm việc${district}`;
        secondaryQueries.push('cà phê ngồi laptop yên tĩnh', 'quán cà phê học bài');
      }
    } else if (requirements.activities.includes('laptop_work')) {
      mustTerms.push('làm việc', 'work', 'laptop', '工作', 'ทำงาน');
      if (isTW) {
        primaryQuery = `適合工作的咖啡廳${district}`;
        secondaryQueries.push('插座咖啡廳', '辦公咖啡廳');
      } else if (isTH) {
        primaryQuery = `คาเฟ่นั่งทำงาน มีปลั๊กไฟ${district}`;
        secondaryQueries.push('work cafe bangkok');
      } else if (isJP) {
        primaryQuery = `作業用カフェ 電源 Wi-Fi${district}`;
      } else if (isEN) {
        primaryQuery = `laptop friendly work cafe${district}`;
      } else {
        primaryQuery = `quán cà phê làm việc có ổ cắm${district}`;
        secondaryQueries.push('cà phê ngồi laptop', 'cà phê làm việc wifi mạnh');
      }
    } else if (requirements.atmosphereVibes.includes('quiet')) {
      mustTerms.push('yên tĩnh', 'quiet', '安靜', 'เงียบ');
      if (isTW) {
        primaryQuery = `安靜咖啡廳${district}`;
        secondaryQueries.push('舒適寧靜咖啡館');
      } else if (isTH) {
        primaryQuery = `คาเฟ่บรรยากาศเงียบสงบ${district}`;
      } else if (isJP) {
        primaryQuery = `静かなカフェ${district}`;
      } else if (isEN) {
        primaryQuery = `quiet peaceful cafe${district}`;
      } else {
        primaryQuery = `quán cà phê yên tĩnh${district}`;
        secondaryQueries.push('cà phê không gian yên tĩnh');
      }
    } else {
      // Default natural cafe query
      if (isTW) {
        primaryQuery = `精選咖啡廳${district}`;
        secondaryQueries.push('特色咖啡館');
      } else if (isTH) {
        primaryQuery = `ร้านกาแฟ คาเฟ่${district}`;
        secondaryQueries.push('specialty coffee');
      } else if (isJP) {
        primaryQuery = `カフェ 喫茶店${district}`;
      } else if (isEN) {
        primaryQuery = `specialty coffee shop${district}`;
      } else {
        primaryQuery = `quán cà phê${district}`;
        secondaryQueries.push('coffee shop', 'cà phê specialty');
      }
    }

    return {
      language: marketLanguage,
      primaryQuery,
      secondaryQueries,
      mustTerms
    };
  }

  /**
   * Full Query Understanding with Gemini Semantic Parser & Caching
   */
  public static async analyze(
    rawQuery: string,
    locationTarget: LocationTarget,
    uiLanguage: SupportedLanguage = 'vi',
    trace?: any
  ): Promise<ParsedSearchQuery> {
    const q = (rawQuery || '').trim();
    const cacheKey = `${q.toLowerCase()}_${locationTarget.city || ''}_${locationTarget.latitude || ''}_${locationTarget.longitude || ''}_${uiLanguage}`;

    if (queryUnderstandingCache.has(cacheKey)) {
      if (trace) trace.recordCacheHit('queryUnderstandingCache', cacheKey, 1);
      const cached = queryUnderstandingCache.get(cacheKey)!;
      if (trace) {
        trace.recordQueryProcessed({
          intentType: cached.intentType,
          marketLanguage: cached.searchMarketLanguage,
          latencyMs: 1
        });
      }
      return cached;
    }

    if (trace) trace.recordCacheMiss('queryUnderstandingCache', cacheKey, 1);

    const stepStart = Date.now();
    // Generate robust deterministic baseline
    const baseline = this.parseQueryDeterministic(q, locationTarget, uiLanguage);

    // If query is very short or in cooldown, return baseline
    if (!q || q.length < 3 || Date.now() < geminiQuotaCooldownUntil) {
      queryUnderstandingCache.set(cacheKey, baseline);
      if (trace) {
        trace.recordQueryProcessed({
          intentType: baseline.intentType,
          marketLanguage: baseline.searchMarketLanguage,
          latencyMs: Date.now() - stepStart
        });
      }
      return baseline;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      queryUnderstandingCache.set(cacheKey, baseline);
      if (trace) {
        trace.recordQueryProcessed({
          intentType: baseline.intentType,
          marketLanguage: baseline.searchMarketLanguage,
          latencyMs: Date.now() - stepStart
        });
      }
      return baseline;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `You are the Lead Search Query Understanding Engine for Mobler.
Analyze the user's natural language search query for local cafés/venues.

CRITICAL DIRECTIVES:
1. Extract search intent, must-have requirements (strict non-negotiables), should-have preferences, and negative constraints (exclusions).
2. Location: City is "${locationTarget.city || 'Local'}", Market Search Language is "${baseline.searchMarketLanguage}".
3. Canonical Experience Modes (0 or more from):
   ${JSON.stringify(CANONICAL_SPECIAL_MODES)}
4. Generate localized Google Search Queries in the Destination Market Language ("${baseline.searchMarketLanguage}").
5. Do NOT invent fake venue names.

User Query: "${q}"
Detected Query Language: "${baseline.detectedLanguage}"
Market Language: "${baseline.searchMarketLanguage}"`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          intentType: { type: Type.STRING },
          experienceModes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          mustHave: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          shouldHave: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          negativeConstraints: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          atmosphereVibes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          activities: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          localizedPrimaryQuery: { type: Type.STRING },
          localizedSecondaryQueries: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: [
          'intentType',
          'experienceModes',
          'mustHave',
          'shouldHave',
          'negativeConstraints',
          'atmosphereVibes',
          'activities',
          'localizedPrimaryQuery',
          'localizedSecondaryQueries'
        ]
      };

      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let response: any = null;
      let usedModel = 'gemini-3.1-flash-lite';
      const aiStartTime = Date.now();

      for (const m of candidateModels) {
        try {
          usedModel = m;
          response = await ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: schema
            }
          });
          if (response?.text) break;
        } catch (err: any) {
          if (trace) {
            trace.recordAiCall({
              model: m,
              operation: 'query_expansion_enrichment',
              latencyMs: Date.now() - aiStartTime,
              success: false,
              errorCode: err?.status || 'AI_ERROR'
            });
          }
          if (err?.status === 'RESOURCE_EXHAUSTED' || err?.status === 429) {
            continue;
          }
          break;
        }
      }

      if (trace && response?.text) {
        const estInputTokens = Math.round(prompt.length / 4);
        const estOutputTokens = Math.round(response.text.length / 4);
        trace.recordAiCall({
          model: usedModel,
          operation: 'query_expansion_enrichment',
          inputTokens: estInputTokens,
          outputTokens: estOutputTokens,
          tokenCountSource: 'estimated_from_text',
          latencyMs: Date.now() - aiStartTime,
          success: true
        });
      }

      if (response?.text) {
        const parsed = JSON.parse(response.text);

        // Merge AI findings with deterministic baseline
        const validModes = (parsed.experienceModes || []).filter((m: string) =>
          CANONICAL_SPECIAL_MODES.includes(m as any)
        );
        for (const bm of baseline.experienceModes) {
          if (!validModes.includes(bm)) validModes.push(bm);
        }

        const merged: ParsedSearchQuery = {
          rawQuery: q,
          normalizedQuery: baseline.normalizedQuery,
          detectedLanguage: baseline.detectedLanguage,
          searchMarketLanguage: baseline.searchMarketLanguage,
          intentType: (parsed.intentType as SearchIntentType) || baseline.intentType,
          primaryCategory: 'cafe',
          experienceModes: validModes,
          requirements: {
            mustHave: Array.from(new Set([...baseline.requirements.mustHave, ...(parsed.mustHave || [])])),
            shouldHave: Array.from(new Set([...baseline.requirements.shouldHave, ...(parsed.shouldHave || [])])),
            niceToHave: baseline.requirements.niceToHave,
            negativeConstraints: Array.from(new Set([...baseline.requirements.negativeConstraints, ...(parsed.negativeConstraints || [])])),
            atmosphereVibes: Array.from(new Set([...baseline.requirements.atmosphereVibes, ...(parsed.atmosphereVibes || [])])),
            activities: Array.from(new Set([...baseline.requirements.activities, ...(parsed.activities || [])]))
          },
          locationTarget: baseline.locationTarget,
          expandedKeywords: baseline.expandedKeywords,
          localizedQueries: {
            language: baseline.searchMarketLanguage,
            primaryQuery: parsed.localizedPrimaryQuery || baseline.localizedQueries.primaryQuery,
            secondaryQueries: Array.from(new Set([
              ...(parsed.localizedSecondaryQueries || []),
              ...baseline.localizedQueries.secondaryQueries
            ])),
            mustTerms: baseline.localizedQueries.mustTerms
          }
        };

        queryUnderstandingCache.set(cacheKey, merged);
        return merged;
      }
    } catch (err: any) {
      if (err?.status === 'RESOURCE_EXHAUSTED' || err?.status === 429) {
        geminiQuotaCooldownUntil = Date.now() + 60000;
      }
    }

    queryUnderstandingCache.set(cacheKey, baseline);
    return baseline;
  }
}
