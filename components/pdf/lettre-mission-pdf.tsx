import { DocumentPdf, type PdfSection } from "./document-pdf";

export function LettreMissionPdf({ sections, hash }: { sections: PdfSection[]; hash: string }) {
  return (
    <DocumentPdf
      eyebrow="Conformité CGP — recommandations CNCGP"
      title="Lettre de mission patrimoniale"
      subtitle="Objet, périmètre, délai de mission et honoraires"
      sections={sections}
      footer={`Empreinte ${hash} · généré le 11/06/2026 · patrimoine-fiscal-demo (V3, démo)`}
    />
  );
}
