PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
LIBDIR ?= $(PREFIX)/share/counting

SOURCES := compose.ts types.ts golden.ts grade.ts

.PHONY: help deps data typecheck check dev web build table stats emit install uninstall clean

help:
	@echo "Targets:"
	@echo "  make data       golden forms, invariants, grading — NO install needed"
	@echo "  make check      data + typecheck + cargo check     (needs 'make deps')"
	@echo "  make dev        run the app with hot reload"
	@echo "  make web        frontend only in a browser, no Tauri"
	@echo "  make build      release build of frontend + app bundle"
	@echo "  make table      print all 303 forms side by side"
	@echo "  make stats      atom counts and irregularity coverage"
	@echo "  make emit       regenerate numbers.json and numbers.tsv"
	@echo "  make install    put the 'counting' CLI on PATH under PREFIX"
	@echo "                  (the app bundle comes from 'make build', not this)"
	@echo "  make uninstall  remove the CLI"
	@echo "  make deps       npm install + cargo fetch"
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

# The suite's 'make check' shape: everything that can fail without running.
check: data typecheck
	cd src-tauri && cargo check

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
	@command -v counting >/dev/null 2>&1 || echo "  note: $(BINDIR) is not on your PATH"

uninstall:
	rm -f $(BINDIR)/counting
	rm -rf $(LIBDIR)
	@echo "uninstalled from $(PREFIX)"

clean:
	rm -rf node_modules dist src-tauri/target
