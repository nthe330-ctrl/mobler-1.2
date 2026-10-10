import { localityConfig } from '../config';
import { fileImportAdapter } from './fileImport';
import { gpmAdapter } from './gpm';
import { mockDevAdapter } from './mockDev';
import { osmAdapter } from './osm';
import { SourceAdapter } from './types';

export const ALL_ADAPTERS: SourceAdapter[] = [mockDevAdapter, osmAdapter, fileImportAdapter, gpmAdapter];

/** Adapters configured for this environment, in priority order. */
export function configuredAdapters(): SourceAdapter[] {
  return localityConfig.sources
    .map(id => ALL_ADAPTERS.find(a => a.id === id))
    .filter((a): a is SourceAdapter => !!a);
}
