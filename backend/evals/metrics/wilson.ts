/**
 * MOBLER SEARCH - WILSON SCORE INTERVAL & STATISTICAL HELPERS
 * Mathematically rigorous Wilson 95% confidence intervals for binomial rates,
 * interval overlap tests, and sample sufficiency guarantees.
 */

import { RateMetric, WilsonInterval, NumericSummaryMetric } from '../types';

export const DEFAULT_MIN_SAMPLE_SIZE = 10;
export const Z_95 = 1.95996398454;
const Z_SQUARED_95 = Z_95 * Z_95;

/**
 * Computes Wilson score interval for binomial proportion with 95% confidence.
 * Formulated with continuity correction / adjusted center:
 *   center = (k + z^2 / 2) / (n + z^2)
 *   margin = (z / (n + z^2)) * sqrt( (k * (n - k) / n) + (z^2 / 4) )
 */
export function calculateWilsonInterval(
  k: number,
  n: number,
  z: number = Z_95
): WilsonInterval {
  if (n <= 0 || k < 0) {
    return { lower: 0, upper: 0, center: 0 };
  }

  // Bound k between 0 and n
  const clampedK = Math.min(Math.max(k, 0), n);
  const z2 = z * z;
  const denominator = n + z2;
  const center = (clampedK + z2 / 2) / denominator;

  const varianceTerm = (clampedK * (n - clampedK)) / n;
  const marginTerm = z * Math.sqrt(varianceTerm + z2 / 4);
  const margin = marginTerm / denominator;

  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);

  return {
    lower: Math.round(lower * 10000) / 10000,
    upper: Math.round(upper * 10000) / 10000,
    center: Math.round(center * 10000) / 10000
  };
}

/**
 * Builds a RateMetric object with k, n, rate, and Wilson 95% CI.
 */
export function buildRateMetric(
  k: number,
  n: number,
  minSample: number = DEFAULT_MIN_SAMPLE_SIZE
): RateMetric {
  const rate = n > 0 ? Math.round((k / n) * 10000) / 10000 : 0;
  const wilson_ci = calculateWilsonInterval(k, n);
  const status = n >= minSample ? 'sufficient' : 'insufficient_data';

  return {
    k,
    n,
    rate,
    wilson_ci,
    status
  };
}

/**
 * Checks if two intervals overlap.
 */
export function intervalsOverlap(a: WilsonInterval, b: WilsonInterval): boolean {
  return Math.max(a.lower, b.lower) <= Math.min(a.upper, b.upper);
}

/**
 * Formats a RateMetric as human-readable string:
 * e.g. "45/50 (90.0% [82.5%, 94.5%])" or "3/5 (60.0%) [insufficient data (n=5)]"
 */
export function formatRateMetric(metric: RateMetric, minSample: number = DEFAULT_MIN_SAMPLE_SIZE): string {
  if (metric.n === 0) {
    return `0/0 (0.0%) [insufficient data (n=0)]`;
  }
  const pct = (metric.rate * 100).toFixed(1);
  const ciLow = (metric.wilson_ci.lower * 100).toFixed(1);
  const ciHigh = (metric.wilson_ci.upper * 100).toFixed(1);

  if (metric.n < minSample) {
    return `${metric.k}/${metric.n} (${pct}%) [insufficient data (n=${metric.n})]`;
  }

  return `${metric.k}/${metric.n} (${pct}% [${ciLow}%, ${ciHigh}%])`;
}

/**
 * Computes numeric summary metrics (sample size, mean, p50, p95, max).
 */
export function computeNumericSummary(
  values: number[],
  minSample: number = DEFAULT_MIN_SAMPLE_SIZE
): NumericSummaryMetric {
  const n = values.length;
  if (n === 0) {
    return {
      sample_size: 0,
      mean: 0,
      p50: 0,
      p95: 0,
      max: 0,
      status: 'insufficient_data'
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = Math.round((sum / n) * 100) / 100;
  const max = Math.round(sorted[n - 1] * 100) / 100;

  const p50Index = Math.min(Math.floor(n * 0.5), n - 1);
  const p95Index = Math.min(Math.floor(n * 0.95), n - 1);
  const p50 = Math.round(sorted[p50Index] * 100) / 100;
  const p95 = Math.round(sorted[p95Index] * 100) / 100;

  return {
    sample_size: n,
    mean,
    p50,
    p95,
    max,
    status: n >= minSample ? 'sufficient' : 'insufficient_data'
  };
}
