import { createRequire } from "node:module";
import { defineConfig, devices } from "@playwright/test";

const require = createRequire(import.meta.url);

function defaultConfig() {
  return defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    use: {
      baseURL: "http://127.0.0.1:8080",
      trace: "on-first-retry",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
      command: "npm run dev",
      url: "http://127.0.0.1:8080",
      reuseExistingServer: !process.env.CI,
    },
  });
}

/** Prefer Lovable’s config when the package is present (e.g. synced from Lovable); otherwise use the local default. */
function getConfig() {
  try {
    const { createLovableConfig } = require("lovable-agent-playwright-config/config");
    return createLovableConfig({});
  } catch {
    return defaultConfig();
  }
}

export default getConfig();
