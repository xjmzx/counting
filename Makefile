PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
LIBDIR ?= $(PREFIX)/share/counting

SOURCES := compose.ts types.ts golden.ts grade.ts

.PHONY: help deps data crosscheck soundcheck scriptcheck speechcheck speechprobe clips clipcheck cliptrim clipclean record typecheck version check dev web build table stats emit install install-app uninstall clean

help:
	@echo "Targets:"
	@echo "  make data       golden forms, invariants, grading — NO install needed"
	@echo "  make check      data + typecheck + cargo test      (needs 'make deps')"
	@echo "  make crosscheck compare every form against ICU        [macOS only]"
	@echo "  make soundcheck verify pronunciation rules by audio   [macOS only]"
	@echo "  make scriptcheck does each voice read its script?     [macOS only]"
	@echo "  make speechcheck what this machine can speak, and why  [any platform]"
	@echo "  make speechprobe L=ja  does that voice read the script? [any platform]"
	@echo "  make clips       render Japanese clips locally         [macOS only]"
	@echo "  make record L=en record a language\047s clips by voice     [any platform]"
	@echo "  make record L=en N=39,40  record just those, over what is kept"
	@echo "  make clipcheck L=en  level and length of every clip, outliers named"
	@echo "  make cliptrim L=en   re-trim saved clips (APPLY=1 to write)"
	@echo "  make clipclean L=en  re-encode clips, dropping any metadata"
	@echo "  make dev        run the app with hot reload"
	@echo "  make web        frontend only in a browser, no Tauri"
	@echo "  make build      release build of frontend + app bundle"
	@echo "  make table      print all 303 forms side by side"
	@echo "  make stats      atom counts and irregularity coverage"
	@echo "  make emit       regenerate numbers.json and numbers.tsv"
	@echo ""
	@echo "  Two different installs. They are not alternatives:"
	@echo "  make install-app  the .app -> /Applications, for a Dock or"
	@echo "                    Spotlight shortcut                     [macOS only]"
	@echo "  make install      the 'counting' CLI -> PREFIX/bin, terminal only"
	@echo "  make uninstall    remove the CLI (not the .app)"
	@echo "  make deps       npm install + cargo fetch"
	@echo "  make version V=0.3.0   bump the version in all five files at once"
	@echo "  make clean      remove node_modules, dist and src-tauri/target"

deps:
	npm install
	cd src-tauri && cargo fetch

# The data layer's own check. No dependencies — Node strips the types itself,
# so this runs on a bare clone.
data:
	node compose.ts check

typecheck:
	npm run typecheck

# Independent verification: ICU's spell-out is a separate implementation of the
# same three languages. Kept out of 'check' because Foundation is macOS-only,
# and because a difference here needs a human, not a red build.
crosscheck:
	node tools/crosscheck.ts

# Speaks each rule's word and its alternative spelling and compares the audio.
# Reports rather than fails: a mismatch means no clean probe exists, not that
# the rule is wrong. macOS-only, like crosscheck.
soundcheck:
	node tools/soundcheck.ts

# Renders several distinct atoms per language and compares their durations. A
# voice with no dictionary for a script emits one fixed fallback per character,
# so a flat spread across different words is proof it is not reading them —
# which is how espeak-ng's missing kanji dictionary was caught on Linux. Like
# soundcheck: reports, never fails a build, and one-way (a varied spread is not
# proof of a correct reading). Validated against espeak-ng, where Japanese
# spreads 0.00 and every other language 0.15 or more.
# Reports what the app itself sees — same detection, same parser, same locale
# mapping — rather than a script that could agree with the app while both were
# wrong. On Linux it answers whether an open-jtalk install is visible, and so
# whether Japanese is offered.
speechcheck:
	cd src-tauri && cargo run --quiet --example speechcheck

# Recorded clips are preferred over synthesis. These are gitignored and
# generated locally; clips/README.md has the licensing question that gates
# committing them.
clips:
	bash tools/make-clips.sh ja Kyoko

# Record a human saying each number. Interactive by nature: Enter starts, Enter
# stops, Enter keeps. Resumes wherever it left off.
# Rebuilds each clip from its samples, so LIST/INFO metadata — an artist, a
# date, the software that made it — has nowhere to survive. Idempotent.
clipcheck:
	@test -n "$(L)" || { echo "usage: make clipcheck L=en" >&2; exit 2; }
	node tools/check-clips.ts $(L)

cliptrim:
	@test -n "$(L)" || { echo "usage: make cliptrim L=en [APPLY=1]" >&2; exit 2; }
	node tools/trim-clips.ts $(L) $(if $(APPLY),apply,)

clipclean:
	@test -n "$(L)" || { echo "usage: make clipclean L=en" >&2; exit 2; }
	node tools/clean-clips.ts $(L)

record:
	@test -n "$(L)" || { echo "usage: make record L=en [N=39,40]" >&2; exit 2; }
	node tools/record-clips.ts $(L) $(N)

# The cross-platform half of scriptcheck. That one measures rendered files with
# afinfo and is macOS-only; speech-dispatcher will not write audio to disk, so
# this times the blocking utterance instead. Same question: a voice with no
# dictionary for a script cannot vary its length.
speechprobe:
	@L=$${L:-ja}; \
	words=$$(node --input-type=module -e "import { LANGS } from './src/lib/langs.ts'; \
	  const l = LANGS.find((x) => x.code === '$$L'); \
	  if (!l) { console.error('unknown language: $$L'); process.exit(1); } \
	  console.log([0, 1, 3, 5, 10, 100].map((n) => l.compose(n).form).join(' '));") && \
	cd src-tauri && cargo run --quiet --example speechcheck -- --probe $$L $$words

scriptcheck:
	node tools/scriptcheck.ts

# The suite's 'make check' shape: everything that can fail without running.
# cargo test rather than cargo check — it compiles the same and also runs the
# tts voice-line parser tests, which cargo check would silently skip.
check: data typecheck
	cd src-tauri && cargo test

dev:
	npm run tauri dev

# The two built drills are pure frontend, so they can be exercised without
# building any Rust. The unbuilt two are the ones that will need it.
web:
	npm run dev

build:
	npm run tauri build

table:
	node compose.ts table

stats:
	node compose.ts stats

emit:
	node compose.ts emit

# The CLI, not the app. No install-guard, unlike the Tauri repos: this target
# ships no bundle and no .desktop entry, so it is correct on both platforms.
# Depends on 'data' rather than 'check' so installing the CLI needs no toolchain.
install: data
	install -d $(BINDIR) $(LIBDIR) $(LIBDIR)/lang
	install -m 0644 $(SOURCES) $(LIBDIR)/
	install -m 0644 lang/zh.ts lang/fr.ts lang/de.ts $(LIBDIR)/lang/
	@printf '%s\n' \
	  '#!/bin/sh' \
	  '# Installed by counting'"'"'s Makefile. Edit the repo, not this file.' \
	  'set -e' \
	  'command -v node >/dev/null 2>&1 || { echo "counting: node not found" >&2; exit 1; }' \
	  'major=$$(node --version | sed "s/^v//; s/\..*//")' \
	  'if [ "$$major" -lt 23 ]; then' \
	  '  echo "counting: needs Node 23+ to run TypeScript directly (found $$(node --version))" >&2' \
	  '  exit 1' \
	  'fi' \
	  'exec node "$(LIBDIR)/compose.ts" "$$@"' \
	  > $(BINDIR)/counting
	chmod 0755 $(BINDIR)/counting
	@echo "installed to $(PREFIX)"
	@echo "  command -> $(BINDIR)/counting"
	@echo "  sources -> $(LIBDIR)/"
	@echo "  this is the CLI only — for the app, run 'make install-app'"
	@command -v counting >/dev/null 2>&1 || echo "  note: $(BINDIR) is not on your PATH"

# The .app, not the CLI. Needs a full `tauri build` — `make build` alone
# produces a bundle but does not place it, quit the old copy, or relaunch.
install-app:
	bash ./install.sh

uninstall:
	rm -f $(BINDIR)/counting
	rm -rf $(LIBDIR)
	@echo "uninstalled the CLI from $(PREFIX)"
	@echo "  the .app, if installed, is at /Applications/counting.app"

# Five files carry the version and they must move together, or the chip in the
# header disagrees with the bundle. Borrowed from nplay unchanged.
version:
	@test -n "$(V)" || { echo "usage: make version V=0.3.0" >&2; exit 2; }
	@npm version --no-git-tag-version --allow-same-version "$(V)" >/dev/null
	@sed -i.bak -E 's/^version = ".*"/version = "$(V)"/' src-tauri/Cargo.toml && rm -f src-tauri/Cargo.toml.bak
	@python3 -c 'import re,sys; v=sys.argv[1]; p="src-tauri/tauri.conf.json"; s=open(p).read(); s2,k=re.subn(r"^(  \"version\"\s*:\s*)\"[^\"]*\"", lambda m: m.group(1)+"\""+v+"\"", s, count=1, flags=re.M); open(p,"w").write(s2) if k==1 else sys.exit("no top-level version key in "+p)' "$(V)"
	@name=$$(grep -m1 '^name = ' src-tauri/Cargo.toml | cut -d'"' -f2); python3 -c 'import re,sys; n,v=sys.argv[1],sys.argv[2]; p="src-tauri/Cargo.lock"; s=open(p).read(); s2,k=re.subn(r"(\[\[package\]\]\nname = \""+re.escape(n)+r"\"\nversion = )\"[^\"]*\"", lambda m: m.group(1)+"\""+v+"\"", s, count=1); open(p,"w").write(s2) if k==1 else sys.exit("no Cargo.lock entry for "+n)' "$$name" "$(V)"
	@echo "version set to $(V) in all five places:"
	@git diff --stat -- package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json

clean:
	rm -rf node_modules dist src-tauri/target
