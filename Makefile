.PHONY: help deps check typecheck table stats emit clean

help:
	@echo "Targets:"
	@echo "  make check      golden forms + invariants (no install needed)"
	@echo "  make typecheck  tsc --noEmit               (needs 'make deps')"
	@echo "  make table      print all 303 forms side by side"
	@echo "  make stats      atom counts and irregularity coverage"
	@echo "  make emit       regenerate numbers.json and numbers.tsv"
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

clean:
	rm -rf node_modules
