import { describe, expect, it } from "vitest";
import { appendAuditEventToRepository } from "../../lib/audit/repository";
import { demoClients, demoDocuments, demoCases, getDemoUser } from "../../lib/demo-data/v1";
import { evidenceSources, sourceSnapshots } from "../../lib/evidence/sources";
import {
  buildRuleDiffImpact,
  compareSnapshotHash,
  controlEvidenceSource,
  createControlledSnapshot,
  hashSourceContent,
} from "../../lib/evidence/source-control";
import {
  assertCronSecretPolicy,
  assertPrivateDocumentPolicy,
  canAccessCaseRecord,
  canAccessDocument,
  canManageEvidence,
  getDocumentUploadPolicy,
} from "../../lib/security/access-control";
import {
  createDemoAsset,
  createDemoCase,
  decideProfessionalReview,
  generateReportVersion,
  persistIfiSimulation,
  replaySimulation,
} from "../../lib/workflow/case-workflow";

describe("V1.2 security, workflow and evidence", () => {
  it("enforces strict client case access by tenant and client user", () => {
    const clientUser = getDemoUser("client");
    const expert = getDemoUser("expert");
    const client = demoClients[0];
    const clientCase = demoCases[0];

    expect(canAccessCaseRecord(clientUser, clientCase, client)).toBe(true);
    expect(canAccessCaseRecord(expert, clientCase, client)).toBe(true);
    expect(canAccessCaseRecord({ ...clientUser, id: "other-client" }, clientCase, client)).toBe(false);
    expect(canAccessDocument(clientUser, demoDocuments[0], client)).toBe(true);
  });

  it("keeps document uploads private by default", () => {
    const policy = getDocumentUploadPolicy();

    expect(policy.visibility).toBe("private");
    expect(policy.allowPublicUrl).toBe(false);
    expect(() => assertPrivateDocumentPolicy(policy)).not.toThrow();
  });

  it("requires CRON_SECRET in production", () => {
    expect(() => assertCronSecretPolicy({ vercelEnv: "production", cronSecret: "" })).toThrow(
      "CRON_SECRET_REQUIRED_IN_PRODUCTION",
    );
    expect(assertCronSecretPolicy({ vercelEnv: "production", cronSecret: "set" }).configured).toBe(true);
  });

  it("limits evidence admin to admin and expert roles", () => {
    expect(canManageEvidence(getDemoUser("admin"))).toBe(true);
    expect(canManageEvidence(getDemoUser("expert"))).toBe(true);
    expect(canManageEvidence(getDemoUser("conseiller"))).toBe(false);
  });

  it("keeps audit repository insert-only", () => {
    const result = appendAuditEventToRepository({
      id: "audit-v12-test",
      tenantId: "tenant-cabinet-ludovic-demo",
      actorUserId: "user-conseiller-marie",
      action: "report.exported",
      entityType: "case",
      entityId: "case-claire-marc-2026",
      createdAt: "2026-05-26T13:00:00.000Z",
      summary: "Rapport versionne test.",
    });

    expect(result.dbContract.allowedOperation).toBe("insert_only");
    expect(result.dbContract.forbiddenOperations).toEqual(["update", "delete"]);
    expect(Object.isFrozen(result.events)).toBe(true);
  });

  it("supports real workflow contracts without external connectors", () => {
    const createdCase = createDemoCase({ title: "Dossier pilote test" }).clientCase;
    const asset = createDemoAsset({ label: "Bien test", category: "real-estate", value: 250_000 });
    const run = persistIfiSimulation();
    const replay = replaySimulation(run);
    const review = decideProfessionalReview({
      decision: "changes_requested",
      summary: "Correction requise avant validation.",
    });
    const report = generateReportVersion({ run });

    expect(createdCase.status).toBe("draft");
    expect(asset.dataQuality.status).toBe("user_declared");
    expect(run.replayable).toBe(true);
    expect(replay.status).toBe("unchanged");
    expect(review.decision).toBe("changes_requested");
    expect(report.simulationRunIds).toContain(run.id);
    expect(report.evidenceSourceIds.length).toBeGreaterThan(0);
  });

  it("creates controlled source hashes and rule diff impacts", async () => {
    const source = evidenceSources[0];
    const snapshot = sourceSnapshots.find((candidate) => candidate.sourceId === source.id)!;
    const hash = hashSourceContent("official content v1");
    const controlled = createControlledSnapshot(source, "official content v1");
    const unchanged = compareSnapshotHash({ source, snapshot: controlled, currentHash: controlled.contentHash });
    const changed = compareSnapshotHash({ source, snapshot, currentHash: hash });
    const controlledByFetcher = await controlEvidenceSource({
      source,
      liveEnabled: true,
      fetcher: async () => "official content v1",
    });
    const diff = buildRuleDiffImpact(changed);

    expect(controlled.contentHash).toBe(hash);
    expect(unchanged.status).toBe("unchanged");
    expect(changed.status).toBe("changed");
    expect(controlledByFetcher.status).toBe("changed");
    expect(diff.status).toBe("review_required");
    expect(diff.impactedCaseIds).toContain("case-claire-marc-2026");
  });
});
