import { Badge } from "@/components/ui/badge";
import { getDisplayTier, tierTone } from "@/lib/cabinet-refonte/status-tiers";
import type { CabinetStatus } from "@/lib/cabinet-refonte/v2-6";

/**
 * Badge à 3 niveaux pour les surfaces guidées (Indicatif / Revue requise /
 * Bloquant). Le StatusBadge à 10 statuts reste utilisé sur les surfaces
 * expertes — ce composant n'affecte que la présentation.
 */
export function TierBadge({ status }: { status: CabinetStatus }) {
  const tier = getDisplayTier(status);
  return (
    <Badge tone={tierTone[tier]} dot>
      {tier}
    </Badge>
  );
}
