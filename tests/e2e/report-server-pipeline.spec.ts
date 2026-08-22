import { expect, test } from "@playwright/test";

/**
 * PF-06B — cabinet report workflow, unauthenticated surface.
 *
 * The authenticated journeys (adviser generate, expert validate and download,
 * client denied, cross-tenant denied, revocation) moved to
 * tests/e2e/authenticated-cabinet.spec.ts in PF-07, where they run against a
 * real Clerk session and a real database instead of being skipped.
 *
 * What remains here is the property that must hold with no session at all: the
 * browser preview is never presented as the deliverable, and an unavailable
 * server pipeline is named rather than hidden.
 */

test.describe("Rapport cabinet — surface publique", () => {
  test("le rapport final n'est jamais présenté comme un PDF navigateur", async ({ page }) => {
    await page.goto("/report");

    await expect(page.getByRole("heading", { name: "Rapports", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Aperçu de travail — NON FINAL/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Imprimer l'aperçu \(non final\)/ })).toBeVisible();
  });

  test("l'indisponibilité du pipeline serveur est explicite, jamais masquée", async ({ page }) => {
    await page.goto("/report");

    // Sans session Clerk ni base managée, la page nomme la cause exacte.
    const unavailable = page.getByText(/pipeline serveur indisponible/i);
    const serverConsole = page.getByText(/Rapport cabinet — pipeline serveur/);

    await expect(unavailable.or(serverConsole).first()).toBeVisible();
  });
});
