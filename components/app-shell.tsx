"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Landmark,
  Library,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Synthèse", icon: BarChart3 },
  { href: "/cabinet", label: "Cabinet", icon: FolderKanban },
  { href: "/client", label: "Client", icon: UserRound },
  { href: "/simulations", label: "Simulations", icon: Landmark },
  { href: "/evidence", label: "Sources", icon: Library },
  { href: "/review", label: "Revue", icon: ClipboardCheck },
  { href: "/report", label: "Rapport", icon: FileText },
  { href: "/compliance", label: "Conformité", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print border-b border-border bg-white/90 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-6 px-4 py-4 lg:px-5 lg:py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-strong)] text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.18em] text-foreground">
                PATRIMOINE
              </span>
              <span className="block text-xs font-medium text-muted">Fiscal Demo</span>
            </span>
          </Link>

          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Navigation principale">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || (pathname === "/" && item.href === "/dashboard");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition",
                    active
                      ? "bg-[var(--surface-strong)] text-white"
                      : "text-muted hover:bg-[var(--surface-soft)] hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden rounded-lg border border-border bg-[var(--surface-soft)] p-4 lg:block">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
              V1 socle cabinet
            </div>
            <p className="text-sm leading-6 text-muted">
              Règles déterministes, sources versionnées, tenant pilote et revue humaine.
            </p>
          </div>
        </div>
      </aside>

      <main className="lg:ml-72 lg:min-h-screen lg:flex-1">
        <header className="no-print sticky top-0 z-20 border-b border-border bg-[rgba(247,248,245,0.88)] px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Dossier demo
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">Claire et Marc</h1>
                <Badge tone="warning">Analyse indicative</Badge>
              </div>
            </div>
            <Link
              href="/report"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#223029]"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Rapport
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
