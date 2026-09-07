PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
LIBDIR ?= $(PREFIX)/share/counting

SOURCES := compose.ts types.ts golden.ts

.PHONY: help deps check typecheck table stats emit install uninstall clean

help:
	@echo "Targets:"
	@echo "  make check      golden forms + invariants (no install needed)"
	@echo "  make typecheck  tsc --noEmit               (needs 'make deps')"
	@echo "  make table      print all 303 forms side by side"
	@echo "  make stats      atom counts and irregularity coverage"
	@echo "  make emit       regenerate numbers.json and numbers.tsv"
	@echo "  make install    put a 'counting' command on PATH under PREFIX"
	@echo "                  (default PREFIX=\$$HOME/.local; works on macOS and Linux)"
	@echo "  make uninstall  remove what 'install' put down"
	@echo "  make deps       npm install (typescript + @types/node only)"
	@echo "  make clean      remove node_modules"

deps:
	npm install

# The real check. Runs on a bare clone with no install — there are no deps.
check:
	node compose.ts check

typecheck:
	npx tsc --noEmit

table:
	node compose.ts table

stats:
	node compose.ts stats

emit:
	node compose.ts emit

# No install-guard here, unlike the Tauri repos: there is no bundle and no
# .desktop entry to get wrong. It is Node running TypeScript, identically on
# both platforms.
install: check
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
	rm -rf node_modules
