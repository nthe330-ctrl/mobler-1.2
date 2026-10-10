import { CoffeeShop } from '../../types';
import { MOCK_SHOPS } from '../../data';
import { SearchIntentObject } from './SearchIntentParser';
import { StrictMatchEngine, StrictMatchResult } from './StrictMatchEngine';
import { SearchRankingEngine } from './SearchRankingEngine';

export class CoffeePassportSearchService {
  private static databaseShops: CoffeeShop[] = [...MOCK_SHOPS];

  /**
   * Sets or extends the authoritative Coffee Passport database cache
   */
  public static setDatabase(shops: CoffeeShop[]): void {
    this.databaseShops = [...shops];
  }

  public static getDatabase(): CoffeeShop[] {
    return this.databaseShops;
  }

  /**
   * Core verification & match method:
   * 1. Takes all place candidates (from DB + external Google Places discoveries).
   * 2. Evaluates against Coffee Passport Taxonomy strictly with StrictMatchEngine (NO semantic loosening).
   * 3. Ranks remaining validated places with SearchRankingEngine.
   */
  public static executeSearch(
    candidatePool: CoffeeShop[],
    intent: SearchIntentObject,
    userCoords?: { lat: number; lng: number } | null
  ): StrictMatchResult & { rankedShops: CoffeeShop[] } {
    // If pool is empty, use the authoritative database
    const pool = candidatePool.length > 0 ? candidatePool : this.databaseShops;

    // 1. Strict Match against taxonomy & database
    const matchResult = StrictMatchEngine.evaluate(pool, intent);

    // 2. Search Ranking Engine
    const rankedShops = SearchRankingEngine.rank(matchResult.passedShops, userCoords);

    return {
      ...matchResult,
      rankedShops
    };
  }
}
