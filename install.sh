#!/usr/bin/env bash
#
# install.sh — Build the CLI and make `imbrace` available globally.
#
# Usage:
#   ./install.sh
#
# What it does:
#   1. Installs CLI dependencies (npm install)
#   2. Builds TypeScript (npm run build)
#   3. Links the binary globally (npm link)
#   4. Symlinks to /opt/homebrew/bin (Apple Silicon) or /usr/local/bin (Intel)
#      so the command works in any shell — including conda envs that don't
#      include nvm in their PATH.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$SCRIPT_DIR/cli"

cd "$CLI_DIR"

echo "──── 1. Install dependencies ────"
if command -v bun >/dev/null 2>&1; then
  bun install
else
  npm install
fi

echo ""
echo "──── 2. Build TypeScript ────"
npm run build

echo ""
echo "──── 3. Link CLI globally (npm link) ────"
npm link

IMBRACE_PATH="$(command -v imbrace || true)"
if [ -z "$IMBRACE_PATH" ]; then
  echo "❌ npm link failed: 'imbrace' command not found"
  exit 1
fi
echo "→ npm link target: $IMBRACE_PATH"

echo ""
echo "──── 4. Symlink to system PATH (cross-shell) ────"
# Pick a system path that's in PATH for every shell (including conda)
if [ -d "/opt/homebrew/bin" ]; then
  TARGET_DIR="/opt/homebrew/bin"
elif [ -d "/usr/local/bin" ]; then
  TARGET_DIR="/usr/local/bin"
else
  echo "⚠️  Skipping system symlink — no /opt/homebrew/bin or /usr/local/bin found"
  TARGET_DIR=""
fi

if [ -n "$TARGET_DIR" ]; then
  if [ -w "$TARGET_DIR" ]; then
    ln -sf "$IMBRACE_PATH" "$TARGET_DIR/imbrace"
  else
    sudo ln -sf "$IMBRACE_PATH" "$TARGET_DIR/imbrace"
  fi
  echo "→ symlinked $TARGET_DIR/imbrace"
fi

echo ""
echo "──── 5. Verify ────"
imbrace --version

echo ""
echo "✅ Done. Try:"
echo "   imbrace login --api-key api_xxx..."
echo "   imbrace ai-agent list --json"
