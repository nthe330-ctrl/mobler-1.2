import {
  TAXONOMY_SPECIAL_MODELS,
  TAXONOMY_AMENITIES,
  TAXONOMY_EXPERIENCES,
  TaxonomyService
} from './TaxonomyService';
import { TaxonomyValidator } from './TaxonomyValidator';

export interface SemanticMappingMatch {
  models: string[];
  amenities: string[];
  experiences: string[];
  keywords: string[];
}

export class TaxonomyMapper {
  /**
   * Deterministically and semantically maps natural language phrases into official canonical taxonomy IDs.
   * Maps multi-lingual synonyms (e.g., 'cà phê mèo', 'cat cafe', '貓咪咖啡廳', '猫カフェ', '고양이 카페' -> 'cat_cafe').
   */
  public static mapTextToTaxonomy(queryText: string): SemanticMappingMatch {
    const text = queryText.toLowerCase().trim();
    const matchedModels = new Set<string>();
    const matchedAmenities = new Set<string>();
    const matchedExperiences = new Set<string>();
    const matchedKeywords: string[] = [];

    // 1. Scan Special Models
    for (const modelDef of TAXONOMY_SPECIAL_MODELS) {
      // Check ID match
      if (text.includes(modelDef.id.replace(/_/g, ' '))) {
        matchedModels.add(modelDef.id);
      }
      // Check UI Name
      if (text.includes(modelDef.uiName.toLowerCase())) {
        matchedModels.add(modelDef.id);
      }
      // Check all multilingual aliases
      for (const langKey of Object.keys(modelDef.aliases)) {
        const aliases = modelDef.aliases[langKey] || [];
        for (const alias of aliases) {
          const cleanAlias = alias.toLowerCase().trim();
          if (cleanAlias && text.includes(cleanAlias)) {
            matchedModels.add(modelDef.id);
            break;
          }
        }
      }
    }

    // 2. Scan Amenities
    for (const amenityDef of TAXONOMY_AMENITIES) {
      if (text.includes(amenityDef.id.replace(/_/g, ' '))) {
        matchedAmenities.add(amenityDef.id);
      }
      if (text.includes(amenityDef.uiName.toLowerCase())) {
        matchedAmenities.add(amenityDef.id);
      }
      for (const langKey of Object.keys(amenityDef.aliases)) {
        const aliases = amenityDef.aliases[langKey] || [];
        for (const alias of aliases) {
          const cleanAlias = alias.toLowerCase().trim();
          if (cleanAlias && text.includes(cleanAlias)) {
            matchedAmenities.add(amenityDef.id);
            break;
          }
        }
      }
    }

    // 3. Scan Experiences
    for (const expDef of TAXONOMY_EXPERIENCES) {
      if (text.includes(expDef.id.replace(/_/g, ' '))) {
        matchedExperiences.add(expDef.id);
      }
      for (const langKey of Object.keys(expDef.aliases)) {
        const aliases = expDef.aliases[langKey] || [];
        for (const alias of aliases) {
          const cleanAlias = alias.toLowerCase().trim();
          if (cleanAlias && text.includes(cleanAlias)) {
            matchedExperiences.add(expDef.id);
            break;
          }
        }
      }
    }

    // Validate all mapped items
    const validation = TaxonomyValidator.validate(
      Array.from(matchedModels),
      Array.from(matchedAmenities),
      Array.from(matchedExperiences),
      matchedKeywords
    );

    return {
      models: validation.validModels,
      amenities: validation.validAmenities,
      experiences: validation.validExperiences,
      keywords: validation.unresolvedKeywords
    };
  }

  /**
   * Helper to map a CoffeeShop database record's fields to canonical taxonomy IDs
   */
  public static extractShopTaxonomyIds(shop: {
    specialModels?: string[];
    primaryModel?: string;
    amenities?: string[];
    styles?: string[];
    primaryStyle?: string;
    moods?: string[];
    tags?: string[];
  }): { models: string[]; amenities: string[]; experiences: string[] } {
    const models = new Set<string>();
    const amenities = new Set<string>();
    const experiences = new Set<string>();

    // Map Special Models
    const rawModels = [...(shop.specialModels || [])];
    if (shop.primaryModel) rawModels.push(shop.primaryModel);
    for (const rm of rawModels) {
      const id = TaxonomyService.mapUiModelToId(rm);
      if (id) models.add(id);
    }

    // Map Amenities
    const rawAmenities = [...(shop.amenities || [])];
    for (const ra of rawAmenities) {
      const id = TaxonomyService.mapUiAmenityToId(ra);
      if (id) amenities.add(id);
    }

    // Map Styles and Moods into experiences
    const rawStyles = [...(shop.styles || [])];
    if (shop.primaryStyle) rawStyles.push(shop.primaryStyle);
    for (const style of rawStyles) {
      const s = style.toLowerCase();
      if (s.includes('minimal')) experiences.add('minimalist');
      if (s.includes('cozy') || s.includes('modern')) experiences.add('cozy_modern');
      if (s.includes('retro') || s.includes('vintage')) experiences.add('retro_vintage');
      if (s.includes('nature')) experiences.add('nature');
      if (s.includes('cute')) experiences.add('cute');
      if (s.includes('industrial')) experiences.add('industrial');
      if (s.includes('artistic')) experiences.add('artistic');
      if (s.includes('futuristic')) experiences.add('futuristic');
    }

    const rawMoods = [...(shop.moods || [])];
    for (const m of rawMoods) {
      const ml = m.toLowerCase();
      if (ml.includes('làm việc') || ml.includes('học bài') || ml.includes('work') || ml.includes('study')) {
        experiences.add('quiet');
      }
      if (ml.includes('thư giãn') || ml.includes('chill')) {
        experiences.add('cozy_modern');
      }
      if (ml.includes('chụp ảnh') || ml.includes('check-in')) {
        experiences.add('cute');
      }
    }

    const rawTags = [...(shop.tags || [])];
    for (const tag of rawTags) {
      const tl = tag.toLowerCase();
      if (tl.includes('yên tĩnh') || tl.includes('quiet')) experiences.add('quiet');
      if (tl.includes('ổ điện') || tl.includes('chỗ sạc')) amenities.add('charging_station');
      if (tl.includes('wifi') || tl.includes('mạng mạnh')) amenities.add('wifi');
      if (tl.includes('sân vườn') || tl.includes('ngoài trời')) amenities.add('outdoor');
    }

    return {
      models: Array.from(models),
      amenities: Array.from(amenities),
      experiences: Array.from(experiences)
    };
  }
}
