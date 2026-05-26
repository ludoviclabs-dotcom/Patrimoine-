import { LockKeyhole, ShieldCheck, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocumentUploadPolicy, assertCronSecretPolicy } from "@/lib/security/access-control";

export function SecurityBoard() {
  const uploadPolicy = getDocumentUploadPolicy();
  const cronPolicy = (() => {
    try {
      return assertCronSecretPolicy({});
    } catch {
      return { required: true, configured: false, tenantId: "tenant-cabinet-ludovic-demo" };
    }
  })();

  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Isolation tenant</CardTitle>
            <p className="mt-1 text-sm text-muted">Cabinet, client, dossier et documents restent scopes.</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-3 text-sm leading-6 text-muted">
          <p>Acces cabinet : admin, conseiller, expert.</p>
          <p>Acces client : uniquement son dossier rattache.</p>
          <p>Evidence admin : admin ou expert seulement.</p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>CRON_SECRET</CardTitle>
            <p className="mt-1 text-sm text-muted">Obligatoire quand `VERCEL_ENV=production`.</p>
          </div>
          <LockKeyhole className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <Badge tone={cronPolicy.configured ? "success" : cronPolicy.required ? "danger" : "warning"}>
          {cronPolicy.configured ? "Configure" : cronPolicy.required ? "A configurer" : "Optionnel local"}
        </Badge>
        <p className="mt-4 text-sm leading-6 text-muted">
          Le endpoint cron refuse la production si le secret n&apos;est pas present.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Documents prives</CardTitle>
            <p className="mt-1 text-sm text-muted">Aucun lien public par defaut.</p>
          </div>
          <UploadCloud className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{uploadPolicy.visibility}</Badge>
          <Badge tone="danger">publicUrl: false</Badge>
          <Badge>{uploadPolicy.provider}</Badge>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{uploadPolicy.reason}</p>
      </Card>
    </section>
  );
}
