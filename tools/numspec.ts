/**
 * The `N=` number spec, shared by the recorder and the clip report.
 *
 * They are two halves of one loop: `make clipcheck` names the takes worth
 * doing again and prints the `make record` line that does them, so the string
 * one writes must be the string the other reads. Keeping both here is what
 * makes that true rather than merely intended — `compose.ts` asserts the round
 * trip.
 */

/**
 * `39`, `39,40`, `38-45`, or any mix of those separated by commas. Null means
 * none was given, which the recorder reads as "whatever is missing".
 */
export function parseNumbers(spec: string | undefined): number[] | null {
  if (spec === undefined || spec.trim() === "") return null;
  const out = new Set<number>();
  for (const piece of spec.split(",")) {
    const s = piece.trim();
    if (s === "") continue;
    const range = /^(\d+)-(\d+)$/.exec(s);
    if (!range && !/^\d+$/.test(s)) throw new Error(`cannot read "${s}" as a number or a range`);
    const lo = Number(range ? range[1] : s);
    const hi = Number(range ? range[2] : s);
    if (lo > hi) throw new Error(`"${s}" counts backwards`);
    if (hi > 100) throw new Error(`"${s}" goes past 100`);
    for (let n = lo; n <= hi; n++) out.add(n);
  }
  return out.size === 0 ? null : [...out].sort((a, b) => a - b);
}

/** 38,39,40,55 as "38-40,55" — short enough to read and to paste back in. */
export function describeNumbers(ns: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < ns.length; ) {
    let j = i;
    while (j + 1 < ns.length && (ns[j + 1] ?? 0) === (ns[j] ?? 0) + 1) j++;
    out.push(i === j ? `${ns[i]}` : `${ns[i]}-${ns[j]}`);
    i = j + 1;
  }
  return out.join(",");
}
