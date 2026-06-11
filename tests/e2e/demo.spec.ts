import { expect, test } from "@playwright/test";

test("V2.6 cabinet refonte workflow", async ({ page }) => {
  await page.goto("/cabinet");

  await expect(page.getByRole("link", { name: "Accueil cabinet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dossiers" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Simuler", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Preuves & règles" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Revue", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accueil cabinet" })).toBeVisible();
  await expect(page.getByText("Dossier actif")).toBeVisible();
  await expect(page.getByText("Actions prioritaires").first()).toBeVisible();
  await expect(page.getByText("Alertes à revoir")).toBeVisible();
  await expect(page.getByText("Parcours testable cabinet")).toBeVisible();

  await page.getByRole("link", { name: "Dossiers" }).click();
  await expect(page.getByRole("heading", { name: "Dossiers", exact: true })).toBeVisible();
  await expect(page.getByText("Liste de dossiers démo")).toBeVisible();
  await expect(page.getByText("Dossier actif : Claire et Marc")).toBeVisible();
  await expect(page.getByText("Événements de vie")).toBeVisible();
  await expect(page.getByText("Préparer la retraite")).toBeVisible();

  await page.goto("/simulations?scenario=plus-value");
  await expect(page.getByRole("heading", { name: "Simuler" })).toBeVisible();
  await expect(page.getByText("Catalogue de simulations")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plus-value", exact: true })).toBeVisible();
  await expect(page.getByText("Donnée utilisée")).toBeVisible();
  await expect(page.getByText("Revue requise").first()).toBeVisible();

  await page.getByRole("link", { name: "Revue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revue" })).toBeVisible();
  await expect(page.getByText("Plus-value immobilière à qualifier")).toBeVisible();
  await expect(page.getByText("Pourquoi le produit ne conclut pas seul")).toBeVisible();

  await page.getByRole("link", { name: "Preuves & règles" }).click();
  await expect(page.getByRole("heading", { name: "Preuves & règles" })).toBeVisible();
  await expect(page.getByText("Table d'audit des preuves")).toBeVisible();
  await expect(page.getByText("Règles versionnées")).toBeVisible();

  await page.getByRole("link", { name: "Rapports" }).click();
  await expect(page.getByRole("heading", { name: "Rapports" })).toBeVisible();
  await expect(page.getByText("Synthèse client").first()).toBeVisible();
  await expect(page.getByText("Annexe conseiller").first()).toBeVisible();
  await expect(page.getByText("Pourquoi le produit ne conclut pas seul").first()).toBeVisible();
});

test("V3 conformité CGP : DER, lettre de mission, KYC et signature simulée", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/conformite-cgp");

  await expect(page.getByRole("heading", { name: "Documents réglementaires" })).toBeVisible();
  await expect(page.getByText("Document d'entrée en relation").first()).toBeVisible();
  await expect(page.getByText("Lettre de mission").first()).toBeVisible();
  await expect(page.getByText("Questionnaire de connaissance client (KYC)")).toBeVisible();
  await expect(page.getByText("Scoring de risque blanchiment")).toBeVisible();
  await expect(page.getByText("Cérémonie de signature")).toBeVisible();

  const signButtons = page.getByRole("button", { name: "Signer (simulé)" });
  await expect(signButtons.first()).toBeVisible();
  for (let index = 0; index < 3; index += 1) {
    await signButtons.first().click();
  }
  await expect(page.getByText("Signé (SES démo) et archivé")).toHaveCount(3);
});

test("V2.6 mobile layout has no horizontal overflow", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 1000 });

  for (const route of ["/cabinet", "/dossiers", "/simulations?scenario=plus-value", "/review", "/evidence", "/report"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  }
});
