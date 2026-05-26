import { expect, test } from "@playwright/test";

test("core demo workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Claire et Marc" })).toBeVisible();
  await expect(page.getByText("3 840 000 €")).toBeVisible();
  await expect(page.getByText("3 420 000 €")).toBeVisible();

  await page.getByRole("link", { name: "Simulations" }).click();
  await expect(page.getByRole("heading", { name: "Simulation IFI" }).first()).toBeVisible();
  await expect(page.getByText("1 110 000 €").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Service-Public" }).first()).toBeVisible();

  await page.getByLabel("Navigation principale").getByRole("link", { name: "Rapport" }).click();
  await expect(page.getByText(/Analyse indicative, à valider par un professionnel habilité/)).toBeVisible();
});
