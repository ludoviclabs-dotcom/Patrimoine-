import { BriefcaseBusiness } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeetingBrief as MeetingBriefType } from "@/lib/types";

export function MeetingBrief({ briefs }: { briefs: MeetingBriefType[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Checklist rendez-vous cabinet</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Resume, questions, documents et points fiscaux a valider par profession.
          </p>
        </div>
        <BriefcaseBusiness className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        {briefs.map((brief) => (
          <div key={brief.id} className="rounded-lg border border-border p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="teal">{brief.audience}</Badge>
              <Badge>Preparation dossier</Badge>
            </div>
            <p className="text-sm font-semibold text-foreground">{brief.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{brief.dossierSummary}</p>
            <BriefSection title="Questions a poser" items={brief.questions} />
            <BriefSection title="Documents a apporter" items={brief.documentsToBring} />
            <BriefSection title="Points fiscaux a valider" items={brief.taxPointsToValidate} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
