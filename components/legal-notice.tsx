import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LegalNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="warning">Simulation indicative</Badge>
            <Badge tone="danger">Non validé</Badge>
          </div>
          <p className={compact ? "mt-2 text-xs leading-5" : "mt-2 text-sm leading-6"}>
            Ces résultats ne constituent pas un conseil fiscal, juridique ou patrimonial.
            Ils servent de support de préparation de dossier et doivent être validés par un
            professionnel habilité avant toute décision ou remise client.
          </p>
        </div>
      </div>
    </div>
  );
}
