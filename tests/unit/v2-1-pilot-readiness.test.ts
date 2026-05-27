import { describe, expect, it } from "vitest";
import { getAuditRepositoryContract } from "../../lib/audit/repository";
import { v21PilotSeedPlan } from "../../lib/db/seed-v2-1";
import { controlOfflineEvidenceSources, hashCanonicalContent } from "../../lib/evidence/offline-control";
import {
  buildDataExportBundle,
  createDataDeletionRequest,
  createDataExportRequest,
  createPrivateDocumentMetadata,
  getPrivateDocumentMetadataFixture,
  getRepositoryReadinessReport,
  getRetentionPolicy,
} from "../../lib/repositories/pilot-readiness";
import { getV2TaxRuns } from "../../lib/tax/v2-engines";
import { assertSimulationHasProof, getGoldenCases, reviewGoldenCase } from "../../lib/validation/golden-cases";

describe("V2.1 pilot readiness without external connectors", () => {
  it("declares repository readiness while staying safe without connectors", () => {
    const readiness = getRepositoryReadinessReport();

    expect(readiness.safeWithoutConnectors).toBe(true);
    expect(readiness.mode).toBe("demo-fixtures");
    expect(readiness.persistenceTarget).toBe("postgres");
    expect(readiness.tablesReady).toContain("data_requests");
    expect(readiness.tablesReady).toContain("golden_cases");
    expect(readiness.externalConnectorsRequired).toEqual([
      "DATABASE_URL",
      "BLOB_READ_WRITE_TOKEN",
      "auth_provider",
    ]);
  });

  it("keeps private document metadata private by construction", () => {
    const fixture = getPrivateDocumentMetadataFixture();
    const created = createPrivateDocumentMetadata({ label: "Contrat de prêt - métadonnée privée" });

    expect(fixture.visibility).toBe("private");
    expect(fixture.allowPublicUrl).toBe(false);
    expect(created.metadata.storageProvider).toBe("demo-private-metadata");
    expect(created.audit.dbContract.allowedOperation).toBe("insert_only");
  });

  it("builds RGPD export and deletion requests without external storage", () => {
    const request = createDataExportRequest();
    const bundle = buildDataExportBundle(request);
    const deletion = createDataDeletionRequest();
    const retention = getRetentionPolicy();

    expect(request.status).toBe("completed");
    expect(bundle.sections.client.id).toBe("client-claire-marc");
    expect(bundle.sections.simulations.length).toBe(getV2TaxRuns().length);
    expect(bundle.limitations.join(" ")).toContain("Blob privé");
    expect(deletion.status).toBe("queued");
    expect(retention.deletionRequiresProfessionalApproval).toBe(true);
  });

  it("keeps audit persistence append-only", () => {
    const contract = getAuditRepositoryContract();

    expect(contract.table).toBe("audit_logs");
    expect(contract.allowedOperation).toBe("insert_only");
    expect(contract.forbiddenOperations).toEqual(["update", "delete"]);
  });

  it("creates golden cases with proof metadata for every V2 tax run", () => {
    const runs = getV2TaxRuns();
    const cases = getGoldenCases();

    expect(cases).toHaveLength(runs.length);
    expect(cases.every((goldenCase) => goldenCase.validationStatus === "pending_professional_review")).toBe(true);
    expect(runs.every((run) => assertSimulationHasProof(run))).toBe(true);
    expect(reviewGoldenCase(cases[0].id, "professionally_reviewed").validationStatus).toBe(
      "professionally_reviewed",
    );
  });

  it("controls offline evidence snapshots deterministically", () => {
    const hash = hashCanonicalContent("contenu canonique");
    const snapshots = controlOfflineEvidenceSources();
    const statuses = new Set(snapshots.map((snapshot) => snapshot.status));

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(statuses.has("unchanged")).toBe(true);
    expect(statuses.has("changed")).toBe(true);
    expect(snapshots.every((snapshot) => snapshot.sourceId && snapshot.recommendedAction)).toBe(true);
  });

  it("documents a Postgres seed plan without executing a connector", () => {
    expect(v21PilotSeedPlan.migration).toBe("drizzle/0002_v2_1_pilot_readiness.sql");
    expect(v21PilotSeedPlan.readinessTables).toContain("offline_evidence_snapshots");
  });
});
