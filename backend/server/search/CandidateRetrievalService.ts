import { googleFetch, googleTextSearch, placePhotoProxyUrl } from '../googleMeter';
import { ParsedSearchQuery, SupportedLanguage } from './types';
import { generateFallbackPlaces } from '../fallbackPlaces';

// Places API search result cache
// ARCHITECTURAL NOTE (PHASE 1B-R SINGLE-FLIGHT vs CACHE CONTRACT):
// In-flight request coalescing (Promise deduping during pending network execution) is strictly
// an ephemeral transport-level concurrency control to prevent thundering herd spikes.
// It is NOT persisted caching, does NOT grant permission to persist Google Place Content,
// and holds promises strictly during request lifetime. The in-memory cache below is flagged
// with policy_basis: "needs_human_review" in docs/CACHE_AUDIT.md for Phase 2 compliance review.
const placesCache = new Map<string, { timestamp: number; data: any[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class CandidateRetrievalService {
  /**
   * Deduplicates candidates by place_id and fuzzy normalized name + proximity
   */
  public static deduplicateCandidates(candidates: any[]): any[] {
    const seenIds = new Set<string>();
    const seenNameLoc = new Set<string>();
    const deduplicated: any[] = [];

    for (const c of candidates) {
      const pid = c.id || c.placeId;
      if (pid && seenIds.has(pid)) {
        continue;
      }

      const name = (c.name || c.displayName?.text || '').trim().toLowerCase();
      const lat = c.location?.lat || c.location?.latitude;
      const lng = c.location?.lng || c.location?.longitude;
      const nameKey = (lat && lng) 
        ? `${name}_${lat.toFixed(3)}_${lng.toFixed(3)}`
        : name;

      if (name && seenNameLoc.has(nameKey)) {
        continue;
      }

      if (pid) seenIds.add(pid);
      if (name) seenNameLoc.add(nameKey);
      deduplicated.push(c);
    }

    return deduplicated;
  }

  /**
   * Retrieves candidate places from Google Places API and Internal DB
   */
  public static async retrieveCandidates(
    parsedQuery: ParsedSearchQuery,
    internalDbShops: any[] = [],
    trace?: any
  ): Promise<{ candidates: any[]; googleQueriesUsed: string[]; source: string }> {
    const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const centerLat = parsedQuery.locationTarget.latitude ?? 10.7769;
    const centerLng = parsedQuery.locationTarget.longitude ?? 106.7009;
    const radiusMeters = parsedQuery.locationTarget.radiusMeters || 6000;

    const googleQueriesUsed: string[] = [];
    const rawGooglePlaces: any[] = [];
    const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types,places.regularOpeningHours,places.googleMapsUri,places.websiteUri,places.priceLevel,places.reviews';

    // Google queries to execute (Primary + up to 2 Secondary queries)
    const queries = [
      parsedQuery.localizedQueries.primaryQuery,
      ...parsedQuery.localizedQueries.secondaryQueries.slice(0, 2)
    ].filter(Boolean);

    if (apiKey) {
      for (const queryText of queries) {
        googleQueriesUsed.push(queryText);
        const cacheKey = `${queryText}_${centerLat.toFixed(4)}_${centerLng.toFixed(4)}_${parsedQuery.searchMarketLanguage}`;
        const cached = placesCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
          if (trace) trace.recordCacheHit('placesCache', cacheKey, 1);
          rawGooglePlaces.push(...cached.data);
          continue;
        }

        if (trace) trace.recordCacheMiss('placesCache', cacheKey, 1);

        const providerStart = Date.now();
        try {
          const requestBody = {
            textQuery: queryText,
            locationBias: {
              circle: {
                center: { latitude: centerLat, longitude: centerLng },
                radius: radiusMeters
              }
            },
            languageCode: parsedQuery.searchMarketLanguage,
            pageSize: 15
          };

          const gmpRes = await googleTextSearch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': fieldMask
            },
            body: JSON.stringify(requestBody)
          });

          const provLatency = Date.now() - providerStart;

          if (gmpRes.ok) {
            const data: any = await gmpRes.json();
            const places = data.places || [];
            placesCache.set(cacheKey, { timestamp: Date.now(), data: places });
            rawGooglePlaces.push(...places);

            if (trace) {
              trace.recordProviderCall({
                provider: 'google_places',
                operation: 'text_search_enterprise',
                apiMethod: 'places:searchText',
                fieldMask,
                latencyMs: provLatency,
                success: true,
                resultCount: places.length
              });
            }
          } else {
            if (trace) {
              trace.recordProviderCall({
                provider: 'google_places',
                operation: 'text_search_enterprise',
                apiMethod: 'places:searchText',
                fieldMask,
                latencyMs: provLatency,
                success: false,
                errorCode: `HTTP_${gmpRes.status}`
              });
            }
          }
        } catch (err: any) {
          console.warn(`[CandidateRetrievalService] Query "${queryText}" failed:`, err);
          if (trace) {
            trace.recordProviderCall({
              provider: 'google_places',
              operation: 'text_search_enterprise',
              apiMethod: 'places:searchText',
              fieldMask,
              latencyMs: Date.now() - providerStart,
              success: false,
              errorCode: 'NETWORK_ERROR',
              errorMessage: err?.message
            });
          }
        }
      }
    }

    // Transform raw Google Places to unified schema
    const transformedGooglePlaces = rawGooglePlaces.map((place: any, index: number) => {
      const pLat = place.location?.latitude || centerLat;
      const pLng = place.location?.longitude || centerLng;
      const placeId = place.id || `gplace_${index}`;
      const placeName = place.displayName?.text || place.name || 'Quán Cà Phê';
      const address = place.formattedAddress || '';
      const rating = place.rating ? Number(place.rating.toFixed(1)) : 4.6;
      const reviewCount = place.userRatingCount || 15;

      const photoUrls: string[] = [];
      if (place.photos && place.photos.length > 0) {
        place.photos.slice(0, 5).forEach((ph: any) => {
          if (ph.name) {
            photoUrls.push(
              `${placePhotoProxyUrl(ph.name, 900)}`
            );
          }
        });
      }

      if (photoUrls.length === 0) {
        photoUrls.push('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800');
        photoUrls.push('https://images.unsplash.com/photo-1495474472201-35011f0f3656?auto=format&fit=crop&q=80&w=800');
      }

      const formattedHours = place.regularOpeningHours?.weekdayDescriptions?.[0] || '07:30 - 22:30';

      return {
        id: `gplace_${placeId}`,
        placeId,
        name: placeName,
        address,
        rating,
        reviewCount,
        coverImage: photoUrls[0],
        images: photoUrls,
        openingHours: [{ day: 'Hàng ngày', time: formattedHours.replace(/.*?:\s*/, '') || '07:30 - 22:30' }],
        moods: ['Làm việc / Học bài', 'Thư giãn / Chill', 'Hẹn hò / Trò chuyện'],
        tags: [`⭐ ${rating}`, 'Google Maps Verified'],
        amenities: ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor'],
        styles: ['Cozy Modern'],
        specialModels: [],
        primaryStyle: 'Cozy Modern',
        location: { lat: pLat, lng: pLng },
        isGoogleVerified: true,
        googleMapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`,
        reviews: (place.reviews || []).map((r: any, i: number) => ({
          id: `gr_${placeId}_${i}`,
          userId: `u_${i}`,
          userName: r.authorAttribution?.displayName || 'Google Local Guide',
          userAvatar: r.authorAttribution?.photoUri || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
          userSystemBadge: 'Khách hàng Google Maps',
          date: r.relativePublishTimeDescription || 'Gần đây',
          images: [],
          content: r.text?.text || r.originalText?.text || '',
          likes: r.rating || 5,
          comments: 0,
          metrics: { noise: 0, seating: 0, accuracy: 0 }
        }))
      };
    });

    // Merge Google Places and Internal DB
    const allPool = [...transformedGooglePlaces, ...internalDbShops];
    let deduplicated = this.deduplicateCandidates(allPool);

    // If pool is empty (no API key or network failure), generate realistic localized fallback data
    if (deduplicated.length === 0) {
      const fallbackLang: 'vi' | 'zh-TW' | 'en' | 'th' = 
        parsedQuery.searchMarketLanguage === 'zh-TW' ? 'zh-TW' :
        parsedQuery.searchMarketLanguage === 'th' ? 'th' :
        parsedQuery.searchMarketLanguage === 'en' ? 'en' : 'vi';

      const fallbackShops = generateFallbackPlaces({
        lat: centerLat,
        lng: centerLng,
        query: parsedQuery.rawQuery,
        language: fallbackLang
      });
      deduplicated = fallbackShops;
    }

    if (trace) {
      trace.recordCandidateCounts({
        candidateCount: allPool.length,
        deduplicatedCount: deduplicated.length
      });
    }

    return {
      candidates: deduplicated,
      googleQueriesUsed,
      source: transformedGooglePlaces.length > 0 ? 'GooglePlaces+InternalDB' : 'InternalFallback'
    };
  }
}
