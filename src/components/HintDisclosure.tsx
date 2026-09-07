import { useEffect, useState } from "react";
import { ChevronRight, Volume2, PenLine } from "lucide-react";
import type { SoundRule } from "../../sounds.ts";
import { cn } from "../lib/cn";

/**
 * A collapsed set of hints, remembered per language.
 *
 * Collapsed by default so it does not crowd the answer, but the choice sticks:
 * someone who needs these should not reopen them every question, and someone
 * who does not should not keep closing them.
 */
export function HintDisclosure({
  label,
  hints,
  storageKey,
  kind,
  onToggle,
}: {
  label: string;
  hints: SoundRule[];
  /** Scoped per language, so a script you read stays quiet. */
  storageKey: string;
  kind: "sound" | "script";
  /** Return focus to the input so Enter still moves on. */
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      // Not remembering the preference is survivable.
    }
  }, [storageKey, open]);

  if (hints.length === 0) return null;
  const Icon = kind === "sound" ? Volume2 : PenLine;
  const tone = kind === "sound" ? "text-digital/90" : "text-mauve/90";

  return (
    <div className="space-y-2">
      <button
        onClick={() => {
          setOpen((v) => !v);
          onToggle?.();
        }}
        aria-expanded={open}
        className={cn("flex items-center gap-1 text-sm transition-colors", tone, "hover:brightness-125")}
      >
        <ChevronRight size={14} className={cn("transition-transform", open && "rotate-90")} />
        {label}
        {!open && <span className="text-muted ml-1">({hints.length})</span>}
      </button>
      {open && (
        <div className="space-y-2">
          {hints.map((h) => (
            <p key={h.id} className={cn("text-sm leading-relaxed max-w-prose flex gap-2", tone)}>
              <Icon size={14} className="shrink-0 mt-1 opacity-70" />
              <span>{h.hint}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
