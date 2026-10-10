import { 
  ParsedSearchQuery, 
  RankedSearchResult, 
  PlaceVerificationResult 
} from './types';
import { PlaceVerificationService } from './PlaceVerificationService';

export class SearchRankingService {
  /**
   * Calculates Haversine distance in kilometers
   */
  public static calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Ranks a collection of candidate places according to multidimensional relevance
   */
  public static rankCandidates(
    candidates: any[],
    parsedQuery: ParsedSearchQuery,
    userLat?: number | null,
    userLng?: number | null
  ): RankedSearchResult[] {
    const isDiscoveryMode = parsedQuery.intentType === 'hidden_gem_discovery';
    const isDirectLookup = parsedQuery.intentType === 'direct_lookup';
    const isWorkOrQuietConstraint = parsedQuery.requirements.activities.includes('laptop_work') || parsedQuery.requirements.atmosphereVibes.includes('quiet');

    const scoredResults: RankedSearchResult[] = candidates.map((place) => {
      const verification: PlaceVerificationResult = PlaceVerificationService.verifyPlace(place, parsedQuery);

      const placeLat = place.location?.lat || place.location?.latitude;
      const placeLng = place.location?.lng || place.location?.longitude;
      const rating = Number(place.rating) || 4.5;
      const reviewCount = Number(place.reviewCount || place.userRatingCount) || 10;
      const nameLower = (place.displayName?.text || place.name || '').toLowerCase();
      const isMoblerVerified = Boolean(place.isGoogleVerified || place.isVerified || place.isMoblerVerified);

      // 1. Must-Have Compliance (Weight: 5000)
      let mustHaveCompliance = 0;
      if (parsedQuery.requirements.mustHave.length > 0) {
        mustHaveCompliance = verification.isMustHaveSatisfied ? 5000 : -4000;
      }

      // 2. Base Relevance Score (Name match, tag match)
      let baseRelevance = 1000;
      if (isDirectLookup && nameLower.includes(parsedQuery.normalizedQuery.toLowerCase())) {
        baseRelevance += 8000;
      }

      // 3. Vibe / Atmosphere & Feature Match Score
      let vibeMatchScore = 0;
      for (const f of verification.verifiedFeatures) {
        if (parsedQuery.requirements.atmosphereVibes.includes(f)) vibeMatchScore += 1200;
        if (parsedQuery.requirements.activities.includes(f)) vibeMatchScore += 1500;
        if (parsedQuery.requirements.shouldHave.includes(f)) vibeMatchScore += 800;
      }

      // 4. Quality Score (Google Rating)
      const qualityScore = rating * 300; // 5.0 -> 1500

      // 5. Trust Score (Mobler Merchant Verified / Official Data)
      const trustScore = isMoblerVerified ? 600 : 200;

      // 6. Proximity / Distance Score (Decay function)
      let distKm = 999;
      let distanceScore = 0;
      if (typeof userLat === 'number' && typeof userLng === 'number' && typeof placeLat === 'number' && typeof placeLng === 'number') {
        distKm = this.calculateDistanceKm(userLat, userLng, placeLat, placeLng);
        // Exponential-like decay for distance
        if (distKm <= 1.5) {
          distanceScore = 2000 - distKm * 300;
        } else if (distKm <= 5.0) {
          distanceScore = 1500 - (distKm - 1.5) * 200;
        } else if (distKm <= 15.0) {
          distanceScore = 800 - (distKm - 5.0) * 50;
        } else {
          distanceScore = Math.max(0, 300 - (distKm - 15.0) * 10);
        }
      }

      // If user specified strict quiet or work constraints, ensure intent match dominates distance
      if (isWorkOrQuietConstraint && verification.verifiedFeatures.length >= 2) {
        vibeMatchScore += 1000;
      }

      // 7. Discovery / Hidden Gem Bonus
      let discoveryBonus = 0;
      if (isDiscoveryMode) {
        // Boost high-rating places (>=4.6) with boutique review count (30 to 350 reviews)
        if (rating >= 4.6 && reviewCount >= 30 && reviewCount <= 400) {
          discoveryBonus += 3500;
        } else if (rating >= 4.7) {
          discoveryBonus += 2000;
        }
      }

      // 8. Negative Constraint Penalties
      let negativePenalty = 0;
      if (verification.hasNegativeConstraintViolation) {
        negativePenalty = 5000;
      }

      // Final Composite Score
      const finalScore = 
        baseRelevance + 
        mustHaveCompliance + 
        vibeMatchScore + 
        qualityScore + 
        trustScore + 
        distanceScore + 
        discoveryBonus - 
        negativePenalty;

      // Generate Highlight text
      let matchHighlight = '';
      if (verification.evidenceList.length > 0) {
        matchHighlight = verification.evidenceList[0].evidenceText;
      } else if (distKm < 999) {
        matchHighlight = `Cách bạn ${distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm}km`}, đánh giá ⭐ ${rating} từ Google.`;
      } else {
        matchHighlight = `Đánh giá xuất sắc ⭐ ${rating} (${reviewCount} lượt review).`;
      }

      return {
        shop: place,
        scoreBreakdown: {
          baseRelevance,
          mustHaveCompliance,
          vibeMatchScore,
          qualityScore,
          trustScore,
          distanceScore,
          discoveryBonus,
          negativePenalty,
          finalScore
        },
        verification,
        matchHighlight
      };
    });

    // Sort descending by finalScore
    scoredResults.sort((a, b) => b.scoreBreakdown.finalScore - a.scoreBreakdown.finalScore);

    return scoredResults;
  }
}
