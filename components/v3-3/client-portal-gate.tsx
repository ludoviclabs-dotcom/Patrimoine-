"use client";

import { useState, type ReactNode } from "react";
import { LockKeyhole, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Porte d'entrée espace client — authentification SIMULÉE.
 * Le rôle `client` (lib/security/access-control.ts) ne voit que la synthèse,
 * les documents demandés et les rapports validés ; jamais les brouillons ni
 * les hypothèses de travail du cabinet.
 * Câblage réel documenté : Auth.js (credentials/magic link) ou Clerk, session
 * liée à clientUserId, contrôle canAccessClient() côté serveur.
 */
export function ClientPortalGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return (
      <Card elevated className="mx-auto max-w-xl">
        <CardHeader>
          <div>
            <CardEyebrow>Espace client</CardEyebrow>
            <CardTitle className="mt-1">Connexion simulée</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Démo sans mot de passe : la session « client » restreint la vue à la synthèse, aux
              documents et aux rapports validés.
            </p>
          </div>
          <LockKeyhole className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => setAuthenticated(true)}>
            <UserRound className="h-4 w-4" aria-hidden />
            Entrer comme Claire (rôle client)
          </Button>
          <Badge tone="teal" dot>
            Auth simulée — Auth.js/Clerk documenté pour le réel
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success" dot>
          Session client simulée : Claire
        </Badge>
        <Badge tone="warning">Vue restreinte : synthèse, documents, rapports validés</Badge>
        <Button type="button" variant="secondary" onClick={() => setAuthenticated(false)}>
          Se déconnecter
        </Button>
      </div>
      {children}
    </div>
  );
}
