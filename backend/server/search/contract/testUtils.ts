import { RequirementType } from './types';
import { TaxonomyLookup } from './taxonomyLookup';

/**
 * TEST-ONLY stub implementation of TaxonomyLookup.
 * Not for production use.
 */
export class StubTaxonomyLookup implements TaxonomyLookup {
  private knownIds: Map<string, RequirementType>;

  constructor(initialIds?: Record<string, RequirementType>) {
    this.knownIds = new Map();
    // Default known canonical IDs for contract test validation
    const defaults: Record<string, RequirementType> = {
      // place_types
      cafe: 'place_type',
      specialty_roastery: 'place_type',
      bakery_cafe: 'place_type',
      dessert_shop: 'place_type',
      tea_house: 'place_type',
      bistro: 'place_type',
      // experiences
      quiet_work: 'experience',
      laptop_friendly: 'experience',
      deep_focus: 'experience',
      dating_cozy: 'experience',
      social_gathering: 'experience',
      reading_nook: 'experience',
      pet_friendly: 'experience',
      // activities
      work_study: 'activity',
      board_games: 'activity',
      gaming: 'activity',
      meeting: 'activity',
      casual_chat: 'activity',
      // attributes
      good_wifi: 'attribute',
      power_outlets: 'attribute',
      air_conditioned: 'attribute',
      outdoor_seating: 'attribute',
      parking_available: 'attribute',
      smoking_allowed: 'attribute',
      credit_card_accepted: 'attribute',
      natural_lighting: 'attribute'
    };

    Object.entries({ ...defaults, ...initialIds }).forEach(([id, type]) => {
      this.knownIds.set(id, type);
    });
  }

  public register(id: string, type: RequirementType): void {
    this.knownIds.set(id, type);
  }

  public hasCanonicalId(canonicalId: string, type?: RequirementType): boolean {
    if (!canonicalId) return false;
    const registeredType = this.knownIds.get(canonicalId);
    if (!registeredType) return false;
    if (type && registeredType !== type) return false;
    return true;
  }

  public getCanonicalEntry(canonicalId: string): { id: string; type: RequirementType } | undefined {
    const type = this.knownIds.get(canonicalId);
    if (!type) return undefined;
    return { id: canonicalId, type };
  }
}
