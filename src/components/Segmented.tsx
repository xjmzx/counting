import { cn } from "../lib/cn";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  /** Rendered muted, still clickable — the panel explains why it is unbuilt. */
  pending?: boolean;
  title?: string;
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
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      // Wraps rather than overflowing: six languages are wider than the 420px
      // minimum window, and a tab list that runs off the edge hides options
      // with nothing to indicate they are there.
      className="flex flex-wrap max-w-full rounded-md bg-surface p-0.5"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              "px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap",
              active ? "bg-surfaceHover text-fg" : "text-muted hover:text-fg",
              o.pending && !active && "opacity-50",
            )}
          >
            {o.label}
            {o.pending && <span className="ml-1.5 text-[10px] align-top text-warn">•</span>}
          </button>
        );
      })}
    </div>
  );
}
