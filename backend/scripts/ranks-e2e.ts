/**
 * Unit tests for the explorer-rank ladder (points come only from missions now).
 *   npm run test:ranks
 */
import { resolveRank, RANK_TIERS } from '../../shared/ranks';
import { TOTAL_MISSION_POINTS } from '../../shared/achievements';

let pass = 0;
let fail = 0;
function check(name: string, cond: unknown, extra?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.error('✗', name, extra ?? '');
  }
}

check('tiers ordered ascending and start at 0', RANK_TIERS[0].minPoints === 0 && RANK_TIERS.every((t, i) => i === 0 || t.minPoints > RANK_TIERS[i - 1].minPoints));
check('completing every mission lands on a real tier', resolveRank(TOTAL_MISSION_POINTS).level >= 0 && resolveRank(TOTAL_MISSION_POINTS).level < RANK_TIERS.length, TOTAL_MISSION_POINTS);

const r0 = resolveRank(0);
check('0 points → first tier', r0.current.id === 'rank-1' && r0.level === 0 && !r0.isMax);
check('0 points → progress 0%', r0.progressPercent === 0);
check('0 points → next is tier 2', r0.next?.id === 'rank-2' && r0.pointsToNext === RANK_TIERS[1].minPoints);

check('negative points clamped to 0', resolveRank(-500).current.id === 'rank-1' && resolveRank(-500).points === 0);
check('garbage input → tier 1', resolveRank(NaN as any).current.id === 'rank-1' && resolveRank(undefined).level === 0 && resolveRank(null).level === 0);

const t2 = RANK_TIERS[1].minPoints;
const t3 = RANK_TIERS[2].minPoints;
const mid = resolveRank(Math.floor((t2 + t3) / 2));
check('mid-tier-2 resolves to tier 2', mid.current.id === 'rank-2');
check('mid-tier-2 progress is partial', mid.progressPercent > 0 && mid.progressPercent < 100);

check('exactly on a threshold promotes', resolveRank(t3).current.id === 'rank-3' && resolveRank(t3).progressPercent === 0);
check('one below threshold stays', resolveRank(t3 - 1).current.id === 'rank-2');

const top = resolveRank(99999);
check('huge points → top tier', top.current.id === RANK_TIERS[RANK_TIERS.length - 1].id);
check('top tier is max', top.isMax && top.next === null && top.pointsToNext === 0 && top.progressPercent === 100);
check('floors fractional points', resolveRank(t2 + 0.9).current.id === 'rank-2' && resolveRank(t2 - 0.1).current.id === 'rank-1');

console.log(`\nranks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
