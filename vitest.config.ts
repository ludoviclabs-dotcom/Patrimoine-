import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Mirrors the `@/*` path alias declared in tsconfig.json.
 *
 * Without it a test cannot import an application route handler, so the
 * signature/authorization chain could only be re-implemented in the test —
 * which would prove the copy, not the code that actually runs.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
