/**
 * MOBLER SEARCH - PHASE 4: ESCALATION DECISION ENGINE
 * Deterministically decides whether a fast-path parse must escalate to AI.
 * Emits clear, auditable escalation reasons for telemetry.
 */

import { FastPathResult } from './fastPath';
import { DISCOVERY_VAGUE_PHRASES } from './config';
import { QueryUnderstandingConfig } from './types';

export interface EscalationResult {
  shouldEscalate: boolean;
  escalationReasons: string[];
}

const COMPARISON_PATTERNS = [
  /\b(tương\s+tự(\s+như)?|giống(\s+như)?|như\s+quán)\b/i,
  /\b(similar\s+to|like|better\s+than|as\s+good\s+as)\b/i,
  /(類似|好像|比.+好|跟.+一樣)/i,
  /(เหมือน|คล้ายกับ|ดีกว่า)/i
];

export class EscalationEngine {
  public static evaluate(
    fastPath: FastPathResult,
    config: QueryUnderstandingConfig
  ): EscalationResult {
    const reasons: string[] = [];
    const intent = fastPath.intent;
    const residual = fastPath.residualWords;

    // 1. Ambiguity check
    if (intent.ambiguities && intent.ambiguities.length > 0) {
      reasons.push('ambiguity_detected');
    }

    // 2. Query truncation check
    if (fastPath.isTruncated) {
      reasons.push('query_truncated');
    }

    // 3. Thai pattern requiring native review
    if (fastPath.hasThaiPattern) {
      reasons.push('thai_pattern_needs_native_review');
    }

    // 4. Comparison or complex syntax check
    const queryText = intent.normalized_query;
    if (COMPARISON_PATTERNS.some(pat => pat.test(queryText))) {
      reasons.push('complex_comparison_syntax');
    }

    // 5. Discovery / vague semantic phrases check
    const langPhrases = DISCOVERY_VAGUE_PHRASES[intent.language] || DISCOVERY_VAGUE_PHRASES.en;
    if (langPhrases.some(phrase => queryText.includes(phrase))) {
      reasons.push('discovery_vague_phrase');
    }

    // 6. Unresolved residual text check
    if (residual.length > config.residualWordThreshold) {
      reasons.push('unresolved_residual_text');
    }

    // 7. Low confidence check
    if (intent.confidence < config.confidenceThreshold) {
      reasons.push('low_confidence');
    }

    // 8. No requirements and no explicit location resolved
    if (intent.requirements.length === 0 && (!intent.location || intent.location.source !== 'explicit')) {
      reasons.push('unresolved_residual_text');
    }

    const uniqueReasons = Array.from(new Set(reasons));
    return {
      shouldEscalate: uniqueReasons.length > 0,
      escalationReasons: uniqueReasons
    };
  }
}
