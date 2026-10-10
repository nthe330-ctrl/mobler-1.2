import { 
  Requirement, 
  RequirementType, 
  Evidence, 
  EvidenceStatus, 
  SearchIntent 
} from './types';

export interface DerivedRequirementViews {
  place_types: Requirement[];
  experiences: Requirement[];
  activities: Requirement[];
  attributes: Requirement[];
  names: Requirement[];
  exclusions: Requirement[];
  inclusions: Requirement[];
  mustHaves: Requirement[];
  shouldHaves: Requirement[];
  optional: Requirement[];
}

/**
 * C3: Requirement is the single source of truth.
 * Per-type lists (experiences, activities, attributes, place_types, names) are derived helper views,
 * never stored fields.
 */
export function deriveRequirementViews(requirements: Requirement[] = []): DerivedRequirementViews {
  const views: DerivedRequirementViews = {
    place_types: [],
    experiences: [],
    activities: [],
    attributes: [],
    names: [],
    exclusions: [],
    inclusions: [],
    mustHaves: [],
    shouldHaves: [],
    optional: []
  };

  for (const req of requirements) {
    // Type-based views
    if (req.type === 'place_type') views.place_types.push(req);
    else if (req.type === 'experience') views.experiences.push(req);
    else if (req.type === 'activity') views.activities.push(req);
    else if (req.type === 'attribute') views.attributes.push(req);
    else if (req.type === 'name') views.names.push(req);

    // Polarity-based views
    if (req.polarity === 'exclude') {
      views.exclusions.push(req);
    } else {
      views.inclusions.push(req);
      // Priority-based views for inclusions
      if (req.priority === 'must') views.mustHaves.push(req);
      else if (req.priority === 'should') views.shouldHaves.push(req);
      else if (req.priority === 'optional') views.optional.push(req);
    }
  }

  return views;
}

/**
 * C7: Evidence Semantics Helper.
 * Encodes the rule: unknown ≠ false, unknown ≠ negative, unknown must not reduce a score by itself.
 */
export function isEvidenceNegative(statusOrEvidence: EvidenceStatus | Evidence): boolean {
  const status = typeof statusOrEvidence === 'string' ? statusOrEvidence : statusOrEvidence.status;
  return status === 'negative';
}

/**
 * C7: Returns true ONLY if evidence is confirmed negative.
 * Unknown, likely, or verified statuses do NOT penalize a candidate score.
 */
export function shouldEvidencePenalize(statusOrEvidence: EvidenceStatus | Evidence): boolean {
  const status = typeof statusOrEvidence === 'string' ? statusOrEvidence : statusOrEvidence.status;
  // 'unknown' is neutral and NEVER reduces a score or acts as negative penalty
  return status === 'negative';
}

/**
 * C7: Explicit contract verification for unknown semantics
 */
export function doesEvidenceStatusReduceScoreByDefault(status: EvidenceStatus): boolean {
  if (status === 'unknown') return false;
  if (status === 'negative') return true;
  return false;
}

/**
 * C2/C4: Strips request-scoped fields (e.g. raw_query) before persisting or passing to telemetry.
 */
export function sanitizeSearchIntentForTelemetry(intent: SearchIntent): Omit<SearchIntent, 'raw_query'> {
  const { raw_query, ...safeIntent } = intent;
  return safeIntent;
}
