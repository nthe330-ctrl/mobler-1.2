import { db } from './db';
import { resolveRank, ResolvedRank } from '../../shared/ranks';

/**
 * Explorer rank for a customer, derived from their real point total.
 * Points are granted only by completing missions (see achievements.ts), which in
 * turn only advance on COMPLETED check-ins — so rank reflects real, finished visits.
 */
export function getUserRank(userId: string): ResolvedRank {
  const user = db.findUserById(userId);
  return resolveRank(user?.points);
}
