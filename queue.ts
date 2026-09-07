/**
 * Which number to ask next.
 *
 * Uniform random is the wrong teacher: it spends as much time on the numbers
 * you already know as on the one that keeps catching you out. This weights
 * selection so unseen numbers come up first (you should meet the whole range)
 * and missed numbers come back sooner, fading as you get them right.
 *
 * It lives at the repo root rather than in `src/` for the reason in CLAUDE.md:
 * it is load-bearing, and `compose.ts check` tests it here. A bug that starved
 * some numbers, or never let a missed one settle, would be invisible in the UI
 * until someone noticed the drill felt wrong.
 */

export type Stat = {
  /** Times asked. */
  seen: number;
  /** Times missed, ever — for display, not for weighting. */
  wrong: number;
  /**
   * How much practice this number still wants. Rises on a miss, falls on a
   * hit, so a number you have since got right several times settles back to
   * the floor instead of haunting the queue forever.
   */
  ease: number;
};

export type Stats = Record<number, Stat>;

/**
 * The resulting policy, in order:
 *
 *   settled       1
 *   missed once   4
 *   unseen        6
 *   missed twice  7
 *   missed thrice 10
 *
 * A single slip does not outrank material you have never met — covering the
 * range matters more than chasing one mistake. Miss the same number twice and
 * it jumps ahead of new material, which is the point at which it has stopped
 * being a slip. `compose.ts check` asserts this ordering, so changing any
 * constant below without meaning to will fail there.
 */
export const UNSEEN_WEIGHT = 6;
/** A number answered correctly and settled. Never zero — it still recurs. */
export const BASE_WEIGHT = 1;
export const EASE_STEP = 3;
/** Beyond this, extra misses stop making a number more likely. */
export const EASE_CAP = 3;

export function weightOf(stat: Stat | undefined): number {
  if (!stat || stat.seen === 0) return UNSEEN_WEIGHT;
  return BASE_WEIGHT + Math.min(stat.ease, EASE_CAP) * EASE_STEP;
}

export const emptyStat = (): Stat => ({ seen: 0, wrong: 0, ease: 0 });

/** Fold one answer into the stats. Returns a new object; does not mutate. */
export function record(stats: Stats, n: number, ok: boolean): Stats {
  const prev = stats[n] ?? emptyStat();
  return {
    ...stats,
    [n]: {
      seen: prev.seen + 1,
      wrong: prev.wrong + (ok ? 0 : 1),
      ease: ok ? Math.max(0, prev.ease - 1) : Math.min(EASE_CAP, prev.ease + 1),
    },
  };
}

/**
 * Weighted pick from 0..max, skipping `avoid` so the same number never
 * appears twice running — except when the range is a single number and there
 * is nothing else to ask.
 */
export function pickNext(
  max: number,
  stats: Stats,
  avoid: number | null,
  rnd: () => number = Math.random,
): number {
  const ns: number[] = [];
  const ws: number[] = [];
  let total = 0;
  for (let n = 0; n <= max; n++) {
    if (n === avoid && max > 0) continue;
    const w = weightOf(stats[n]);
    ns.push(n);
    ws.push(w);
    total += w;
  }
  let r = rnd() * total;
  for (let i = 0; i < ns.length; i++) {
    r -= ws[i]!;
    if (r < 0) return ns[i]!;
  }
  // Only reachable through floating-point drift at the very top of the range.
  return ns[ns.length - 1]!;
}

/** Answered at least once and currently settled — the progress readout. */
export function solidCount(stats: Stats, max: number): number {
  let k = 0;
  for (let n = 0; n <= max; n++) {
    const s = stats[n];
    if (s && s.seen > 0 && s.ease === 0) k++;
  }
  return k;
}
