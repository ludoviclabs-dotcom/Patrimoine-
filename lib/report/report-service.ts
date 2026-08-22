import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { withAuthorizedTenantTransaction } from "../auth/authorization";
import { getDatabase } from "../db/client";
import type { TenantTransaction } from "../db/tenant-transaction";
import {
  auditLogs,
  calculationSteps,
  clientCases,
  documentVersions,
  evidenceSources,
  professionalReviews,
  reportVersions,
  reports,
  ruleVersions,
  simulationDocumentVersions,
  simulationRuns,
} from "../db/schema";
import type { TenantContext } from "../tenancy/tenant-context";
import {
  assertReportBlobKeyOwnedByTenant,
  buildReportVersionBlobKey,
} from "../documents/blob";
import {
  downloadGrantTtlSeconds,
  issueDownloadGrant,
  verifyDownloadGrant,
} from "../documents/access-grant";
import type { PrivateDocumentStorage } from "../documents/private-storage";
import { evaluateFreshness, type ReportFreshness } from "./freshness";
import { renderReportPdf } from "./render";
import {
  assembleReportSnapshot,
  blockingFlags,
  buildReportBusinessPayload,
  hashBusinessPayload,
  hashSnapshot,
  reportGeneratorVersion,
  resolveWatermark,
  type ReportBusinessPayload,
  type ReportReviewFlag,
  type ReportSnapshot,
  type ReportValidationBlock,
  type ReportVersionStatus,
} from "./snapshot";

type Database = ReturnType<typeof getDatabase>;

export const defaultReportLimitations = [
  "Analyse indicative produite par un moteur déterministe : elle ne remplace pas la décision d'un professionnel habilité.",
  "Seules les données enregistrées dans le dossier au moment du gel juridique sont prises en compte.",
  "Toute évolution réglementaire postérieure à la date de gel juridique impose un recalcul.",
] as const;

export type ServerReportServiceDependencies = Readonly<{
  database?: Database;
  storage: PrivateDocumentStorage;
  downloadSigningSecret: string;
  now?: () => Date;
  generatorVersion?: string;
}>;

export type GenerateReportDraftInput = Readonly<{
  caseId: string;
  simulationRunIds: readonly string[];
  legalFreezeDate: string;
  title?: string;
  limitations?: readonly string[];
}>;

export type ReportVersionSummary = Readonly<{
  reportId: string;
  reportVersionId: string;
  versionNumber: number;
  status: ReportVersionStatus;
  decision: string;
  watermark: string | null;
  snapshotSha256: string;
  businessSha256: string;
  pdfSha256: string;
  pdfByteSize: number;
  generatedAt: string;
  blockingFlagCount: number;
}>;

export type ReportDownloadAuthorization = ReportVersionSummary & Readonly<{
  token: string;
  expiresAt: string;
}>;

export type ReportDownloadPayload = Readonly<{
  reportId: string;
  reportVersionId: string;
  versionNumber: number;
  fileName: string;
  byteSize: number;
  pdfSha256: string;
  snapshotSha256: string;
  status: ReportVersionStatus;
  stream: ReadableStream<Uint8Array>;
}>;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Readiness verdict shown before any write. `canValidateFinal` mirrors exactly
 * what validateVersion enforces, so the interface can never offer a final
 * validation the server would refuse.
 */
export type ReportReadiness = Readonly<{
  business: ReportBusinessPayload;
  businessSha256: string;
  blockingFlags: readonly ReportReviewFlag[];
  reviewFlags: readonly ReportReviewFlag[];
  evidenceCount: number;
  simulationRunIds: readonly string[];
  professionalReviewSigned: boolean;
  canValidateFinal: boolean;
}>;

function summariseReadiness(business: ReportBusinessPayload): ReportReadiness {
  const blocking = blockingFlags(business);

  return {
    business,
    businessSha256: hashBusinessPayload(business),
    blockingFlags: blocking,
    reviewFlags: business.reviewFlags.filter((flag) => flag.severity !== "blocking"),
    evidenceCount: business.documentReferences.length,
    simulationRunIds: business.simulationRunIds,
    professionalReviewSigned: business.professionalValidation.decision === "approved",
    canValidateFinal: blocking.length === 0,
  };
}

function auditIdentity(context: TenantContext) {
  return {
    tenantId: context.tenantId,
    actorIdentityId: context.identityId,
    correlationId: context.correlationId,
  } as const;
}

function isoOrNull(value: Date | null) {
  return value ? value.toISOString() : null;
}

/**
 * Reads every fact the report needs, inside the caller's authorized RLS
 * transaction. Anything the tenant may not see is simply absent, which the
 * explicit not-found checks turn into a refusal rather than a partial report.
 */
async function readBusinessFacts(
  transaction: TenantTransaction,
  context: TenantContext,
  input: { caseId: string; simulationRunIds: readonly string[]; legalFreezeDate: string; limitations: readonly string[] },
): Promise<ReportBusinessPayload> {
  const [dossier] = await transaction
    .select()
    .from(clientCases)
    .where(and(eq(clientCases.tenantId, context.tenantId), eq(clientCases.id, input.caseId)))
    .limit(1);

  if (!dossier) {
    throw new Error("DOSSIER_NOT_FOUND");
  }

  const runRows = input.simulationRunIds.length === 0
    ? []
    : await transaction
      .select()
      .from(simulationRuns)
      .where(
        and(
          eq(simulationRuns.tenantId, context.tenantId),
          eq(simulationRuns.caseId, input.caseId),
          inArray(simulationRuns.id, [...input.simulationRunIds]),
        ),
      );

  if (runRows.length !== input.simulationRunIds.length) {
    throw new Error("SIMULATION_RUN_NOT_FOUND");
  }

  const runIds = runRows.map((run) => run.id);
  const stepRows = runIds.length === 0
    ? []
    : await transaction
      .select()
      .from(calculationSteps)
      .where(
        and(
          eq(calculationSteps.tenantId, context.tenantId),
          inArray(calculationSteps.simulationRunId, runIds),
        ),
      )
      .orderBy(asc(calculationSteps.simulationRunId), asc(calculationSteps.stepOrder));

  const ruleVersionIds = [...new Set(stepRows.map((step) => step.ruleVersionId))];
  const ruleRows = ruleVersionIds.length === 0
    ? []
    : await transaction
      .select()
      .from(ruleVersions)
      .where(inArray(ruleVersions.id, ruleVersionIds));

  const evidenceIds = [
    ...new Set([
      ...stepRows.map((step) => step.evidenceSourceId),
      ...ruleRows.flatMap((rule) => rule.evidenceSourceIds),
    ]),
  ];
  const evidenceRows = evidenceIds.length === 0
    ? []
    : await transaction
      .select()
      .from(evidenceSources)
      .where(inArray(evidenceSources.id, evidenceIds));

  const documentRows = runIds.length === 0
    ? []
    : await transaction
      .select({
        documentId: documentVersions.documentId,
        documentVersionId: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        sha256: documentVersions.sha256,
        byteSize: documentVersions.byteSize,
        mimeType: documentVersions.mimeType,
        purpose: simulationDocumentVersions.purpose,
        simulationRunId: simulationDocumentVersions.simulationRunId,
      })
      .from(simulationDocumentVersions)
      .innerJoin(
        documentVersions,
        and(
          eq(simulationDocumentVersions.tenantId, documentVersions.tenantId),
          eq(simulationDocumentVersions.documentVersionId, documentVersions.id),
        ),
      )
      .where(
        and(
          eq(simulationDocumentVersions.tenantId, context.tenantId),
          inArray(simulationDocumentVersions.simulationRunId, runIds),
        ),
      );

  const [review] = await transaction
    .select()
    .from(professionalReviews)
    .where(
      and(
        eq(professionalReviews.tenantId, context.tenantId),
        eq(professionalReviews.caseId, input.caseId),
      ),
    )
    .orderBy(desc(professionalReviews.createdAt))
    .limit(1);

  return buildReportBusinessPayload({
    dossier: {
      tenantId: dossier.tenantId,
      caseId: dossier.id,
      reference: dossier.reference,
      title: dossier.title,
      status: dossier.status,
      fiscalYear: dossier.fiscalYear,
    },
    legalFreezeDate: input.legalFreezeDate,
    runs: runRows.map((run) => ({
      id: run.id,
      engineKey: run.engineKey,
      engineVersion: run.engineVersion,
      scenario: run.scenario,
      status: run.status,
      professionalValidationRequired: run.professionalValidationRequired,
      inputSnapshot: run.inputSnapshot,
      output: run.output,
      coverageLimitIds: run.coverageLimitIds ?? [],
      completedAt: isoOrNull(run.completedAt),
    })),
    ruleVersions: ruleRows.map((rule) => ({
      id: rule.id,
      ruleSet: rule.ruleSet,
      version: rule.version,
      title: rule.title,
      status: rule.status,
      effectiveFrom: rule.effectiveFrom.toISOString(),
      effectiveTo: isoOrNull(rule.effectiveTo),
      sourceReference: rule.sourceReference,
      evidenceSourceIds: rule.evidenceSourceIds,
      checksumSha256: rule.checksumSha256,
    })),
    calculationSteps: stepRows.map((step) => ({
      simulationRunId: step.simulationRunId,
      stepOrder: step.stepOrder,
      label: step.label,
      inputValue: step.inputValue,
      formula: step.formula,
      outputValue: step.outputValue,
      ruleVersionId: step.ruleVersionId,
      evidenceSourceId: step.evidenceSourceId,
      confidenceStatus: step.confidenceStatus,
      displayStatus: step.displayStatus,
      coverageLimitIds: step.coverageLimitIds,
      nextAction: step.nextAction,
    })),
    evidenceSources: evidenceRows.map((source) => ({
      id: source.id,
      title: source.title,
      authority: source.authority,
      url: source.url,
      legalScope: source.legalScope,
      reliability: source.reliability,
      status: source.status,
      checkedAt: source.checkedAt.toISOString(),
    })),
    documentReferences: documentRows,
    professionalValidation: {
      required: runRows.some((run) => run.professionalValidationRequired),
      decision: review?.decision ?? "pending",
      reviewId: review?.id ?? null,
      reviewerUserId: review?.reviewerUserId ?? null,
      reviewedAt: isoOrNull(review?.reviewedAt ?? null),
      summary: review?.summary ?? null,
      requiredActions: review?.requiredActions ?? [],
    },
    limitations: input.limitations,
  });
}

/**
 * Server-side report pipeline: snapshot first, then PDF from the snapshot.
 *
 * No entry point ever renders from live UI state, and no delivered version is
 * ever mutated — a validation appends version n+1.
 */
export function createServerReportService(dependencies: ServerReportServiceDependencies) {
  const database = dependencies.database ?? getDatabase();
  const storage = dependencies.storage;
  const secret = dependencies.downloadSigningSecret;
  const now = dependencies.now ?? (() => new Date());
  const generatorVersion = dependencies.generatorVersion ?? reportGeneratorVersion;

  function toSummary(row: typeof reportVersions.$inferSelect, snapshot: ReportSnapshot): ReportVersionSummary {
    return {
      reportId: snapshot.generation.reportId,
      reportVersionId: row.id,
      versionNumber: snapshot.generation.versionNumber,
      status: snapshot.validation.status,
      decision: snapshot.validation.decision,
      watermark: snapshot.generation.watermark,
      snapshotSha256: row.snapshotSha256 ?? "",
      businessSha256: row.businessSha256 ?? "",
      pdfSha256: row.pdfSha256 ?? "",
      pdfByteSize: row.pdfByteSize ?? 0,
      generatedAt: snapshot.generation.generatedAt,
      blockingFlagCount: blockingFlags(snapshot.business).length,
    };
  }

  /**
   * Shared three-phase writer. Phase 1 reserves the version number, phase 2
   * renders and stores the PDF outside any transaction, phase 3 appends the
   * immutable row and its audit entry.
   */
  async function appendVersion(
    context: TenantContext,
    action: "report.generate" | "report.validate",
    input: {
      caseId: string;
      title: string;
      business: ReportBusinessPayload | null;
      businessInput: { simulationRunIds: readonly string[]; legalFreezeDate: string; limitations: readonly string[] } | null;
      validation: ReportValidationBlock;
      auditAction: "report.generated" | "report.validated";
      auditSummary: string;
    },
  ) {
    const reportVersionId = randomUUID();

    const reservation = await withAuthorizedTenantTransaction(
      database,
      context,
      action,
      { tenantId: context.tenantId, type: "report", id: input.caseId },
      async (transaction) => {
        const business = input.business ?? await readBusinessFacts(transaction, context, {
          caseId: input.caseId,
          simulationRunIds: input.businessInput?.simulationRunIds ?? [],
          legalFreezeDate: input.businessInput?.legalFreezeDate ?? "",
          limitations: input.businessInput?.limitations ?? defaultReportLimitations,
        });

        const [existing] = await transaction
          .select()
          .from(reports)
          .where(and(eq(reports.tenantId, context.tenantId), eq(reports.caseId, input.caseId)))
          .limit(1);

        const report = existing ?? (await transaction
          .insert(reports)
          .values({
            tenantId: context.tenantId,
            caseId: input.caseId,
            title: input.title,
            status: input.validation.status,
            currentVersionNumber: 0,
            createdByIdentityId: context.identityId,
          })
          .returning())[0];

        const versionNumber = report.currentVersionNumber + 1;

        await transaction
          .update(reports)
          .set({
            currentVersionNumber: versionNumber,
            status: input.validation.status,
            updatedAt: now(),
          })
          .where(and(eq(reports.tenantId, context.tenantId), eq(reports.id, report.id)));

        return { business, reportId: report.id, versionNumber };
      },
    );

    const generatedAt = now().toISOString();
    const snapshot = assembleReportSnapshot({
      business: reservation.business,
      validation: input.validation,
      generation: {
        reportId: reservation.reportId,
        reportVersionId,
        versionNumber: reservation.versionNumber,
        generatedAt,
        generatedByIdentityId: context.identityId,
        generatorVersion,
        watermark: resolveWatermark(input.validation.status),
      },
    });

    const snapshotSha256 = hashSnapshot(snapshot);
    const businessSha256 = hashBusinessPayload(snapshot.business);
    const pdf = await renderReportPdf(snapshot);
    const blobKey = buildReportVersionBlobKey({
      tenantId: context.tenantId,
      reportId: reservation.reportId,
      reportVersionId,
    });

    await storage.put({ key: blobKey, bytes: pdf.bytes, contentType: "application/pdf" });

    return withAuthorizedTenantTransaction(
      database,
      context,
      action,
      { tenantId: context.tenantId, type: "report", id: input.caseId },
      async (transaction) => {
        const [row] = await transaction
          .insert(reportVersions)
          .values({
            id: reportVersionId,
            tenantId: context.tenantId,
            caseId: input.caseId,
            version: `v${reservation.versionNumber}`,
            status: input.validation.status,
            simulationRunIds: [...snapshot.business.simulationRunIds],
            validationDecision: input.validation.decision,
            evidenceSourceIds: snapshot.business.evidenceSources.map((source) => source.id),
            coverageLimitIds: [...snapshot.business.coverageLimitIds],
            reportId: reservation.reportId,
            versionNumber: reservation.versionNumber,
            legalFreezeDate: snapshot.business.legalFreezeDate,
            snapshot: snapshot as unknown as Record<string, unknown>,
            snapshotSha256,
            businessSha256,
            pdfBlobKey: blobKey,
            pdfSha256: pdf.sha256,
            pdfByteSize: pdf.bytes.byteLength,
            watermark: snapshot.generation.watermark,
            validationBlock: input.validation as unknown as Record<string, unknown>,
            generatorVersion,
            generatedByIdentityId: context.identityId,
            validatedByIdentityId: input.validation.validatedByIdentityId,
            validatedAt: input.validation.validatedAt ? new Date(input.validation.validatedAt) : null,
            generatedAt: new Date(generatedAt),
          })
          .returning();

        await transaction.insert(auditLogs).values({
          ...auditIdentity(context),
          action: input.auditAction,
          entityType: "report_version",
          entityId: reportVersionId,
          summary: input.auditSummary,
          metadata: {
            reportId: reservation.reportId,
            versionNumber: reservation.versionNumber,
            status: input.validation.status,
            decision: input.validation.decision,
            snapshotSha256,
            businessSha256,
            pdfSha256: pdf.sha256,
            blockingFlags: blockingFlags(snapshot.business).length,
          },
        });

        return toSummary(row, snapshot);
      },
    );
  }

  async function loadVersion(
    transaction: TenantTransaction,
    context: TenantContext,
    reportVersionId: string,
  ) {
    const [row] = await transaction
      .select()
      .from(reportVersions)
      .where(
        and(
          eq(reportVersions.tenantId, context.tenantId),
          eq(reportVersions.id, reportVersionId),
        ),
      )
      .limit(1);

    if (!row || !row.reportId || !row.snapshot) {
      throw new Error("REPORT_VERSION_NOT_FOUND");
    }

    return { row, snapshot: row.snapshot as unknown as ReportSnapshot };
  }

  return {
    /**
     * Read-only readiness gate. It builds the business payload the next
     * generation would use, without writing anything and without rendering,
     * so the UI can show exactly what blocks a final report before acting.
     */
    previewReadiness(
      context: TenantContext,
      input: { caseId: string; simulationRunIds: readonly string[]; legalFreezeDate: string; limitations?: readonly string[] },
    ): Promise<ReportReadiness> {
      if (!isoDatePattern.test(input.legalFreezeDate)) {
        throw new Error("REPORT_LEGAL_FREEZE_DATE_REQUIRED");
      }

      return withAuthorizedTenantTransaction(
        database,
        context,
        "report.generate",
        { tenantId: context.tenantId, type: "report", id: input.caseId },
        async (transaction) => {
          const business = await readBusinessFacts(transaction, context, {
            caseId: input.caseId,
            simulationRunIds: input.simulationRunIds,
            legalFreezeDate: input.legalFreezeDate,
            limitations: input.limitations ?? defaultReportLimitations,
          });

          return summariseReadiness(business);
        },
      );
    },

    /**
     * Compares a delivered version's stored snapshot with the payload rebuilt
     * from today's facts. Nothing is written and no stored PDF is touched: a
     * changed dossier yields OUTDATED plus the sections that moved.
     */
    async evaluateFreshness(
      context: TenantContext,
      reportVersionId: string,
    ): Promise<ReportFreshness> {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "report.download",
        { tenantId: context.tenantId, type: "report", id: reportVersionId },
        async (transaction) => {
          const { row, snapshot } = await loadVersion(transaction, context, reportVersionId);

          try {
            const currentBusiness = await readBusinessFacts(transaction, context, {
              caseId: row.caseId,
              simulationRunIds: snapshot.business.simulationRunIds,
              legalFreezeDate: snapshot.business.legalFreezeDate,
              limitations: snapshot.business.limitations,
            });

            return evaluateFreshness({
              reportVersionId,
              snapshotBusiness: snapshot.business,
              currentBusiness,
            });
          } catch (error) {
            return evaluateFreshness({
              reportVersionId,
              snapshotBusiness: snapshot.business,
              currentBusiness: null,
              unreadableReasonCode: error instanceof Error ? error.message : null,
            });
          }
        },
      );
    },

    /** Builds the snapshot from database facts, then renders the draft PDF. */
    generateDraft(context: TenantContext, input: GenerateReportDraftInput) {
      if (!isoDatePattern.test(input.legalFreezeDate)) {
        throw new Error("REPORT_LEGAL_FREEZE_DATE_REQUIRED");
      }

      if (input.simulationRunIds.length === 0) {
        throw new Error("REPORT_SIMULATION_RUN_REQUIRED");
      }

      return appendVersion(context, "report.generate", {
        caseId: input.caseId,
        title: input.title ?? "Rapport patrimonial et fiscal",
        business: null,
        businessInput: {
          simulationRunIds: input.simulationRunIds,
          legalFreezeDate: input.legalFreezeDate,
          limitations: input.limitations ?? defaultReportLimitations,
        },
        validation: {
          status: "draft",
          decision: "pending",
          validatedByIdentityId: null,
          validatedAt: null,
          comment: null,
        },
        auditAction: "report.generated",
        auditSummary: "Brouillon de rapport généré depuis un snapshot immuable.",
      });
    },

    /**
     * Only an authorized role may validate, and a validation never edits the
     * reviewed version: it appends a new immutable version carrying the same
     * business payload plus the actor, timestamp, decision and comment.
     */
    async validateVersion(
      context: TenantContext,
      input: { reportVersionId: string; decision: "approved" | "changes_requested" | "rejected"; comment: string },
    ) {
      const comment = input.comment.trim();

      if (!comment) {
        throw new Error("REPORT_VALIDATION_COMMENT_REQUIRED");
      }

      const reviewed = await withAuthorizedTenantTransaction(
        database,
        context,
        "report.validate",
        { tenantId: context.tenantId, type: "report", id: input.reportVersionId },
        async (transaction) => {
          const { row, snapshot } = await loadVersion(transaction, context, input.reportVersionId);

          const [report] = await transaction
            .select()
            .from(reports)
            .where(and(eq(reports.tenantId, context.tenantId), eq(reports.id, row.reportId!)))
            .limit(1);

          if (!report || report.currentVersionNumber !== snapshot.generation.versionNumber) {
            throw new Error("REPORT_VERSION_SUPERSEDED");
          }

          if (snapshot.validation.status === "validated") {
            throw new Error("REPORT_ALREADY_VALIDATED");
          }

          return { row, snapshot };
        },
      );

      const blocking = blockingFlags(reviewed.snapshot.business);

      if (input.decision === "approved" && blocking.length > 0) {
        throw new Error("REPORT_READINESS_BLOCKED");
      }

      // PF-07B: the gate above reads the STORED snapshot, so a version
      // generated while the review was signed could still be approved after a
      // later review asked for changes. Approving a stale version would ship a
      // document stating a reality that no longer holds, so the freshness
      // verdict is now enforced server-side and not merely disabled in the UI.
      // `changes_requested` and `rejected` stay allowed while stale — asking
      // for changes on an outdated draft is exactly the point.
      if (input.decision === "approved") {
        const freshness = await this.evaluateFreshness(context, input.reportVersionId);
        if (freshness.status === "outdated") {
          throw new Error(freshness.reasonCode ?? "REPORT_REGENERATION_REQUIRED");
        }
      }

      const validatedAt = now().toISOString();

      return appendVersion(context, "report.validate", {
        caseId: reviewed.row.caseId,
        title: reviewed.snapshot.business.dossier.title,
        business: reviewed.snapshot.business,
        businessInput: null,
        validation: {
          status: input.decision === "approved" ? "validated" : "changes_requested",
          decision: input.decision,
          validatedByIdentityId: context.identityId,
          validatedAt,
          comment,
        },
        auditAction: "report.validated",
        auditSummary: "Décision de validation professionnelle enregistrée en nouvelle version.",
      });
    },

    listVersions(context: TenantContext, caseId: string) {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "report.download",
        { tenantId: context.tenantId, type: "report", id: caseId },
        async (transaction) => {
          const rows = await transaction
            .select()
            .from(reportVersions)
            .where(
              and(
                eq(reportVersions.tenantId, context.tenantId),
                eq(reportVersions.caseId, caseId),
              ),
            )
            .orderBy(asc(reportVersions.versionNumber));

          return rows
            .filter((row) => row.reportId && row.snapshot)
            .map((row) => toSummary(row, row.snapshot as unknown as ReportSnapshot));
        },
      );
    },

    getSnapshot(context: TenantContext, reportVersionId: string): Promise<ReportSnapshot> {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "report.download",
        { tenantId: context.tenantId, type: "report", id: reportVersionId },
        async (transaction) => {
          const { snapshot } = await loadVersion(transaction, context, reportVersionId);
          return snapshot;
        },
      );
    },

    async authorizeDownload(
      context: TenantContext,
      reportVersionId: string,
    ): Promise<ReportDownloadAuthorization> {
      const reviewed = await withAuthorizedTenantTransaction(
        database,
        context,
        "report.download",
        { tenantId: context.tenantId, type: "report", id: reportVersionId },
        async (transaction) => {
          const loaded = await loadVersion(transaction, context, reportVersionId);

          await transaction.insert(auditLogs).values({
            ...auditIdentity(context),
            action: "report.download.authorized",
            entityType: "report_version",
            entityId: reportVersionId,
            summary: "Accès temporaire à une version de rapport autorisé.",
            metadata: {
              reportId: loaded.row.reportId ?? "",
              versionNumber: loaded.snapshot.generation.versionNumber,
              ttlSeconds: downloadGrantTtlSeconds,
            },
          });

          return loaded;
        },
      );

      const expiresAtMs = now().getTime() + downloadGrantTtlSeconds * 1000;

      return {
        ...toSummary(reviewed.row, reviewed.snapshot),
        token: issueDownloadGrant(secret, {
          tenantId: context.tenantId,
          resource: "report_version",
          resourceId: reviewed.row.reportId!,
          versionId: reportVersionId,
          identityId: context.identityId,
          expiresAtMs,
        }),
        expiresAt: new Date(expiresAtMs).toISOString(),
      };
    },

    async openDownload(context: TenantContext, token: string): Promise<ReportDownloadPayload> {
      const verification = verifyDownloadGrant(secret, token, now().getTime());

      if (verification.status !== "valid") {
        throw new Error(`REPORT_DOWNLOAD_GRANT_${verification.status.toUpperCase()}`);
      }

      const { payload } = verification;

      if (
        payload.tenantId !== context.tenantId
        || payload.identityId !== context.identityId
        || payload.resource !== "report_version"
      ) {
        throw new Error("REPORT_DOWNLOAD_GRANT_SUBJECT_MISMATCH");
      }

      const reviewed = await withAuthorizedTenantTransaction(
        database,
        context,
        "report.download",
        { tenantId: context.tenantId, type: "report", id: payload.versionId },
        async (transaction) => {
          const loaded = await loadVersion(transaction, context, payload.versionId);

          if (loaded.row.reportId !== payload.resourceId) {
            throw new Error("REPORT_DOWNLOAD_GRANT_SUBJECT_MISMATCH");
          }

          await transaction.insert(auditLogs).values({
            ...auditIdentity(context),
            action: "report.downloaded",
            entityType: "report_version",
            entityId: payload.versionId,
            summary: "Version de rapport téléchargée.",
            metadata: {
              reportId: payload.resourceId,
              versionNumber: loaded.snapshot.generation.versionNumber,
              pdfSha256: loaded.row.pdfSha256 ?? "",
              status: loaded.snapshot.validation.status,
            },
          });

          return loaded;
        },
      );

      assertReportBlobKeyOwnedByTenant(reviewed.row.pdfBlobKey ?? "", context.tenantId);
      const object = await storage.open(reviewed.row.pdfBlobKey ?? "");

      if (!object) {
        throw new Error("REPORT_OBJECT_NOT_FOUND");
      }

      const { snapshot } = reviewed;

      return {
        reportId: snapshot.generation.reportId,
        reportVersionId: reviewed.row.id,
        versionNumber: snapshot.generation.versionNumber,
        fileName: `${snapshot.business.dossier.reference}-rapport-v${snapshot.generation.versionNumber}.pdf`,
        byteSize: reviewed.row.pdfByteSize ?? object.byteSize,
        pdfSha256: reviewed.row.pdfSha256 ?? "",
        snapshotSha256: reviewed.row.snapshotSha256 ?? "",
        status: snapshot.validation.status,
        stream: object.stream,
      };
    },
  };
}
