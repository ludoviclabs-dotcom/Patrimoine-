import { appendAuditEventToRepository } from "../audit/repository";
import { demoTenant } from "../demo-data/v1";
import { stableHash } from "../conformite/hash";
import type { ProfessionalDocument, SignatureEnvelope } from "../types";

/**
 * Signature électronique — SIMULÉE, prête à brancher.
 *
 * Niveau démo : « SES-demo » (signature électronique simple au sens eIDAS,
 * règlement (UE) 910/2014) — hash du document + horodatage dans l'audit
 * append-only. Câblage réel documenté :
 * - Yousign (API REST, niveau SES/AES, ancrage horodaté) ou DocuSign ;
 * - implémenter `HttpSignatureProvider implements SignatureProvider` et
 *   basculer dans `getSignatureProvider()` sur présence de
 *   `SIGNATURE_API_KEY` (jamais lue en mode démo) ;
 * - en production : AES/QES selon l'enjeu, archivage à valeur probante.
 */

export interface SignatureProvider {
  createEnvelope(document: ProfessionalDocument): SignatureEnvelope;
  sign(envelope: SignatureEnvelope): SignatureEnvelope;
}

export class FixtureSignatureProvider implements SignatureProvider {
  createEnvelope(document: ProfessionalDocument): SignatureEnvelope {
    return {
      id: `envelope-${document.id}`,
      documentId: document.id,
      documentTitle: document.title,
      documentHash: `sha-demo-${stableHash(`${document.id}:${document.hash}`)}`,
      signers: [
        { name: "Claire et Marc", role: "client" },
        { name: "Cabinet Démo Patrimoine", role: "conseiller" },
      ],
      status: "sent",
      signatureLevel: "SES-demo",
    };
  }

  sign(envelope: SignatureEnvelope): SignatureEnvelope {
    const auditEventId = `audit-signature-${envelope.id}`;
    appendAuditEventToRepository({
      id: auditEventId,
      tenantId: demoTenant.id,
      actorUserId: "user-client-demo",
      action: "document.signed",
      entityType: "document",
      entityId: envelope.documentId,
      createdAt: "2026-06-11T15:30:00.000Z",
      summary: `Document « ${envelope.documentTitle} » signé (SES démo), empreinte ${envelope.documentHash}.`,
    });

    return {
      ...envelope,
      status: "signed",
      timestampedAt: "2026-06-11T15:30:00.000Z",
      auditEventId,
    };
  }
}

export function getSignatureProvider(): SignatureProvider {
  // Démo : fixture systématique, aucun secret requis.
  return new FixtureSignatureProvider();
}
