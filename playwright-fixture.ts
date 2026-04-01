import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Prefer Lovable’s fixture when the package is present; otherwise use @playwright/test. */
export const { test, expect } = (() => {
  try {
    return require("lovable-agent-playwright-config/fixture");
  } catch {
    return require("@playwright/test");
  }
})();
