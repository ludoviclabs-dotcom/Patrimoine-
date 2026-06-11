import { stableHash } from "./hash";
import type { ProfessionalDocument } from "../types";

/**
 * Lettre de mission patrimoniale — recommandations CNCGP.
 * Le délai de mission est OBLIGATOIRE : sans durée, la lettre est bloquée.
 */

export type LettreMissionInput = {
  clientName: string;
  missionObject: string;
  scope: string[];
  deliverables: string[];
  durationMonths: number;
  feesDescription: string;
};

export const defaultLettreMissionInput: LettreMissionInput = {
  clientName: "Claire et Marc",
  missionObject: "Diagnostic patrimonial global et préparation de la transmission",
  scope: [
    "Audit de la situation patrimoniale et fiscale",
    "Simulations IFI, transmission, Dutreil et assurance-vie",
    "Coordination avec notaire et expert-comptable",
  ],
  deliverables: ["Rapport patrimonial sourcé", "Annexes de calcul", "Plan d'action priorisé"],
  durationMonths: 4,
  feesDescription: "Honoraires forfaitaires de 3 600 € TTC, payables en deux échéances.",
};

export type LettreMissionResult =
  | { status: "blocked"; missingFields: string[] }
  | { status: "ready"; document: ProfessionalDocument; sections: Array<{ label: string; value: string }> };

export function buildLettreMission(input: LettreMissionInput): LettreMissionResult {
  const missingFields: string[] = [];
  if (!input.clientName.trim()) missingFields.push("Identité du client");
  if (!input.missionObject.trim()) missingFields.push("Objet de la mission");
  if (input.scope.length === 0) missingFields.push("Périmètre");
  if (!Number.isFinite(input.durationMonths) || input.durationMonths <= 0)
    missingFields.push("Délai de mission (obligatoire)");
  if (!input.feesDescription.trim()) missingFields.push("Honoraires");

  if (missingFields.length > 0) return { status: "blocked", missingFields };

  const sections = [
    { label: "Client", value: input.clientName },
    { label: "Objet", value: input.missionObject },
    { label: "Périmètre", value: input.scope.join(" · ") },
    { label: "Livrables", value: input.deliverables.join(" · ") },
    { label: "Délai de mission", value: `${input.durationMonths} mois à compter de la signature` },
    { label: "Honoraires", value: input.feesDescription },
    {
      label: "Limites",
      value:
        "Simulations indicatives : aucune décision sans validation par le professionnel du droit ou du chiffre compétent.",
    },
  ];

  const hash = stableHash(JSON.stringify(sections));

  return {
    status: "ready",
    sections,
    document: {
      id: `doc-lettre-mission-${hash}`,
      tenantId: "tenant-cabinet-demo",
      caseId: "case-claire-marc-2026",
      kind: "lettre-mission",
      title: `Lettre de mission — ${input.clientName}`,
      status: "issued_for_review",
      generatedAt: "2026-06-11T15:05:00.000Z",
      version: "V3.0",
      hash: `lm-${hash}`,
      requiredInputs: ["Objet", "Périmètre", "Délai de mission", "Honoraires"],
      professionalValidationRequired: true,
    },
  };
}
