import { expect, test, type Page } from "@playwright/test";

/**
 * PF-07 — responsive audit of the cabinet routes.
 *
 * A patrimonial console is read on a laptop and checked on a phone between
 * meetings, so horizontal scrolling of the page body is a defect, not a
 * cosmetic detail: it hides amounts, hashes and actions.
 *
 * The rule enforced here is narrow on purpose. Wide content — tables, ledgers,
 * long SHA-256 fingerprints — is allowed to scroll, but only inside its own
 * container. The page itself must never scroll sideways.
 */

const widths = [375, 390, 430, 768, 1024, 1440] as const;

const routes = [
  "/cabinet",
  "/dossiers",
  "/simulations",
  "/simulations/lab",
  "/evidence",
  "/review",
  "/report",
] as const;

type Overflow = Readonly<{
  documentOverflow: number;
  offenders: ReadonlyArray<{ tag: string; testLabel: string; width: number; right: number }>;
}>;

async function measureOverflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders: Array<{ tag: string; testLabel: string; width: number; right: number }> = [];

    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      // An element allowed to scroll on its own axis is not a page defect.
      const scrollable = ["auto", "scroll"].includes(style.overflowX);
      if (scrollable) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right <= viewport + 1) continue;

      // Report only the outermost offender of a subtree: a wide parent makes
      // every descendant look wide too, which buries the actual cause.
      const parent = element.parentElement;
      if (parent && parent.getBoundingClientRect().right > viewport + 1) continue;

      offenders.push({
        tag: element.tagName.toLowerCase(),
        testLabel: (element.className || "").toString().slice(0, 90),
        width: Math.round(rect.width),
        right: Math.round(rect.right),
      });
    }

    return {
      documentOverflow: document.documentElement.scrollWidth - viewport,
      offenders: offenders.slice(0, 8),
    };
  });
}

test.describe("PF-07 — parcours cabinet responsive", () => {
  // The audit drives its own viewport, so one browser project is enough.
  // Both projects run chromium, so the project name is what distinguishes them.
  test.beforeEach(({ }, testInfo) => {
    testInfo.skip(testInfo.project.name !== "chromium", "viewport-driven audit runs once");
  });

  for (const route of routes) {
    test(`${route} ne déborde horizontalement à aucune largeur`, async ({ page }) => {
      const failures: string[] = [];

      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        const { documentOverflow, offenders } = await measureOverflow(page);
        if (documentOverflow > 1) {
          failures.push(
            `${width}px: page scrolls ${documentOverflow}px sideways`
            + (offenders.length
              ? ` — ${offenders.map((o) => `${o.tag}.${o.testLabel} (w=${o.width}, right=${o.right})`).join(" | ")}`
              : ""),
          );
        }
      }

      expect(failures, `${route}\n${failures.join("\n")}`).toEqual([]);
    });
  }

  test("les cibles tactiles principales restent atteignables en 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/cabinet");
    await page.waitForLoadState("networkidle");

    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(navigation).toBeVisible();

    const links = await navigation.getByRole("link").all();
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const box = await link.boundingBox();
      // 44px is the accessible minimum for a primary touch target.
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
