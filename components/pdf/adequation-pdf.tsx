import { DocumentPdf, type PdfSection } from "./document-pdf";

export function AdequationPdf({ sections, hash }: { sections: PdfSection[]; hash: string }) {
  return (
    <DocumentPdf
      eyebrow="Conformité CGP — MIF 2 / DDA"
      title="Déclaration d'adéquation"
      subtitle="Profil KYC, préférences de durabilité et écarts détectés"
      sections={sections}
      footer={`Empreinte ${hash} · généré le 11/06/2026 · patrimoine-fiscal-demo (V3, démo)`}
    />
  );
}
