import { ArrowRight, FileText, FolderPlus, Library, UsersRound } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

const actions = [
  {
    href: "/dossiers",
    label: "Créer un dossier",
    detail: "Onboarding 90 secondes et snapshot de dossier.",
    icon: FolderPlus,
  },
  {
    href: "/dossiers#personas",
    label: "Ouvrir un persona",
    detail: "7 cas fictifs instanciables pour rendez-vous.",
    icon: UsersRound,
  },
  {
    href: "/report",
    label: "Générer un rapport",
    detail: "Rapport sourcé, limites et validation visible.",
    icon: FileText,
  },
  {
    href: "/pilot",
    label: "Demander une démo",
    detail: "Script cabinet, cas pilote et pricing test.",
    icon: Library,
  },
];

export function CabinetHero() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="rounded-lg border border-border bg-white p-6 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          Produit cabinet V2
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-foreground md:text-4xl">
          Moteur fiscal sourcé pour cabinets, dossiers dirigeants et fiscalité LF 2026.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
          La plateforme prépare un dossier professionnel, calcule de façon déterministe,
          cite les sources officielles, montre les limites et impose une validation humaine
          avant tout livrable client.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dossiers"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white transition hover:bg-[#223029]"
          >
            Créer un dossier
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/evidence"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)]"
          >
            Voir les preuves
          </Link>
        </div>
      </div>

      <Card>
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-[var(--surface-soft)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-strong)] text-white">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted">{action.detail}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
