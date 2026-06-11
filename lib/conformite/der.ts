import { stableHash } from "./hash";
import type { ProfessionalDocument } from "../types";

/**
 * Document d'entrée en relation (DER) — RG AMF art. 325-5, L. 541-8-1 CMF.
 * Générateur avec validation bloquante des champs obligatoires : un DER sans
 * numéro ORIAS ou sans statuts n'est jamais produit.
 */

export type DerInput = {
  cabinetName: string;
  oriasNumber: string;
  statuses: Array<"CIF" | "IAS" | "IOBSP">;
  association: "CNCGP" | "ANACOFI-CIF" | "CNCEF" | "Compagnie CIF";
  remunerationModel: "honoraires" | "commissions" | "mixte";
  capitalLinks: string;
  clientName: string;
};

export const defaultDerInput: DerInput = {
  cabinetName: "Cabinet Démo Patrimoine",
  oriasNumber: "26001234",
  statuses: ["CIF", "IAS"],
  association: "CNCGP",
  remunerationModel: "mixte",
  capitalLinks: "Aucun lien capitalistique avec un établissement promoteur de produits.",
  clientName: "Claire et Marc",
};

export type DerResult =
  | { status: "blocked"; missingFields: string[] }
  | { status: "ready"; document: ProfessionalDocument; sections: Array<{ label: string; value: string }> };

export function buildDer(input: DerInput): DerResult {
  const missingFields: string[] = [];
  if (!input.cabinetName.trim()) missingFields.push("Nom du cabinet");
  if (!input.oriasNumber.trim()) missingFields.push("Numéro ORIAS");
  if (input.statuses.length === 0) missingFields.push("Statuts (CIF/IAS/IOBSP)");
  if (!input.clientName.trim()) missingFields.push("Identité du client");

  if (missingFields.length > 0) return { status: "blocked", missingFields };

  const sections = [
    { label: "Cabinet", value: input.cabinetName },
    { label: "Immatriculation ORIAS", value: `n° ${input.oriasNumber} (www.orias.fr)` },
    { label: "Statuts réglementés", value: input.statuses.join(", ") },
    { label: "Association professionnelle", value: input.association },
    {
      label: "Mode de rémunération",
      value:
        input.remunerationModel === "honoraires"
          ? "Honoraires exclusivement"
          : input.remunerationModel === "commissions"
            ? "Commissions des partenaires"
            : "Mixte : honoraires et commissions, détaillés avant toute mission",
    },
    { label: "Liens capitalistiques", value: input.capitalLinks },
    { label: "Client", value: input.clientName },
    {
      label: "Réclamations / médiation",
      value: "Procédure de réclamation interne puis médiateur de l'AMF (RG AMF 325-23).",
    },
  ];

  const hash = stableHash(JSON.stringify(sections));

  return {
    status: "ready",
    sections,
    document: {
      id: `doc-der-${hash}`,
      tenantId: "tenant-cabinet-demo",
      caseId: "case-claire-marc-2026",
      kind: "der",
      title: `Document d'entrée en relation — ${input.clientName}`,
      status: "issued_for_review",
      generatedAt: "2026-06-11T15:00:00.000Z",
      version: "V3.0",
      hash: `der-${hash}`,
      requiredInputs: ["Identité client", "Statut CIF/IAS/IOBSP", "N° ORIAS", "Mode de rémunération"],
      professionalValidationRequired: true,
    },
  };
}
