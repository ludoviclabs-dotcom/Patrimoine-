"use client";

import { useCallback, useState } from "react";
import { DerGenerator } from "@/components/v3-4/der-generator";
import { KycQuestionnaire } from "@/components/v3-4/kyc-questionnaire";
import { LcbFtBoard } from "@/components/v3-4/lcb-ft-board";
import { LettreMissionGenerator } from "@/components/v3-4/lettre-mission-generator";
import { SignatureCeremony } from "@/components/v3-4/signature-ceremony";
import type { ProfessionalDocument } from "@/lib/types";

/**
 * Parcours conformité complet : DER → lettre de mission → KYC/adéquation →
 * LCB-FT → signature simulée. Critère d'acceptation du rapport d'audit :
 * un dossier produit DER + lettre de mission + profil de risque signés
 * (simulé) et archivés.
 */
export function ConformiteWorkspace() {
  const [der, setDer] = useState<ProfessionalDocument | null>(null);
  const [lettre, setLettre] = useState<ProfessionalDocument | null>(null);
  const [adequation, setAdequation] = useState<ProfessionalDocument | null>(null);

  const handleDer = useCallback((document: ProfessionalDocument | null) => setDer(document), []);
  const handleLettre = useCallback((document: ProfessionalDocument | null) => setLettre(document), []);
  const handleAdequation = useCallback(
    (document: ProfessionalDocument | null) => setAdequation(document),
    [],
  );

  const readyDocuments = [der, lettre, adequation].filter(
    (document): document is ProfessionalDocument => document !== null,
  );

  return (
    <div className="space-y-8">
      <DerGenerator onDocument={handleDer} />
      <LettreMissionGenerator onDocument={handleLettre} />
      <KycQuestionnaire onDocument={handleAdequation} />
      <LcbFtBoard />
      <SignatureCeremony documents={readyDocuments} />
    </div>
  );
}
