import { Construction } from "lucide-react";

/** An honest empty state. The skill is named in the UI because it is part of
 *  the plan, so the panel has to say plainly that it does not work yet. */
export function Unbuilt({
  label,
  reason,
  heading,
}: {
  label: string;
  reason: string;
  /** Override when the skill IS built and something else is in the way. */
  heading?: string;
}) {
  return (
    <div className="rounded-lg bg-panel p-6 flex gap-4 items-start">
      <Construction size={20} className="text-warn shrink-0 mt-0.5" />
      <div className="space-y-2">
        <h2 className="font-medium text-fg">{heading ?? `${label} is not built yet`}</h2>
        <p className="text-sm text-muted leading-relaxed max-w-prose">{reason}</p>
      </div>
    </div>
  );
}
