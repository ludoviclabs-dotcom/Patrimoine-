import { describeError } from "../errors/error-catalog";
import type { ReportConsoleState } from "../report/report-console";

/**
 * PF-07 — the cabinet journey, derived from stored facts.
 *
 * The product already had a stepper, but it was decorative: its position was a
 * hardcoded constant, identical for every dossier. A professional could not
 * tell from it what was finished, what was blocking, what merely needed review,
 * or what to do next.
 *
 * This model answers those questions from the same facts the report console
 * already loads — dossier, legal freeze date, simulations, evidence, review and
 * report versions. Nothing here infers a fiscal conclusion; it only reports
 * which stage the file has actually reached.
 */

export const cabinetJourneyStepKeys = [
  "qualification",
  "hypotheses",
  "simulation",
  "preuves",
  "revue",
  "rapport",
] as const;

export type CabinetJourneyStepKey = (typeof cabinetJourneyStepKeys)[number];

/**
 * `review` is deliberately distinct from `blocked`: a vigilance point must be
 * visible without being presented as something that stops the work.
 */
export type CabinetJourneyStepState = "done" | "active" | "blocked" | "review" | "todo";

export type CabinetJourneyStep = Readonly<{
  key: CabinetJourneyStepKey;
  label: string;
  state: CabinetJourneyStepState;
  detail: string;
  nextAction: string | null;
  code: string | null;
}>;

export type CabinetJourney = Readonly<{
  dossierReference: string | null;
  dossierTitle: string | null;
  steps: readonly CabinetJourneyStep[];
  activeStep: CabinetJourneyStepKey | null;
  nextAction: string | null;
  nextActionCode: string | null;
  blockingCount: number;
  reviewCount: number;
}>;

const labels: Readonly<Record<CabinetJourneyStepKey, string>> = {
  qualification: "Qualification",
  hypotheses: "Hypothèses",
  simulation: "Simulation",
  preuves: "Preuves",
  revue: "Revue",
  rapport: "Rapport",
};

type Resolution = Readonly<{
  state: CabinetJourneyStepState;
  detail: string;
  code?: string;
}>;

function step(key: CabinetJourneyStepKey, resolution: Resolution): CabinetJourneyStep {
  const descriptor = resolution.code ? describeError(resolution.code) : null;

  return {
    key,
    label: labels[key],
    state: resolution.state,
    detail: resolution.detail,
    nextAction: descriptor?.nextAction ?? null,
    code: resolution.code ?? null,
  };
}

function hasFlag(state: ReportConsoleState, prefix: string) {
  return (state.readiness?.blockingFlags ?? []).some((flag) => flag.code.startsWith(prefix));
}

function resolveQualification(state: ReportConsoleState): Resolution {
  const outOfScope = state.blockers.some((blocker) => blocker.code === "REPORT_DOSSIER_NOT_ACCESSIBLE");
  if (outOfScope) {
    return {
      state: "blocked",
      detail: "Le dossier demandé est hors du périmètre de votre cabinet.",
      code: "REPORT_DOSSIER_NOT_ACCESSIBLE",
    };
  }
  if (!state.selectedDossier) {
    return { state: "todo", detail: "Aucun dossier n'est ouvert." };
  }

  return {
    state: "done",
    detail: `${state.selectedDossier.reference} — exercice ${state.selectedDossier.fiscalYear}.`,
  };
}

function resolveHypotheses(state: ReportConsoleState): Resolution {
  if (!state.selectedDossier) {
    return { state: "todo", detail: "Ouvrez d'abord un dossier." };
  }
  if (!state.legalFreezeDate) {
    return {
      state: "blocked",
      detail: "La date de gel juridique n'est pas renseignée.",
      code: "REPORT_LEGAL_FREEZE_DATE_REQUIRED",
    };
  }

  return { state: "done", detail: `Droit figé au ${state.legalFreezeDate}.` };
}

function resolveSimulation(state: ReportConsoleState): Resolution {
  if (!state.selectedDossier) {
    return { state: "todo", detail: "Ouvrez d'abord un dossier." };
  }
  if (state.selectedRunIds.length === 0) {
    return {
      state: "blocked",
      detail: "Aucune simulation n'est retenue pour ce livrable.",
      code: "REPORT_SIMULATION_RUN_REQUIRED",
    };
  }
  if (hasFlag(state, "simulation.") || hasFlag(state, "calculation.") || hasFlag(state, "rule.")) {
    const flag = (state.readiness?.blockingFlags ?? [])
      .find((candidate) => /^(simulation|calculation|rule)\./.test(candidate.code));
    return {
      state: "blocked",
      detail: flag?.detail ?? "Une simulation retenue comporte un point bloquant.",
      code: flag?.code,
    };
  }

  const count = state.selectedRunIds.length;
  return {
    state: "done",
    detail: `${count} simulation${count > 1 ? "s" : ""} retenue${count > 1 ? "s" : ""}.`,
  };
}

function resolvePreuves(state: ReportConsoleState): Resolution {
  if (!state.readiness) {
    return { state: "todo", detail: "Les preuves seront listées une fois les simulations retenues." };
  }
  if (state.readiness.evidenceCount === 0) {
    // Vigilance, not a blocker: PF-06 lets a report be produced with an empty
    // evidence index, and says so rather than pretending it is complete.
    return {
      state: "review",
      detail: "Aucune version de document n'est rattachée aux simulations retenues.",
      code: "REPORT_EVIDENCE_MISSING",
    };
  }

  const count = state.readiness.evidenceCount;
  return {
    state: "done",
    detail: `${count} pièce${count > 1 ? "s" : ""} rattachée${count > 1 ? "s" : ""} et horodatée${count > 1 ? "s" : ""}.`,
  };
}

function resolveRevue(state: ReportConsoleState): Resolution {
  if (!state.readiness) {
    return { state: "todo", detail: "La revue s'ouvre une fois les simulations retenues." };
  }
  if (!state.readiness.professionalReviewSigned) {
    return {
      state: "blocked",
      detail: "La revue professionnelle requise n'est pas signée.",
      code: "review.professional_not_signed",
    };
  }

  return { state: "done", detail: "Revue professionnelle signée." };
}

function resolveRapport(state: ReportConsoleState): Resolution {
  const current = state.currentVersion;
  if (!current) {
    return {
      state: state.readiness ? "active" : "todo",
      detail: "Aucune version serveur n'a encore été produite.",
    };
  }
  if (state.freshness?.status === "outdated") {
    return {
      state: "blocked",
      detail: `Version ${current.versionNumber} obsolète : les faits du dossier ont changé depuis sa génération.`,
      code: state.freshness.reasonCode ?? "REPORT_REGENERATION_REQUIRED",
    };
  }
  if (current.status === "validated") {
    return { state: "done", detail: `Version ${current.versionNumber} validée, sans filigrane.` };
  }

  return {
    state: "active",
    detail: `Version ${current.versionNumber} au statut brouillon, filigranée et non remittable.`,
  };
}

/**
 * A step is "active" when it is the first one not finished. Blocked and review
 * steps keep their own state so the reader can tell a stop from a warning.
 */
export function buildCabinetJourney(state: ReportConsoleState): CabinetJourney {
  const resolved: CabinetJourneyStep[] = [
    step("qualification", resolveQualification(state)),
    step("hypotheses", resolveHypotheses(state)),
    step("simulation", resolveSimulation(state)),
    step("preuves", resolvePreuves(state)),
    step("revue", resolveRevue(state)),
    step("rapport", resolveRapport(state)),
  ];

  const firstUnfinished = resolved.find((entry) => entry.state !== "done" && entry.state !== "review");
  const steps = resolved.map((entry) =>
    entry === firstUnfinished && entry.state === "todo"
      ? { ...entry, state: "active" as const }
      : entry);

  // What to do next is the first genuine stop; a vigilance point is reported
  // but never presented as the thing standing in the way.
  const nextStop = steps.find((entry) => entry.state === "blocked")
    ?? steps.find((entry) => entry.state === "active");

  return {
    dossierReference: state.selectedDossier?.reference ?? null,
    dossierTitle: state.selectedDossier?.title ?? null,
    steps,
    activeStep: (steps.find((entry) => entry.state === "blocked")
      ?? steps.find((entry) => entry.state === "active"))?.key ?? null,
    nextAction: nextStop?.nextAction
      ?? (nextStop?.key === "rapport" ? "Générez le brouillon serveur du rapport." : null),
    nextActionCode: nextStop?.code ?? null,
    blockingCount: steps.filter((entry) => entry.state === "blocked").length,
    reviewCount: steps.filter((entry) => entry.state === "review").length,
  };
}
