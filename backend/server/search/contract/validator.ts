import {
  SearchIntent,
  Requirement,
  LocationIntent,
  SearchEntity,
  Evidence,
  RequirementType,
  RequirementPriority,
  RequirementPolarity,
  RequirementSource,
  EntityType,
  EntitySource,
  LocationSource,
  RadiusSource,
  LocationStrictness,
  SearchMode,
  ParseSource,
  EvidenceStatus,
  EvidenceSourceType,
  EvidenceDataOwner,
  ContractVersions
} from './types';
import { TaxonomyLookup } from './taxonomyLookup';
import { ComplianceRegistry, defaultComplianceRegistry } from './complianceRegistry';
import { defaultTaxonomyRegistry } from '../taxonomy';

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: ValidationError[];
  data?: T;
}

export interface ValidationOptions {
  taxonomyLookup?: TaxonomyLookup;
  complianceRegistry?: ComplianceRegistry;
  allowUnknownFields?: boolean;
}

const ALLOWED_INTENTS = new Set([
  'discover',
  'nearby',
  'search_by_name',
  'search_by_location',
  'search_by_experience',
  'search_by_attribute',
  'search_by_activity',
  'booking',
  'recommendation',
  'revisit',
  'navigation'
]);

const ALLOWED_REQUIREMENT_TYPES = new Set<RequirementType>([
  'place_type',
  'experience',
  'activity',
  'attribute',
  'name'
]);

const ALLOWED_REQUIREMENT_PRIORITIES = new Set<RequirementPriority>([
  'must',
  'should',
  'optional'
]);

const ALLOWED_REQUIREMENT_POLARITIES = new Set<RequirementPolarity>([
  'include',
  'exclude'
]);

const ALLOWED_REQUIREMENT_SOURCES = new Set<RequirementSource>([
  'deterministic',
  'ai',
  'system'
]);

const ALLOWED_ENTITY_TYPES = new Set<EntityType>([
  'business',
  'neighborhood',
  'district',
  'city',
  'landmark',
  'station',
  'university',
  'mall',
  'street',
  'place_type',
  'experience'
]);

const ALLOWED_ENTITY_SOURCES = new Set<EntitySource>([
  'deterministic',
  'ai',
  'system'
]);

const ALLOWED_LOCATION_SOURCES = new Set<LocationSource>([
  'gps',
  'explicit',
  'resolved_entity'
]);

const ALLOWED_RADIUS_SOURCES = new Set<RadiusSource>([
  'user',
  'system_default'
]);

const ALLOWED_LOCATION_STRICTNESS = new Set<LocationStrictness>([
  'must',
  'should'
]);

const ALLOWED_SEARCH_MODES = new Set<SearchMode>([
  'standard',
  'discovery'
]);

const ALLOWED_PARSE_SOURCES = new Set<ParseSource>([
  'fast_path',
  'cache',
  'ai',
  'fallback'
]);

const ALLOWED_EVIDENCE_STATUSES = new Set<EvidenceStatus>([
  'verified',
  'likely',
  'mixed',
  'negative',
  'unknown'
]);

const ALLOWED_EVIDENCE_SOURCE_TYPES = new Set<EvidenceSourceType>([
  'mobler_review',
  'mobler_checkin',
  'mobler_tag',
  'mobler_visit',
  'mobler_booking',
  'mobler_shop',
  'google_provider',
  'deterministic',
  'ai_inference',
  'system'
]);

const ALLOWED_EVIDENCE_DATA_OWNERS = new Set<EvidenceDataOwner>([
  'mobler_first_party',
  'google_provider',
  'internal_derived'
]);

/**
 * Checks for unknown fields in an object
 */
function checkUnknownFields(
  obj: Record<string, any>,
  allowedFields: Set<string>,
  path: string,
  errors: ValidationError[]
): void {
  for (const key of Object.keys(obj)) {
    if (!allowedFields.has(key)) {
      errors.push({
        path: path ? `${path}.${key}` : key,
        message: `Unknown field '${key}' is forbidden in schema`,
        code: 'UNKNOWN_FIELD'
      });
    }
  }
}

/**
 * C6: Confidence must be a finite number in [0, 1].
 * Rejects NaN, Infinity, non-numbers, and values outside [0, 1].
 */
export function validateConfidence(val: any, path: string, errors: ValidationError[]): boolean {
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val) || val < 0 || val > 1) {
    errors.push({
      path,
      message: `confidence must be a finite number between 0 and 1 (received: ${val})`,
      code: 'INVALID_CONFIDENCE'
    });
    return false;
  }
  return true;
}

/**
 * C5: Validates SearchEntity structure
 */
export function validateSearchEntity(
  entity: any,
  path: string,
  options?: ValidationOptions
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
    errors.push({
      path,
      message: `SearchEntity must be a non-null object`,
      code: 'INVALID_ENTITY'
    });
    return errors;
  }

  if (!options?.allowUnknownFields) {
    const allowed = new Set(['entity_type', 'canonical_value', 'original_text', 'confidence', 'source']);
    checkUnknownFields(entity, allowed, path, errors);
  }

  if (!ALLOWED_ENTITY_TYPES.has(entity.entity_type)) {
    errors.push({
      path: `${path}.entity_type`,
      message: `Invalid entity_type: '${entity.entity_type}'`,
      code: 'INVALID_ENTITY_TYPE'
    });
  }

  if (typeof entity.canonical_value !== 'string' || entity.canonical_value.trim() === '') {
    errors.push({
      path: `${path}.canonical_value`,
      message: `canonical_value must be a non-empty string`,
      code: 'INVALID_CANONICAL_VALUE'
    });
  }

  if (typeof entity.original_text !== 'string') {
    errors.push({
      path: `${path}.original_text`,
      message: `original_text must be a string`,
      code: 'INVALID_ORIGINAL_TEXT'
    });
  }

  validateConfidence(entity.confidence, `${path}.confidence`, errors);

  if (!ALLOWED_ENTITY_SOURCES.has(entity.source)) {
    errors.push({
      path: `${path}.source`,
      message: `Invalid entity source: '${entity.source}'`,
      code: 'INVALID_SOURCE'
    });
  }

  return errors;
}

/**
 * C4: Validates LocationIntent.
 * Location is NOT a requirement. Coordinates are request-scoped only and forbidden in persistent contract.
 */
export function validateLocationIntent(
  loc: any,
  path: string,
  options?: ValidationOptions
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (loc === null) return errors;

  if (!loc || typeof loc !== 'object' || Array.isArray(loc)) {
    errors.push({
      path,
      message: `LocationIntent must be a non-null object or null`,
      code: 'INVALID_LOCATION'
    });
    return errors;
  }

  if (!options?.allowUnknownFields) {
    const allowed = new Set([
      'source',
      'scope',
      'radius_meters',
      'radius_source',
      'resolved_entity',
      'strictness',
      'confidence'
    ]);
    checkUnknownFields(loc, allowed, path, errors);
  }

  // Reject precise coordinates if accidentally leaked into contract schema
  if ('latitude' in loc || 'longitude' in loc || 'lat' in loc || 'lng' in loc) {
    errors.push({
      path,
      message: `Precise coordinates are forbidden in persistent LocationIntent contract (request-scoped only)`,
      code: 'COORDINATES_FORBIDDEN'
    });
  }

  if (!ALLOWED_LOCATION_SOURCES.has(loc.source)) {
    errors.push({
      path: `${path}.source`,
      message: `Invalid location source: '${loc.source}'`,
      code: 'INVALID_LOCATION_SOURCE'
    });
  }

  if (typeof loc.scope !== 'string' || loc.scope.trim() === '') {
    errors.push({
      path: `${path}.scope`,
      message: `scope must be a non-empty string`,
      code: 'INVALID_LOCATION_SCOPE'
    });
  }

  if (loc.radius_meters !== undefined) {
    if (
      typeof loc.radius_meters !== 'number' ||
      Number.isNaN(loc.radius_meters) ||
      !Number.isFinite(loc.radius_meters) ||
      loc.radius_meters < 0
    ) {
      errors.push({
        path: `${path}.radius_meters`,
        message: `radius_meters must be a non-negative finite number`,
        code: 'INVALID_RADIUS_METERS'
      });
    }
  }

  if (!ALLOWED_RADIUS_SOURCES.has(loc.radius_source)) {
    errors.push({
      path: `${path}.radius_source`,
      message: `Invalid radius_source: '${loc.radius_source}'`,
      code: 'INVALID_RADIUS_SOURCE'
    });
  }

  if (!ALLOWED_LOCATION_STRICTNESS.has(loc.strictness)) {
    errors.push({
      path: `${path}.strictness`,
      message: `Invalid strictness: '${loc.strictness}'`,
      code: 'INVALID_STRICTNESS'
    });
  }

  validateConfidence(loc.confidence, `${path}.confidence`, errors);

  if (loc.resolved_entity !== undefined) {
    const entityErrors = validateSearchEntity(loc.resolved_entity, `${path}.resolved_entity`, options);
    errors.push(...entityErrors);
  }

  return errors;
}

/**
 * C3: Validates Requirement structure and conditional rules.
 * Rules:
 *  - type in {place_type, experience, activity, attribute} -> canonical_id REQUIRED, value FORBIDDEN.
 *  - type = name -> value REQUIRED (free text), canonical_id FORBIDDEN.
 */
export function validateRequirement(
  req: any,
  path: string,
  options?: ValidationOptions
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!req || typeof req !== 'object' || Array.isArray(req)) {
    errors.push({
      path,
      message: `Requirement must be a non-null object`,
      code: 'INVALID_REQUIREMENT'
    });
    return errors;
  }

  if (!options?.allowUnknownFields) {
    const allowed = new Set([
      'id',
      'type',
      'canonical_id',
      'value',
      'priority',
      'polarity',
      'confidence',
      'source',
      'original_text'
    ]);
    checkUnknownFields(req, allowed, path, errors);
  }

  if (typeof req.id !== 'string' || req.id.trim() === '') {
    errors.push({
      path: `${path}.id`,
      message: `id must be a non-empty string`,
      code: 'INVALID_ID'
    });
  }

  if (!ALLOWED_REQUIREMENT_TYPES.has(req.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Invalid requirement type: '${req.type}'`,
      code: 'INVALID_REQUIREMENT_TYPE'
    });
    return errors;
  }

  if (!ALLOWED_REQUIREMENT_PRIORITIES.has(req.priority)) {
    errors.push({
      path: `${path}.priority`,
      message: `Invalid priority: '${req.priority}'`,
      code: 'INVALID_PRIORITY'
    });
  }

  if (!ALLOWED_REQUIREMENT_POLARITIES.has(req.polarity)) {
    errors.push({
      path: `${path}.polarity`,
      message: `Invalid polarity: '${req.polarity}'`,
      code: 'INVALID_POLARITY'
    });
  }

  validateConfidence(req.confidence, `${path}.confidence`, errors);

  if (!ALLOWED_REQUIREMENT_SOURCES.has(req.source)) {
    errors.push({
      path: `${path}.source`,
      message: `Invalid source: '${req.source}'`,
      code: 'INVALID_SOURCE'
    });
  }

  if (req.original_text !== undefined && typeof req.original_text !== 'string') {
    errors.push({
      path: `${path}.original_text`,
      message: `original_text must be a string`,
      code: 'INVALID_ORIGINAL_TEXT'
    });
  }

  // C3 Conditional Rules
  const taxonomy = options?.taxonomyLookup || defaultTaxonomyRegistry;

  if (req.type === 'name') {
    if (typeof req.value !== 'string' || req.value.trim() === '') {
      errors.push({
        path: `${path}.value`,
        message: `value is required for requirement type 'name'`,
        code: 'MISSING_NAME_VALUE'
      });
    }
    if (req.canonical_id !== undefined) {
      errors.push({
        path: `${path}.canonical_id`,
        message: `canonical_id is forbidden for requirement type 'name' (must use value)`,
        code: 'CANONICAL_ID_FORBIDDEN_FOR_NAME'
      });
    }
  } else {
    // place_type, experience, activity, attribute
    if (typeof req.canonical_id !== 'string' || req.canonical_id.trim() === '') {
      errors.push({
        path: `${path}.canonical_id`,
        message: `canonical_id is required for requirement type '${req.type}'`,
        code: 'MISSING_CANONICAL_ID'
      });
    } else if (taxonomy && !taxonomy.hasCanonicalId(req.canonical_id, req.type)) {
      errors.push({
        path: `${path}.canonical_id`,
        message: `canonical_id '${req.canonical_id}' does not exist in taxonomy for type '${req.type}'`,
        code: 'UNKNOWN_CANONICAL_ID'
      });
    }

    if (req.value !== undefined) {
      errors.push({
        path: `${path}.value`,
        message: `value is forbidden for requirement type '${req.type}' (must use canonical_id)`,
        code: 'VALUE_FORBIDDEN_FOR_CANONICAL_TYPE'
      });
    }
  }

  return errors;
}

/**
 * C2: Validates full SearchIntent structure and strict rules
 */
export function validateSearchIntent(
  intent: any,
  options?: ValidationOptions
): ValidationResult<SearchIntent> {
  const errors: ValidationError[] = [];

  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
    return {
      valid: false,
      errors: [{ path: 'intent', message: 'SearchIntent must be a non-null object', code: 'INVALID_SEARCH_INTENT' }]
    };
  }

  if (!options?.allowUnknownFields) {
    const allowed = new Set([
      'raw_query',
      'normalized_query',
      'language',
      'secondary_languages',
      'intent',
      'entities',
      'location',
      'requirements',
      'constraints',
      'search_mode',
      'ambiguities',
      'parse_source',
      'confidence',
      'versions'
    ]);
    checkUnknownFields(intent, allowed, '', errors);
  }

  if (typeof intent.normalized_query !== 'string' || intent.normalized_query.trim() === '') {
    errors.push({
      path: 'normalized_query',
      message: 'normalized_query must be a non-empty string',
      code: 'INVALID_NORMALIZED_QUERY'
    });
  }

  if (typeof intent.language !== 'string' || intent.language.trim() === '') {
    errors.push({
      path: 'language',
      message: 'language must be a non-empty string',
      code: 'INVALID_LANGUAGE'
    });
  }

  if (intent.secondary_languages !== undefined) {
    if (!Array.isArray(intent.secondary_languages)) {
      errors.push({
        path: 'secondary_languages',
        message: 'secondary_languages must be an array of strings',
        code: 'INVALID_SECONDARY_LANGUAGES'
      });
    }
  }

  if (!ALLOWED_INTENTS.has(intent.intent) && typeof intent.intent !== 'string') {
    errors.push({
      path: 'intent',
      message: `Invalid intent: '${intent.intent}'`,
      code: 'INVALID_INTENT'
    });
  }

  if (!ALLOWED_SEARCH_MODES.has(intent.search_mode)) {
    errors.push({
      path: 'search_mode',
      message: `Invalid search_mode: '${intent.search_mode}' (must be 'standard' or 'discovery')`,
      code: 'INVALID_SEARCH_MODE'
    });
  }

  if (!ALLOWED_PARSE_SOURCES.has(intent.parse_source)) {
    errors.push({
      path: 'parse_source',
      message: `Invalid parse_source: '${intent.parse_source}'`,
      code: 'INVALID_PARSE_SOURCE'
    });
  }

  validateConfidence(intent.confidence, 'confidence', errors);

  // Versions check (C8)
  if (!intent.versions || typeof intent.versions !== 'object') {
    errors.push({
      path: 'versions',
      message: 'versions object is required',
      code: 'MISSING_VERSIONS'
    });
  } else {
    if (!options?.allowUnknownFields) {
      checkUnknownFields(intent.versions, new Set(['contract', 'taxonomy', 'parser', 'normalizer']), 'versions', errors);
    }
    ['contract', 'taxonomy', 'parser', 'normalizer'].forEach(vKey => {
      if (typeof intent.versions[vKey] !== 'string' || intent.versions[vKey].trim() === '') {
        errors.push({
          path: `versions.${vKey}`,
          message: `versions.${vKey} must be a non-empty string`,
          code: 'INVALID_VERSION_FIELD'
        });
      }
    });
  }

  // Entities check (C5)
  if (!Array.isArray(intent.entities)) {
    errors.push({
      path: 'entities',
      message: 'entities must be an array',
      code: 'INVALID_ENTITIES'
    });
  } else {
    intent.entities.forEach((entity: any, idx: number) => {
      const entityErrors = validateSearchEntity(entity, `entities[${idx}]`, options);
      errors.push(...entityErrors);
    });
  }

  // Location check (C4)
  if (intent.location !== null && intent.location !== undefined) {
    const locErrors = validateLocationIntent(intent.location, 'location', options);
    errors.push(...locErrors);
  } else if (intent.location === undefined) {
    errors.push({
      path: 'location',
      message: 'location must be specified (can be null if unconstrained)',
      code: 'MISSING_LOCATION'
    });
  }

  // Requirements check (C3)
  if (!Array.isArray(intent.requirements)) {
    errors.push({
      path: 'requirements',
      message: 'requirements must be an array',
      code: 'INVALID_REQUIREMENTS'
    });
  } else {
    intent.requirements.forEach((req: any, idx: number) => {
      const reqErrors = validateRequirement(req, `requirements[${idx}]`, options);
      errors.push(...reqErrors);
    });
  }

  // Ambiguities check
  if (!Array.isArray(intent.ambiguities)) {
    errors.push({
      path: 'ambiguities',
      message: 'ambiguities must be an array',
      code: 'INVALID_AMBIGUITIES'
    });
  } else {
    intent.ambiguities.forEach((amb: any, idx: number) => {
      if (!amb || typeof amb !== 'object' || typeof amb.text !== 'string' || !Array.isArray(amb.candidate_ids)) {
        errors.push({
          path: `ambiguities[${idx}]`,
          message: 'Ambiguity must be an object with text (string) and candidate_ids (string array)',
          code: 'INVALID_AMBIGUITY_ITEM'
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (intent as SearchIntent) : undefined
  };
}

/**
 * C7: Validates Evidence structure and strict compliance registry rules.
 * Rules:
 *  - data_owner = google_provider -> persistable defaults to false.
 *  - persistable = true with google-derived data requires compliance_review_ref that RESOLVES in docs/compliance/reviews.json
 *    AND whose entry has status "approved", approved_by, approved_at, scope.
 *  - If derived_from includes google_provider, evidence inherits google_provider constraints (labeling it internal_derived does not bypass).
 *  - source_type = google_provider requires data_owner = google_provider.
 */
export function validateEvidence(
  evidence: any,
  options?: ValidationOptions
): ValidationResult<Evidence> {
  const errors: ValidationError[] = [];

  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return {
      valid: false,
      errors: [{ path: 'evidence', message: 'Evidence must be a non-null object', code: 'INVALID_EVIDENCE' }]
    };
  }

  if (!options?.allowUnknownFields) {
    const allowed = new Set([
      'feature_id',
      'status',
      'positive_count',
      'negative_count',
      'confidence',
      'source_type',
      'evidence_count',
      'evidence_refs',
      'data_owner',
      'derived_from',
      'persistable',
      'compliance_review_ref',
      'created_at',
      'version'
    ]);
    checkUnknownFields(evidence, allowed, '', errors);
  }

  if (typeof evidence.feature_id !== 'string' || evidence.feature_id.trim() === '') {
    errors.push({
      path: 'feature_id',
      message: 'feature_id must be a non-empty string',
      code: 'INVALID_FEATURE_ID'
    });
  }

  if (!ALLOWED_EVIDENCE_STATUSES.has(evidence.status)) {
    errors.push({
      path: 'status',
      message: `Invalid evidence status: '${evidence.status}'`,
      code: 'INVALID_EVIDENCE_STATUS'
    });
  }

  if (
    typeof evidence.positive_count !== 'number' ||
    !Number.isInteger(evidence.positive_count) ||
    evidence.positive_count < 0
  ) {
    errors.push({
      path: 'positive_count',
      message: 'positive_count must be a non-negative integer',
      code: 'INVALID_COUNT'
    });
  }

  if (
    typeof evidence.negative_count !== 'number' ||
    !Number.isInteger(evidence.negative_count) ||
    evidence.negative_count < 0
  ) {
    errors.push({
      path: 'negative_count',
      message: 'negative_count must be a non-negative integer',
      code: 'INVALID_COUNT'
    });
  }

  validateConfidence(evidence.confidence, 'confidence', errors);

  if (!ALLOWED_EVIDENCE_SOURCE_TYPES.has(evidence.source_type)) {
    errors.push({
      path: 'source_type',
      message: `Invalid evidence source_type: '${evidence.source_type}'`,
      code: 'INVALID_SOURCE_TYPE'
    });
  }

  if (!ALLOWED_EVIDENCE_DATA_OWNERS.has(evidence.data_owner)) {
    errors.push({
      path: 'data_owner',
      message: `Invalid evidence data_owner: '${evidence.data_owner}'`,
      code: 'INVALID_DATA_OWNER'
    });
  }

  if (typeof evidence.persistable !== 'boolean') {
    errors.push({
      path: 'persistable',
      message: 'persistable must be a boolean',
      code: 'INVALID_PERSISTABLE'
    });
  }

  if (evidence.derived_from !== undefined) {
    if (!Array.isArray(evidence.derived_from)) {
      errors.push({
        path: 'derived_from',
        message: 'derived_from must be an array of source types',
        code: 'INVALID_DERIVED_FROM'
      });
    } else {
      evidence.derived_from.forEach((src: any, idx: number) => {
        if (!ALLOWED_EVIDENCE_SOURCE_TYPES.has(src)) {
          errors.push({
            path: `derived_from[${idx}]`,
            message: `Invalid derived_from source type: '${src}'`,
            code: 'INVALID_DERIVED_SOURCE'
          });
        }
      });
    }
  }

  // C7 Constraint: source_type = google_provider requires data_owner = google_provider
  if (evidence.source_type === 'google_provider' && evidence.data_owner !== 'google_provider') {
    errors.push({
      path: 'data_owner',
      message: `source_type 'google_provider' requires data_owner to be 'google_provider' (got '${evidence.data_owner}')`,
      code: 'GOOGLE_SOURCE_REQUIRES_GOOGLE_OWNER'
    });
  }

  // C7 Constraint: Check Google-derived persistable compliance review requirement
  const isGoogleDerived =
    evidence.data_owner === 'google_provider' ||
    (Array.isArray(evidence.derived_from) && evidence.derived_from.includes('google_provider'));

  if (evidence.persistable === true && isGoogleDerived) {
    if (typeof evidence.compliance_review_ref !== 'string' || evidence.compliance_review_ref.trim() === '') {
      errors.push({
        path: 'compliance_review_ref',
        message: 'persistable google-derived evidence requires a non-empty compliance_review_ref',
        code: 'MISSING_COMPLIANCE_REVIEW_REF'
      });
    } else {
      const registry = options?.complianceRegistry || defaultComplianceRegistry;
      const reviewEntry = registry.getReview(evidence.compliance_review_ref);

      if (!reviewEntry) {
        errors.push({
          path: 'compliance_review_ref',
          message: `compliance_review_ref '${evidence.compliance_review_ref}' not found in compliance registry`,
          code: 'COMPLIANCE_REVIEW_NOT_FOUND'
        });
      } else {
        if (reviewEntry.status !== 'approved') {
          errors.push({
            path: 'compliance_review_ref',
            message: `compliance review '${evidence.compliance_review_ref}' has status '${reviewEntry.status}' (must be 'approved')`,
            code: 'COMPLIANCE_REVIEW_NOT_APPROVED'
          });
        }
        if (!reviewEntry.approved_by || reviewEntry.approved_by.trim() === '') {
          errors.push({
            path: 'compliance_review_ref',
            message: `compliance review '${evidence.compliance_review_ref}' missing approved_by`,
            code: 'COMPLIANCE_REVIEW_INCOMPLETE'
          });
        }
        if (!reviewEntry.approved_at || Number.isNaN(Date.parse(reviewEntry.approved_at))) {
          errors.push({
            path: 'compliance_review_ref',
            message: `compliance review '${evidence.compliance_review_ref}' missing or invalid approved_at date`,
            code: 'COMPLIANCE_REVIEW_INCOMPLETE'
          });
        }
        if (!reviewEntry.scope || (Array.isArray(reviewEntry.scope) && reviewEntry.scope.length === 0)) {
          errors.push({
            path: 'compliance_review_ref',
            message: `compliance review '${evidence.compliance_review_ref}' missing scope definition`,
            code: 'COMPLIANCE_REVIEW_INCOMPLETE'
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (evidence as Evidence) : undefined
  };
}
