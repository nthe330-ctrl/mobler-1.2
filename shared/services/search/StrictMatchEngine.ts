import { CoffeeShop } from '../../types';
import { SearchIntentObject } from './SearchIntentParser';
import { TaxonomyMapper } from '../taxonomy/TaxonomyMapper';

export interface StrictMatchResult {
  passedShops: CoffeeShop[];
  rejectedCount: number;
  isFallbackApplied: boolean;
  fallbackNotice?: string;
  matchedCriteriaSummary: {
    requestedModels: string[];
    requestedAmenities: string[];
    requestedExperiences: string[];
    operator: 'AND' | 'OR';
  };
}

export class StrictMatchEngine {
  /**
   * Evaluates candidate coffee shops strictly against the Coffee Passport database and taxonomy.
   * NO SEMANTIC LOOSENING RULE:
   * A shop must explicitly possess the requested model in its Coffee Passport taxonomy profile.
   * A mere "pet-friendly" tag or a casual mention in reviews is STRICTLY REJECTED if cat_cafe is requested.
   */
  public static evaluate(
    candidateShops: CoffeeShop[],
    intent: SearchIntentObject
  ): StrictMatchResult {
    const { models, amenities, experiences, operator, fallbackIntent } = intent;

    const hasModelConstraint = models.length > 0;
    const hasAmenityConstraint = amenities.length > 0;
    const hasExperienceConstraint = experiences.length > 0;

    // Filter candidate shops
    let passedShops: CoffeeShop[] = [];
    let rejectedCount = 0;

    // Evaluate standard/primary criteria
    for (const shop of candidateShops) {
      const shopTaxonomy = TaxonomyMapper.extractShopTaxonomyIds(shop);
      const isMatch = this.checkShopMatches(
        shopTaxonomy,
        models,
        amenities,
        experiences,
        operator
      );

      if (isMatch) {
        passedShops.push(shop);
      } else {
        rejectedCount++;
      }
    }

    // Zero Results & User-Requested Fallback Check (Rules 20 & 21)
    let isFallbackApplied = false;
    let fallbackNotice: string | undefined = undefined;

    if (passedShops.length === 0 && fallbackIntent) {
      // User explicitly allowed fallback
      const fallbackPassed: CoffeeShop[] = [];
      const fbModels = fallbackIntent.models || [];
      const fbAmenities = fallbackIntent.amenities || [];
      const fbExperiences = fallbackIntent.experiences || [];

      for (const shop of candidateShops) {
        const shopTaxonomy = TaxonomyMapper.extractShopTaxonomyIds(shop);
        const isMatch = this.checkShopMatches(
          shopTaxonomy,
          fbModels,
          fbAmenities,
          fbExperiences,
          'OR'
        );
        if (isMatch) {
          fallbackPassed.push(shop);
        }
      }

      if (fallbackPassed.length > 0) {
        passedShops = fallbackPassed;
        isFallbackApplied = true;
        fallbackNotice = 'Không tìm thấy địa điểm khớp chính xác yêu cầu chính. Đang hiển thị các địa điểm thay thế theo yêu cầu dự phòng của bạn.';
      }
    }

    return {
      passedShops,
      rejectedCount,
      isFallbackApplied,
      fallbackNotice,
      matchedCriteriaSummary: {
        requestedModels: models,
        requestedAmenities: amenities,
        requestedExperiences: experiences,
        operator
      }
    };
  }

  private static checkShopMatches(
    shopTaxonomy: { models: string[]; amenities: string[]; experiences: string[] },
    reqModels: string[],
    reqAmenities: string[],
    reqExperiences: string[],
    operator: 'AND' | 'OR'
  ): boolean {
    const modelChecks = reqModels.map(m => shopTaxonomy.models.includes(m));
    const amenityChecks = reqAmenities.map(a => shopTaxonomy.amenities.includes(a));
    const expChecks = reqExperiences.map(e => shopTaxonomy.experiences.includes(e));

    const allChecks = [...modelChecks, ...amenityChecks, ...expChecks];
    if (allChecks.length === 0) return true; // No constraints -> passes

    if (operator === 'OR') {
      // If user specified OR across models (e.g. cat_cafe OR board_game_cafe)
      if (reqModels.length > 0 && reqAmenities.length === 0 && reqExperiences.length === 0) {
        return modelChecks.some(Boolean);
      }
      return allChecks.some(Boolean);
    }

    // Default: AND operator
    // If models are specified, at least one requested model MUST match (if multiple models in AND mode, must have the model)
    if (reqModels.length > 0) {
      const hasAnyReqModel = modelChecks.some(Boolean);
      if (!hasAnyReqModel) return false;
    }

    // All requested amenities must match
    if (reqAmenities.length > 0) {
      const hasAllAmenities = amenityChecks.every(Boolean);
      if (!hasAllAmenities) return false;
    }

    // All requested experiences must match
    if (reqExperiences.length > 0) {
      const hasAllExperiences = expChecks.every(Boolean);
      if (!hasAllExperiences) return false;
    }

    return true;
  }
}
