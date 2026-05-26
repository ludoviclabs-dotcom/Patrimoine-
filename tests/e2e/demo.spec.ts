import { expect, test } from "@playwright/test";

test("core V2 cabinet workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Claire et Marc" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cockpit cabinet V2" })).toBeVisible();
  await expect(page.getByText("Moteur fiscal sourcé pour cabinets")).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer un dossier", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Dossiers" }).click();
  await expect(page.getByRole("heading", { name: "Dossiers cabinet" })).toBeVisible();
  await page.getByRole("button", { name: "Créer le dossier depuis l'onboarding" }).click();
  await expect(page.getByText("Famille dirigeante exemple")).toBeVisible();
  await page.getByRole("button", { name: "Instancier" }).first().click();
  await expect(page.getByText("Dossier créé en mode démo")).toBeVisible();
  await expect(page.getByText("Dossier vivant")).toBeVisible();

  await page.getByRole("link", { name: "Simulations" }).click();
  await expect(page.getByRole("heading", { name: "Simulations fiscales cabinet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "IR / PFU / CDHR" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Pacte Dutreil/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Taxe holding/ })).toBeVisible();
  await page.getByRole("button", { name: "Lancer le scénario" }).click();
  await expect(page.getByText(/Scénario .* lancé/)).toBeVisible();
  await page.getByRole("button", { name: "Pourquoi ce résultat ?" }).click();
  await expect(page.getByText("Données utilisées")).toBeVisible();

  await page.getByRole("link", { name: "Preuves" }).click();
  await expect(page.getByRole("heading", { name: "Preuves & conformité" })).toBeVisible();
  await expect(page.getByText("LF 2026 art. 7 : taxe holding patrimoniale")).toBeVisible();
  await expect(page.getByText("IR, PFU 30/31,4 % et CDHR")).toBeVisible();

  await page.getByRole("link", { name: "Rapports" }).click();
  await expect(page.getByRole("heading", { name: "Rapport cabinet V2" })).toBeVisible();
  await expect(page.getByText("Rapport cabinet fiscal evidence-first")).toBeVisible();
  await expect(page.getByText("Documents cabinet préparés")).toBeVisible();
  await expect(page.getByText(/Aucun conseil fiscal ou juridique définitif/i)).toBeVisible();
});

test("mobile V2 navigation and report stay readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/cabinet");

  await expect(page.getByRole("link", { name: "Cockpit" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dossiers" })).toBeVisible();
  await expect(page.getByText("Cockpit cabinet V2")).toBeVisible();

  await page.getByRole("link", { name: "Dossiers" }).click();
  await expect(page.getByText("Onboarding 90 secondes")).toBeVisible();

  await page.getByRole("link", { name: "Rapports" }).first().click();
  await expect(page.getByText(/Simulation indicative/i)).toBeVisible();
  await expect(page.getByText(/validé par : non validé/i)).toBeVisible();
});
