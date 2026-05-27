import { evidenceSources, sourceSnapshots } from "../evidence/sources";
import type { SourceWatchResult } from "../types";

export function runDemoSourceWatch(now = new Date("2026-05-26T12:00:00.000Z")): SourceWatchResult[] {
  return sourceSnapshots.map((snapshot) => {
    const source = evidenceSources.find((candidate) => candidate.id === snapshot.sourceId);

    if (!source) {
      return {
        sourceId: snapshot.sourceId,
        previousHash: snapshot.contentHash,
        currentHash: "missing-source",
        status: "failed",
        checkedAt: now.toISOString(),
        recommendedAction: "Verifier la fixture source avant prochain controle.",
      };
    }

    if (source.id === "src-service-public-pfu-2026") {
      return {
        sourceId: source.id,
        previousHash: "sp-entreprendre-pfu-a18796-2025-30-0",
        currentHash: source.contentHash,
        status: "changed",
        checkedAt: now.toISOString(),
        recommendedAction: "PFU 30 % -> 31,4 % detecte : revue humaine et recalcul des dossiers avec revenus de capitaux.",
      };
    }

    const simulatedCurrentHash =
      source.id === "src-legifrance-code-civil-transmission"
        ? `${source.contentHash}-review`
        : source.contentHash;

    const status = simulatedCurrentHash === snapshot.contentHash ? "unchanged" : "changed";

    return {
      sourceId: source.id,
      previousHash: snapshot.contentHash,
      currentHash: simulatedCurrentHash,
      status,
      checkedAt: now.toISOString(),
      recommendedAction:
        status === "changed"
          ? "Revue humaine requise avant mise a jour des regles liees."
          : "Aucune action requise en mode demo.",
    };
  });
}
