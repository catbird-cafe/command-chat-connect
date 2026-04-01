#!/usr/bin/env node
/**
 * Copy CLI files into public/ so the dev server and production host serve:
 *   /install-cli.sh
 *   /cli-client/{cli-client.js,package.json,package-lock.json}
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const destDir = path.join(root, "public", "cli-client");

fs.mkdirSync(destDir, { recursive: true });

for (const f of ["cli-client.js", "package.json", "package-lock.json"]) {
  const src = path.join(root, "client", f);
  if (!fs.existsSync(src)) {
    console.warn(`sync-cli-public: skip missing ${src}`);
    continue;
  }
  fs.copyFileSync(src, path.join(destDir, f));
}

const installerSrc = path.join(root, "scripts", "install-cli-remote.sh");
const installerDest = path.join(root, "public", "install-cli.sh");
fs.copyFileSync(installerSrc, installerDest);
fs.chmodSync(installerDest, 0o755);

console.log("sync-cli-public: public/install-cli.sh + public/cli-client/*");
