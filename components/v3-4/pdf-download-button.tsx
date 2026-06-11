"use client";

import { useState, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Téléchargement PDF natif — client-only : @react-pdf/renderer est importé
 * dynamiquement au clic (jamais au rendu serveur). Si la génération échoue,
 * le circuit d'impression print CSS reste le fallback permanent.
 */
export function PdfDownloadButton({
  documentElement,
  fileName,
  label = "Télécharger le PDF",
}: {
  documentElement: ReactElement<DocumentProps>;
  fileName: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={status === "working"}
      onClick={async () => {
        setStatus("working");
        try {
          const { pdf } = await import("@react-pdf/renderer");
          const blob = await pdf(documentElement).toBlob();
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = fileName;
          anchor.click();
          URL.revokeObjectURL(url);
          setStatus("idle");
        } catch {
          setStatus("error");
        }
      }}
    >
      <FileDown className="h-4 w-4" aria-hidden />
      {status === "working" ? "Génération…" : status === "error" ? "Échec — utiliser l'impression" : label}
    </Button>
  );
}
