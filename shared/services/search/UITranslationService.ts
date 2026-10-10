import { CoffeeShop } from '../../types';
import { TaxonomyService } from '../taxonomy/TaxonomyService';

export interface FormattedSearchResult {
  shop: CoffeeShop;
  nativeName: string;
  nativeAddress: string;
  localizedCategory: string;
  localizedModelBadge?: string;
  localizedAmenityBadges: string[];
  formattedDistance: string;
  isVerified: boolean;
}

export class UITranslationService {
  /**
   * Formats and prepares place results according to UI Language requirements.
   * Native name and native address are preserved intact (Section 14).
   * Taxonomy badges and UI metadata are localized according to UI_LANGUAGE (Section 15).
   */
  public static formatPlaceForUI(
    shop: CoffeeShop,
    uiLanguage: string = 'vi'
  ): FormattedSearchResult {
    const localizedAmenityBadges: string[] = [];
    for (const a of shop.amenities || []) {
      const aId = TaxonomyService.mapUiAmenityToId(a);
      if (aId) {
        const def = TaxonomyService.getAmenity(aId);
        if (def) localizedAmenityBadges.push(def.uiName);
      } else {
        localizedAmenityBadges.push(a);
      }
    }

    let localizedModelBadge: string | undefined = undefined;
    if (shop.primaryModel || (shop.specialModels && shop.specialModels.length > 0)) {
      const modelName = shop.primaryModel || shop.specialModels[0];
      const mId = TaxonomyService.mapUiModelToId(modelName);
      if (mId) {
        localizedModelBadge = TaxonomyService.getModelUiLabel(mId, uiLanguage);
      } else {
        localizedModelBadge = modelName;
      }
    }

    let localizedCategory = 'Quán cà phê';
    if (uiLanguage === 'en') localizedCategory = 'Coffee Shop';
    else if (uiLanguage === 'zh-TW') localizedCategory = '咖啡廳';
    else if (uiLanguage === 'ja') localizedCategory = 'カフェ';
    else if (uiLanguage === 'ko') localizedCategory = '카페';
    else if (uiLanguage === 'th') localizedCategory = 'ร้านกาแฟ';

    return {
      shop,
      nativeName: shop.name,
      nativeAddress: shop.address,
      localizedCategory,
      localizedModelBadge,
      localizedAmenityBadges,
      formattedDistance: shop.distance || '',
      isVerified: !!shop.isGoogleVerified
    };
  }
}
