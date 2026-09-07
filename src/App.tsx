import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { cn } from "./lib/cn";
import { LANGS, RANGES, SKILLS, type SkillId } from "./lib/langs";
import { Segmented } from "./components/Segmented";
import { Drill, type DrillSkill } from "./components/Drill";
import { useVoices } from "./lib/useVoices";
import { appVersion } from "./lib/tauri";
import { Unbuilt } from "./components/Unbuilt";
import { LanguageNote } from "./components/LanguageNote";

// Derived, not written out: these strings went stale the moment three
// languages became six.
/**
 * Suite convention: the chip shows only major.minor.patch, and any
 * pre-release or build suffix moves to the tooltip. That keeps the chip a
 * fixed width as releases run from 0.2.0-beta.2 to 1.3.1, so the header does
 * not reflow on a release.
 */
function shortVersion(v: string): string {
  return v.split(/[-+]/)[0] ?? v;
}

const COUNT_WORD = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve",
];
const spell = (n: number) => COUNT_WORD[n] ?? String(n);

export default function App() {
  const [upleb, setUpleb] = useState(false);
  const [langCode, setLangCode] = useState(LANGS[0]!.code);
  const [skill, setSkill] = useState<SkillId>("read");
  const [max, setMax] = useState(20);

  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    void appVersion().then(setVersion);
  }, []);

  const { voices, error: voiceError, loading: voicesLoading } = useVoices();
  const lang = LANGS.find((l) => l.code === langCode) ?? LANGS[0]!;
  const current = SKILLS.find((s) => s.id === skill)!;

  // Listening needs a host that can speak. Without one it is unbuilt in
  // practice, whatever the roster says, so say so rather than showing a mute
  // play button.
  const speechUnavailable = skill === "listen" && !voicesLoading && voiceError !== null;

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
        {/* Version chip, in the suite's format: short version on the face, the
            full string in the tooltip. Null outside the app, where there is no
            bundle to read it from. */}
        {version && (
          <span
            className="hidden md:inline-flex items-center px-2 py-1 rounded-md
                       bg-surface text-mauve font-mono text-xs shrink-0"
            title={`v${version}`}
          >
            v{shortVersion(version)}
          </span>
        )}
        <span className="text-xs text-muted hidden sm:inline">
          0–100 in {spell(LANGS.length)} languages
        </span>
      </header>

      <div className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-surface/60">
        <Segmented
          ariaLabel="Language"
          value={langCode}
          onChange={setLangCode}
          options={LANGS.map((l) => ({
            id: l.code,
            label: l.name.replace(" Chinese", ""),
            group: l.family,
          }))}
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
        <div className="w-full max-w-2xl m-auto space-y-4">
          <LanguageNote lang={lang} />
          {speechUnavailable ? (
            <Unbuilt label="Listening" heading="Listening needs the app" reason={voiceError ?? ""} />
          ) : current.ready ? (
            <Drill
              key={`${lang.code}-${skill}-${max}`}
              lang={lang}
              skill={skill as DrillSkill}
              max={max}
              voices={voices}
            />
          ) : (
            <Unbuilt label={current.label} reason={current.blocked ?? ""} />
          )}
        </div>
      </main>

      <footer className="px-5 py-3 border-t border-surface/60 text-xs text-muted">
        0–100 in {spell(LANGS.length)} languages. Read, write and listen; speaking is a long-term
        aim.
      </footer>
    </div>
  );
}
