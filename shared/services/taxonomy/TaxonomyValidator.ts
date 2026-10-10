import { TaxonomyService, TAXONOMY_SPECIAL_MODELS, TAXONOMY_AMENITIES, TAXONOMY_EXPERIENCES } from './TaxonomyService';

export interface ValidationResult {
  validModels: string[];
  invalidModels: string[];
  validAmenities: string[];
  invalidAmenities: string[];
  validExperiences: string[];
  invalidExperiences: string[];
  unresolvedKeywords: string[];
}

export class TaxonomyValidator {
  /**
   * Strictly validates extracted model, amenity, and experience IDs against Coffee Passport taxonomy.
   * If a model ID does NOT exist in the defined taxonomy, it is strictly flagged as invalid,
   * dropped from database filters, and never allowed to invent new schemas.
   */
  public static validate(
    rawModels: string[] = [],
    rawAmenities: string[] = [],
    rawExperiences: string[] = [],
    rawKeywords: string[] = []
  ): ValidationResult {
    const validModels: string[] = [];
    const invalidModels: string[] = [];
    const validAmenities: string[] = [];
    const invalidAmenities: string[] = [];
    const validExperiences: string[] = [];
    const invalidExperiences: string[] = [];
    const unresolvedKeywords: string[] = [...rawKeywords];

    // 1. Validate Special Models
    for (const m of rawModels) {
      const normalized = m.trim().toLowerCase();
      if (TaxonomyService.isValidModel(normalized)) {
        if (!validModels.includes(normalized)) validModels.push(normalized);
      } else {
        invalidModels.push(m);
        // Add to unresolved keywords for text matching fallback only, NOT as strict model filter
        if (!unresolvedKeywords.includes(m)) unresolvedKeywords.push(m);
      }
    }

    // 2. Validate Amenities
    for (const a of rawAmenities) {
      const normalized = a.trim().toLowerCase();
      if (TaxonomyService.isValidAmenity(normalized)) {
        if (!validAmenities.includes(normalized)) validAmenities.push(normalized);
      } else {
        invalidAmenities.push(a);
        if (!unresolvedKeywords.includes(a)) unresolvedKeywords.push(a);
      }
    }

    // 3. Validate Experiences
    for (const e of rawExperiences) {
      const normalized = e.trim().toLowerCase();
      if (TaxonomyService.isValidExperience(normalized)) {
        if (!validExperiences.includes(normalized)) validExperiences.push(normalized);
      } else {
        invalidExperiences.push(e);
        if (!unresolvedKeywords.includes(e)) unresolvedKeywords.push(e);
      }
    }

    return {
      validModels,
      invalidModels,
      validAmenities,
      invalidAmenities,
      validExperiences,
      invalidExperiences,
      unresolvedKeywords
    };
  }

  /**
   * Validates a single model ID
   */
  public static isModelValid(modelId: string): boolean {
    return TaxonomyService.isValidModel(modelId.trim().toLowerCase());
  }

  /**
   * Get all registered and allowed special model IDs
   */
  public static getAllowedModelIds(): string[] {
    return TAXONOMY_SPECIAL_MODELS.map(m => m.id);
  }

  /**
   * Get all registered and allowed amenity IDs
   */
  public static getAllowedAmenityIds(): string[] {
    return TAXONOMY_AMENITIES.map(a => a.id);
  }

  /**
   * Get all registered and allowed experience IDs
   */
  public static getAllowedExperienceIds(): string[] {
    return TAXONOMY_EXPERIENCES.map(e => e.id);
  }
}
