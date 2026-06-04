import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { EvidenceSource } from "@/lib/types";

const authorityLabels: Record<EvidenceSource["authority"], string> = {
  "service-public": "Service-Public",
  impots: "impots.gouv.fr",
  bofip: "BOFiP",
  legifrance: "Légifrance",
  cnil: "CNIL",
  eurlex: "EUR-Lex",
  "banque-france": "Banque de France",
  aife: "AIFE",
  amf: "AMF",
  cnb: "CNB",
  "ordre-ec": "Ordre EC",
  "commission-europeenne": "Commission européenne",
};

const scopeLabels: Record<EvidenceSource["legalScope"], string> = {
  IFI: "IFI",
  transmission: "Transmission",
  "facturation-electronique": "Facturation électronique",
  rgpd: "RGPD",
  donation: "Donation",
  "plus-value": "Plus-value",
  sci: "SCI",
  "ai-act": "AI Act",
  "ir-pfu-cdhr": "IR/PFU/CDHR",
  dutreil: "Dutreil",
  "apport-cession": "Apport-cession",
  "holding-tax": "Taxe holding",
  "mif2-dda": "MIF II / DDA",
  pea: "PEA",
  per: "PER",
  "open-banking": "Open banking",
  "lcb-ft": "LCB-FT",
  "dac6-dac7": "DAC6/DAC7",
};

export function EvidenceList({ sources }: { sources: EvidenceSource[] }) {
  return (
    <div className="grid gap-4">
      {sources.map((source) => (
        <Card key={source.id} className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge tone="teal">{authorityLabels[source.authority]}</Badge>
                <Badge>{scopeLabels[source.legalScope]}</Badge>
                <Badge tone={source.status === "active" ? "success" : "warning"}>
                  {source.status === "active" ? "Active" : "À revoir"}
                </Badge>
              </div>
              <h2 className="text-base font-semibold text-foreground">{source.title}</h2>
              <p className="mt-2 font-mono text-xs text-muted">Vérifiée le {source.checkedAt}</p>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)]"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Ouvrir
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function EvidenceRail({ sources }: { sources: EvidenceSource[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Evidence Center</CardTitle>
          <p className="mt-1 text-sm text-muted">Sources officielles liées aux règles V2.</p>
        </div>
      </CardHeader>
      <div className="space-y-3">
        {sources.slice(0, 4).map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-border p-3 transition hover:border-[#cbd6cf] hover:bg-[var(--surface-soft)]"
          >
            <p className="text-sm font-semibold text-foreground">{source.title}</p>
            <p className="mt-2 font-mono text-xs text-muted">
              {authorityLabels[source.authority]} · {source.checkedAt}
            </p>
          </a>
        ))}
      </div>
    </Card>
  );
}
