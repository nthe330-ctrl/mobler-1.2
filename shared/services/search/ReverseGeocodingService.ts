import { LocalLanguageResolver, ResolvedLocationContext } from './LocalLanguageResolver';

const nominatimCache = new Map<string, any>();
let lastNominatimCall = 0;

export class ReverseGeocodingService {
  /**
   * Translates geographic coordinates into administrative location components (country, region, city, district)
   * and delegates to LocalLanguageResolver to pinpoint the local search language.
   */
  public static async reverseGeocode(
    latitude: number,
    longitude: number,
    apiKey?: string,
    /** UI language for the returned place names (BCP-47, e.g. 'en', 'th', 'zh-TW'). */
    uiLanguage = 'vi'
  ): Promise<ResolvedLocationContext> {
    // 1. Try Google Maps Geocoding API if key is available
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const first = data.results[0];
            let country = '';
            let countryCode = '';
            let city = '';
            let district = '';
            let region = '';

            for (const comp of first.address_components || []) {
              if (comp.types.includes('country')) {
                country = comp.long_name;
                countryCode = comp.short_name;
              }
              if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
                city = comp.long_name;
              }
              if (comp.types.includes('administrative_area_level_1')) {
                region = comp.long_name;
              }
              if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) {
                district = comp.long_name;
              }
            }

            const baseResolved = LocalLanguageResolver.resolve(latitude, longitude, city || region || country);
            return {
              countryCode: countryCode || baseResolved.countryCode,
              country: country || baseResolved.country,
              region: region || city || baseResolved.region,
              city: city || baseResolved.city,
              district: district || undefined,
              localLanguage: baseResolved.localLanguage,
              languageCode: baseResolved.languageCode,
              timezone: baseResolved.timezone,
              coordinates: { lat: latitude, lng: longitude }
            };
          }
        }
      } catch {
        // Fall through to deterministic resolver
      }
    }

    // 2. Free alternative: OpenStreetMap Nominatim (no key). Server-side only, cached,
    //    at most 1 request/second per the Nominatim usage policy.
    if (typeof window === 'undefined') {
      try {
        const key = `${latitude.toFixed(3)},${longitude.toFixed(3)},${uiLanguage}`;
        let data = nominatimCache.get(key);
        if (!data) {
          const wait = Math.max(0, lastNominatimCall + 1100 - Date.now());
          if (wait) await new Promise(r => setTimeout(r, wait));
          lastNominatimCall = Date.now();
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&accept-language=${encodeURIComponent(uiLanguage)}`,
            { headers: { 'User-Agent': (globalThis as any).process?.env?.NOMINATIM_USER_AGENT || 'Mobler/2.0 (admin@mobler.vn)' }, signal: AbortSignal.timeout(6000) }
          );
          if (res.ok) {
            data = await res.json();
            if (nominatimCache.size > 5000) nominatimCache.clear();
            nominatimCache.set(key, data);
          }
        }
        const a = data?.address;
        if (a) {
          const city = a.city || a.town || a.village || a.state || '';
          const baseResolved = LocalLanguageResolver.resolve(latitude, longitude, city || a.country || '');
          return {
            countryCode: String(a.country_code || baseResolved.countryCode).toUpperCase(),
            country: a.country || baseResolved.country,
            region: a.state || city || baseResolved.region,
            city: city || baseResolved.city,
            district: a.city_district || a.suburb || a.county || undefined,
            localLanguage: baseResolved.localLanguage,
            languageCode: baseResolved.languageCode,
            timezone: baseResolved.timezone,
            coordinates: { lat: latitude, lng: longitude }
          };
        }
      } catch {
        // Fall through to deterministic resolver
      }
    }

    // 2. Deterministic high-precision geographical resolver
    return LocalLanguageResolver.resolve(latitude, longitude);
  }
}
