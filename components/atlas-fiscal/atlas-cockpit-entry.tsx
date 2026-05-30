import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleDollarSign, FileSearch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const cockpitAtlasActions = [
  {
    href: "/atlas-fiscal",
    label: "Ouvrir l'atlas",
    title: "Comprendre avant de simuler",
    description:
      "Cartes courtes sur les frictions fiscales, la trésorerie entrepreneuriale et les scénarios de réforme.",
    icon: BookOpenCheck,
  },
  {
    href: "/atlas-fiscal#public-money",
    label: "Voir 1 000 €",
    title: "Où va l'argent public ?",
    description:
      "Ventilation visuelle des prélèvements vers protection sociale, services publics, dette et investissement collectif.",
    icon: CircleDollarSign,
  },
  {
    href: "/atlas-fiscal#sources",
    label: "Auditer les sources",
    title: "Établi, débattu, fragile",
    description:
      "Lecture immédiate du niveau de preuve pour éviter de mélanger fait, analyse et hypothèse.",
    icon: FileSearch,
  },
];

export function AtlasCockpitEntry() {
  return (
    <Card>
      <CardHeader>
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="teal">Nouvelle étape</Badge>
            <Badge tone="neutral">Comprendre → Simuler → Prouver</Badge>
          </div>
          <CardTitle className="text-xl">Comprendre avant de simuler</CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            L&apos;Atlas fiscal sert de face pédagogique du cockpit : il donne le mécanisme, le niveau
            de certitude et l&apos;action suivante avant d&apos;ouvrir un moteur de calcul.
          </p>
        </div>
      </CardHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        {cockpitAtlasActions.map((action) => (
          <CockpitAtlasAction key={action.href} {...action} />
        ))}
      </div>
    </Card>
  );
}

function CockpitAtlasAction({
  href,
  label,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-border bg-[var(--surface-soft)] p-4 transition hover:-translate-y-0.5 hover:border-[#cbd6cf] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--accent)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <ArrowRight
          className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
          aria-hidden="true"
        />
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
    </Link>
  );
}
