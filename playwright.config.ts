import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // PF-07: obtains the Clerk Testing Token when the authenticated fixture is
  // enabled; a no-op otherwise, so the public suite needs no credential.
  globalSetup: "./tests/e2e/global-setup.ts",
  // The authenticated journeys share one dossier and advance its report
  // versions, so both browser projects would otherwise interleave generation
  // and validation on the same rows. Serialising the whole run keeps the state
  // machine deterministic; the public suite keeps its default parallelism.
  workers: process.env.E2E_CLERK_FIXTURE === "1" ? 1 : undefined,
  fullyParallel: process.env.E2E_CLERK_FIXTURE !== "1",
  // Le serveur e2e tourne en `next dev` : les routes lourdes compilent à la
  // demande au premier accès. Marges élargies pour absorber cette latence.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
