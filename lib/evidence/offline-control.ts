import { createHash } from "node:crypto";
import { evidenceSources } from "./sources";
import type { OfflineEvidenceSnapshot } from "../types";

const canonicalSourceExtracts: Record<string, string> = {
  "src-service-public-ifi-2026":
    "IFI 2026: seuil 1 300 000 EUR, résidence principale, barème, décote, plafonnement, dettes sous conditions.",
  "src-service-public-pfu-2026":
    "PFU 2026: prélèvement forfaitaire unique et prélèvements sociaux, cas de taux 30 ou 31,4 selon enveloppe.",
  "src-economie-cdhr-2026":
    "CDHR: contribution différentielle hauts revenus, seuils 250 000 / 500 000 et imposition minimale 20%.",
  "src-legifrance-dutreil-2026":
    "LF 2026 art. 8: Pacte Dutreil, exonération 75%, conditions et exclusions à valider.",
  "src-legifrance-apport-cession-2026":
    "LF 2026 art. 11: apport-cession 150-0 B ter, réinvestissement 70%, délai et conservation.",
  "src-legifrance-holding-tax-2026":
    "LF 2026 art. 7: taxe holding patrimoniale, critères cumulés, actifs non professionnels, taux 20%.",
};

export function hashCanonicalContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function buildOfflineEvidenceSnapshot(sourceId: string): OfflineEvidenceSnapshot {
  const source = evidenceSources.find((candidate) => candidate.id === sourceId) ?? evidenceSources[0];
  const canonical = canonicalSourceExtracts[source.id] ?? `${source.title}\n${source.summary}\n${source.url}`;
  const canonicalContentHash =
    source.snapshotStatus === "current" ? source.contentHash : hashCanonicalContent(canonical);
  const changed = canonicalContentHash !== source.contentHash;

  return {
    id: `offline-snapshot-${source.id}-v21`,
    sourceId: source.id,
    capturedAt: "2026-05-27T09:45:00.000Z",
    canonicalContentHash,
    previousHash: source.contentHash,
    status: changed ? "changed" : "unchanged",
    recommendedAction: changed
      ? "Créer une revue de source et décider si une règle doit être mise à jour."
      : "Aucune action requise dans le référentiel offline.",
  };
}

export function controlOfflineEvidenceSources() {
  return evidenceSources.map((source) => buildOfflineEvidenceSnapshot(source.id));
}
