import { useState } from "react";
import { Languages } from "lucide-react";
import { cn } from "./lib/cn";
import { LANGS, RANGES, SKILLS, type SkillId } from "./lib/langs";
import { Segmented } from "./components/Segmented";
import { Drill } from "./components/Drill";
import { Unbuilt } from "./components/Unbuilt";

export default function App() {
  const [upleb, setUpleb] = useState(false);
  const [langCode, setLangCode] = useState(LANGS[0]!.code);
  const [skill, setSkill] = useState<SkillId>("read");
  const [max, setMax] = useState(20);

  const lang = LANGS.find((l) => l.code === langCode) ?? LANGS[0]!;
  const current = SKILLS.find((s) => s.id === skill)!;

  return (
    <div className={cn("min-h-full flex flex-col", upleb && "theme-upleb")}>
      <header className="flex items-center gap-3 px-5 py-4 border-b border-surface/60">
        <Languages size={22} className="text-accent shrink-0" />
        <button
          onClick={() => setUpleb((v) => !v)}
          title="Toggle theme"
          className="text-2xl font-bold tracking-tight select-none"
        >
          <span className="text-accent">count</span>
          <span className="text-mauve">ing</span>
        </button>
        <span className="text-xs text-muted hidden sm:inline">0–100 in three languages</span>
      </header>

      <div className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-surface/60">
        <Segmented
          ariaLabel="Language"
          value={langCode}
          onChange={setLangCode}
          options={LANGS.map((l) => ({ id: l.code, label: l.name.replace(" Chinese", "") }))}
        />
        <Segmented
          ariaLabel="Skill"
          value={skill}
          onChange={setSkill}
          options={SKILLS.map((s) => ({
            id: s.id,
            label: s.label,
            pending: !s.ready,
            title: s.ready ? undefined : "Not built yet",
          }))}
        />
        <Segmented
          ariaLabel="Range"
          value={String(max)}
          onChange={(v) => setMax(Number(v))}
          options={RANGES.map((r) => ({ id: String(r.max), label: r.label }))}
        />
      </div>

      {/* m-auto, not items-center. With room to spare the card sits centred; when
          the card is taller than the window the auto margins collapse to zero
          and the page grows, so it scrolls instead of clipping the top off.
          `items-center` would clip. The root is min-h-full rather than h-full,
          so it is the document that scrolls here, not this element. */}
      <main className="flex-1 px-5 py-6 flex">
        <div className="w-full max-w-2xl m-auto">
          {current.ready ? (
            <Drill
              key={`${lang.code}-${skill}-${max}`}
              lang={lang}
              skill={skill as "read" | "write"}
              max={max}
            />
          ) : (
            <Unbuilt label={current.label} reason={current.blocked ?? ""} />
          )}
        </div>
      </main>

      <footer className="px-5 py-3 border-t border-surface/60 text-xs text-muted">
        0–100, three languages. Listening is next; speaking is a long-term aim.
      </footer>
    </div>
  );
}
