import { canonicalJson, sha256Hex, type ReportBusinessPayload } from "./snapshot";

/**
 * Staleness detection for an already delivered report version.
 *
 * A delivered PDF is never rewritten. When the facts behind it change, the
 * report is declared OUTDATED and a regeneration is required — the stored
 * version, its snapshot and its hashes stay exactly as they were.
 */

export const reportFreshnessStatuses = ["current", "outdated"] as const;
export type ReportFreshnessStatus = (typeof reportFreshnessStatuses)[number];

/** Human-facing labels for the sections a reader can act on. */
export const businessSectionLabels: Readonly<Record<string, string>> = {
  dossier: "identité du dossier",
  legalFreezeDate: "date de gel juridique",
  simulationRunIds: "simulations retenues",
  runs: "données de simulation",
  ruleVersions: "versions de règles",
  calculationSteps: "étapes de calcul",
  comparisons: "comparaison des scénarios",
  reviewFlags: "points de vigilance",
  professionalValidation: "revue professionnelle",
  evidenceSources: "sources officielles",
  documentReferences: "pièces justificatives",
  coverageLimitIds: "limites de couverture",
  limitations: "limites déclarées",
};

/**
 * Compares two business payloads section by section, using the same canonical
 * serialisation as the snapshot hash. The result explains *what* changed
 * instead of only reporting that a hash differs.
 */
export function diffBusinessPayloads(
  previous: ReportBusinessPayload,
  next: ReportBusinessPayload,
): readonly string[] {
  const keys = [
    ...new Set([...Object.keys(previous), ...Object.keys(next)]),
  ].sort();

  return keys.filter((key) => {
    const left = canonicalJson((previous as unknown as Record<string, unknown>)[key]);
    const right = canonicalJson((next as unknown as Record<string, unknown>)[key]);
    return left !== right;
  });
}

export type ReportFreshness = Readonly<{
  reportVersionId: string;
  status: ReportFreshnessStatus;
  snapshotBusinessSha256: string;
  currentBusinessSha256: string | null;
  changedSections: readonly string[];
  reasonCode: string | null;
  reason: string | null;
}>;

export function describeChangedSections(sections: readonly string[]) {
  if (sections.length === 0) {
    return null;
  }

  return sections
    .map((section) => businessSectionLabels[section] ?? section)
    .join(", ");
}

/**
 * Builds the freshness verdict from the stored snapshot payload and the
 * payload rebuilt from today's facts. `unreadableReasonCode` covers the case
 * where the referenced facts can no longer be read at all — a report pointing
 * at facts that disappeared is outdated, never silently "current".
 */
export function evaluateFreshness(input: {
  reportVersionId: string;
  snapshotBusiness: ReportBusinessPayload;
  currentBusiness: ReportBusinessPayload | null;
  unreadableReasonCode?: string | null;
}): ReportFreshness {
  const snapshotBusinessSha256 = sha256Hex(canonicalJson(input.snapshotBusiness));

  if (!input.currentBusiness) {
    return {
      reportVersionId: input.reportVersionId,
      status: "outdated",
      snapshotBusinessSha256,
      currentBusinessSha256: null,
      changedSections: [],
      reasonCode: input.unreadableReasonCode ?? "REPORT_FACTS_UNREADABLE",
      reason:
        "Les faits référencés par ce rapport ne sont plus lisibles dans le périmètre du dossier.",
    };
  }

  const currentBusinessSha256 = sha256Hex(canonicalJson(input.currentBusiness));

  if (currentBusinessSha256 === snapshotBusinessSha256) {
    return {
      reportVersionId: input.reportVersionId,
      status: "current",
      snapshotBusinessSha256,
      currentBusinessSha256,
      changedSections: [],
      reasonCode: null,
      reason: null,
    };
  }

  const changedSections = diffBusinessPayloads(input.snapshotBusiness, input.currentBusiness);

  return {
    reportVersionId: input.reportVersionId,
    status: "outdated",
    snapshotBusinessSha256,
    currentBusinessSha256,
    changedSections,
    reasonCode: "REPORT_REGENERATION_REQUIRED",
    reason: `Le dossier a changé depuis la génération : ${describeChangedSections(changedSections) ?? "contenu métier"}.`,
  };
}
