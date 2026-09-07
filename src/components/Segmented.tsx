import { cn } from "../lib/cn";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  /** Rendered muted, still clickable — the panel explains why it is unbuilt. */
  pending?: boolean;
  title?: string;
  /**
   * Options sharing a group are drawn together, separated from the next group
   * by a divider. Options are taken in the order given, so a group must be
   * contiguous; `make data` asserts that for the language roster.
   */
  group?: string;
  /**
   * A division *inside* a group, shown as a gap rather than a pill of its own.
   * Indo-European is the right family to group by, but Romance, Germanic and
   * Indo-Aryan diverge enough that flattening them loses something real — the
   * four Romance languages reinforce each other in a way German does not.
   * A gap keeps that visible without claiming they are separate families.
   */
  subgroup?: string;
}

/** Split a flat list into runs of equal `group`, preserving order. */
function runs<T extends string>(options: SegmentedOption<T>[]): SegmentedOption<T>[][] {
  const out: SegmentedOption<T>[][] = [];
  for (const o of options) {
    const last = out[out.length - 1];
    if (last && last[0]?.group === o.group) last.push(o);
    else out.push([o]);
  }
  return out;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const groups = runs(options);

  return (
    // Each group is its own pill, separated by a gap rather than a divider.
    // A divider element is wrong here because the list wraps: at the 420px
    // minimum window each family lands on its own line, and a leading divider
    // reads as a stray tick rather than a separator. A gap survives wrapping,
    // and separate pills make the grouping legible on one line or three.
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-1.5 max-w-full">
      {groups.map((group, gi) => (
        <div
          key={group[0]?.group ?? gi}
          role="presentation"
          className="flex flex-wrap rounded-md bg-surface p-0.5"
        >
          {group.map((o, oi) => {
            const active = o.id === value;
            // A gap, not a rule: the list wraps, and a divider at the start of
            // a line reads as a stray mark. See the note above the tablist.
            const newBranch = oi > 0 && group[oi - 1]?.subgroup !== o.subgroup;
            return (
              <button
                key={o.id}
                role="tab"
                aria-selected={active}
                // The family is not spelled out once grouped, so name it here
                // for anyone who cannot see the grouping.
                title={o.title ?? [o.group, o.subgroup].filter(Boolean).join(" · ")}
                onClick={() => onChange(o.id)}
                className={cn(
                  "px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap",
                  active ? "bg-surfaceHover text-fg" : "text-muted hover:text-fg",
                  o.pending && !active && "opacity-50",
                  newBranch && "ml-4",
                )}
              >
                {o.label}
                {o.pending && <span className="ml-1.5 text-[10px] align-top text-warn">•</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
