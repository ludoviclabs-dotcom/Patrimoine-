import { expect, test } from "@playwright/test";

/**
 * PF-06B — cabinet report workflow.
 *
 * The authenticated journey (EXPERT: generate → validate → download, and
 * CLIENT: validate denied) requires a real Clerk test instance, a seeded
 * managed PostgreSQL tenant and a private Blob store. None of those exist in
 * the local harness, so that part is skipped explicitly rather than faked with
 * a stubbed session — a stub would prove nothing about the real authorization
 * chain, which is what these steps are meant to exercise.
 *
 * Enable by exporting E2E_CLERK_FIXTURE=1 together with the credentials listed
 * in docs/agent/PF06_SERVER_REPORT.md.
 */

const clerkFixtureAvailable = process.env.E2E_CLERK_FIXTURE === "1";

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

test.describe("Rapport cabinet — parcours authentifié", () => {
  test.skip(
    !clerkFixtureAvailable,
    "SKIPPED — REAL AUTH FIXTURE REQUIRED: instance Clerk de test, PostgreSQL managé et Blob privé.",
  );

  test("EXPERT : générer, valider puis télécharger le rapport", async ({ page }) => {
    await page.goto("/report");

    await page.getByLabel(/Date de gel juridique/).fill("2026-08-18");
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Générer le brouillon serveur|Régénérer un brouillon/ }).click();

    await expect(page.getByText("BROUILLON")).toBeVisible();

    await page.getByLabel(/Commentaire/).fill("Conclusions vérifiées.");
    await page.getByRole("button", { name: /Valider le rapport final/ }).click();

    await expect(page.getByText("VALIDÉ")).toBeVisible();
    await expect(page.getByText(/Empreinte snapshot/)).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Télécharger le PDF privé/ }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("CLIENT : la validation est refusée", async ({ page }) => {
    await page.goto("/report");

    await expect(page.getByRole("button", { name: /Valider le rapport final/ })).toHaveCount(0);
  });
});
