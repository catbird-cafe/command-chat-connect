#!/usr/bin/env bash
# Install dependencies for the Command Chat CLI (run from anywhere).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Command Chat CLI installer"
echo "    Directory: $SCRIPT_DIR"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed or not on PATH."
  echo "       Install Node.js 18 or newer: https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node.js 18+ required (found $(node --version))."
  exit 1
fi

echo "==> Node $(node --version), npm $(npm --version)"
echo "==> Installing npm dependencies ..."
npm install

chmod +x cli-client.js 2>/dev/null || true

echo ""
echo "Done."
echo ""
echo "Run all CLI commands from this directory:"
echo "  cd \"$SCRIPT_DIR\""
echo ""
echo "Examples:"
echo "  REGISTER_URL=\"<your-register-url>\" node cli-client.js <token>"
echo "  node cli-client.js"
echo "  SUPABASE_URL=... SUPABASE_ANON_KEY=... node cli-client.js <name>"
echo ""
