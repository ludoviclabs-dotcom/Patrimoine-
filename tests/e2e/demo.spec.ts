import { expect, test } from "@playwright/test";

test("core V1.2 demo workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Claire et Marc" })).toBeVisible();
  await expect(page.getByText("3 840 000 €")).toBeVisible();
  await expect(page.getByText("3 420 000 €")).toBeVisible();

  await page.getByRole("link", { name: "Cabinet" }).click();
  await expect(page.getByRole("heading", { name: "Portail cabinet V1.1" })).toBeVisible();
  await expect(page.getByText("Completude du dossier")).toBeVisible();
  await expect(page.getByText("Documents prives")).toBeVisible();
  await expect(page.getByText("CRON_SECRET")).toBeVisible();

  await page.getByRole("link", { name: "Workflow" }).click();
  await expect(page.getByRole("heading", { name: "Workflow métier réel" })).toBeVisible();
  await page.getByRole("button", { name: "Creer dossier" }).click();
  await expect(page.getByText("Dossier cree")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer actif" }).click();
  await expect(page.getByText("Actif enregistre")).toBeVisible();
  await page.getByRole("button", { name: "Lancer simulation persistee" }).click();
  await expect(page.getByText(/Run replayable/)).toBeVisible();
  await page.getByRole("button", { name: "Rejouer simulation" }).click();
  await expect(page.getByText("Simulation replay")).toBeVisible();

  await page.getByRole("link", { name: "Simulations" }).click();
  await expect(page.getByRole("heading", { name: "Simulation IFI" }).first()).toBeVisible();
  await expect(page.getByText("1 110 000 €").first()).toBeVisible();
  await page.getByRole("button", { name: "Pourquoi ce resultat ?" }).click();
  await expect(page.getByText("Donnees utilisees")).toBeVisible();

  await page.getByRole("link", { name: "Admin preuve" }).click();
  await expect(page.getByRole("heading", { name: "Admin règles et sources" })).toBeVisible();
  await page.getByRole("button", { name: "Controler sources" }).click();
  await expect(page.getByText("Aucune action requise.").first()).toBeVisible();

  await page.getByRole("link", { name: "Pilotage" }).click();
  await expect(page.getByRole("heading", { name: "Produit pilote" })).toBeVisible();
  await expect(page.getByText("Script commercial 7 minutes")).toBeVisible();

  await page.getByLabel("Navigation principale").getByRole("link", { name: "Rapport" }).click();
  await expect(page.getByText(/Statut indicatif/i)).toBeVisible();
  await expect(page.getByText(/valide par : non valide/i)).toBeVisible();
  await expect(page.getByText(/Limites de couverture/i)).toBeVisible();
});

test("mobile V1.2 pages keep visible navigation and report status", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/cabinet");

  await expect(page.getByRole("link", { name: "Workflow" })).toBeVisible();
  await expect(page.getByText("Completude du dossier")).toBeVisible();

  await page.getByRole("link", { name: "Pilotage" }).click();
  await expect(page.getByText("3 cas pilote cabinet")).toBeVisible();

  await page.getByRole("link", { name: "Rapport" }).first().click();
  await expect(page.getByText(/Rapport Patrimoine & Fiscalite/i)).toBeVisible();
  await expect(page.getByText(/Aucun conseil fiscal ou juridique definitif/i)).toBeVisible();
});
