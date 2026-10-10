export interface ResolvedLocationContext {
  countryCode: string;
  country: string;
  region: string;
  city: string;
  district?: string;
  localLanguage: string;
  languageCode: string; // e.g. 'zh-TW', 'ja', 'vi', 'ko', 'th', 'id', 'en'
  timezone: string;
  coordinates?: { lat: number; lng: number };
}

export class LocalLanguageResolver {
  /**
   * Resolves the country, local language, and search language code based on geographical coordinates or city name.
   * GPS / User Location is the highest priority for determining the local search language.
   * SYSTEM/UI LANGUAGE is completely separate and does NOT dictate local search language.
   */
  public static resolve(
    lat?: number | null,
    lng?: number | null,
    cityName?: string | null
  ): ResolvedLocationContext {
    // 1. If explicit coordinates are provided (GPS is highest priority)
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      // Taiwan bounds: lat ~ 21.8 - 25.4, lng ~ 119.9 - 122.1
      if (lat >= 21.8 && lat <= 25.5 && lng >= 119.8 && lng <= 122.2) {
        let city = 'Taipei';
        if (lat < 22.8) city = 'Kaohsiung';
        else if (lat < 23.2) city = 'Tainan';
        else if (lat < 23.6) city = 'Chiayi';
        else if (lat < 24.0) city = 'Changhua';
        else if (lat < 24.3) city = 'Taichung';
        else if (lat < 24.6) city = 'Miaoli';
        else if (lat < 24.9) city = 'Hsinchu';
        else if (lat < 25.0) city = 'Taoyuan';
        return {
          countryCode: 'TW',
          country: 'Taiwan',
          region: `${city} City`,
          city,
          localLanguage: 'Traditional Chinese',
          languageCode: 'zh-TW',
          timezone: 'Asia/Taipei',
          coordinates: { lat, lng }
        };
      }

      // Japan bounds: lat ~ 24.0 - 46.0, lng ~ 122.0 - 154.0
      if (lat >= 30.0 && lat <= 45.5 && lng >= 128.0 && lng <= 146.0) {
        let city = 'Tokyo';
        if (lat < 35.0 && lng < 136.0) city = 'Osaka';
        if (lat >= 35.0 && lat < 35.2 && lng > 135.5 && lng < 136.0) city = 'Kyoto';
        return {
          countryCode: 'JP',
          country: 'Japan',
          region: 'Kanto',
          city,
          localLanguage: 'Japanese',
          languageCode: 'ja',
          timezone: 'Asia/Tokyo',
          coordinates: { lat, lng }
        };
      }

      // South Korea bounds: lat ~ 33.0 - 38.6, lng ~ 124.5 - 131.0
      if (lat >= 33.0 && lat <= 38.8 && lng >= 124.5 && lng <= 130.5) {
        let city = 'Seoul';
        if (lat < 36.0) city = 'Busan';
        return {
          countryCode: 'KR',
          country: 'South Korea',
          region: 'Seoul Special City',
          city,
          localLanguage: 'Korean',
          languageCode: 'ko',
          timezone: 'Asia/Seoul',
          coordinates: { lat, lng }
        };
      }

      // Vietnam bounds: lat ~ 8.0 - 23.5, lng ~ 102.0 - 110.0
      if (lat >= 8.2 && lat <= 23.5 && lng >= 102.0 && lng <= 109.8) {
        let city = 'Hồ Chí Minh';
        if (lat >= 20.0) city = 'Hà Nội';
        else if (lat >= 15.5 && lat < 17.0) city = 'Đà Nẵng';
        else if (lat >= 11.5 && lat < 12.5) city = 'Đà Lạt';
        return {
          countryCode: 'VN',
          country: 'Vietnam',
          region: city,
          city,
          localLanguage: 'Vietnamese',
          languageCode: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
          coordinates: { lat, lng }
        };
      }

      // Thailand bounds: lat ~ 5.5 - 20.5, lng ~ 97.0 - 106.0
      if (lat >= 5.5 && lat <= 20.5 && lng >= 97.0 && lng <= 105.8) {
        let city = 'Bangkok';
        if (lat >= 18.0) city = 'Chiang Mai';
        return {
          countryCode: 'TH',
          country: 'Thailand',
          region: 'Bangkok',
          city,
          localLanguage: 'Thai',
          languageCode: 'th',
          timezone: 'Asia/Bangkok',
          coordinates: { lat, lng }
        };
      }

      // Indonesia bounds: lat ~ -11.0 - 6.0, lng ~ 95.0 - 141.0
      if (lat >= -11.0 && lat <= 6.0 && lng >= 95.0 && lng <= 141.0) {
        return {
          countryCode: 'ID',
          country: 'Indonesia',
          region: 'Jakarta',
          city: 'Jakarta',
          localLanguage: 'Indonesian',
          languageCode: 'id',
          timezone: 'Asia/Jakarta',
          coordinates: { lat, lng }
        };
      }

      // Hong Kong / Macau
      if (lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.4) {
        return {
          countryCode: 'HK',
          country: 'Hong Kong',
          region: 'Hong Kong',
          city: 'Hong Kong',
          localLanguage: 'Traditional Chinese',
          languageCode: 'zh-HK',
          timezone: 'Asia/Hong_Kong',
          coordinates: { lat, lng }
        };
      }
    }

    // 2. Fallback to city/region text matching
    if (cityName) {
      const lowerCity = cityName.toLowerCase();
      if (lowerCity.includes('taipei') || lowerCity.includes('đài bắc') || lowerCity.includes('taiwan') || lowerCity.includes('đài loan') || lowerCity.includes('kaohsiung') || lowerCity.includes('taichung')) {
        return {
          countryCode: 'TW',
          country: 'Taiwan',
          region: 'Taipei City',
          city: 'Taipei',
          localLanguage: 'Traditional Chinese',
          languageCode: 'zh-TW',
          timezone: 'Asia/Taipei',
          coordinates: { lat: 25.0330, lng: 121.5654 }
        };
      }

      if (lowerCity.includes('tokyo') || lowerCity.includes('japan') || lowerCity.includes('nhật bản') || lowerCity.includes('osaka') || lowerCity.includes('kyoto')) {
        return {
          countryCode: 'JP',
          country: 'Japan',
          region: 'Tokyo',
          city: 'Tokyo',
          localLanguage: 'Japanese',
          languageCode: 'ja',
          timezone: 'Asia/Tokyo',
          coordinates: { lat: 35.6762, lng: 139.6503 }
        };
      }

      if (lowerCity.includes('seoul') || lowerCity.includes('korea') || lowerCity.includes('hàn quốc') || lowerCity.includes('busan')) {
        return {
          countryCode: 'KR',
          country: 'South Korea',
          region: 'Seoul',
          city: 'Seoul',
          localLanguage: 'Korean',
          languageCode: 'ko',
          timezone: 'Asia/Seoul',
          coordinates: { lat: 37.5665, lng: 126.9780 }
        };
      }

      if (lowerCity.includes('bangkok') || lowerCity.includes('thailand') || lowerCity.includes('thái lan') || lowerCity.includes('chiang mai')) {
        return {
          countryCode: 'TH',
          country: 'Thailand',
          region: 'Bangkok',
          city: 'Bangkok',
          localLanguage: 'Thai',
          languageCode: 'th',
          timezone: 'Asia/Bangkok',
          coordinates: { lat: 13.7563, lng: 100.5018 }
        };
      }

      if (lowerCity.includes('hồ chí minh') || lowerCity.includes('sài gòn') || lowerCity.includes('hà nội') || lowerCity.includes('đà nẵng') || lowerCity.includes('việt nam')) {
        return {
          countryCode: 'VN',
          country: 'Vietnam',
          region: 'Hồ Chí Minh',
          city: 'Hồ Chí Minh',
          localLanguage: 'Vietnamese',
          languageCode: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
          coordinates: { lat: 10.7769, lng: 106.7009 }
        };
      }
    }

    // Default global fallback
    return {
      countryCode: 'VN',
      country: 'Vietnam',
      region: 'Hồ Chí Minh',
      city: 'Hồ Chí Minh',
      localLanguage: 'Vietnamese',
      languageCode: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      coordinates: { lat: 10.7769, lng: 106.7009 }
    };
  }
}
