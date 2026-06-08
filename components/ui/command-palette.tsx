"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  FileText,
  FolderKanban,
  FolderOpen,
  Landmark,
  Library,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react";
import { simulationCatalog } from "@/lib/cabinet-refonte/v2-6";

const pages = [
  { label: "Accueil cabinet", href: "/cabinet", icon: BarChart3 },
  { label: "Dossiers", href: "/dossiers", icon: FolderKanban },
  { label: "Simuler", href: "/simulations", icon: Landmark },
  { label: "Preuves & règles", href: "/evidence", icon: Library },
  { label: "Revue", href: "/review", icon: UserCheck },
  { label: "Rapports", href: "/report", icon: FileText },
  { label: "Administration", href: "/compliance", icon: SlidersHorizontal },
];

const dossiers = [
  { label: "Claire et Marc", href: "/dossiers", hint: "Dossier actif" },
  { label: "Famille dirigeante exemple", href: "/dossiers", hint: "Brouillon" },
  { label: "Succession Durand", href: "/dossiers", hint: "Brouillon" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("command-palette:open", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("command-palette:open", onOpen);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Recherche rapide">
      <Command.Input placeholder="Rechercher un dossier, une simulation, une preuve…" />
      <Command.List>
        <Command.Empty>Aucun résultat.</Command.Empty>

        <Command.Group heading="Navigation">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <Command.Item key={page.href} value={`page ${page.label}`} onSelect={() => go(page.href)}>
                <Icon aria-hidden />
                {page.label}
              </Command.Item>
            );
          })}
        </Command.Group>

        <Command.Group heading="Dossiers">
          {dossiers.map((dossier) => (
            <Command.Item
              key={dossier.label}
              value={`dossier ${dossier.label}`}
              onSelect={() => go(dossier.href)}
            >
              <FolderOpen aria-hidden />
              {dossier.label}
              <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.72rem" }}>
                {dossier.hint}
              </span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Simulations">
          {simulationCatalog.map((item) => (
            <Command.Item
              key={item.id}
              value={`simulation ${item.label}`}
              onSelect={() => go(item.href)}
            >
              <Landmark aria-hidden />
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Preuves & conformité">
          <Command.Item value="preuves table audit" onSelect={() => go("/evidence")}>
            <Library aria-hidden />
            Table d&apos;audit des preuves
          </Command.Item>
          <Command.Item value="administration conformite" onSelect={() => go("/compliance")}>
            <ShieldCheck aria-hidden />
            Administration & conformité
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
