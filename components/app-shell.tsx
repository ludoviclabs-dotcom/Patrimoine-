"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  FileText,
  FolderKanban,
  FolderOpen,
  Landmark,
  Library,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Workflow,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CommandPalette } from "@/components/ui/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: "/cabinet", label: "Accueil cabinet", icon: BarChart3 },
  { href: "/dossiers", label: "Dossiers", icon: FolderKanban },
  { href: "/simulations", label: "Simuler", icon: Landmark },
  { href: "/evidence", label: "Preuves & règles", icon: Library },
  { href: "/review", label: "Revue", icon: UserCheck },
  { href: "/report", label: "Rapports", icon: FileText },
  { href: "/compliance", label: "Administration", icon: SlidersHorizontal },
];

const dossiers = [
  { name: "Claire et Marc", active: true },
  { name: "Famille dirigeante exemple", active: false },
  { name: "Succession Durand", active: false },
];

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (pathname === "/" && href === "/cabinet") ||
    (href === "/evidence" && pathname === "/admin/evidence") ||
    (href === "/dossiers" && ["/workflow", "/client"].includes(pathname))
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav
      className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 lg:grid lg:flex-none lg:overflow-visible lg:pb-0"
      aria-label="Navigation principale"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-[var(--r-md)] px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
              active ? "text-white" : "text-muted hover:bg-[var(--surface-soft)] hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-[var(--r-md)] bg-[var(--surface-strong)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function Wordmark() {
  return (
    <Link href="/cabinet" className="flex shrink-0 items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-strong)] text-white shadow-[var(--shadow-sm)]">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="hidden sm:block">
        <span className="block font-serif text-base font-semibold tracking-[0.02em] text-foreground">
          Patrimoine
        </span>
        <span className="block text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--gold-strong)]">
          Cabinet privé
        </span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 12);
  });

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-[var(--r-md)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      >
        Aller au contenu principal
      </a>

      <aside className="no-print z-10 border-b border-border bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 py-3 lg:h-full lg:flex-col lg:items-stretch lg:gap-7 lg:px-5 lg:py-6">
          <Wordmark />
          <NavLinks pathname={pathname} />
          <div className="mt-auto hidden rounded-[var(--r-lg)] border border-border bg-[var(--surface-soft)] p-4 lg:block">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-[var(--gold-strong)]" aria-hidden />
              Démo evidence-first
            </div>
            <p className="text-sm leading-6 text-muted">
              Moteur fiscal sourcé, revue humaine obligatoire, conclusions justifiées.
            </p>
            <kbd className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[0.7rem] font-medium text-muted">
              <Search className="h-3 w-3" aria-hidden /> ⌘K pour rechercher
            </kbd>
          </div>
        </div>
      </aside>

      <main id="main-content" tabIndex={-1} className="lg:ml-72 lg:min-h-screen lg:flex-1">
        <header
          className={cn(
            "no-print sticky top-0 z-20 border-b backdrop-blur transition-all duration-300",
            scrolled
              ? "border-border bg-[color-mix(in_srgb,var(--background)_82%,transparent)] py-2.5 shadow-[var(--shadow-sm)]"
              : "border-transparent bg-[color-mix(in_srgb,var(--background)_66%,transparent)] py-4",
          )}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5">
            <div className="flex min-w-0 items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="group flex items-center gap-2.5 rounded-[var(--r-md)] px-2 py-1.5 text-left transition hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-[var(--gold-strong)]" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted">
                        Dossier suivi
                      </span>
                      <span className="flex items-center gap-1 truncate font-serif text-base font-semibold text-foreground">
                        Claire et Marc
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted transition group-data-[state=open]:rotate-180" aria-hidden />
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[16rem]">
                  <DropdownMenuLabel>Dossiers démo</DropdownMenuLabel>
                  {dossiers.map((dossier) => (
                    <DropdownMenuItem key={dossier.name} asChild>
                      <Link href="/dossiers">
                        <FolderOpen className="h-4 w-4 text-muted" aria-hidden />
                        <span className="flex-1">{dossier.name}</span>
                        {dossier.active ? (
                          <Badge tone="teal" dot>
                            Actif
                          </Badge>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dossiers">
                      <FolderKanban className="h-4 w-4 text-muted" aria-hidden />
                      Tous les dossiers
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge tone="warning" className="hidden sm:inline-flex">
                Simulation indicative
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
                className="hidden items-center gap-2 rounded-full border border-border bg-white py-2 pl-3 pr-2 text-sm text-muted transition hover:border-[var(--line-strong)] hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] md:inline-flex"
              >
                <Search className="h-4 w-4" aria-hidden />
                <span>Rechercher</span>
                <kbd className="rounded border border-border bg-[var(--surface-soft)] px-1.5 py-0.5 text-[0.65rem] font-medium">
                  ⌘K
                </kbd>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden items-center gap-2 rounded-[var(--r-md)] border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] lg:inline-flex"
                  >
                    <BookOpen className="h-4 w-4 text-[var(--gold-strong)]" aria-hidden />
                    Ressources
                    <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Ressources contextuelles</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/atlas-fiscal">
                      <BookOpen className="h-4 w-4 text-muted" aria-hidden />
                      Atlas fiscal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/workflow">
                      <Workflow className="h-4 w-4 text-muted" aria-hidden />
                      Workflow démo
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/comptabilite-sci">
                      <BookOpen className="h-4 w-4 text-muted" aria-hidden />
                      Comptabilité SCI
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />

              <Link
                href="/report"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--r-md)] bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <FileText className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Rapport</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-7 lg:py-9">{children}</div>
      </main>

      <CommandPalette />
    </div>
  );
}
