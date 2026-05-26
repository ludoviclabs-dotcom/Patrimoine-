import { Badge } from "@/components/ui/badge";
import type { ReliabilityStatus } from "@/lib/types";

const labels: Record<ReliabilityStatus, string> = {
  validated_calculation: "Calcul deterministe valide",
  indicative_calculation: "Calcul indicatif",
  user_assumption: "Hypothese utilisateur",
  official_source: "Source officielle",
  professional_review_required: "A valider",
  not_covered_v1: "Non couvert V1",
};

const tones: Record<ReliabilityStatus, Parameters<typeof Badge>[0]["tone"]> = {
  validated_calculation: "success",
  indicative_calculation: "teal",
  user_assumption: "neutral",
  official_source: "success",
  professional_review_required: "warning",
  not_covered_v1: "danger",
};

export function ReliabilityBadge({ status }: { status: ReliabilityStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
