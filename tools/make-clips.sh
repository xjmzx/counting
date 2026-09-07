#!/bin/bash
# Render a language's numbers to clips/<lang>/<n>.wav using macOS `say`.
#
#   bash tools/make-clips.sh ja Kyoko
#
# These are a stopgap, not the destination. The clip mechanism exists for
# recordings by people who speak the language; synthesised clips are here
# because espeak-ng cannot read kanji at all, so on Linux the choice for
# Japanese is a clip or nothing.
#
# WAV at 22 kHz mono, because `afplay`, `paplay` and `aplay` all decode it with
# nothing installed. A clip needing a codec is a clip that silently fails.
set -euo pipefail
cd "$(dirname "$0")/.."

lang="${1:-}"; voice="${2:-}"
if [[ -z "$lang" || -z "$voice" ]]; then
  echo "usage: bash tools/make-clips.sh <lang> <voice>   e.g. ja Kyoko" >&2
  exit 2
fi
if [[ "$(uname)" != "Darwin" ]]; then
  echo "make-clips is macOS-only: it renders with \`say\`." >&2
  echo "Recorded clips from a speaker of the language need no tool — just drop" >&2
  echo "22 kHz mono WAVs into clips/$lang/<n>.wav." >&2
  exit 1
fi
if ! say -v '?' | grep -q "^$voice "; then
  echo "No voice called '$voice'. \`say -v '?'\` lists them." >&2
  exit 1
fi

mkdir -p "clips/$lang"
node --input-type=module -e "
import { LANGS } from './src/lib/langs.ts';
const l = LANGS.find((x) => x.code === '$lang');
if (!l) { console.error('unknown language: $lang'); process.exit(1); }
for (let n = 0; n <= 100; n++) console.log(n + '\t' + l.compose(n).form);
" | while IFS=$'\t' read -r n form; do
  say -v "$voice" -o "clips/$lang/$n.wav" --data-format=LEI16@22050 "$form"
done

count=$(ls "clips/$lang"/*.wav 2>/dev/null | wc -l | tr -d ' ')
echo "wrote $count clips to clips/$lang/ ($(du -sh "clips/$lang" | cut -f1)) with $voice"
echo "These are gitignored. See clips/README.md for why."
