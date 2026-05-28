import { expect, test } from "@playwright/test";

test("core V2 cabinet workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Claire et Marc" })).toBeVisible();
  await expect(page.getByText("Démo cabinet 7 minutes")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Un dossier fiscal guidé, sourcé et prêt pour revue professionnelle." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuer le dossier", exact: true })).toBeVisible();
  await expect(page.getByText("Qualification → Hypothèses → Simulation → Preuves → Rapport").first()).toBeVisible();
  await expect(page.getByText("31,4 %", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("1 680 €", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Revue expert", { exact: true })).toBeVisible();
  await expect(page.getByText("Revue requise").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. Qualifier le dossier et les hypothèses" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. Comprendre l'alerte PFU 2026" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Montrer les limites avant le rapport" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diff réglementaire PFU" })).toBeVisible();
  await expect(page.getByText("30 % vers 31,4 %").first()).toBeVisible();
  await expect(page.getByText("Impact dossier").first()).toBeVisible();
  await expect(page.getByText("Recalcul requis").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Piste d'audit métier" })).toBeVisible();
  await expect(page.getByText("review_required")).toHaveCount(0);
  await expect(page.getByText("needs_professional_review")).toHaveCount(0);
  await expect(page.getByText("not_covered_v1")).toHaveCount(0);
  await expect(page.getByText("Matrice de maturité")).toBeVisible();
  await expect(page.getByText("Fondations prêtes").first()).toBeVisible();
  await expect(page.getByText("Cas pilote ultra propres")).toBeVisible();

  await page.getByRole("link", { name: "Continuer le dossier", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dossiers cabinet" })).toBeVisible();
  await page.getByRole("button", { name: "Créer le dossier depuis l'onboarding" }).click();
  await expect(page.getByRole("textbox", { name: "Nom du foyer" })).toHaveValue("Famille dirigeante exemple");
  await page.getByRole("button", { name: "Instancier" }).first().click();
  await expect(page.getByText("Dossier créé en mode démo")).toBeVisible();
  await expect(page.getByText("Dossier vivant")).toBeVisible();

  await page.getByRole("link", { name: "Simulations" }).click();
  await expect(page.getByRole("heading", { name: "Simulations fiscales cabinet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Laboratoire de simulation paramétrable" })).toBeVisible();
  await page.getByRole("button", { name: "Dutreil", exact: true }).click();
  await page.getByLabel("Actifs somptuaires exclus").fill("40000");
  await page.getByRole("button", { name: "Lancer avec ces hypothèses" }).click();
  await expect(page.getByText("Scénario recalculé depuis les hypothèses saisies")).toBeVisible();
  await expect(page.getByText("Actifs exclus ou non affectés")).toBeVisible();
  await page.getByRole("button", { name: "Taxe holding", exact: true }).click();
  await expect(page.getByText("Inventaire taxable indicatif")).toBeVisible();
  await expect(page.getByRole("heading", { name: "IR / PFU / CDHR" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Pacte Dutreil/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Taxe holding", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lancer le scénario" }).click();
  await expect(page.getByText(/Scénario .* lancé/)).toBeVisible();
  await expect(page.getByText("Données utilisées")).toBeVisible();

  await page.getByRole("link", { name: "Preuves" }).click();
  await expect(page.getByRole("heading", { name: "Preuves & conformité" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diff réglementaire PFU" })).toBeVisible();
  await expect(page.getByText("PFU-2025.12 : taux global 30 %")).toBeVisible();
  await expect(page.getByText("Impact dossier : Claire et Marc")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Piste d'audit métier" })).toBeVisible();
  await expect(page.getByText("Recalcul requis").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /LF 2026 art\. 7 : taxe holding/ })).toBeVisible();
  await expect(page.getByText("IR, PFU 30/31,4 % et CDHR")).toBeVisible();
  await expect(page.getByText("Snapshots offline contrôlés")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Matrice de maturité" })).toBeVisible();

  await page.getByRole("link", { name: "Voir conformité RGPD / IA" }).click();
  await expect(page.getByRole("heading", { name: "Registre RGPD pilote" })).toBeVisible();
  await expect(page.getByText("Destinataires : cabinet, professionnel habilite")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AIPD / DPIA" })).toBeVisible();

  await page.getByRole("link", { name: "Rapports" }).click();
  await expect(page.getByRole("heading", { name: "Rapport cabinet V2" })).toBeVisible();
  await expect(page.getByText("Rapport cabinet fiscal evidence-first")).toBeVisible();
  await expect(page.getByText("Indicatif non validé")).toBeVisible();
  await expect(page.getByText("Hypothèses saisies par le conseiller")).toBeVisible();
  await expect(page.getByText("Cas non couverts / revue obligatoire")).toBeVisible();
  await expect(page.getByText("Résumé audit PFU")).toBeVisible();
  await expect(page.getByText("Bloc validation et signature future")).toBeVisible();
  await expect(page.getByText("Documents cabinet préparés")).toBeVisible();
  await expect(page.getByText(/Aucun conseil fiscal ou juridique définitif/i)).toBeVisible();
});

test("mobile V2 navigation and report stay readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/cabinet");

  await expect(page.getByRole("link", { name: "Cockpit" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dossiers" })).toBeVisible();
  await expect(page.getByText("Parcours de rendez-vous")).toBeVisible();
  await expect(page.getByText("Qualification → Hypothèses → Simulation → Preuves → Rapport").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. Comprendre l'alerte PFU 2026" })).toBeVisible();
  await expect(page.getByText("Revue requise").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.getByRole("link", { name: "Dossiers" }).click();
  await expect(page.getByText("Onboarding 90 secondes")).toBeVisible();

  await page.getByRole("link", { name: "Rapports" }).first().click();
  await expect(page.getByRole("heading", { name: "Rapport cabinet V2" })).toBeVisible();
  await expect(page.getByText(/validé par : non validé/i)).toBeVisible();
});
