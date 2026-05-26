"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportPrintButton() {
  return (
    <Button type="button" onClick={() => window.print()} className="no-print">
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimer / PDF
    </Button>
  );
}
