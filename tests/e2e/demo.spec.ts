import { expect, test } from "@playwright/test";

test("core V1.1 demo workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Claire et Marc" })).toBeVisible();
  await expect(page.getByText("3 840 000 €")).toBeVisible();
  await expect(page.getByText("3 420 000 €")).toBeVisible();

  await page.getByRole("link", { name: "Cabinet" }).click();
  await expect(page.getByRole("heading", { name: "Portail cabinet V1.1" })).toBeVisible();
  await expect(page.getByText("Completude du dossier")).toBeVisible();
  await expect(page.getByText("72%")).toBeVisible();
  await expect(page.getByText("Radar de vigilance")).toBeVisible();
  await expect(page.getByText("Timeline patrimoniale")).toBeVisible();

  await page.getByRole("link", { name: "Simulations" }).click();
  await expect(page.getByRole("heading", { name: "Simulation IFI" }).first()).toBeVisible();
  await expect(page.getByText("1 110 000 €").first()).toBeVisible();
  await page.getByRole("button", { name: "Pourquoi ce resultat ?" }).click();
  await expect(page.getByText("Donnees utilisees")).toBeVisible();
  await expect(page.getByRole("link", { name: /Impot sur la fortune immobiliere/i })).toBeVisible();

  await page.getByRole("link", { name: "Sources" }).click();
  await expect(page.getByRole("heading", { name: "Evidence Center V1.1" })).toBeVisible();
  await page.getByLabel("Autorite").selectOption("service-public");
  await expect(page.getByText("rule-ifi-simplified-2026-v1").first()).toBeVisible();

  await page.getByRole("link", { name: "Scenarios" }).click();
  await expect(page.getByRole("heading", { name: "Comparateur de scenarios" }).first()).toBeVisible();
  await page.getByRole("button", { name: /Donation simple/ }).click();
  await expect(page.getByText("Validation necessaire")).toBeVisible();

  await page.getByLabel("Navigation principale").getByRole("link", { name: "Rapport" }).click();
  await expect(page.getByText(/Statut indicatif/i)).toBeVisible();
  await expect(page.getByText(/valide par : non valide/i)).toBeVisible();
  await expect(page.getByText(/Limites de couverture/i)).toBeVisible();
});

test("mobile V1.1 pages keep visible navigation and report status", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/cabinet");

  await expect(page.getByRole("link", { name: "Simulations" })).toBeVisible();
  await expect(page.getByText("Completude du dossier")).toBeVisible();

  await page.getByRole("link", { name: "Rapport" }).first().click();
  await expect(page.getByText(/Rapport Patrimoine & Fiscalite/i)).toBeVisible();
  await expect(page.getByText(/Aucun conseil fiscal ou juridique definitif/i)).toBeVisible();
});
