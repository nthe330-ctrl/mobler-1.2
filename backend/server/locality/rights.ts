import fs from 'fs';
import path from 'path';
import { RightsStatus } from './types';

/**
 * Source rights registry (backend/config/source-rights.json).
 * Nothing is stored, shown or counted toward the quality gate unless the
 * corresponding right is explicitly "granted" here.
 */
export interface SourceRights {
  label: string;
  dev_only?: boolean;
  business_data: RightsStatus;
  photos: RightsStatus;
  reviews: RightsStatus;
  redistribute: RightsStatus;
  attribution?: string;
  retention_days?: number | null;
  basis?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string;
}

interface RightsFile {
  sources: Record<string, SourceRights>;
  origins: Record<string, SourceRights>;
}

const FILE = process.env.LOCALITY_RIGHTS_FILE
  ? path.resolve(process.env.LOCALITY_RIGHTS_FILE)
  : path.join(process.cwd(), 'config', 'source-rights.json');

let cache: { mtime: number; data: RightsFile } | null = null;

function load(): RightsFile {
  try {
    const stat = fs.statSync(FILE);
    if (!cache || cache.mtime !== stat.mtimeMs) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
      cache = { mtime: stat.mtimeMs, data: { sources: parsed.sources || {}, origins: parsed.origins || {} } };
    }
    return cache.data;
  } catch {
    // Missing/invalid registry → nothing is granted.
    return { sources: {}, origins: {} };
  }
}

const DENY_ALL: SourceRights = {
  label: 'unknown',
  business_data: 'unverified',
  photos: 'unverified',
  reviews: 'unverified',
  redistribute: 'unverified'
};

/**
 * Effective rights for a record. `source` is the adapter id; `origin` is where the
 * data really came from (e.g. a file exported by GPM from some website). The most
 * restrictive of the two wins.
 */
export function rightsFor(source: string, origin?: string): SourceRights {
  const reg = load();
  const base = reg.sources[source.split(':')[0]] || DENY_ALL;
  const isProd = process.env.NODE_ENV === 'production';
  if (base.dev_only && isProd) return { ...base, business_data: 'denied', photos: 'denied', reviews: 'denied', redistribute: 'denied' };
  if (!origin) return base;
  const o = reg.origins[origin] || { ...DENY_ALL, label: origin };
  const min = (a: RightsStatus, b: RightsStatus): RightsStatus =>
    a === 'denied' || b === 'denied' ? 'denied' : a === 'granted' && b === 'granted' ? 'granted' : 'unverified';
  return {
    ...base,
    label: `${base.label} ← ${o.label}`,
    business_data: min(base.business_data === 'unverified' ? 'granted' : base.business_data, o.business_data),
    photos: min(base.photos === 'unverified' ? 'granted' : base.photos, o.photos),
    reviews: min(base.reviews === 'unverified' ? 'granted' : base.reviews, o.reviews),
    redistribute: min(base.redistribute === 'unverified' ? 'granted' : base.redistribute, o.redistribute),
    attribution: o.attribution || base.attribution,
    retention_days: o.retention_days ?? base.retention_days,
    basis: o.basis,
    verified_by: o.verified_by,
    verified_at: o.verified_at
  };
}

export function rightsRegistry() {
  const reg = load();
  const isProd = process.env.NODE_ENV === 'production';
  return {
    file: path.relative(process.cwd(), FILE),
    sources: Object.entries(reg.sources).map(([id, r]) => ({ id, ...r, active_in_this_env: !(r.dev_only && isProd) })),
    origins: Object.entries(reg.origins).map(([id, r]) => ({ id, ...r }))
  };
}

export function retentionExpiry(fetchedAt: string, rights: SourceRights): string | undefined {
  if (!rights.retention_days) return undefined;
  return new Date(new Date(fetchedAt).getTime() + rights.retention_days * 86400000).toISOString();
}
