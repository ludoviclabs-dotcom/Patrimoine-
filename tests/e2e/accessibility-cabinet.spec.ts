import { expect, test, type Page } from "@playwright/test";

/**
 * PF-07 — keyboard and assistive-technology audit of the cabinet routes.
 *
 * A cabinet console is a professional tool used all day, often without a
 * mouse. These checks are deliberately mechanical: an unnamed control, an
 * invisible focus ring or a dialog that traps a keyboard user are defects that
 * a screenshot review never catches.
 */

const routes = [
  "/cabinet",
  "/dossiers",
  "/simulations",
  "/evidence",
  "/review",
  "/report",
] as const;

/** Controls with no accessible name, which a screen reader announces as blank. */
async function unnamedControls(page: Page) {
  return page.evaluate(() => {
    const offenders: Array<{ tag: string; classes: string }> = [];
    const selector = "a[href], button, input, select, textarea, [role='button'], [role='link']";

    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>(selector))) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (element.getAttribute("aria-hidden") === "true") continue;
      if (element.hasAttribute("disabled")) continue;

      const labelledBy = element.getAttribute("aria-labelledby");
      const labelledText = labelledBy
        ? labelledBy.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
        : "";
      const associatedLabel = element.id
        ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent ?? ""
        : "";
      const wrappingLabel = element.closest("label")?.textContent ?? "";

      const name = [
        element.getAttribute("aria-label"),
        labelledText,
        associatedLabel,
        wrappingLabel,
        element.getAttribute("title"),
        element.getAttribute("alt"),
        (element as HTMLInputElement).placeholder,
        element.textContent,
      ].map((value) => (value ?? "").trim()).find(Boolean);

      if (!name) {
        offenders.push({
          tag: element.tagName.toLowerCase(),
          classes: (element.className || "").toString().slice(0, 80),
        });
      }
    }

    return offenders;
  });
}

test.describe("PF-07 — accessibilité du parcours cabinet", () => {
  test.beforeEach(({ }, testInfo) => {
    testInfo.skip(testInfo.project.name !== "chromium", "keyboard audit runs once");
  });

  for (const route of routes) {
    test(`${route} : chaque contrôle porte un nom accessible`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const offenders = await unnamedControls(page);
      expect(
        offenders,
        `${route} — contrôles sans nom accessible : ${JSON.stringify(offenders)}`,
      ).toEqual([]);
    });

    test(`${route} : une seule structure de titre principale`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Exactly one h1 keeps the document outline usable for screen readers.
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }

  test("le lien d'évitement amène le focus au contenu principal", async ({ page }) => {
    await page.goto("/cabinet");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /Aller au contenu principal/ });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("le focus clavier reste visible sur la navigation principale", async ({ page }) => {
    await page.goto("/cabinet");
    await page.waitForLoadState("networkidle");

    const link = page.getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link").first();
    await link.focus();

    const focusRing = await link.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      };
    });

    const visible = (focusRing.outlineStyle !== "none" && parseFloat(focusRing.outlineWidth) > 0)
      || (focusRing.boxShadow !== "none" && focusRing.boxShadow.length > 0);
    expect(visible, `focus indicator: ${JSON.stringify(focusRing)}`).toBe(true);
  });

  test("la palette de commandes piège le focus et se ferme avec Échap", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/cabinet");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("ControlOrMeta+k");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Focus must land inside the dialog, not stay behind it.
    const focusInside = await page.evaluate(() => {
      const active = document.activeElement;
      const openDialog = document.querySelector("[role='dialog']");
      return Boolean(active && openDialog && openDialog.contains(active));
    });
    expect(focusInside).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("le mouvement est réduit quand l'utilisateur le demande", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cabinet");
    await page.waitForLoadState("networkidle");

    const respected = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(respected).toBe(true);

    // No element may keep an indefinite animation running under reduced motion.
    const looping = await page.evaluate(() =>
      Array.from(document.body.querySelectorAll<HTMLElement>("*"))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return style.animationIterationCount === "infinite"
            && style.animationName !== "none"
            && style.animationPlayState === "running";
        })
        .map((element) => (element.className || "").toString().slice(0, 60)));

    expect(looping, `animations infinies sous reduced-motion : ${JSON.stringify(looping)}`).toEqual([]);
  });
});
