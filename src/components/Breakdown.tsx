import type { Item, Language } from "../../types.ts";

/**
 * The pieces of a number in the order they are spoken, which is not always the
 * order of the numeral — German says three-and-seventy. This is the part worth
 * showing after a wrong answer: it is why the answer was wrong, not just that.
 */
export function Breakdown({ lang, item }: { lang: Language; item: Item }) {
  const label = (n: number): string => {
    const atom = lang.atoms.find((a) => a.n === n);
    return atom ? atom.form : lang.compose(n).form;
  };

  if (item.parts.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted select-none">+</span>}
          <span className="px-2 py-1 rounded bg-surface text-sm">
            <span className="text-fg">{label(p)}</span>
            <span className="text-muted ml-1.5 text-xs tabular-nums">{p}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
