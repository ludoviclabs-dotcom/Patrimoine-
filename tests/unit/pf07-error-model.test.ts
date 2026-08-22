import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeError,
  errorCatalog,
  isKnownErrorCode,
} from "../../lib/errors/error-catalog";
import { buildBlockers, describeUnavailable } from "../../lib/report/report-console";

/**
 * PF-07 — the frontend must not turn a precise server refusal into a generic
 * message, and it must not invent one either.
 *
 * The first test is the one that matters over time: it reads the real status
 * map the API routes use, so adding a server code without a user-facing
 * explanation fails here rather than shipping as "Action impossible".
 */

function serverErrorCodes(): readonly string[] {
  const source = readFileSync(join(process.cwd(), "lib/documents/runtime.ts"), "utf8");
  const table = source.slice(source.indexOf("const statusByCode"), source.indexOf("/**\n * Maps a domain failure"));
  return [...table.matchAll(/^\s*([A-Z][A-Z0-9_]+):\s*\d{3},/gm)].map((match) => match[1]);
}

describe("PF-07 — error catalog coverage", () => {
  it("reads a non-trivial set of codes from the API status map", () => {
    // Guards the extraction itself: a silent regex miss would make the
    // coverage test below pass vacuously.
    expect(serverErrorCodes().length).toBeGreaterThan(30);
  });

  it("gives every server error code a title, an explanation and a next action", () => {
    const missing = serverErrorCodes().filter((code) => !isKnownErrorCode(code));
    expect(missing, `codes sans entrée utilisateur : ${missing.join(", ")}`).toEqual([]);
  });

  it("never leaves an entry without usable wording", () => {
    for (const [code, entry] of Object.entries(errorCatalog)) {
      expect(entry.title.trim(), code).not.toBe("");
      expect(entry.explanation.trim(), code).not.toBe("");
      expect(entry.nextAction.trim(), code).not.toBe("");
    }
  });

  it("keeps every message free of interpolation, so no tenant data can leak into it", () => {
    for (const [code, entry] of Object.entries(errorCatalog)) {
      for (const text of [entry.title, entry.explanation, entry.nextAction]) {
        expect(text, code).not.toMatch(/\$\{|%s|\{\{/);
      }
    }
  });

  it("never names another cabinet's data in a cross-tenant refusal", () => {
    for (const code of ["TENANT_OWNERSHIP_VIOLATION", "REPORT_DOSSIER_NOT_ACCESSIBLE",
      "DOCUMENT_BLOB_KEY_TENANT_MISMATCH", "REPORT_BLOB_KEY_TENANT_MISMATCH"]) {
      const descriptor = describeError(code);
      // A refusal states the resource is out of scope; it must not confirm or
      // deny that it exists somewhere else.
      expect(descriptor.explanation).not.toMatch(/appartient à|autre cabinet .* nommé|existe dans/i);
      expect(descriptor.explanation).toMatch(/périmètre|cabinet de votre session/i);
    }
  });

  it("keeps an unknown code visible instead of rewriting it", () => {
    const descriptor = describeError("SOME_FUTURE_CODE");
    expect(descriptor.code).toBe("SOME_FUTURE_CODE");
    expect(descriptor.nextAction).toContain("code");
  });
});

describe("PF-07 — report console uses the catalog", () => {
  it("names the cause and the next action when the pipeline is unavailable", () => {
    const unavailable = describeUnavailable("TENANT_MEMBERSHIP_REQUIRED");

    expect(unavailable.code).toBe("TENANT_MEMBERSHIP_REQUIRED");
    expect(unavailable.title).toBe("Adhésion révoquée");
    expect(unavailable.nextAction).toMatch(/administrateur/i);
  });

  it("gives every blocker its own code and its own next action", () => {
    const blockers = buildBlockers({
      legalFreezeDate: null,
      selectedRunIds: [],
      readiness: null,
      readinessErrorCode: null,
      freshness: null,
      storageConfigured: false,
      downloadSecretConfigured: false,
    });

    expect(blockers.length).toBeGreaterThan(0);
    for (const blocker of blockers) {
      expect(blocker.code).not.toBe("");
      expect(blocker.nextAction.trim()).not.toBe("");
    }

    const codes = blockers.map((blocker) => blocker.code);
    // Distinct causes stay distinct: nothing is merged into one message.
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("REPORT_LEGAL_FREEZE_DATE_REQUIRED");
    expect(codes).toContain("REPORT_SIMULATION_RUN_REQUIRED");
    expect(codes).toContain("BLOB_READ_WRITE_TOKEN_REQUIRED");
    expect(codes).toContain("DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED");
  });

  it("keeps a stale report blocking and offers regeneration rather than rewriting", () => {
    const [blocker] = buildBlockers({
      legalFreezeDate: "2026-08-18",
      selectedRunIds: ["run-1"],
      readiness: null,
      readinessErrorCode: null,
      freshness: {
        reportVersionId: "version-1",
        status: "outdated",
        snapshotBusinessSha256: "a".repeat(64),
        currentBusinessSha256: "b".repeat(64),
        changedSections: ["reviewFlags"],
        reasonCode: "REPORT_REGENERATION_REQUIRED",
        reason: "Les faits du dossier ont changé.",
      },
      storageConfigured: true,
      downloadSecretConfigured: true,
    });

    expect(blocker.code).toBe("REPORT_REGENERATION_REQUIRED");
    expect(blocker.severity).toBe("blocking");
    expect(blocker.nextAction).toMatch(/[Rr]égénérez/);
  });

  it("keeps an unreadable dossier blocking under its own technical code", () => {
    const blockers = buildBlockers({
      legalFreezeDate: "2026-08-18",
      selectedRunIds: ["run-1"],
      readiness: null,
      readinessErrorCode: "TENANT_MEMBERSHIP_REQUIRED",
      freshness: null,
      storageConfigured: true,
      downloadSecretConfigured: true,
    });

    const unreadable = blockers.find((blocker) => blocker.code === "TENANT_MEMBERSHIP_REQUIRED");
    expect(unreadable?.severity).toBe("blocking");
    expect(unreadable?.title).toBe("Faits du dossier illisibles");
    // The catalog still supplies the remedy for the underlying cause.
    expect(unreadable?.nextAction).toMatch(/adhésion/i);
  });
});
