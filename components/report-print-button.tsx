"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Prints the browser working preview. It is deliberately NOT the cabinet
 * deliverable: the professional report is rendered server-side, versioned,
 * hashed and stored privately. The label states so explicitly.
 */
export function ReportPrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="no-print">
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimer l&apos;aperçu (non final)
    </Button>
  );
}
