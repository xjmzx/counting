#!/bin/bash
# Build counting and install it to /Applications, then relaunch. macOS only.
#
#   ./install.sh               # build (release) + quit + install + relaunch
#   ./install.sh --skip-build  # reinstall the last build without rebuilding
#
# Or via npm:  npm run install:app
# Or via make: make install-app
#
# Note the two different installs in this repo, which are not alternatives:
#
#   make install    the `counting` CLI -> ~/.local/bin. Terminal only. No bundle,
#                   no icon, nothing the Dock or Spotlight will show.
#   ./install.sh    the .app -> /Applications. This is the one you want a
#                   shortcut to.
#
# The app needs a full `tauri build`; there is no shortcut through `make build`.
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "install.sh is macOS-only (installs a .app to /Applications)." >&2
  echo "On Linux, build with: make build" >&2
  exit 1
fi

APP_NAME="counting.app"
BUILT="src-tauri/target/release/bundle/macos/$APP_NAME"

if [[ "${1:-}" != "--skip-build" ]]; then
  # `npm run tauri` resolves the CLI out of node_modules/.bin, so on a fresh
  # clone this fails with "tauri: command not found" — which reads like a
  # missing global tool rather than "you have not installed deps yet".
  if [[ ! -x node_modules/.bin/tauri ]]; then
    echo "--- Installing npm dependencies (first build here) ---"
    npm install
  fi
  # The data layer is cheap to check and the app is worthless if it is wrong.
  echo "--- Checking the composer ---"
  node compose.ts check
  echo "--- Building counting (release) ---"
  npm run tauri build
fi

if [[ ! -d "$BUILT" ]]; then
  echo "No built app at $BUILT — run without --skip-build first." >&2
  exit 1
fi

echo "--- Quitting running counting (if any) ---"
# Both, unconditionally. Chaining these with || means the force-kill is skipped
# whenever osascript merely *returns* success, which it does even when it
# quit nothing — leaving a `make dev` debug build running alongside the copy
# this script is about to launch. Two windows, one of them stale.
osascript -e 'quit app "counting"' 2>/dev/null || true
sleep 1
pkill -x counting 2>/dev/null || true
sleep 1

echo "--- Installing to /Applications ---"
rm -rf "/Applications/$APP_NAME"
cp -R "$BUILT" "/Applications/$APP_NAME"

echo "--- Relaunching ---"
open "/Applications/$APP_NAME"

VER=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' \
  "/Applications/$APP_NAME/Contents/Info.plist" 2>/dev/null || echo "?")
echo "Installed + relaunched: /Applications/$APP_NAME (v$VER)"
