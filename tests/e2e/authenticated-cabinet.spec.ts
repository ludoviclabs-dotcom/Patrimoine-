import { expect, test, type Page } from "@playwright/test";
import {
  clerkFixtureEnabled,
  signInAs,
  withE2EAdminDatabase,
} from "./support/clerk-fixture";
import { e2eFixtureRole } from "../../lib/auth/e2e-fixture-plan";

/**
 * PF-07 — the authenticated cabinet journeys PF-06C4 had to leave BLOCKED.
 *
 * Every assertion below runs against a real Clerk session, a real PostgreSQL
 * database with FORCE RLS, a NOBYPASSRLS runtime login and the real RBAC
 * capability matrix. Nothing is stubbed and no security control is relaxed to
 * make a journey pass: where a role is refused, the refusal is the assertion.
 *
 * Enable with E2E_CLERK_FIXTURE=1 after `npm run e2e:fixture -- provision`.
 */

const dossierA = "44444444-4444-4444-8444-444444444444";

// Captured by the expert journey. The describe block is serial, and a client
// deliberately cannot see a report version at all, so the identifier the
// direct-call test needs can only come from a cabinet role.
let validatedVersionId: string | null = null;

/** Reads the console's machine-readable state rather than its prose. */
function consoleState(page: Page) {
  return page.locator("[data-report-console]");
}

async function reportVersionId(page: Page) {
  return consoleState(page).getAttribute("data-report-version-id");
}

test.describe("PF-07 — parcours cabinet authentifié", () => {
  test.skip(
    !clerkFixtureEnabled,
    "SKIPPED — set E2E_CLERK_FIXTURE=1 and provision the synthetic Clerk identities.",
  );

  // The journeys share one dossier and mutate its report versions, so they run
  // in declaration order rather than concurrently.
  test.describe.configure({ mode: "serial" });

  test("ADVISER_A : dossier résolu, preuves et génération du brouillon serveur", async ({ page }) => {
    await signInAs(page, "E2E_ADVISER_A");
    await page.goto("/report");

    // The server pipeline is live: the unavailable card must not be shown.
    await expect(consoleState(page)).toBeVisible();
    await expect(page.getByText(/pipeline serveur indisponible/i)).toHaveCount(0);

    // Tenant resolution reached CABINET_A, its internal role and its dossier.
    await expect(consoleState(page)).toHaveAttribute("data-report-role", "conseiller");
    await expect(consoleState(page)).toHaveAttribute("data-report-dossier", "DOS-CLAIRE-MARC-2026");

    // The journey states where the file stands, from server facts.
    const journey = page.locator("[data-cabinet-journey]");
    await expect(journey).toBeVisible();
    // The reference appears in the heading and again in the qualification
    // stage detail; the heading is the one that names the current dossier.
    await expect(journey.getByRole("heading", { name: /DOS-CLAIRE-MARC-2026/ })).toBeVisible();
    for (const stage of ["qualification", "hypotheses", "simulation", "preuves", "revue", "rapport"]) {
      await expect(page.locator(`[data-journey-step="${stage}"]`)).toBeVisible();
    }
    // Each stage reports a real state, never a placeholder. The exact stage
    // reached depends on what the dossier already holds, so the invariant is
    // asserted rather than one particular position: whenever the journey names
    // an open stage, it also names what to do about it.
    const states = await page.locator("[data-journey-step]").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.journeyState ?? ""));
    expect(states).toHaveLength(6);
    for (const state of states) {
      expect(["done", "active", "blocked", "review", "todo"]).toContain(state);
    }

    const activeStage = await journey.getAttribute("data-journey-active");
    if (activeStage) {
      await expect(page.locator("[data-journey-next-action]")).toBeVisible();
      await expect(page.locator(`[data-journey-step="${activeStage}"]`))
        .not.toHaveAttribute("data-journey-state", "done");
    }

    await page.getByLabel(/Date de gel juridique/).fill("2026-08-18");
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Générer le brouillon serveur|Régénérer un brouillon/ })
      .click();

    await expect(consoleState(page)).toHaveAttribute("data-report-status", "draft", {
      timeout: 90_000,
    });
    // A draft is watermarked and is explicitly not remittable.
    await expect(page.getByText(/BROUILLON — NON VALIDÉ/)).toBeVisible();
    await expect(page.getByText(/Empreinte snapshot/)).toBeVisible();

    // With a run retained, the stages that depend on it resolve from the
    // seeded facts, and the draft leaves the report stage in progress.
    await expect(page.locator('[data-journey-step="simulation"]'))
      .toHaveAttribute("data-journey-state", "done");
    await expect(page.locator('[data-journey-step="preuves"]'))
      .toHaveAttribute("data-journey-state", "done");
    await expect(page.locator('[data-journey-step="revue"]'))
      .toHaveAttribute("data-journey-state", "done");
    await expect(page.locator('[data-journey-step="rapport"]'))
      .toHaveAttribute("data-journey-state", "active");

    // A conseiller holds report.download, so the private download is offered.
    await expect(page.getByRole("button", { name: /Télécharger le PDF privé/ })).toBeVisible();
    // A conseiller does not hold report.validate; the action must not exist.
    await expect(page.getByRole("button", { name: /Valider le rapport final/ })).toHaveCount(0);
  });

  test("EXPERT_A : validation professionnelle puis téléchargement privé", async ({ page }) => {
    await signInAs(page, "E2E_EXPERT_A");
    await page.goto("/report");

    await expect(consoleState(page)).toHaveAttribute("data-report-role", "expert");
    await expect(consoleState(page)).toHaveAttribute("data-report-status", "draft");
    const draftVersionId = await reportVersionId(page);

    await page.getByLabel(/Commentaire/).fill("Conclusions vérifiées par l'expert E2E.");
    await page.getByRole("button", { name: /Valider le rapport final/ }).click();

    await expect(consoleState(page)).toHaveAttribute("data-report-status", "validated", {
      timeout: 90_000,
    });

    // Validation appends a new version; the reviewed draft is never mutated.
    expect(await reportVersionId(page)).not.toBe(draftVersionId);
    // A validated version carries no watermark; that is what distinguishes it.
    await expect(page.getByText(/BROUILLON — NON VALIDÉ/)).toHaveCount(0);
    await expect(page.getByText(/Version validée, sans filigrane/)).toBeVisible();
    // Every stage is now finished, so no stop is advertised.
    await expect(page.locator('[data-journey-step="rapport"]'))
      .toHaveAttribute("data-journey-state", "done");
    await expect(page.locator("[data-cabinet-journey]"))
      .toHaveAttribute("data-journey-active", "");

    validatedVersionId = await reportVersionId(page);

    const download = page.waitForEvent("download", { timeout: 90_000 });
    await page.getByRole("button", { name: /Télécharger le PDF privé/ }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("CLIENT_A : lecture du dossier accordé, aucune action cabinet offerte", async ({ page }) => {
    await signInAs(page, "E2E_CLIENT_A");
    await page.goto("/report");

    // The client holds dossier.read and an explicit grant on this dossier.
    await expect(consoleState(page)).toHaveAttribute("data-report-role", "client");
    await expect(consoleState(page)).toHaveAttribute("data-report-dossier", "DOS-CLAIRE-MARC-2026");

    // report.validate and report.generate are absent from the client row of the
    // capability matrix, so neither action is rendered.
    await expect(page.getByRole("button", { name: /Valider le rapport final/ })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Générer le brouillon serveur|Régénérer un brouillon/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Télécharger le PDF privé/ })).toHaveCount(0);

    // Reports are not client resources: the version validated moments ago in
    // the same dossier is not merely hidden, it is not loaded for this role.
    await expect(consoleState(page)).toHaveAttribute("data-report-version-id", "");
    await expect(consoleState(page)).toHaveAttribute("data-report-status", "none");
  });

  test("CLIENT_A : report.validate appelé directement est refusé par le serveur", async ({ page }) => {
    await signInAs(page, "E2E_CLIENT_A");
    await page.goto("/report");

    expect(validatedVersionId, "the expert journey must have produced a version").toBeTruthy();

    // Hiding a button is UX; the refusal has to come from the server.
    const response = await page.request.post(
      `/api/v1/reports/versions/${validatedVersionId}/validation`,
      { data: { decision: "approved", comment: "Tentative client." } },
    );

    expect(response.status()).toBe(403);
    expect((await response.json()).error).toBe("TENANT_AUTHORIZATION_DENIED");
  });

  test("EXPERT_B : le dossier de CABINET_A reste invisible, même par URL directe", async ({ page }) => {
    await signInAs(page, "E2E_EXPERT_B");

    // Cabinet B sees only its own dossier.
    await page.goto("/report");
    await expect(consoleState(page)).toHaveAttribute("data-report-dossier", "DOS-B-E2E");

    // Asking for cabinet A's dossier by id never falls back to another one.
    await page.goto(`/report?dossier=${dossierA}`);
    await expect(consoleState(page)).not.toHaveAttribute("data-report-dossier", "DOS-CLAIRE-MARC-2026");
    await expect(consoleState(page)).toHaveAttribute("data-report-status", "none");
  });

  test("EXPERT_B : les routes rapport de CABINET_A répondent en refus", async ({ page }) => {
    await signInAs(page, "E2E_EXPERT_B");
    await page.goto("/report");

    // Listing a foreign dossier answers 200 with nothing, by design: a 404 would
    // disclose whether that dossier exists. What must never happen is data.
    const versions = await page.request.get(`/api/v1/reports/cases/${dossierA}/versions`);
    expect(versions.status()).toBe(200);
    expect((await versions.json()).data).toEqual([]);

    expect(validatedVersionId).toBeTruthy();

    // Reaching a known cabinet A version by id is refused outright.
    const download = await page.request.get(
      `/api/v1/reports/versions/${validatedVersionId}/download`,
    );
    expect(download.status()).not.toBe(200);
    expect((await download.json()).error).toBe("REPORT_VERSION_NOT_FOUND");

    const validation = await page.request.post(
      `/api/v1/reports/versions/${validatedVersionId}/validation`,
      { data: { decision: "approved", comment: "Tentative cabinet B." } },
    );
    expect(validation.status()).not.toBe(200);

    // Generating into another cabinet's dossier is refused too.
    const generate = await page.request.post(`/api/v1/reports/cases/${dossierA}/versions`, {
      data: { simulationRunIds: ["e2e1a000-0000-4000-8000-0000000000a1"], legalFreezeDate: "2026-08-18" },
    });
    expect(generate.status()).not.toBe(201);
  });

  test("Identité inconnue : appartenir à l'organisation Clerk n'autorise rien", async ({ page }) => {
    // A genuine Clerk member of the organization with no internal row at all.
    // PF-04A's central claim is that the identity provider grants nothing on
    // its own; PostgreSQL remains the authority.
    await signInAs(page, "E2E_UNKNOWN_A");
    await page.goto("/report");

    await expect(consoleState(page)).toHaveCount(0);
    await expect(page.getByText("CLERK_TENANT_CONTEXT_DENIED")).toBeVisible();
    // The refusal names the cause and what to do, without leaking any dossier.
    await expect(page.getByText(/Compte non rattaché à un cabinet/)).toBeVisible();
    await expect(page.getByText(/Prochaine action/)).toBeVisible();
    await expect(page.getByText("DOS-CLAIRE-MARC-2026")).toHaveCount(0);
    await expect(page.getByText("DOS-B-E2E")).toHaveCount(0);

    // The API refuses it too: hiding the console is not the control.
    const versions = await page.request.get(`/api/v1/reports/cases/${dossierA}/versions`);
    expect(versions.status()).toBe(401);
    expect((await versions.json()).error).toBe("CLERK_TENANT_CONTEXT_DENIED");
  });

  test("Membership révoquée : la session Clerk reste valide, l'accès ne l'est plus", async ({ page }) => {
    const adviser = e2eFixtureRole("E2E_ADVISER_A");

    await signInAs(page, "E2E_ADVISER_A");
    await page.goto("/report");
    await expect(consoleState(page)).toHaveAttribute("data-report-dossier", "DOS-CLAIRE-MARC-2026");

    try {
      // PostgreSQL is the authorization authority, not Clerk. Revoking here
      // leaves the browser holding a perfectly valid Clerk session.
      await withE2EAdminDatabase(async (sql) => {
        await sql`
          update memberships set status = 'disabled', revoked_at = now()
          where user_identity_id = ${adviser.identityId}
        `;
      });

      // The Clerk session is untouched: the browser still holds its session
      // cookie. Asserting the cookie rather than window.Clerk keeps this
      // independent of when the Clerk script happens to hydrate.
      const sessionCookies = await page.context().cookies();
      expect(sessionCookies.some((cookie) => cookie.name === "__session")).toBe(true);

      await page.goto("/report");
      // resolve_clerk_context now returns nothing, so the console cannot open
      // and the reason is named rather than silently showing an empty cabinet.
      await expect(page.getByText(/pipeline serveur indisponible/i)).toBeVisible();
      await expect(page.getByText("CLERK_TENANT_CONTEXT_DENIED")).toBeVisible();
      await expect(consoleState(page)).toHaveCount(0);
    } finally {
      await withE2EAdminDatabase(async (sql) => {
        await sql`
          update memberships set status = 'active', revoked_at = null
          where user_identity_id = ${adviser.identityId}
        `;
      });
    }

    // Restoring the membership restores access with the same session.
    await page.goto("/report");
    await expect(consoleState(page)).toHaveAttribute("data-report-dossier", "DOS-CLAIRE-MARC-2026");
  });
});
