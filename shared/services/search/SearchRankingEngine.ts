import { CoffeeShop } from '../../types';

export class SearchRankingEngine {
  /**
   * Ranks shops that passed the Strict Match Engine according to the Coffee Passport Ranking Architecture:
   * 1. Must-match validity
   * 2. Verified status (isGoogleVerified / Coffee Passport Official)
   * 3. Distance (Proximity to user GPS coordinates)
   * 4. Search relevance score
   * 5. Rating (5.0 -> 1.0)
   * 6. Review count
   */
  public static rank(
    shops: CoffeeShop[],
    userCoords?: { lat: number; lng: number } | null
  ): CoffeeShop[] {
    const calculateDistanceKm = (shop: CoffeeShop): number => {
      if (
        userCoords &&
        typeof userCoords.lat === 'number' &&
        typeof userCoords.lng === 'number' &&
        shop.location &&
        typeof shop.location.lat === 'number' &&
        typeof shop.location.lng === 'number'
      ) {
        const R = 6371; // Earth radius in km
        const dLat = ((shop.location.lat - userCoords.lat) * Math.PI) / 180;
        const dLon = ((shop.location.lng - userCoords.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((userCoords.lat * Math.PI) / 180) *
            Math.cos((shop.location.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      if (shop.distance) {
        if (shop.distance.includes('m') && !shop.distance.includes('km')) {
          return (parseFloat(shop.distance) || 0) / 1000;
        }
        return parseFloat(shop.distance) || 99999;
      }
      return 99999;
    };

    return [...shops].sort((a, b) => {
      // 1. Verified Status bonus
      const aVerified = a.isGoogleVerified ? 1 : 0;
      const bVerified = b.isGoogleVerified ? 1 : 0;
      if (aVerified !== bVerified) {
        return bVerified - aVerified;
      }

      // 2. Proximity / Distance (Primary sort key)
      const distA = calculateDistanceKm(a);
      const distB = calculateDistanceKm(b);
      if (Math.abs(distA - distB) > 0.15) {
        return distA - distB;
      }

      // 3. Rating
      const rateA = a.rating || 0;
      const rateB = b.rating || 0;
      if (rateA !== rateB) {
        return rateB - rateA;
      }

      // 4. Review count
      const revA = a.reviewCount || 0;
      const revB = b.reviewCount || 0;
      return revB - revA;
    });
  }
}
