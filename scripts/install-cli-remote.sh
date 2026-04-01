#!/usr/bin/env bash
# Install Command Chat CLI by downloading assets from your app’s URL.
# Creates ./client in the directory where you run curl (or INSTALL_DIR), then npm installs there.
# Served at /install-cli.sh on the same host as the web app.
set -euo pipefail

# Usage (run from whatever folder you want the client/ folder created in):
#   curl -fsSL https://<host>/install-cli.sh | bash -s -- https://<host>
#   curl -fsSL http://localhost:8080/install-cli.sh | bash -s -- http://localhost:8080
#
# Override install location:
#   INSTALL_DIR=/path/to/dir curl -fsSL ... | bash -s -- https://<host>

ORIGIN="${1:-${INSTALLER_ORIGIN:-}}"
if [ -z "${ORIGIN}" ]; then
  echo "Pass the app origin (same base URL as in the browser, no trailing slash)."
  echo ""
  echo "  curl -fsSL https://example.com/install-cli.sh | bash -s -- https://example.com"
  echo ""
  echo "Or set INSTALLER_ORIGIN before piping to bash."
  exit 1
fi

ORIGIN="${ORIGIN%/}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js 18+ is required. Install from https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node.js 18+ required (found $(node --version))."
  exit 1
fi

INVOKED_FROM="$(pwd)"
TARGET_DIR="${INSTALL_DIR:-$INVOKED_FROM/client}"
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

echo "==> Command Chat CLI"
echo "    App origin: $ORIGIN"
echo "    Install directory: $TARGET_DIR"
echo "    (curl was run from: $INVOKED_FROM)"
echo ""

echo "==> Downloading CLI assets ..."
curl -fsSL "$ORIGIN/cli-client/package.json" -o package.json
curl -fsSL "$ORIGIN/cli-client/package-lock.json" -o package-lock.json
curl -fsSL "$ORIGIN/cli-client/cli-client.js" -o cli-client.js
chmod +x cli-client.js

echo "==> npm install (Node $(node --version), npm $(npm --version)) ..."
npm install

echo ""
echo "Done."
echo ""
echo "Run from this directory:"
echo "  cd \"$TARGET_DIR\""
echo ""
echo "  REGISTER_URL=\"<your-edge-function-register-url>\" node cli-client.js <token>"
echo "  node cli-client.js"
echo ""
