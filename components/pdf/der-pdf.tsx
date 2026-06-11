import { DocumentPdf, type PdfSection } from "./document-pdf";

export function DerPdf({ sections, hash }: { sections: PdfSection[]; hash: string }) {
  return (
    <DocumentPdf
      eyebrow="Conformité CGP — RG AMF 325-5 · L. 541-8-1 CMF"
      title="Document d'entrée en relation"
      subtitle="Statuts, immatriculation ORIAS, rémunération et liens capitalistiques"
      sections={sections}
      footer={`Empreinte ${hash} · généré le 11/06/2026 · patrimoine-fiscal-demo (V3, démo)`}
    />
  );
}
